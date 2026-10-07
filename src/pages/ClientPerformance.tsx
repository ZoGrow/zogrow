import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { cn } from "@/lib/utils";

const money = (v: number) =>
  v > 0 ? `$${v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : 2 })}` : "—";
const num = (v: number) => (v || 0).toLocaleString();
const pct = (v: number) => `${(isFinite(v) ? v : 0).toFixed(1)}%`;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

type Row = Record<string, number | string> & { id: string; client_name: string; market: string; state: string; ad_account_status?: string | null };

const adsStatusMeta: Record<string, { label: string; className: string }> = {
  active: { label: "Ads Active", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  not_running: { label: "Not Running", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  payment_error: { label: "Payment Error", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const columns: { key: string; label: string; group: "ads" | "isa" | "results"; fmt: (v: number) => string }[] = [
  { key: "ad_spend", label: "Spend", group: "ads", fmt: money },
  { key: "impressions", label: "Impr.", group: "ads", fmt: num },
  { key: "clicks", label: "Clicks", group: "ads", fmt: num },
  { key: "ctr", label: "CTR", group: "ads", fmt: pct },
  { key: "cpc", label: "CPC", group: "ads", fmt: money },
  { key: "leads", label: "Leads", group: "ads", fmt: num },
  { key: "cpl", label: "CPL", group: "ads", fmt: money },
  { key: "dials_made", label: "Dials", group: "isa", fmt: num },
  { key: "pickups", label: "Pickups", group: "isa", fmt: num },
  { key: "pickup_rate", label: "Pickup / Lead", group: "isa", fmt: pct },
  { key: "live_transfers", label: "Live Transfers", group: "isa", fmt: num },
  { key: "sales_team_booked", label: "Appts Booked", group: "isa", fmt: num },
  { key: "total_lt_appt", label: "Total LT/APPT", group: "isa", fmt: num },
  { key: "lead_to_booked", label: "Lead → LT/APPT", group: "isa", fmt: pct },
  { key: "cost_per_appointment_booked", label: "Cost / LT/APPT", group: "isa", fmt: money },
  { key: "appointments_showed", label: "Showed", group: "results", fmt: num },
  { key: "show_up_rate", label: "Show %", group: "results", fmt: pct },
  { key: "deals_closed", label: "Deals", group: "results", fmt: num },
  { key: "cac", label: "Cost / Deal", group: "results", fmt: money },
  { key: "revenue", label: "Revenue", group: "results", fmt: money },
  { key: "roas", label: "ROAS", group: "results", fmt: (v) => `${(v || 0).toFixed(2)}x` },
];

const groupLabel = { ads: "Campaign (Ads)", isa: "ISA Conversions", results: "Results" };

export default function ClientPerformance() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "ad_spend", desc: true });
  const { loading, clientPerformance } = useRealMetrics({ from: dateRange?.from, to: dateRange?.to });

  const rows: Row[] = useMemo(() => {
    return clientPerformance
      .filter((c) => c.status === "active")
      .filter((c) => c.client_name.toLowerCase().includes(search.toLowerCase()))
      .map((c) => {
        const total = (c.live_transfers || 0) + (c.self_booked || 0) + (c.sales_team_booked || 0);
        return {
          ...c,
          pickup_rate: div(c.pickups, c.leads) * 100,
          total_lt_appt: total,
          lead_to_booked: div(total, c.leads) * 100,
        } as unknown as Row;
      })
      .sort((a, b) => {
        const d = (Number(a[sort.key]) || 0) - (Number(b[sort.key]) || 0);
        return sort.desc ? -d : d;
      });
  }, [clientPerformance, search, sort]);

  const totals = useMemo(() => {
    const s = (k: string) => rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    const t: Record<string, number> = {};
    ["ad_spend", "impressions", "clicks", "leads", "dials_made", "pickups", "live_transfers", "sales_team_booked", "total_lt_appt", "appointments_showed", "deals_closed", "revenue"].forEach((k) => (t[k] = s(k)));
    // Weighted ratios from aggregated totals
    t.ctr = div(t.clicks, t.impressions) * 100;
    t.cpc = div(t.ad_spend, t.clicks);
    t.cpl = div(t.ad_spend, t.leads);
    t.pickup_rate = div(t.pickups, t.leads) * 100;
    t.lead_to_booked = div(t.total_lt_appt, t.leads) * 100;
    t.cost_per_appointment_booked = div(t.ad_spend, t.total_lt_appt);
    t.show_up_rate = div(t.appointments_showed, t.total_lt_appt) * 100;
    t.cac = div(t.ad_spend, t.deals_closed);
    t.roas = div(t.revenue, t.ad_spend);
    return t;
  }, [rows]);

  const groups = (["ads", "isa", "results"] as const).map((g) => ({ g, span: columns.filter((c) => c.group === g).length }));
  const totalCols = columns.length + 2; // client name + ads status

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Client Performance</h1>
          <p className="text-muted-foreground">All active clients — ad campaign analytics and ISA conversions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
          </div>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading client performance...</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 bg-card z-10" />
                <TableHead className="text-center text-xs uppercase tracking-wide text-muted-foreground border-l border-border">Ads Status</TableHead>
                {groups.map(({ g, span }) => (
                  <TableHead key={g} colSpan={span} className="text-center text-xs uppercase tracking-wide text-primary border-l border-border">
                    {groupLabel[g]}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Client</TableHead>
                {columns.map((c, i) => (
                  <TableHead
                    key={c.key}
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : true }))}
                    className={cn(
                      "text-right whitespace-nowrap cursor-pointer select-none hover:text-foreground",
                      sort.key === c.key && "text-foreground",
                      i > 0 && columns[i - 1].group !== c.group && "border-l border-border",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalCols} className="text-center py-8 text-muted-foreground">
                    No active clients found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${r.id}`)}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="font-medium">{r.client_name}</div>
                      <div className="text-xs text-muted-foreground">{[r.market, r.state].filter(Boolean).join(", ")}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const meta = r.ad_account_status ? adsStatusMeta[r.ad_account_status] : undefined;
                        if (!meta) return <span className="text-xs text-muted-foreground">—</span>;
                        return (
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", meta.className)}>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </TableCell>
                    {columns.map((c, i) => (
                      <TableCell
                        key={c.key}
                        className={cn("text-right whitespace-nowrap tabular-nums", i > 0 && columns[i - 1].group !== c.group && "border-l border-border")}
                      >
                        {c.fmt(Number(r[c.key]) || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
              {rows.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                  <TableCell className="sticky left-0 bg-muted z-10">Total ({rows.length})</TableCell>
                  <TableCell />
                  {columns.map((c, i) => (
                    <TableCell key={c.key} className={cn("text-right whitespace-nowrap tabular-nums", i > 0 && columns[i - 1].group !== c.group && "border-l border-border")}>
                      {c.fmt(totals[c.key] || 0)}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
