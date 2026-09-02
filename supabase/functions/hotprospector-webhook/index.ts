import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- helpers -------------------------------------------------------------

function similarity(a: string, b: string): number {
  const an = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bn = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!an || !bn) return 0;
  if (an === bn) return 1;
  if (an.includes(bn) || bn.includes(an)) return 0.8;
  const words1 = a.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = b.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));
  return matched.length / Math.max(words1.length, words2.length);
}

function findBestClient(clients: { id: string; client_name: string }[], input: string) {
  let best: { id: string; client_name: string } | null = null;
  let bestScore = 0;
  for (const client of clients) {
    const score = similarity(input, client.client_name);
    if (score > bestScore) {
      bestScore = score;
      best = client;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

// Local (America/Chicago) calendar day for a timestamp
function chicagoDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function firstOf(body: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    const v = k.split(".").reduce<any>((acc, part) => (acc == null ? acc : acc[part]), body);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function toSeconds(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return Math.max(0, Math.round(v));
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  // handle mm:ss or hh:mm:ss
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.length && parts.every((p) => !isNaN(p))) {
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const f = parseFloat(s);
  return isNaN(f) ? 0 : Math.round(f);
}

// Dispositions / statuses that mean a human actually picked up
const PICKUP_KEYWORDS = [
  "answer",
  "human",
  "connected",
  "connect",
  "live",
  "talked",
  "contact made",
  "interested",
  "not interested",
  "callback",
  "call back",
  "appointment",
  "transfer",
  "dnc",
  "do not call",
  "wrong number",
  "qualified",
  "sale",
];

const NON_PICKUP_KEYWORDS = [
  "no answer",
  "noanswer",
  "voicemail",
  "vm",
  "machine",
  "busy",
  "failed",
  "abandon",
  "dropped",
  "invalid",
  "disconnected",
  "unreachable",
  "congestion",
  "cancel",
];

function isPickup(disposition: string | null, status: string | null, durationSeconds: number): boolean {
  const text = `${disposition || ""} ${status || ""}`.toLowerCase().trim();
  if (text) {
    if (NON_PICKUP_KEYWORDS.some((k) => text.includes(k))) return false;
    if (PICKUP_KEYWORDS.some((k) => text.includes(k))) return true;
  }
  // Fallback: any real talk time counts as a pickup
  return durationSeconds >= 15;
}

// ---- handler -------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.text();
    let body: Record<string, any> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      // HotProspector may post form-encoded data
      body = Object.fromEntries(new URLSearchParams(raw));
    }
    console.log("HotProspector webhook received:", JSON.stringify(body).slice(0, 2000));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Support batch payloads: { calls: [...] } or a bare array
    const events: Record<string, any>[] = Array.isArray(body)
      ? body
      : Array.isArray(body.calls)
        ? body.calls
        : Array.isArray(body.data)
          ? body.data
          : [body];

    const { data: allClients, error: clientsError } = await supabase
      .from("clients")
      .select("id, client_name");
    if (clientsError) throw clientsError;

    const results: any[] = [];
    // date -> clientId -> { dials, pickups }
    const rollup = new Map<string, Map<string, { dials: number; pickups: number }>>();

    for (const ev of events) {
      const clientId = firstOf(ev, ["client_id", "clientId"]);
      // Try each candidate name until one matches a client
      const ghlLocation = firstOf(ev, ["ghl_location_name", "location_name", "sub_account_name"]);
      const ghlLocationBase = ghlLocation ? String(ghlLocation).split(" - ")[0].trim() : null;
      const nameCandidates = [
        firstOf(ev, ["client_name", "clientName"]),
        ghlLocationBase,
        ghlLocation,
        firstOf(ev, ["campaign_name", "campaign", "list_name", "list", "group_name"]),
      ].filter((v) => v != null && String(v).trim() !== "").map(String);

      let resolvedClientId: string | null = clientId;
      if (!resolvedClientId) {
        for (const candidate of nameCandidates) {
          const matched = findBestClient(allClients || [], candidate);
          console.log(`Client match: "${candidate}" -> "${matched?.client_name || "NO MATCH"}"`);
          if (matched) {
            resolvedClientId = matched.id;
            break;
          }
        }
      }
      if (!resolvedClientId) {
        results.push({ skipped: true, reason: `Unmatched client for "${nameCandidates[0] ?? ""}"` });
        continue;
      }

      let externalEventId = firstOf(ev, [
        "call_id",
        "callId",
        "unique_id",
        "uniqueid",
        "event_id",
        "call_uuid",
        "recording_id",
      ]);
      if (!externalEventId) {
        // HP has no unique call id — build one from lead/contact + call time
        const leadRef = firstOf(ev, ["leadId", "lead_id", "contactId", "contact_id", "id"]);
        const timeRef = firstOf(ev, ["call_time", "call_date", "timestamp"]);
        if (leadRef && timeRef) externalEventId = `hp-${leadRef}-${timeRef}`;
      }
      const dialedAtRaw = firstOf(ev, [
        "call_time",
        "call_date",
        "start_time",
        "started_at",
        "timestamp",
        "date",
        "created_at",
      ]);
      const dialedAt = dialedAtRaw ? new Date(String(dialedAtRaw)) : new Date();
      const dialedAtValid = isNaN(dialedAt.getTime()) ? new Date() : dialedAt;

      const durationSeconds = toSeconds(
        firstOf(ev, ["talk_time", "talktime", "duration", "call_duration", "duration_seconds", "length"]),
      );
      const disposition = firstOf(ev, ["disposition", "call_disposition", "call_dispostion", "outcome", "result", "status_name"]);
      const callStatus = firstOf(ev, ["call_status", "status", "call_result"]);
      const agentName = firstOf(ev, ["agent_name", "agent", "user_name", "user", "rep", "caller_name"]);
      const campaignName = firstOf(ev, ["campaign_name", "campaign", "list_name", "list"]);

      const record = {
        client_id: resolvedClientId,
        caller_phone: firstOf(ev, ["from_number", "caller_id", "call_from", "agent_phone"]),
        caller_name: agentName ? String(agentName) : null,
        contact_name: firstOf(ev, ["contact_name", "full_name", "lead_name", "name"]),
        contact_phone: firstOf(ev, ["to_number", "phone", "contact_phone", "call_to", "lead_phone"]),
        call_status: callStatus ? String(callStatus) : null,
        call_direction: String(firstOf(ev, ["direction", "call_direction"]) || "outbound"),
        dialed_at: dialedAtValid.toISOString(),
        duration_seconds: durationSeconds,
        disposition: disposition ? String(disposition) : null,
        agent_name: agentName ? String(agentName) : null,
        campaign_name: campaignName ? String(campaignName) : null,
        dialer_source: "hotprospector",
        raw_payload: ev,
        external_event_id: externalEventId ? String(externalEventId) : null,
      };

      if (record.external_event_id) {
        const { data: dupe } = await supabase
          .from("dial_logs")
          .select("id")
          .eq("external_event_id", record.external_event_id)
          .limit(1);
        if (dupe && dupe.length > 0) {
          console.log(`Duplicate call ignored: ${record.external_event_id}`);
          results.push({ duplicate: true, external_event_id: record.external_event_id });
          continue;
        }
      }

      const { error: insertError } = await supabase.from("dial_logs").insert(record);
      if (insertError) {
        console.error("Failed to insert dial log:", insertError);
        results.push({ error: insertError.message });
        continue;
      }

      const day = chicagoDay(dialedAtValid);
      if (!rollup.has(day)) rollup.set(day, new Map());
      const dayMap = rollup.get(day)!;
      const cur = dayMap.get(resolvedClientId) || { dials: 0, pickups: 0 };
      cur.dials += 1;
      if (isPickup(record.disposition, record.call_status, durationSeconds)) cur.pickups += 1;
      dayMap.set(resolvedClientId, cur);

      results.push({ logged: true, client_id: resolvedClientId, date: day });
    }

    // Roll up into the metrics table so ISA Performance picks it up
    for (const [day, dayMap] of rollup) {
      for (const [cid, counts] of dayMap) {
        const { data: existing } = await supabase
          .from("metrics")
          .select("id, dials_made, pickups")
          .eq("client_id", cid)
          .eq("date", day)
          .is("campaign_id", null)
          .order("created_at", { ascending: true })
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from("metrics")
            .update({
              dials_made: (existing[0].dials_made || 0) + counts.dials,
              pickups: (existing[0].pickups || 0) + counts.pickups,
            })
            .eq("id", existing[0].id);
        } else {
          await supabase.from("metrics").insert({
            client_id: cid,
            date: day,
            dials_made: counts.dials,
            pickups: counts.pickups,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("HotProspector webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
