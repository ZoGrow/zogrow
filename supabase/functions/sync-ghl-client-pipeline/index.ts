import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const SYNC_NOTE = "GHL pipeline sync";
const SYNC_CAMPAIGN_NAME = "GHL Pipeline";

interface GhlOpportunity {
  id: string;
  name?: string;
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue?: number;
  createdAt?: string;
  lastStageChangeAt?: string;
  updatedAt?: string;
}

interface StageInfo {
  id: string;
  name: string;
}

// Stage semantics cover both the B2B naming and the B2C
// "Lead > Appointment" pipeline naming (Live Transfers, Booked Appointments, ...)
const LIVE_TRANSFER_STAGES = ["live transfers", "live transfer"];

const CLOSED_STAGES = ["sold", "deal won", "deal won 🎊", "won", "closed won"];

// Anything at/after a booked appointment
const BOOKED_OR_BEYOND = [
  ...LIVE_TRANSFER_STAGES,
  ...CLOSED_STAGES,
  "booked appointments",
  "booked appointment",
  "booked call",
  "new leads",
  "responded",
  "canceled",
  "cancelled",
  "reschedule intent",
  "no show",
  "follow up",
  "follow-up",
  "short-term follow up",
  "short term follow up",
  "long-term follow up",
  "long term follow up",
  "dormant",
  "contract sent",
  "deal lost",
  "lost",
];

// Stages that mean the appointment actually happened
const SHOWED_STAGES = [
  ...CLOSED_STAGES,
  "follow up",
  "follow-up",
  "short-term follow up",
  "short term follow up",
  "long-term follow up",
  "long term follow up",
  "dormant",
  "contract sent",
  "deal lost",
  "lost",
];


function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function ghlFetch(path: string, token: string) {
  const res = await fetch(`${GHL_BASE}${path}`, { headers: ghlHeaders(token) });
  const text = await res.text();
  if (!res.ok) throw new Error(`GHL ${path} failed [${res.status}]: ${text}`);
  return JSON.parse(text);
}

async function fetchAllOpportunities(token: string, locationId: string, pipelineId: string) {
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
    if (all.length > 5000) break;
  }
  return all;
}

