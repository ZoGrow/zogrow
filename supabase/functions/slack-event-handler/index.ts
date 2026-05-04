import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp",
};

const SELF_BOOKED_CHANNEL_ID = Deno.env.get("SLACK_SELF_BOOKED_CHANNEL_ID") || "";
const LIVE_TRANSFER_CHANNEL_ID = Deno.env.get("SLACK_LIVE_TRANSFER_CHANNEL_ID") || "";
const SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET") || "";

async function verifySlackSignature(body: string, timestamp: string, signature: string): Promise<boolean> {
  if (!SIGNING_SECRET) return false;
  // Reject requests older than 5 min
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  const computed = "v0=" + Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // Constant-time compare
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

type EventType = "live_transfer" | "self_booked" | "sales_team_booked";

function classify(channelId: string, text: string): { type: EventType; realtor: string } | null {
  const cleanText = text.replace(/\*/g, ""); // strip slack bold markers

  if (channelId === LIVE_TRANSFER_CHANNEL_ID) {
    // Live transfer: "Connected to {Name}."
    const ltMatch = cleanText.match(/Live Transfer Initiated[\s\S]*?Connected to ([^.\n]+?)\s*[.\n]/i);
    if (ltMatch) return { type: "live_transfer", realtor: ltMatch[1].trim() };

    // Team-booked appt in live-transfer channel: "Appointment booked ... with {Name}."
    const apptMatch = cleanText.match(/Appointment Initiated[\s\S]*?Appointment booked[\s\S]*?with ([^.\n]+?)\s*[.\n]/i);
    if (apptMatch) return { type: "sales_team_booked", realtor: apptMatch[1].trim() };
    return null;
  }

  if (channelId === SELF_BOOKED_CHANNEL_ID) {
    const sbMatch = cleanText.match(/Appointment booked[\s\S]*?with ([^.\n]+?)\s*[.\n]/i);
    if (sbMatch) return { type: "self_booked", realtor: sbMatch[1].trim() };
    return null;
  }
  return null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

async function findClient(supabase: any, realtor: string): Promise<string | null> {
  // Strip trailing " - Brokerage" suffixes
  const cleanedRealtor = realtor.split(/\s[-–]\s/)[0].trim();
  const target = normalize(cleanedRealtor);

  const { data: clients } = await supabase.from("clients").select("id, client_name");
  if (!clients) return null;

  // Exact normalized match first
  for (const c of clients) {
    if (normalize(c.client_name) === target) return c.id;
  }
  // Then last-name + first-name token containment
  const targetTokens = target.split(" ").filter(Boolean);
  for (const c of clients) {
    const ct = normalize(c.client_name);
    if (targetTokens.length >= 2 && targetTokens.every((t) => ct.includes(t))) return c.id;
  }
  return null;
}

async function incrementMetric(supabase: any, clientId: string, type: EventType) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const column = type === "live_transfer" ? "live_transfers"
    : type === "self_booked" ? "self_booked"
    : "sales_team_booked";

  const { data: existing } = await supabase
    .from("metrics")
    .select(`id, ${column}`)
    .eq("client_id", clientId)
    .eq("date", date)
    .is("campaign_id", null)
    .limit(1);

  if (existing && existing.length > 0) {
    const current = (existing[0] as any)[column] || 0;
    await supabase.from("metrics").update({ [column]: current + 1 }).eq("id", existing[0].id);
  } else {
    await supabase.from("metrics").insert({
      client_id: clientId,
      campaign_id: null,
      date,
      [column]: 1,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-slack-request-timestamp") || "";
    const signature = req.headers.get("x-slack-signature") || "";

    // Verify signature (skip only if no secret configured for initial setup)
    if (SIGNING_SECRET) {
      const valid = await verifySlackSignature(rawBody, timestamp, signature);
      if (!valid) {
        return new Response("invalid signature", { status: 401, headers: corsHeaders });
      }
    }

    const payload = JSON.parse(rawBody);

    // URL verification handshake
    if (payload.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.type !== "event_callback" || !payload.event) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const event = payload.event;
    if (event.type !== "message" || event.subtype === "message_deleted" || event.subtype === "message_changed") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const eventId = payload.event_id;
    const channelId = event.channel;
    let text: string = event.text || "";

    // Many bot/app messages put content in attachments or blocks
    if ((!text || text.length < 50) && Array.isArray(event.attachments)) {
      for (const a of event.attachments) {
        if (a.text) text += "\n" + a.text;
        if (a.fallback) text += "\n" + a.fallback;
      }
    }
    if ((!text || text.length < 50) && Array.isArray(event.blocks)) {
      for (const b of event.blocks) {
        if (b.text?.text) text += "\n" + b.text.text;
        if (Array.isArray(b.elements)) {
          for (const el of b.elements) {
            if (el.text) text += "\n" + el.text;
            if (Array.isArray(el.elements)) {
              for (const sub of el.elements) {
                if (sub.text) text += "\n" + sub.text;
              }
            }
          }
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Dedup
    const { data: dup } = await supabase.from("slack_event_log").select("id").eq("event_id", eventId).limit(1);
    if (dup && dup.length > 0) {
      return new Response("ok (dup)", { status: 200, headers: corsHeaders });
    }

    const classified = classify(channelId, text);
    if (!classified) {
      await supabase.from("slack_event_log").insert({ event_id: eventId, channel_id: channelId, event_type: "unmatched" });
      return new Response("ok (no match)", { status: 200, headers: corsHeaders });
    }

    const clientId = await findClient(supabase, classified.realtor);
    if (!clientId) {
      console.log(`No client match for realtor: "${classified.realtor}"`);
      await supabase.from("slack_event_log").insert({ event_id: eventId, channel_id: channelId, event_type: `no_client:${classified.type}` });
      return new Response("ok (no client)", { status: 200, headers: corsHeaders });
    }

    await incrementMetric(supabase, clientId, classified.type);
    await supabase.from("slack_event_log").insert({
      event_id: eventId,
      channel_id: channelId,
      client_id: clientId,
      event_type: classified.type,
    });

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("slack-event-handler error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 200, // return 200 so Slack doesn't retry storms
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
