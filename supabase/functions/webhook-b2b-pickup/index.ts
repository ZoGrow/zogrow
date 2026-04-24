import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function similarity(a: string, b: string): number {
  const an = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bn = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (an === bn) return 1;
  if (an.includes(bn) || bn.includes(an)) return 0.8;
  const words1 = a.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = b.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));
  return matched.length / Math.max(words1.length, words2.length);
}

function findBestClient(clients: { id: string; client_name: string }[], input: string) {
  let best = null;
  let bestScore = 0;
  for (const client of clients) {
    const score = similarity(input, client.client_name);
    if (score > bestScore) {
      bestScore = score;
      best = client;
    }
  }
  return bestScore >= 0.3 ? best : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("B2B Pickup webhook received:", JSON.stringify(body));

    // Only count actual pickups (completed calls). Twilio statuses: completed, no-answer, busy, failed, initiated.
    const callStatus = (body.customData?.call_status || body.call_status || "").toLowerCase();
    if (callStatus && callStatus !== "completed") {
      console.log(`B2B Pickup webhook: ignoring call_status="${callStatus}" (not a pickup)`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: `call_status=${callStatus}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientName =
      body.client_name ||
      body.clientName ||
      body.location?.name ||
      body.contact_name ||
      body.contactName ||
      body.contact?.name ||
      "";
    const clientId = body.client_id || null;

    if (!clientName && !clientId) {
      return new Response(
        JSON.stringify({ error: "No client_name, contact_name, location.name, or client_id provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let resolvedClientId = clientId;
    if (!resolvedClientId && clientName) {
      const { data: allClients, error: clientsError } = await supabase
        .from("clients")
        .select("id, client_name");
      if (clientsError) throw clientsError;

      const matched = findBestClient(allClients || [], clientName);
      console.log(`Fuzzy match: "${clientName}" -> "${matched?.client_name || "NO MATCH"}"`);

      if (!matched) {
        return new Response(
          JSON.stringify({ error: `Client not found matching: "${clientName}"` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedClientId = matched.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const increment = Number(body.count) || 1;

    const { data: existing, error: existingError } = await supabase
      .from("metrics")
      .select("id, pickups")
      .eq("client_id", resolvedClientId)
      .eq("date", today)
      .order("created_at", { ascending: true });
    if (existingError) throw existingError;

    let result;
    if (existing && existing.length > 0) {
      // Consolidate any duplicate rows into the first one
      const totalPickups = existing.reduce((s, r) => s + (r.pickups || 0), 0) + increment;
      const primary = existing[0];
      const { data, error } = await supabase
        .from("metrics")
        .update({ pickups: totalPickups })
        .eq("id", primary.id)
        .select();
      if (error) throw error;
      if (existing.length > 1) {
        await supabase.from("metrics").delete().in("id", existing.slice(1).map((r) => r.id));
      }
      result = { action: "updated", data };
    } else {
      const { data, error } = await supabase
        .from("metrics")
        .insert({ client_id: resolvedClientId, date: today, pickups: increment })
        .select();
      if (error) throw error;
      result = { action: "created", data };
    }

    console.log(`B2B Pickup webhook: +${increment} for client ${resolvedClientId}`);

    // Also update aggregated b2b_ads_metrics table (used by B2B Ads page)
    const { data: b2bExisting } = await supabase
      .from("b2b_ads_metrics")
      .select("id, pickups")
      .eq("date", today)
      .limit(1);

    if (b2bExisting && b2bExisting.length > 0) {
      await supabase
        .from("b2b_ads_metrics")
        .update({ pickups: (b2bExisting[0].pickups || 0) + increment })
        .eq("id", b2bExisting[0].id);
    } else {
      await supabase
        .from("b2b_ads_metrics")
        .insert({ date: today, pickups: increment });
    }

    return new Response(
      JSON.stringify({ success: true, metric: "pickups", client_id: resolvedClientId, incremented_by: increment, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