async function syncClient(
  supabase: ReturnType<typeof createClient>,
  integration: {
    client_id: string;
    ghl_api_key: string | null;
    ghl_location_id: string | null;
    ghl_pipeline_name: string | null;
    ghl_pipeline_id: string | null;
  },
  startDate?: string,
  endDate?: string
) {
  const token = integration.ghl_api_key?.trim();
  const locationId = integration.ghl_location_id?.trim();
  if (!token || !locationId) {
    return { client_id: integration.client_id, status: "skipped: missing credentials" };
  }

  const pipelinesJson = await ghlFetch(`/opportunities/pipelines?locationId=${locationId}`, token);
  const pipelines = (pipelinesJson.pipelines || []) as Array<{
    id: string;
    name: string;
    stages?: StageInfo[];
  }>;

  const wanted = integration.ghl_pipeline_name?.toLowerCase().trim();
  const pipeline =
    (integration.ghl_pipeline_id && pipelines.find((p) => p.id === integration.ghl_pipeline_id)) ||
    (wanted && pipelines.find((p) => p.name.toLowerCase().includes(wanted))) ||
    pipelines[0];

  if (!pipeline) {
    return {
      client_id: integration.client_id,
      status: "error: no pipeline found",
      available: pipelines.map((p) => p.name),
    };
  }

  const stageMap = new Map<string, string>();
  for (const s of pipeline.stages || []) stageMap.set(s.id, s.name);

  const opps = await fetchAllOpportunities(token, locationId, pipeline.id);

  const byDate = new Map<
    string,
    {
      leads: number;
      booked: number;
      transfers: number;
      showed: number;
      deals: number;
      revenue: number;
    }
  >();
  const get = (date: string) => {
    let a = byDate.get(date);
    if (!a) {
      a = { leads: 0, booked: 0, transfers: 0, showed: 0, deals: 0, revenue: 0 };
      byDate.set(date, a);
    }
    return a;
  };

  let skipped = 0;
  for (const o of opps) {
    const stage = (stageMap.get(o.pipelineStageId) || "").toLowerCase().trim();
    const createdDate = (o.createdAt || o.updatedAt || "").slice(0, 10);
    const changedDate = (o.lastStageChangeAt || o.updatedAt || o.createdAt || "").slice(0, 10);
    if (!createdDate && !changedDate) {
      skipped++;
      continue;
    }
    if (stage === "disqualified") {
      skipped++;
      continue;
    }

    get(createdDate || changedDate).leads++;
    if (LIVE_TRANSFER_STAGES.includes(stage)) {
      get(createdDate || changedDate).transfers++;
    } else if (BOOKED_OR_BEYOND.includes(stage)) {
      get(createdDate || changedDate).booked++;
    }
    if (SHOWED_STAGES.includes(stage)) get(changedDate).showed++;
    if (CLOSED_STAGES.includes(stage)) {
      const agg = get(changedDate);
      agg.deals++;
      agg.revenue += Number(o.monetaryValue || 0);
    }
  }


  // Pipeline data lives on its own campaign row so manual entries (campaign_id NULL)
  // and Meta ad rows are never overwritten.
  let campaignId: string | null = null;
  const { data: existingCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("client_id", integration.client_id)
    .eq("campaign_name", SYNC_CAMPAIGN_NAME)
    .maybeSingle();

  if (existingCampaign?.id) {
    campaignId = existingCampaign.id as string;
  } else {
    const { data: created, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        client_id: integration.client_id,
        campaign_name: SYNC_CAMPAIGN_NAME,
        platform: "ghl",
        status: "active",
      })
      .select("id")
      .single();
    if (campErr) return { client_id: integration.client_id, status: `error: ${campErr.message}` };
    campaignId = created.id as string;
  }

  const dates = [...byDate.keys()].filter(Boolean).sort();
  const rangeStart = startDate || dates[0];
  const rangeEnd = endDate || dates[dates.length - 1];

  if (rangeStart && rangeEnd) {
    await supabase
      .from("metrics")
      .update({
        leads: 0,
        self_booked: 0,
        live_transfers: 0,
        appointments_showed: 0,
        deals_closed: 0,
        revenue: 0,
      })
      .eq("client_id", integration.client_id)
      .eq("campaign_id", campaignId)
      .gte("date", rangeStart)
      .lte("date", rangeEnd);
  }

  let written = 0;
  for (const [date, agg] of byDate) {
    if (!date) continue;
    if (rangeStart && date < rangeStart) continue;
    if (rangeEnd && date > rangeEnd) continue;

    const { error } = await supabase.from("metrics").upsert(
      {
        client_id: integration.client_id,
        campaign_id: campaignId,
        date,
        leads: agg.leads,
        self_booked: agg.booked,
        live_transfers: agg.transfers,
        appointments_showed: agg.showed,
        deals_closed: agg.deals,
        revenue: agg.revenue,
        notes: SYNC_NOTE,
      },
      { onConflict: "client_id,campaign_id,date" }
    );
    if (!error) written++;
  }


  await supabase
    .from("client_integrations")
    .update({ last_synced_at: new Date().toISOString(), ghl_pipeline_id: pipeline.id })
    .eq("client_id", integration.client_id);

  return {
    client_id: integration.client_id,
    status: "ok",
    pipeline: pipeline.name,
    opportunities: opps.length,
    skipped,
    dates_written: written,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";
    const clientId: string | undefined = body.clientId;

    let query = supabase
      .from("client_integrations")
      .select("client_id, ghl_api_key, ghl_location_id, ghl_pipeline_name, ghl_pipeline_id")
      .not("ghl_api_key", "is", null)
      .not("ghl_location_id", "is", null);
    if (clientId) query = query.eq("client_id", clientId);

    const { data: integrations, error } = await query;
    if (error) throw error;

    if (action === "list") {
      const results = [];
      for (const i of integrations || []) {
        const token = (i.ghl_api_key as string | null)?.trim();
        const loc = (i.ghl_location_id as string | null)?.trim();
        if (!token || !loc) continue;
        try {
          const json = await ghlFetch(`/opportunities/pipelines?locationId=${loc}`, token);
          results.push({
            client_id: i.client_id,
            pipelines: (json.pipelines || []).map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            })),
          });
        } catch (e) {
          results.push({ client_id: i.client_id, error: String(e) });
        }
      }
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "debug") {
      const month: string | undefined = body.month; // "YYYY-MM"
      const results = [];
      for (const i of integrations || []) {
        const token = (i.ghl_api_key as string | null)?.trim();
        const loc = (i.ghl_location_id as string | null)?.trim();
        if (!token || !loc) continue;
        const pj = await ghlFetch(`/opportunities/pipelines?locationId=${loc}`, token);
        const pipelines = (pj.pipelines || []) as Array<{ id: string; name: string; stages?: StageInfo[] }>;
        const wanted = (i.ghl_pipeline_name as string | null)?.toLowerCase().trim();
        const pipeline =
          (i.ghl_pipeline_id && pipelines.find((p) => p.id === i.ghl_pipeline_id)) ||
          (wanted && pipelines.find((p) => p.name.toLowerCase().includes(wanted))) ||
          pipelines[0];
        if (!pipeline) {
          results.push({ client_id: i.client_id, error: "no pipeline" });
          continue;
        }
        const stageMap = new Map<string, string>();
        for (const s of pipeline.stages || []) stageMap.set(s.id, s.name);
        const opps = await fetchAllOpportunities(token, loc, pipeline.id);
        const counts: Record<string, number> = {};
        let total = 0;
        for (const o of opps) {
          const created = (o.createdAt || o.updatedAt || "").slice(0, 7);
          if (month && created !== month) continue;
          const name = stageMap.get(o.pipelineStageId) || "unknown";
          counts[name] = (counts[name] || 0) + 1;
          total++;
        }
        results.push({
          client_id: i.client_id,
          pipeline: pipeline.name,
          all_pipelines: pipelines.map((p) => p.name),
          stages: (pipeline.stages || []).map((s) => s.name),
          month: month || "all",
          total,
          counts,
        });
      }
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    const results = [];
    for (const i of integrations || []) {
      try {
        results.push(
          await syncClient(
            supabase,
            i as never,
            body.startDate as string | undefined,
            body.endDate as string | undefined
          )
        );
      } catch (e) {
        results.push({ client_id: i.client_id, status: `error: ${String(e)}` });
      }
    }

    return new Response(JSON.stringify({ clients: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-ghl-client-pipeline error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
