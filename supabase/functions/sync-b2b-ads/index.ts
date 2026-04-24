import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_B2B_AD_ACCOUNT_ID = "act_1066517286536273";

interface MetaInsight {
  date_start: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

function parseInsight(insight: MetaInsight) {
  const impressions = parseInt(insight.impressions || "0", 10);
  const clicks = parseInt(insight.clicks || "0", 10);
  const spend = parseFloat(insight.spend || "0");
  let leads = 0;
  if (insight.actions) {
    for (const action of insight.actions) {
      if (action.action_type === "lead" || action.action_type === "offsite_conversion.fb_pixel_lead") {
        leads += parseInt(action.value || "0", 10);
      }
    }
  }
  return { impressions, clicks, spend, leads };
}

async function fetchAllInsights(url: string): Promise<MetaInsight[]> {
  let all: MetaInsight[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    if (json.data) all = all.concat(json.data);
    nextUrl = json.paging?.next || null;
  }
  return all;
}

async function upsertB2BMetric(
  supabase: any,
  date: string,
  data: { impressions: number; clicks: number; spend: number; leads: number }
) {
  // Use upsert with unique date constraint — only update ad metrics, preserve manual fields
  const { error } = await supabase
    .from("b2b_ads_metrics")
    .upsert(
      {
        date,
        impressions: data.impressions,
        clicks: data.clicks,
        ad_spend: data.spend,
        leads: data.leads,
      },
      { onConflict: "date", ignoreDuplicates: false }
    );
  if (error) {
    // Fallback: if row exists, just update ad metrics
    await supabase
      .from("b2b_ads_metrics")
      .update({
        impressions: data.impressions,
        clicks: data.clicks,
        ad_spend: data.spend,
        leads: data.leads,
      })
      .eq("date", date);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_ACCESS_TOKEN) throw new Error("META_ACCESS_TOKEN is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const backfillDays = body.backfill_days || body.days || 0;

    // Load ad account ID from app_settings (fallback to default)
    let B2B_AD_ACCOUNT_ID = DEFAULT_B2B_AD_ACCOUNT_ID;
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "b2b_meta_ad_account_id")
      .maybeSingle();
    if (setting?.value && typeof setting.value === "string" && setting.value.trim()) {
      B2B_AD_ACCOUNT_ID = setting.value.trim();
    }

    let daysSynced = 0;

    if (backfillDays > 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - backfillDays);
      const since = startDate.toISOString().split("T")[0];
      const until = endDate.toISOString().split("T")[0];

      const metaUrl = `https://graph.facebook.com/v21.0/${B2B_AD_ACCOUNT_ID}/insights?fields=impressions,clicks,spend,actions&time_range={"since":"${since}","until":"${until}"}&time_increment=1&limit=500&access_token=${META_ACCESS_TOKEN}`;
      const allInsights = await fetchAllInsights(metaUrl);

      for (const insight of allInsights) {
        const parsed = parseInsight(insight);
        await upsertB2BMetric(supabase, insight.date_start, parsed);
        daysSynced++;
      }
    } else {
      // Today only
      const metaUrl = `https://graph.facebook.com/v21.0/${B2B_AD_ACCOUNT_ID}/insights?fields=impressions,clicks,spend,actions&date_preset=today&limit=500&access_token=${META_ACCESS_TOKEN}`;
      const allInsights = await fetchAllInsights(metaUrl);
      const today = new Date().toISOString().split("T")[0];

      if (allInsights.length > 0) {
        // Aggregate all campaigns for the day
        const totals = allInsights.reduce(
          (acc, insight) => {
            const p = parseInsight(insight);
            return {
              impressions: acc.impressions + p.impressions,
              clicks: acc.clicks + p.clicks,
              spend: acc.spend + p.spend,
              leads: acc.leads + p.leads,
            };
          },
          { impressions: 0, clicks: 0, spend: 0, leads: 0 }
        );
        await upsertB2BMetric(supabase, today, totals);
        daysSynced = 1;
      }
    }

    return new Response(
      JSON.stringify({ success: true, days_synced: daysSynced }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("B2B sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
