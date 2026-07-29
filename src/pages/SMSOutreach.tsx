import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarIcon,
  Plus,
  MessageSquare,
  PhoneCall,
  Eye,
  Video,
  Handshake,
  DollarSign,
  Trash2,
  Pencil,
  Percent,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

interface SMSMetric {
  id: string;
  date: string;
  sdr_name: string | null;
  messages_sent: number;
  sdr_calls_booked: number;
  sdr_calls_showed: number;
  demos_booked: number;
  demos_showed: number;
  deals_closed: number;
  revenue: number;
  sms_spend: number;
  intros_rescheduled: number;
  intro_attempts: number;
  power_dials: number;
  source: string | null;
  notes: string | null;
}

interface FormData {
  date: Date;
  messages_sent: string;
  sdr_calls_booked: string;
  sdr_calls_showed: string;
  demos_booked: string;
  demos_showed: string;
  deals_closed: string;
  revenue: string;
  sms_spend: string;
  notes: string;
}

const blankForm = (): FormData => ({
  date: new Date(),
  messages_sent: "",
  sdr_calls_booked: "",
  sdr_calls_showed: "",
  demos_booked: "",
  demos_showed: "",
  deals_closed: "",
  revenue: "",
  sms_spend: "",
  notes: "",
});

const toLocalDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const safePct = (num: number, denom: number) =>
  denom > 0 ? (num / denom) * 100 : 0;

