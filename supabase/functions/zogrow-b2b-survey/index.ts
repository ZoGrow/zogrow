import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    console.log("B2B Survey webhook received:", JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const contactId =
      body.contact_id || body.contactId || body.id || body.email || null;
    const email = body.email || body.contact?.email || null;
    const fullName =
      body.full_name ||
      body.name ||
      [body.first_name, body.last_name].filter(Boolean).join(" ") ||
      null;
    const phone = body.phone || body.contact?.phone || null;
    const source = body.source || body.form_name || body.survey_name || null;

    // Dedupe: one fill-out per contact
    if (contactId) {
      const { data: existing } = await supabase
        .from("b2b_survey_submissions")
        .select("id")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (existing) {
        console.log(`Survey already recorded for contact ${contactId}, skipping`);
        return new Response(
          JSON.stringify({ success: true, action: "duplicate", contact_id: contactId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { error: insertError } = await supabase
      .from("b2b_survey_submissions")
      .insert({
        contact_id: contactId,
        email,
        full_name: fullName,
        phone,
        source,
        payload: body,
      });
    if (insertError) throw insertError;

    // Increment today's survey_fillouts on the B2B daily metrics row
    const today = new Date().toISOString().split("T")[0];

    const { data: metricRow } = await supabase
      .from("b2b_ads_metrics")
      .select("id, survey_fillouts")
      .eq("date", today)
      .limit(1)
      .maybeSingle();

    let result;
    if (metricRow) {
      const { data, error } = await supabase
        .from("b2b_ads_metrics")
        .update({ survey_fillouts: (metricRow.survey_fillouts || 0) + 1 })
        .eq("id", metricRow.id)
        .select();
      if (error) throw error;
      result = { action: "updated", data };
    } else {
      const { data, error } = await supabase
        .from("b2b_ads_metrics")
        .upsert({ date: today, survey_fillouts: 1 }, { onConflict: "date" })
        .select();
      if (error) throw error;
      result = { action: "created", data };
    }

    console.log(`B2B Survey webhook: recorded fill-out for ${contactId ?? "unknown contact"}`);
    return new Response(
      JSON.stringify({ success: true, metric: "survey_fillouts", contact_id: contactId, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Survey webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
