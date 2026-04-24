import { useState, useEffect, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MonthlyData {
  month: string;
  monthLabel: string;
  new_calls_scheduled: number;
  followup_calls_scheduled: number;
  new_calls_taken: number;
  qualified_calls_taken: number;
  followup_calls_taken: number;
  no_shows: number;
  cancelled: number;
  rescheduled: number;
  new_closes: number;
  new_mrr: number;
  upsell_mrr: number;
  otp: number;
  cash_committed: number;
  total_cash_collected: number;
  base_starting_mrr: number;
  base_clients: number;
  lost_clients: number;
  lost_mrr: number;
  // B2B Ads metrics
  b2b_leads: number;
  b2b_appointments_booked: number;
  b2b_appointments_showed: number;
  b2b_qualified_showed: number;
  b2b_deals_closed: number;
  b2b_ad_spend: number;
  b2b_revenue: number;
  b2b_cash_collected: number;
  // Calculated
  total_calls_scheduled: number;
  total_calls_taken: number;
  show_rate: number;
  qualified_show_rate: number;
  booked_close_rate: number;
  show_close_rate: number;
  churn_rate: number;
  cash_per_call_booked: number;
  avg_close_cash: number;
  b2b_show_rate: number;
  b2b_cpl: number;
}

const metricRows = [
  { key: "new_calls_scheduled", label: "New Calls Scheduled", type: "number" },
  { key: "followup_calls_scheduled", label: "Follow-Up Calls Scheduled", type: "number" },
  { key: "new_calls_taken", label: "New Calls Taken", type: "number" },
  { key: "qualified_calls_taken", label: "Qualified Calls Taken", type: "number" },
  { key: "followup_calls_taken", label: "FU Calls Taken", type: "number" },
  { key: "no_shows", label: "No-Shows", type: "number", negative: true },
  { key: "cancelled", label: "Cancelled", type: "number", negative: true },
  { key: "rescheduled", label: "Rescheduled", type: "number" },
  { key: "divider1", label: "", type: "divider" },
  { key: "show_rate", label: "Show Rate %", type: "percent", target: 50 },
  { key: "qualified_show_rate", label: "Qualified Shown Calls %", type: "percent" },
  { key: "divider2", label: "", type: "divider" },
  { key: "new_closes", label: "New Closes", type: "number" },
  { key: "new_mrr", label: "New MRR $", type: "currency" },
  { key: "upsell_mrr", label: "Upsell MRR $", type: "currency" },
  { key: "otp", label: "OTP $", type: "currency" },
  { key: "cash_committed", label: "Cash Committed $", type: "currency" },
  { key: "total_cash_collected", label: "Total New Cash Collected $", type: "currency" },
  { key: "divider3", label: "", type: "divider" },
  { key: "booked_close_rate", label: "Booked > Close %", type: "percent" },
  { key: "show_close_rate", label: "Show > Close %", type: "percent", target: 20 },
  { key: "cash_per_call_booked", label: "Cash Collected Per Call Booked", type: "currency" },
  { key: "avg_close_cash", label: "Avg Close Cash Collected On Call", type: "currency", target: 2500 },
  { key: "divider4", label: "", type: "divider" },
  { key: "total_calls_scheduled", label: "Total Calls Scheduled", type: "number" },
  { key: "total_calls_taken", label: "Total Calls Taken", type: "number" },
  { key: "divider5", label: "", type: "divider" },
  { key: "base_starting_mrr", label: "Base Starting MRR $", type: "currency" },
  { key: "base_clients", label: "Base Clients", type: "number" },
  { key: "lost_clients", label: "Lost Clients (Churn)", type: "number", negative: true },
  { key: "lost_mrr", label: "Lost MRR $", type: "currency", negative: true },
  { key: "churn_rate", label: "Churn Rate %", type: "percent", negative: true },
  { key: "divider6", label: "", type: "divider" },
  { key: "b2b_header", label: "B2B ADS PIPELINE", type: "header" },
  { key: "b2b_leads", label: "B2B Leads", type: "number" },
  { key: "b2b_appointments_booked", label: "B2B Appts Booked", type: "number" },
  { key: "b2b_appointments_showed", label: "B2B Appts Showed", type: "number" },
  { key: "b2b_qualified_showed", label: "B2B Qualified Showed", type: "number" },
  { key: "b2b_deals_closed", label: "B2B Deals Closed", type: "number" },
  { key: "b2b_show_rate", label: "B2B Show Rate %", type: "percent" },
  { key: "b2b_ad_spend", label: "B2B Ad Spend $", type: "currency", negative: true },
  { key: "b2b_cpl", label: "B2B CPL $", type: "currency", negative: true },
  { key: "b2b_revenue", label: "B2B Revenue $", type: "currency" },
  { key: "b2b_cash_collected", label: "B2B Cash Collected $", type: "currency" },
];

const formatValue = (value: number, type: string): string => {
  if (type === "currency") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  }
  if (type === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
};

const getChangeIndicator = (current: number, previous: number, isNegativeGood: boolean) => {
  if (previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
  
  const isPositive = change > 0;
  const isGood = isNegativeGood ? !isPositive : isPositive;
  
  if (isPositive) {
    return <TrendingUp className={cn("h-3 w-3", isGood ? "text-success" : "text-destructive")} />;
  }
  return <TrendingDown className={cn("h-3 w-3", isGood ? "text-success" : "text-destructive")} />;
};

export default function SalesMonthly() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [startMonth, setStartMonth] = useState(() => subMonths(new Date(), 5));

  const visibleMonths = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfMonth(startMonth),
      end: endOfMonth(subMonths(new Date(), 0)),
    }).slice(0, 6);
  }, [startMonth]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const startDate = format(startOfMonth(visibleMonths[0]), "yyyy-MM-dd");
      const endDate = format(endOfMonth(visibleMonths[visibleMonths.length - 1]), "yyyy-MM-dd");

      // Fetch both sales_metrics and b2b_ads_metrics in parallel
      const [salesResult, b2bResult] = await Promise.all([
        supabase
          .from("sales_metrics")
          .select("*")
          .eq("period_type", "daily")
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("b2b_ads_metrics")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
      ]);

      if (salesResult.error) {
        console.error("Error fetching sales metrics:", salesResult.error);
      }
      if (b2bResult.error) {
        console.error("Error fetching B2B ads metrics:", b2bResult.error);
      }

      // Aggregate by month
      const monthlyAggregates: Record<string, MonthlyData> = {};

      visibleMonths.forEach((month) => {
        const monthKey = format(month, "yyyy-MM");
        monthlyAggregates[monthKey] = {
          month: monthKey,
          monthLabel: format(month, "MMM yy"),
          new_calls_scheduled: 0,
          followup_calls_scheduled: 0,
          new_calls_taken: 0,
          qualified_calls_taken: 0,
          followup_calls_taken: 0,
          no_shows: 0,
          cancelled: 0,
          rescheduled: 0,
          new_closes: 0,
          new_mrr: 0,
          upsell_mrr: 0,
          otp: 0,
          cash_committed: 0,
          total_cash_collected: 0,
          base_starting_mrr: 0,
          base_clients: 0,
          lost_clients: 0,
          lost_mrr: 0,
          // B2B fields
          b2b_leads: 0,
          b2b_appointments_booked: 0,
          b2b_appointments_showed: 0,
          b2b_qualified_showed: 0,
          b2b_deals_closed: 0,
          b2b_ad_spend: 0,
          b2b_revenue: 0,
          b2b_cash_collected: 0,
          // Calculated
          total_calls_scheduled: 0,
          total_calls_taken: 0,
          show_rate: 0,
          qualified_show_rate: 0,
          booked_close_rate: 0,
          show_close_rate: 0,
          churn_rate: 0,
          cash_per_call_booked: 0,
          avg_close_cash: 0,
          b2b_show_rate: 0,
          b2b_cpl: 0,
        };
      });

      // Aggregate sales metrics
      (salesResult.data || []).forEach((row) => {
        const monthKey = format(new Date(row.date + "T00:00:00"), "yyyy-MM");
        if (monthlyAggregates[monthKey]) {
          const agg = monthlyAggregates[monthKey];
          agg.new_calls_scheduled += row.new_calls_scheduled || 0;
          agg.followup_calls_scheduled += row.followup_calls_scheduled || 0;
          agg.new_calls_taken += row.new_calls_taken || 0;
          agg.qualified_calls_taken += row.qualified_calls_taken || 0;
          agg.followup_calls_taken += row.followup_calls_taken || 0;
          agg.no_shows += row.no_shows || 0;
          agg.cancelled += row.cancelled || 0;
          agg.rescheduled += row.rescheduled || 0;
          agg.new_closes += row.new_closes || 0;
          agg.new_mrr += Number(row.new_mrr || 0);
          agg.upsell_mrr += Number(row.upsell_mrr || 0);
          agg.otp += Number(row.otp || 0);
          agg.cash_committed += Number(row.cash_committed || 0);
          agg.total_cash_collected += Number(row.total_cash_collected || 0);
          agg.base_starting_mrr += Number(row.base_starting_mrr || 0);
          agg.base_clients += row.base_clients || 0;
          agg.lost_clients += row.lost_clients || 0;
          agg.lost_mrr += Number(row.lost_mrr || 0);
        }
      });

      // Aggregate B2B ads metrics
      (b2bResult.data || []).forEach((row) => {
        const monthKey = format(new Date(row.date + "T00:00:00"), "yyyy-MM");
        if (monthlyAggregates[monthKey]) {
          const agg = monthlyAggregates[monthKey];
          agg.b2b_leads += row.leads || 0;
          agg.b2b_appointments_booked += row.appointments_booked || 0;
          agg.b2b_appointments_showed += row.appointments_showed || 0;
          agg.b2b_qualified_showed += row.qualified_showed || 0;
          agg.b2b_deals_closed += row.deals_closed || 0;
          agg.b2b_ad_spend += Number(row.ad_spend || 0);
          agg.b2b_revenue += Number(row.revenue || 0);
          agg.b2b_cash_collected += Number(row.cash_collected || 0);
        }
      });

      // Calculate derived metrics
      Object.values(monthlyAggregates).forEach((agg) => {
        agg.total_calls_scheduled = agg.new_calls_scheduled + agg.followup_calls_scheduled;
        agg.total_calls_taken = agg.new_calls_taken + agg.followup_calls_taken;
        agg.show_rate = agg.total_calls_scheduled > 0 
          ? (agg.total_calls_taken / agg.total_calls_scheduled) * 100 
          : 0;
        agg.qualified_show_rate = agg.total_calls_taken > 0 
          ? (agg.qualified_calls_taken / agg.total_calls_taken) * 100 
          : 0;
        agg.booked_close_rate = agg.total_calls_scheduled > 0 
          ? (agg.new_closes / agg.total_calls_scheduled) * 100 
          : 0;
        agg.show_close_rate = agg.total_calls_taken > 0 
          ? (agg.new_closes / agg.total_calls_taken) * 100 
          : 0;
        agg.churn_rate = agg.base_clients > 0 
          ? (agg.lost_clients / agg.base_clients) * 100 
          : 0;
        agg.cash_per_call_booked = agg.total_calls_scheduled > 0 
          ? agg.total_cash_collected / agg.total_calls_scheduled 
          : 0;
        agg.avg_close_cash = agg.new_closes > 0 
          ? agg.total_cash_collected / agg.new_closes 
          : 0;
        // B2B calculated metrics
        agg.b2b_show_rate = agg.b2b_appointments_booked > 0 
          ? (agg.b2b_appointments_showed / agg.b2b_appointments_booked) * 100 
          : 0;
        agg.b2b_cpl = agg.b2b_leads > 0 
          ? agg.b2b_ad_spend / agg.b2b_leads 
          : 0;
      });

      const sorted = Object.values(monthlyAggregates).sort((a, b) => a.month.localeCompare(b.month));
      setMonthlyData(sorted);
      setLoading(false);
    }

    fetchData();
  }, [visibleMonths]);

  const navigateMonths = (direction: "prev" | "next") => {
    setStartMonth((prev) => 
      direction === "prev" 
        ? subMonths(prev, 1) 
        : subMonths(prev, -1)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading monthly data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Comparison</h1>
          <p className="text-muted-foreground">
            Side-by-side monthly sales performance
          </p>
        </div>
      </div>

      {/* Monthly Comparison Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Closing Data Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Metric</TableHead>
                  {monthlyData.map((month) => (
                    <TableHead key={month.month} className="text-center min-w-[100px]">
                      {month.monthLabel}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricRows.map((row, index) => {
                  if (row.type === "divider") {
                    return (
                      <TableRow key={row.key} className="border-t-2 border-border">
                        <TableCell colSpan={monthlyData.length + 1} className="h-2 p-0" />
                      </TableRow>
                    );
                  }

                  if (row.type === "header") {
                    return (
                      <TableRow key={row.key} className="bg-muted/50">
                        <TableCell colSpan={monthlyData.length + 1} className="font-bold text-primary">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium sticky left-0 bg-card z-10">
                        {row.label}
                      </TableCell>
                      {monthlyData.map((month, monthIndex) => {
                        const value = (month as any)[row.key] || 0;
                        const prevMonth = monthIndex > 0 ? monthlyData[monthIndex - 1] : null;
                        const prevValue = prevMonth ? (prevMonth as any)[row.key] || 0 : 0;

                        return (
                          <TableCell key={month.month} className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={cn(
                                row.negative && value > 0 && "text-destructive",
                                row.type === "currency" && value > 0 && !row.negative && "text-success"
                              )}>
                                {formatValue(value, row.type)}
                              </span>
                              {monthIndex > 0 && getChangeIndicator(value, prevValue, !!row.negative)}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