export default function SMSOutreach() {
  const [metrics, setMetrics] = useState<SMSMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(blankForm());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const handleSyncMonday = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-monday-eod", {
        body: {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      toast.success(
        `Synced ${data.synced} entries from Monday (${data.skipped} skipped)`,
      );
      fetchMetrics();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Monday sync failed: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    let query = supabase
      .from("sms_outreach_metrics")
      .select("*")
      .order("date", { ascending: false });

    if (dateRange?.from)
      query = query.gte("date", toLocalDateString(dateRange.from));
    if (dateRange?.to)
      query = query.lte("date", toLocalDateString(dateRange.to));

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load SMS metrics");
    } else {
      setMetrics((data as SMSMetric[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from?.toString(), dateRange?.to?.toString()]);

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        messages_sent: acc.messages_sent + (m.messages_sent || 0),
        sdr_calls_booked: acc.sdr_calls_booked + (m.sdr_calls_booked || 0),
        sdr_calls_showed: acc.sdr_calls_showed + (m.sdr_calls_showed || 0),
        demos_booked: acc.demos_booked + (m.demos_booked || 0),
        demos_showed: acc.demos_showed + (m.demos_showed || 0),
        deals_closed: acc.deals_closed + (m.deals_closed || 0),
        revenue: acc.revenue + Number(m.revenue || 0),
        sms_spend: acc.sms_spend + Number(m.sms_spend || 0),
      }),
      {
        messages_sent: 0,
        sdr_calls_booked: 0,
        sdr_calls_showed: 0,
        demos_booked: 0,
        demos_showed: 0,
        deals_closed: 0,
        revenue: 0,
        sms_spend: 0,
      }
    );
  }, [metrics]);

  const openNew = () => {
    setEditingId(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (m: SMSMetric) => {
    setEditingId(m.id);
    const [y, mo, d] = m.date.split("-").map(Number);
    setForm({
      date: new Date(y, mo - 1, d),
      messages_sent: String(m.messages_sent || ""),
      sdr_calls_booked: String(m.sdr_calls_booked || ""),
      sdr_calls_showed: String(m.sdr_calls_showed || ""),
      demos_booked: String(m.demos_booked || ""),
      demos_showed: String(m.demos_showed || ""),
      deals_closed: String(m.deals_closed || ""),
      revenue: String(m.revenue || ""),
      sms_spend: String(m.sms_spend || ""),
      notes: m.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      date: toLocalDateString(form.date),
      messages_sent: parseInt(form.messages_sent) || 0,
      sdr_calls_booked: parseInt(form.sdr_calls_booked) || 0,
      sdr_calls_showed: parseInt(form.sdr_calls_showed) || 0,
      demos_booked: parseInt(form.demos_booked) || 0,
      demos_showed: parseInt(form.demos_showed) || 0,
      deals_closed: parseInt(form.deals_closed) || 0,
      revenue: parseFloat(form.revenue) || 0,
      sms_spend: parseFloat(form.sms_spend) || 0,
      notes: form.notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("sms_outreach_metrics")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("sms_outreach_metrics")
        .upsert(payload, { onConflict: "date" }));
    }

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Entry updated" : "Entry saved");
    setDialogOpen(false);
    fetchMetrics();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase
      .from("sms_outreach_metrics")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entry deleted");
    fetchMetrics();
  };

  const kpis = [
    {
      label: "Messages Sent",
      value: totals.messages_sent.toLocaleString(),
      icon: MessageSquare,
    },
    {
      label: "SDR Calls Booked",
      value: totals.sdr_calls_booked.toLocaleString(),
      sub: `${safePct(totals.sdr_calls_booked, totals.messages_sent).toFixed(1)}% from messages`,
      icon: PhoneCall,
    },
    {
      label: "SDR Calls Showed",
      value: totals.sdr_calls_showed.toLocaleString(),
      sub: `${safePct(totals.sdr_calls_showed, totals.sdr_calls_booked).toFixed(1)}% show rate`,
      icon: Eye,
    },
    {
      label: "Demos Booked",
      value: totals.demos_booked.toLocaleString(),
      sub: `${safePct(totals.demos_booked, totals.sdr_calls_showed).toFixed(1)}% from SDR`,
      icon: Video,
    },
    {
      label: "Demos Showed",
      value: totals.demos_showed.toLocaleString(),
      sub: `${safePct(totals.demos_showed, totals.demos_booked).toFixed(1)}% show rate`,
      icon: Eye,
    },
    {
      label: "Deals Closed",
      value: totals.deals_closed.toLocaleString(),
      sub: `${safePct(totals.deals_closed, totals.demos_showed).toFixed(1)}% close rate`,
      icon: Handshake,
    },
    {
      label: "Revenue",
      value: `$${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub:
        totals.deals_closed > 0
          ? `$${(totals.revenue / totals.deals_closed).toLocaleString(undefined, { maximumFractionDigits: 0 })} avg`
          : undefined,
      icon: DollarSign,
    },
    {
      label: "SMS Spend",
      value: `$${totals.sms_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub:
        totals.sms_spend > 0
          ? `${(totals.revenue > 0 ? totals.revenue / totals.sms_spend : 0).toFixed(2)}x ROAS`
          : undefined,
      icon: DollarSign,
    },
    {
      label: "Cost per Intro",
      value:
        totals.sdr_calls_booked > 0
          ? `$${(totals.sms_spend / totals.sdr_calls_booked).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : "$0",
      sub: `${totals.sdr_calls_booked.toLocaleString()} intros booked`,
      icon: DollarSign,
    },
    {
      label: "Cost per Demo",
      value:
        totals.demos_booked > 0
          ? `$${(totals.sms_spend / totals.demos_booked).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : "$0",
      sub: `${totals.demos_booked.toLocaleString()} demos booked`,
      icon: DollarSign,
    },
  ];




  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SMS Outreach</h1>
          <p className="text-muted-foreground mt-1">
            Track your SMS outreach funnel from message to close
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button variant="outline" onClick={handleSyncMonday} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Monday"}
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Entry
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {kpi.label}
                </span>
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              {kpi.sub && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {kpi.sub}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily entries table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">Loading...</div>
          ) : metrics.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No entries yet. Click "Add Entry" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>SDR</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">SDR Booked</TableHead>
                    <TableHead className="text-right">SDR Showed</TableHead>
                    <TableHead className="text-right">Demo Booked</TableHead>
                    <TableHead className="text-right">Demo Showed</TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">SMS Spend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {format(new Date(m.date + "T00:00:00"), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.sdr_name || "—"}
                      </TableCell>
                      <TableCell className="text-right">{m.messages_sent}</TableCell>
                      <TableCell className="text-right">{m.sdr_calls_booked}</TableCell>
                      <TableCell className="text-right">{m.sdr_calls_showed}</TableCell>
                      <TableCell className="text-right">{m.demos_booked}</TableCell>
                      <TableCell className="text-right">{m.demos_showed}</TableCell>
                      <TableCell className="text-right">{m.deals_closed}</TableCell>
                      <TableCell className="text-right">
                        ${Number(m.revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(m.sms_spend || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Entry" : "New SMS Outreach Entry"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? format(form.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={(d) => d && setForm({ ...form, date: d })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Messages Sent</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.messages_sent}
                  onChange={(e) => setForm({ ...form, messages_sent: e.target.value })}
                />
              </div>
              <div>
                <Label>SDR Calls Booked</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sdr_calls_booked}
                  onChange={(e) =>
                    setForm({ ...form, sdr_calls_booked: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>SDR Calls Showed</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sdr_calls_showed}
                  onChange={(e) =>
                    setForm({ ...form, sdr_calls_showed: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Demos Booked</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.demos_booked}
                  onChange={(e) => setForm({ ...form, demos_booked: e.target.value })}
                />
              </div>
              <div>
                <Label>Demos Showed</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.demos_showed}
                  onChange={(e) => setForm({ ...form, demos_showed: e.target.value })}
                />
              </div>
              <div>
                <Label>Deals Closed</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.deals_closed}
                  onChange={(e) => setForm({ ...form, deals_closed: e.target.value })}
                />
              </div>
              <div>
                <Label>Revenue ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.revenue}
                  onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                />
              </div>
              <div>
                <Label>SMS Spend ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sms_spend}
                  onChange={(e) => setForm({ ...form, sms_spend: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editingId ? "Update" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
