import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONDAY_BOARD_ID = 6272250437;

// Column ID -> SMS Outreach field mapping (discovered from Monday API)
const COL_DATE = "date";
const COL_SDR = "label"; // "Your Name" status column
const COL_INTROS_SCHEDULED = "numbers";
const COL_CALLS_CONNECTED = "numbers1";
const COL_DEMOS_BOOKED = "numbers7";
const COL_INTROS_RESCHEDULED = "numbers14";
const COL_INTRO_ATTEMPTS = "number4";
const COL_POWER_DIALS = "number1";

interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text: string | null;
    value: string | null;
  }>;
}

const num = (v: string | null) => {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const parseStatusLabel = (rawValue: string | null, text: string | null): string | null => {
  // Status columns: text already contains the label, fallback to JSON value
  if (text && text.trim()) return text.trim();
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    return parsed.label || null;
  } catch {
    return null;
  }
};

const parseDateValue = (rawValue: string | null, text: string | null): string | null => {
  // Monday date column value: {"date":"2026-04-06"}
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed?.date) return parsed.date;
    } catch {
      // fall through
    }
  }
  return text || null;
};

async function fetchAllMondayItems(token: string): Promise<MondayItem[]> {
  const items: MondayItem[] = [];
  let cursor: string | null = null;

  do {
    const query = cursor
      ? `query { next_items_page(limit: 100, cursor: "${cursor}") { cursor items { id name column_values { id text value } } } }`
      : `query { boards(ids: ${MONDAY_BOARD_ID}) { items_page(limit: 100) { cursor items { id name column_values { id text value } } } } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Monday API error [${res.status}]: ${body}`);
    }

    const data = await res.json();
    if (data.errors) {
      throw new Error(`Monday GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const page = cursor
      ? data.data.next_items_page
      : data.data.boards?.[0]?.items_page;

    if (!page) break;
    items.push(...(page.items || []));
    cursor = page.cursor;
  } while (cursor);

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONDAY_TOKEN = Deno.env.get("MONDAY_API_TOKEN");
    if (!MONDAY_TOKEN) throw new Error("MONDAY_API_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Optional: limit how many days back to consider (default = all)
    let sinceDate: string | null = null;
    try {
      const body = await req.json();
      if (body?.since) sinceDate = body.since;
    } catch {
      // no body, sync everything
    }

    const items = await fetchAllMondayItems(MONDAY_TOKEN);
    console.log(`Fetched ${items.length} items from Monday board`);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      const cols = Object.fromEntries(
        item.column_values.map((c) => [c.id, c]),
      );

      const dateCol = cols[COL_DATE];
      const dateStr = parseDateValue(dateCol?.value ?? null, dateCol?.text ?? null);

      if (!dateStr) {
        skipped++;
        continue;
      }

      if (sinceDate && dateStr < sinceDate) {
        skipped++;
        continue;
      }

      const sdrCol = cols[COL_SDR];
      const sdrName = parseStatusLabel(sdrCol?.value ?? null, sdrCol?.text ?? null);

      const payload = {
        date: dateStr,
        sdr_name: sdrName,
        sdr_calls_booked: num(cols[COL_INTROS_SCHEDULED]?.text ?? null),
        sdr_calls_showed: num(cols[COL_CALLS_CONNECTED]?.text ?? null),
        demos_booked: num(cols[COL_DEMOS_BOOKED]?.text ?? null),
        intros_rescheduled: num(cols[COL_INTROS_RESCHEDULED]?.text ?? null),
        intro_attempts: num(cols[COL_INTRO_ATTEMPTS]?.text ?? null),
        power_dials: num(cols[COL_POWER_DIALS]?.text ?? null),
        monday_item_id: item.id,
        source: "monday",
      };

      const { error } = await supabase
        .from("sms_outreach_metrics")
        .upsert(payload, { onConflict: "monday_item_id" });

      if (error) {
        errors.push(`item ${item.id}: ${error.message}`);
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_items: items.length,
        synced,
        skipped,
        errors: errors.slice(0, 10),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-monday-eod error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
