import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

interface GhlOpportunity {
  id: string;
  name?: string;
  pipelineId: string;
  pipelineStageId: string;
  status?: string;
  monetaryValue?: number;
  createdAt?: string;
  lastStageChangeAt?: string;
  updatedAt?: string;
}

interface StageInfo {
  id: string;
  name: string;
}

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function ghlFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: { ...ghlHeaders(token), ...(init?.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL ${path} failed [${res.status}]: ${text}`);
  }
  return JSON.parse(text);
}

// Classify a stage name into a B2B metric bucket.
// Confirmed mapping for the "1. META ADS" pipeline:
//   BOOKED CALL   -> appointment_booked (Appointments Booked)
//   CONTRACT SENT -> demo_showed
//   SOLD          -> closed_won (Deals Closed + revenue)
function classifyStage(stageName: string):
  | "appointment_booked"
  | "demo_booked"
  | "demo_showed"
  | "closed_won"
  | null {
  const s = stageName.toLowerCase();
  if (/lost|disqualified|no.?show|cancel/.test(s)) return null;
  if (/(sold|won|closed|signed)/.test(s)) return "closed_won";
  if (/contract sent/.test(s)) return "demo_showed";
  if (/demo/.test(s) && /(show|held|done|complete|taken)/.test(s)) return "demo_showed";
  if (/demo/.test(s) && /book/.test(s)) return "demo_booked";
  if (/booked call|book|appointment|appt/.test(s)) return "appointment_booked";
  return null;
}

async function fetchAllOpportunities(
  token: string,
  locationId: string,
  pipelineId: string,
  startDate?: string,
  endDate?: string
): Promise<GhlOpportunity[]> {
  const all: GhlOpportunity[] = [];
  let startAfterId: string | undefined;
  let startAfter: number | undefined;
  const limit = 100;
  for (;;) {
    const params = new URLSearchParams({
      location_id: locationId,
      pipeline_id: pipelineId,
      limit: String(limit),
    });
    if (startAfterId && startAfter !== undefined) {
      params.set("startAfterId", startAfterId);
      params.set("startAfter", String(startAfter));
    }
    const json = await ghlFetch(`/opportunities/search?${params.toString()}`, token);
    const opps: GhlOpportunity[] = json.opportunities || [];
    all.push(...opps);
    const meta = json.meta || {};
    if (opps.length < limit || !meta.startAfterId) break;
    startAfterId = meta.startAfterId;
    startAfter = meta.startAfter;
    if (all.length > 5000) break; // safety
  }
  // Filter by last stage change date if range provided
  if (startDate || endDate) {
    return all.filter((o) => {
      const d = (o.lastStageChangeAt || o.updatedAt || o.createdAt || "").slice(0, 10);
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("GHL_LOCATION_API_KEY");
    const locationId = Deno.env.get("GHL_LOCATION_ID");
    if (!token || !locationId) {
      return new Response(
        JSON.stringify({ error: "Missing GHL_LOCATION_API_KEY or GHL_LOCATION_ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    // Fetch pipelines for this location
    const pipelinesJson = await ghlFetch(`/opportunities/pipelines?locationId=${locationId}`, token);
    const pipelines = (pipelinesJson.pipelines || []) as Array<{
      id: string;
      name: string;
      stages?: StageInfo[];
    }>;

    if (action === "list") {
      return new Response(
        JSON.stringify({
          pipelines: pipelines.map((p) => ({
            id: p.id,
            name: p.name,
            stages: (p.stages || []).map((s) => ({ id: s.id, name: s.name })),
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "sync") {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the "Meta Ads" pipeline (or a pipelineId passed explicitly)
    let pipeline = body.pipelineId
      ? pipelines.find((p) => p.id === body.pipelineId)
      : pipelines.find((p) => p.name.toLowerCase().includes("meta ads"));
    if (!pipeline) {
      return new Response(
        JSON.stringify({
          error: "Meta Ads pipeline not found",
          available: pipelines.map((p) => p.name),
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stageMap = new Map<string, string>();
    for (const s of pipeline.stages || []) stageMap.set(s.id, s.name);

    const opps = await fetchAllOpportunities(
      token,
      locationId,
      pipeline.id,
      body.startDate,
      body.endDate
    );

    // Aggregate per date (by last stage change date)
    const byDate = new Map<
      string,
      { appointments: number; demos_booked: number; demos_showed: number; deals: number; revenue: number }
    >();
    let skipped = 0;
    for (const o of opps) {
      const stageName = stageMap.get(o.pipelineStageId) || "";
      const bucket = classifyStage(stageName);
      if (!bucket) {
        skipped++;
        continue;
      }
      const date = (o.lastStageChangeAt || o.updatedAt || o.createdAt || "").slice(0, 10);
      if (!date) {
        skipped++;
        continue;
      }
      const agg =
        byDate.get(date) || { appointments: 0, demos_booked: 0, demos_showed: 0, deals: 0, revenue: 0 };
      if (bucket === "appointment_booked") agg.appointments++;
      else if (bucket === "demo_booked") agg.demos_booked++;
      else if (bucket === "demo_showed") agg.demos_showed++;
      else if (bucket === "closed_won") {
        agg.deals++;
        agg.revenue += Number(o.monetaryValue || 0);
      }
      byDate.set(date, agg);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Array<{ date: string; status: string }> = [];
    for (const [date, agg] of byDate) {
      // Fetch existing row to preserve manual/ad-sync fields
      const { data: existing } = await supabase
        .from("b2b_ads_metrics")
        .select("id, notes")
        .eq("date", date)
        .maybeSingle();

      const pipelineNote = "GHL pipeline sync";
      const payload = {
        date,
        leads: agg.appointments, // Appointments Booked
        demo_booked: agg.demos_booked,
        demo_showed: agg.demos_showed,
        deals_closed: agg.deals,
        revenue: agg.revenue,
        notes: existing?.notes
          ? existing.notes.includes(pipelineNote)
            ? existing.notes
            : `${existing.notes} | ${pipelineNote}`
          : pipelineNote,
      };

      const { error } = await supabase.from("b2b_ads_metrics").upsert(payload, {
        onConflict: "date",
      });
      results.push({ date, status: error ? `error: ${error.message}` : "ok" });
    }

    return new Response(
      JSON.stringify({
        pipeline: { id: pipeline.id, name: pipeline.name },
        opportunities: opps.length,
        skipped,
        dates_updated: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-ghl-b2b-pipeline error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
