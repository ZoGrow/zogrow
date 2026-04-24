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
    console.log("Lead received webhook:", JSON.stringify(body));

    // Extract client identifiers
    const clientName =
      body.client_name ||
      body.clientName ||
      body.location?.name ||
      body.contact_name ||
      body.contactName ||
      "";
    const clientId = body.client_id || null;

    if (!clientName && !clientId) {
      return new Response(
        JSON.stringify({ error: "No client identifier provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve client ID
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

    // Extract lead/contact info
    const contactId = body.contact_id || body.contactId || body.id || null;
    const contactName = body.full_name || body.contact_name || body.contactName || body.name || null;
    const contactPhone = body.phone || body.contact_phone || null;
    const contactEmail = body.email || body.contact_email || null;
    const source = body.source || body.lead_source || body.customData?.source || null;

    // Use the event timestamp if provided, otherwise now()
    const receivedAt = body.date_created || body.dateCreated || body.timestamp || new Date().toISOString();

    // Idempotency key — prefer explicit event id, fall back to client+contact+timestamp signature
    const externalEventId =
      body.event_id || body.eventId || body.webhook_id || body.id ||
      (contactId ? `${resolvedClientId}:${contactId}:${receivedAt}` : null);

    // Check for duplicate by idempotency key first, then by contact_id
    if (externalEventId) {
      const { data: existing } = await supabase
        .from("lead_logs")
        .select("id")
        .eq("external_event_id", externalEventId)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Duplicate lead ignored (event_id): ${externalEventId}`);
        return new Response(
          JSON.stringify({ success: true, duplicate: true, lead_log_id: existing[0].id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    if (contactId) {
      const { data: existing } = await supabase
        .from("lead_logs")
        .select("id")
        .eq("client_id", resolvedClientId)
        .eq("contact_id", contactId)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Duplicate lead ignored: contact_id=${contactId}`);
        return new Response(
          JSON.stringify({ success: true, duplicate: true, lead_log_id: existing[0].id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert lead log
    const { data, error } = await supabase.from("lead_logs").insert({
      client_id: resolvedClientId,
      contact_id: contactId,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      source,
      received_at: receivedAt,
      raw_payload: body,
      external_event_id: externalEventId,
    }).select();

    if (error) throw error;

    console.log(`Lead logged for client ${resolvedClientId}: ${contactName || contactPhone || contactId}`);

    return new Response(
      JSON.stringify({ success: true, lead_log: data?.[0] }),
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
