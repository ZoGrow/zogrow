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
  const matched = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  const score = matched.length / Math.max(words1.length, words2.length);
  return score;
}

function findBestClient(clients: { id: string; client_name: string }[], input: string) {
  let best = null;
  let bestScore = 0;
  for (const c of clients) {
    const score = similarity(input, c.client_name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
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
    console.log("Live transfer webhook received:", JSON.stringify(body));

    const clientName = body.client_name || body.clientName || body.location?.name || body.contact_name || body.contactName || body.contact?.name || "";
    const clientId = body.client_id || null;

    if (!clientName && !clientId) {
      return new Response(
        JSON.stringify({ error: "No client_name, contact_name, or client_id provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let resolvedClientId = clientId;
    if (!resolvedClientId && clientName) {
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, client_name");

      const matched = findBestClient(allClients || [], clientName);
      console.log(`Fuzzy match: "${clientName}" -> "${matched?.client_name || 'NO MATCH'}"`)

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

    const { data: existing } = await supabase
      .from("metrics")
      .select("id, live_transfers")
      .eq("client_id", resolvedClientId)
      .eq("date", today)
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      const row = existing[0];
      const { data, error } = await supabase
        .from("metrics")
        .update({ live_transfers: (row.live_transfers || 0) + increment })
        .eq("id", row.id)
        .select();
      if (error) throw error;
      result = { action: "updated", data };
    } else {
      const { data, error } = await supabase
        .from("metrics")
        .insert({ client_id: resolvedClientId, date: today, live_transfers: increment })
        .select();
      if (error) throw error;
      result = { action: "created", data };
    }

    return new Response(
      JSON.stringify({ success: true, metric: "live_transfers", incremented_by: increment, ...result }),
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
