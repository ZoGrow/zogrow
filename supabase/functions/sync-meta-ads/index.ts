import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

function parseInsight(insight: CampaignInsight) {
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

async function getOrCreateCampaign(
  supabase: any,
  clientId: string,
  metaCampaignId: string,
  campaignName: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("client_id", clientId)
    .eq("meta_campaign_id", metaCampaignId)
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({
      client_id: clientId,
      campaign_name: campaignName,
      platform: "Meta",
      status: "active",
      meta_campaign_id: metaCampaignId,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return created.id;
}

async function upsertMetric(
  supabase: any,
  clientId: string,
  campaignId: string | null,
  date: string,
  data: { impressions: number; clicks: number; spend: number; leads: number }
) {
  let query = supabase
    .from("metrics")
    .select("id")
    .eq("client_id", clientId)
    .eq("date", date);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  } else {
    query = query.is("campaign_id", null);
  }

  const { data: existing } = await query.limit(1);

  if (existing && existing.length > 0) {
    // Only update ad metrics - NEVER overwrite appointment/manual fields
    await supabase
      .from("metrics")
      .update({ impressions: data.impressions, clicks: data.clicks, ad_spend: data.spend, leads: data.leads })
      .eq("id", existing[0].id);
  } else {
    // For new rows, only insert ad metrics. Webhook/manual fields live on their own
    // campaign_id=NULL row — don't copy them here or the dashboard will double-count.
    await supabase
      .from("metrics")
      .insert({
        client_id: clientId,
        campaign_id: campaignId,
        date,
        impressions: data.impressions,
        clicks: data.clicks,
        ad_spend: data.spend,
        leads: data.leads,
      });
  }
}

async function fetchAllInsights(url: string): Promise<any[]> {
  let allInsights: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    if (json.data) allInsights = allInsights.concat(json.data);
    nextUrl = json.paging?.next || null;
  }
  return allInsights;
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
    const clientId = body.client_id || null;
    const datePreset = body.date_preset || "today";
    const backfillDays = body.backfill_days || 0;

    let query = supabase
      .from("clients")
      .select("id, client_name, meta_ad_account_id")
      .not("meta_ad_account_id", "is", null)
      .neq("meta_ad_account_id", "");

    if (clientId) query = query.eq("id", clientId);

    const { data: clients, error: clientsError } = await query;
    if (clientsError) throw clientsError;

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No clients with Meta Ad Account IDs found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ client_id: string; client_name: string; status: string; campaigns_synced?: number; days_synced?: number; error?: string }> = [];

    for (const client of clients) {
      try {
        const adAccountId = client.meta_ad_account_id.trim();
        const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

        if (backfillDays > 0) {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - backfillDays);
          const since = startDate.toISOString().split("T")[0];
          const until = endDate.toISOString().split("T")[0];

          // Fetch campaign-level daily breakdown
          const metaUrl = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,actions&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=campaign&limit=500&access_token=${META_ACCESS_TOKEN}`;

          const allInsights = await fetchAllInsights(metaUrl);

          if (allInsights.length === 0) {
            results.push({ client_id: client.id, client_name: client.client_name, status: "no_data", days_synced: 0, campaigns_synced: 0 });
            continue;
          }

          const campaignIds = new Set<string>();
          let daysSynced = 0;

          for (const insight of allInsights) {
            const date = insight.date_start;
            const parsed = parseInsight(insight);
            const metaCampaignId = insight.campaign_id;
            const campaignName = insight.campaign_name || `Campaign ${metaCampaignId}`;

            const dbCampaignId = await getOrCreateCampaign(supabase, client.id, metaCampaignId, campaignName);
            campaignIds.add(metaCampaignId);

            await upsertMetric(supabase, client.id, dbCampaignId, date, parsed);
            daysSynced++;
          }

          results.push({ client_id: client.id, client_name: client.client_name, status: "synced", days_synced: daysSynced, campaigns_synced: campaignIds.size });
        } else {
          // Single day mode with campaign breakdown
          const metaUrl = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,actions&date_preset=${datePreset}&level=campaign&limit=500&access_token=${META_ACCESS_TOKEN}`;

          const allInsights = await fetchAllInsights(metaUrl);

          if (allInsights.length === 0) {
            results.push({ client_id: client.id, client_name: client.client_name, status: "no_data" });
            continue;
          }

          const today = new Date().toISOString().split("T")[0];
          const campaignIds = new Set<string>();

          for (const insight of allInsights) {
            const parsed = parseInsight(insight);
            const metaCampaignId = insight.campaign_id;
            const campaignName = insight.campaign_name || `Campaign ${metaCampaignId}`;

            const dbCampaignId = await getOrCreateCampaign(supabase, client.id, metaCampaignId, campaignName);
            campaignIds.add(metaCampaignId);

            await upsertMetric(supabase, client.id, dbCampaignId, today, parsed);
          }

          results.push({ client_id: client.id, client_name: client.client_name, status: "synced", campaigns_synced: campaignIds.size });
        }
      } catch (err) {
        results.push({
          client_id: client.id,
          client_name: client.client_name,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: results.filter(r => r.status === "synced").length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
