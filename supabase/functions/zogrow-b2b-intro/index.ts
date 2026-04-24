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
    const body = await req.json();
    console.log("B2B Intro webhook received:", JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const contactId = body.contact_id || body.contactId || body.id;
    if (!contactId) {
      return new Response(
        JSON.stringify({ error: "Missing contact_id in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this lead already booked an intro before
    const { data: existing } = await supabase
      .from("b2b_lead_bookings")
      .select("id, booking_count")
      .eq("contact_id", contactId)
      .eq("booking_type", "intro")
      .maybeSingle();

    if (existing) {
      // Reschedule - update the tracking but DON'T increment the metric
      await supabase
        .from("b2b_lead_bookings")
        .update({ latest_booked_at: new Date().toISOString(), booking_count: (existing.booking_count || 1) + 1 })
        .eq("id", existing.id);

      console.log(`B2B Intro webhook: contact ${contactId} already booked before (reschedule #${existing.booking_count + 1}), skipping metric increment`);
      return new Response(
        JSON.stringify({ success: true, action: "reschedule", contact_id: contactId, booking_count: (existing.booking_count || 1) + 1 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New booking - track the lead
    await supabase
      .from("b2b_lead_bookings")
      .insert({ contact_id: contactId, booking_type: "intro" });

    // Increment the metric
    const today = new Date().toISOString().split("T")[0];
    const increment = 1;

    const { data: metricRow } = await supabase
      .from("b2b_ads_metrics")
      .select("id, intro_call_booked")
      .eq("date", today)
      .limit(1)
      .single();

    let result;
    if (metricRow) {
      const { data, error } = await supabase
        .from("b2b_ads_metrics")
        .update({ intro_call_booked: (metricRow.intro_call_booked || 0) + increment })
        .eq("id", metricRow.id)
        .select();
      if (error) throw error;
      result = { action: "updated", data };
    } else {
      const { data, error } = await supabase
        .from("b2b_ads_metrics")
        .upsert({ date: today, intro_call_booked: increment }, { onConflict: "date" })
        .select();
      if (error) throw error;
      result = { action: "created", data };
    }

    console.log(`B2B Intro webhook: NEW intro_call_booked for contact ${contactId}`);
    return new Response(
      JSON.stringify({ success: true, metric: "intro_call_booked", contact_id: contactId, ...result }),
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
