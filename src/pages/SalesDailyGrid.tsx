import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DailyMetric {
  id?: string;
  date: string;
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
}

const metricFields = [
  { key: "new_calls_scheduled", label: "New Calls Scheduled", type: "int" },
  { key: "new_calls_taken", label: "New Calls Taken", type: "int" },
  { key: "qualified_calls_taken", label: "Qualified Calls Taken", type: "int" },
  { key: "followup_calls_scheduled", label: "Follow-Up's Scheduled", type: "int" },
  { key: "followup_calls_taken", label: "Follow-Up's Taken", type: "int" },
  { key: "no_shows", label: "No-Shows", type: "int" },
  { key: "cancelled", label: "Cancelled", type: "int" },
  { key: "rescheduled", label: "Rescheduled", type: "int" },
  { key: "new_closes", label: "New Closes", type: "int" },
  { key: "new_mrr", label: "New MRR $", type: "float" },
  { key: "upsell_mrr", label: "Upsell MRR $", type: "float" },
  { key: "otp", label: "PIF $", type: "float" },
  { key: "cash_committed", label: "Cash Committed $", type: "float" },
] as const;

type MetricKey = typeof metricFields[number]["key"];

const emptyMetric = (): Omit<DailyMetric, "date"> => ({
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
});

export default function SalesDailyGrid() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [metricsData, setMetricsData] = useState<Record<string, DailyMetric>>({});
  const [dirtyDays, setDirtyDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const fetchMonthData = async () => {
    setLoading(true);
    const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("sales_metrics")
      .select("*")
      .eq("period_type", "daily")
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Failed to load data");
    } else {
      const dataMap: Record<string, DailyMetric> = {};
      data?.forEach((row) => {
        dataMap[row.date] = row as DailyMetric;
      });
      setMetricsData(dataMap);
      setDirtyDays(new Set());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMonthData();
  }, [selectedMonth]);

  const handleCellChange = (dateStr: string, field: MetricKey, value: string) => {
    const fieldMeta = metricFields.find((f) => f.key === field);
    const parsedValue = fieldMeta?.type === "float" 
      ? parseFloat(value) || 0 
      : parseInt(value) || 0;

    setMetricsData((prev) => {
      const existing = prev[dateStr] || { date: dateStr, ...emptyMetric() };
      return {
        ...prev,
        [dateStr]: {
          ...existing,
          [field]: parsedValue,
        },
      };
    });
    setDirtyDays((prev) => new Set([...prev, dateStr]));
  };

  const getCellValue = (dateStr: string, field: MetricKey): string => {
    const dayData = metricsData[dateStr];
    if (!dayData) return "";
    const val = dayData[field];
    return val === 0 ? "" : String(val);
  };

  const handleSaveAll = async () => {
    if (dirtyDays.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    const updates = Array.from(dirtyDays).map((dateStr) => {
      const data = metricsData[dateStr];
      return {
        date: dateStr,
        period_type: "daily",
        new_calls_scheduled: data.new_calls_scheduled,
        followup_calls_scheduled: data.followup_calls_scheduled,
        new_calls_taken: data.new_calls_taken,
        qualified_calls_taken: data.qualified_calls_taken,
        followup_calls_taken: data.followup_calls_taken,
        no_shows: data.no_shows,
        cancelled: data.cancelled,
        rescheduled: data.rescheduled,
        new_closes: data.new_closes,
        new_mrr: data.new_mrr,
        upsell_mrr: data.upsell_mrr,
        otp: data.otp,
        cash_committed: data.cash_committed,
        total_cash_collected: data.total_cash_collected,
        base_starting_mrr: data.base_starting_mrr,
        base_clients: data.base_clients,
        lost_clients: data.lost_clients,
        lost_mrr: data.lost_mrr,
      };
    });

    const { error } = await supabase
      .from("sales_metrics")
      .upsert(updates, { onConflict: "date,period_type" });

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      toast.error("Failed to save changes");
    } else {
      toast.success(`Saved ${updates.length} day(s)`);
      setDirtyDays(new Set());
      fetchMonthData();
    }
  };

  const getMonthColumnTotals = (field: MetricKey): number => {
    return daysInMonth.reduce((sum, day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const val = metricsData[dateStr]?.[field] || 0;
      return sum + val;
    }, 0);
  };

  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = -12; i <= 6; i++) {
      const date = addMonths(new Date(), i);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Sales Grid</h1>
          <p className="text-muted-foreground">
            Enter daily metrics for each day of the month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={format(selectedMonth, "yyyy-MM")}
            onValueChange={(val) => {
              const [year, month] = val.split("-");
              setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {format(selectedMonth, "MMMM yyyy")} - Daily Entry
            </CardTitle>
            <Button onClick={handleSaveAll} disabled={saving || dirtyDays.size === 0}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : `Save Changes (${dirtyDays.size})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="always">
            <div className="min-w-[1200px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 font-medium sticky left-0 bg-muted/50 z-20 min-w-[140px]">
                      Metric
                    </th>
                    {daysInMonth.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayNum = format(day, "d");
                      const dayName = format(day, "EEE");
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      const isDirty = dirtyDays.has(dateStr);
                      return (
                        <th
                          key={dateStr}
                          className={cn(
                            "p-1 text-center min-w-[70px] font-normal",
                            isWeekend && "bg-muted/30",
                            isDirty && "bg-primary/10"
                          )}
                        >
                          <div className="text-xs text-muted-foreground">{dayName}</div>
                          <div className="font-medium">{dayNum}</div>
                        </th>
                      );
                    })}
                    <th className="p-2 text-center font-medium min-w-[80px] bg-primary/5">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={daysInMonth.length + 2} className="p-8 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    metricFields.map((field, idx) => (
                      <tr
                        key={field.key}
                        className={cn(
                          "border-b border-border/50",
                          idx % 2 === 0 && "bg-muted/20"
                        )}
                      >
                        <td className="p-2 font-medium text-xs sticky left-0 bg-background z-10">
                          {field.label}
                        </td>
                        {daysInMonth.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                          return (
                            <td
                              key={dateStr}
                              className={cn(
                                "p-0.5",
                                isWeekend && "bg-muted/20"
                              )}
                            >
                              <Input
                                type="number"
                                step={field.type === "float" ? "0.01" : "1"}
                                value={getCellValue(dateStr, field.key)}
                                onChange={(e) =>
                                  handleCellChange(dateStr, field.key, e.target.value)
                                }
                                className="h-7 w-full text-xs text-center p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-medium text-xs bg-primary/5">
                          {field.type === "float"
                            ? `$${getMonthColumnTotals(field.key).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                            : getMonthColumnTotals(field.key).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {dirtyDays.size > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button size="lg" onClick={handleSaveAll} disabled={saving} className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : `Save ${dirtyDays.size} Day(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
