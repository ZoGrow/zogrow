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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  DollarSign, 
  MousePointer, 
  Users, 
  Calendar as CalendarIconSolid,
  Target,
  Trash2,
  Pencil,
  TrendingUp,
  Eye,
  Percent,
  FileText,
  Handshake,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

interface B2BAdsMetric {
  id: string;
  date: string;
  impressions: number;
  clicks: number;
  ad_spend: number;
  leads: number;
  qualified_leads: number;
  dials_made: number;
  pickups: number;
  intro_call_booked: number;
  intro_call_showed: number;
  demo_booked: number;
  demo_showed: number;
  qualified_showed: number;
  qualified_intro_showed: number;
  deals_closed: number;
  revenue: number;
  cash_collected: number;
  notes: string | null;
}

interface FormData {
  date: Date;
  impressions: string;
  clicks: string;
  ad_spend: string;
  leads: string;
  qualified_leads: string;
  intro_call_booked: string;
  intro_call_showed: string;
  demo_booked: string;
  demo_showed: string;
  qualified_showed: string;
  qualified_intro_showed: string;
  deals_closed: string;
  revenue: string;
  cash_collected: string;
  notes: string;
}

const initialFormData: FormData = {
  date: new Date(),
  impressions: "",
  clicks: "",
  ad_spend: "",
  leads: "",
  qualified_leads: "",
  intro_call_booked: "",
  intro_call_showed: "",
  demo_booked: "",
  demo_showed: "",
  qualified_showed: "",
  qualified_intro_showed: "",
  deals_closed: "",
  revenue: "",
  cash_collected: "",
  notes: "",
};

// KPI Card Component matching the reference design
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'purple' | 'green' | 'default' | 'yellow';
  className?: string;
}

function KPICard({ title, value, subtitle, icon: Icon, variant = 'default', className }: KPICardProps) {
  const variantStyles = {
    purple: 'border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent',
    green: 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent',
    yellow: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent',
    default: 'border-border bg-card',
  };

  const iconStyles = {
    purple: 'text-purple-400 bg-purple-500/20',
    green: 'text-green-400 bg-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
    default: 'text-muted-foreground bg-muted',
  };

  return (
    <Card className={cn("relative overflow-hidden", variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("p-2 rounded-lg", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function B2BAds() {
  const [metrics, setMetrics] = useState<B2BAdsMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("b2b_ads_metrics")
        .select("*")
        .order("date", { ascending: false });

      if (dateRange?.from) {
        query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching B2B ads metrics:", error);
      toast.error("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const handleInputChange = (field: keyof FormData, value: string | Date) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    console.log("B2B Ads form submitted", formData);
    setSaving(true);

    try {
      const dateStr = format(formData.date, "yyyy-MM-dd");
      console.log("Formatted date:", dateStr);

      const payload = {
        date: dateStr,
        impressions: parseInt(formData.impressions) || 0,
        clicks: parseInt(formData.clicks) || 0,
        ad_spend: parseFloat(formData.ad_spend) || 0,
        leads: parseInt(formData.leads) || 0,
        qualified_leads: parseInt(formData.qualified_leads) || 0,
        intro_call_booked: parseInt(formData.intro_call_booked) || 0,
        intro_call_showed: parseInt(formData.intro_call_showed) || 0,
        demo_booked: parseInt(formData.demo_booked) || 0,
        demo_showed: parseInt(formData.demo_showed) || 0,
        qualified_showed: parseInt(formData.qualified_showed) || 0,
        qualified_intro_showed: parseInt(formData.qualified_intro_showed) || 0,
        deals_closed: parseInt(formData.deals_closed) || 0,
        revenue: parseFloat(formData.revenue) || 0,
        cash_collected: parseFloat(formData.cash_collected) || 0,
        notes: formData.notes || null,
      };

      console.log("Payload to insert:", payload);

      if (editingId) {
        const { error } = await supabase
          .from("b2b_ads_metrics")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Metrics updated successfully");
      } else {
        const { error } = await supabase.from("b2b_ads_metrics").insert(payload);

        if (error) throw error;
        toast.success("Metrics saved successfully");
      }

      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      fetchMetrics();
    } catch (error) {
      console.error("Error saving metrics:", error);
      toast.error("Failed to save metrics");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (metric: B2BAdsMetric) => {
    setFormData({
      date: new Date(metric.date + "T00:00:00"),
      impressions: metric.impressions?.toString() || "",
      clicks: metric.clicks?.toString() || "",
      ad_spend: metric.ad_spend?.toString() || "",
      leads: metric.leads?.toString() || "",
      qualified_leads: (metric.qualified_leads as number)?.toString() || "",
      intro_call_booked: (metric as any).intro_call_booked?.toString() || "",
      intro_call_showed: (metric as any).intro_call_showed?.toString() || "",
      demo_booked: (metric as any).demo_booked?.toString() || "",
      demo_showed: (metric as any).demo_showed?.toString() || "",
      qualified_showed: metric.qualified_showed?.toString() || "",
      qualified_intro_showed: (metric as any).qualified_intro_showed?.toString() || "",
      deals_closed: metric.deals_closed?.toString() || "",
      revenue: metric.revenue?.toString() || "",
      cash_collected: metric.cash_collected?.toString() || "",
      notes: metric.notes || "",
    });
    setEditingId(metric.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await supabase.from("b2b_ads_metrics").delete().eq("id", id);

      if (error) throw error;
      toast.success("Entry deleted successfully");
      fetchMetrics();
    } catch (error) {
      console.error("Error deleting metric:", error);
      toast.error("Failed to delete entry");
    }
  };

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        ad_spend: acc.ad_spend + (m.ad_spend || 0),
        leads: acc.leads + (m.leads || 0),
        qualified_leads: acc.qualified_leads + ((m as any).qualified_leads || 0),
        intro_call_booked: acc.intro_call_booked + ((m as any).intro_call_booked || 0),
        intro_call_showed: acc.intro_call_showed + ((m as any).intro_call_showed || 0),
        demo_booked: acc.demo_booked + ((m as any).demo_booked || 0),
        demo_showed: acc.demo_showed + ((m as any).demo_showed || 0),
        qualified_showed: acc.qualified_showed + (m.qualified_showed || 0),
        qualified_intro_showed: acc.qualified_intro_showed + ((m as any).qualified_intro_showed || 0),
        deals_closed: acc.deals_closed + (m.deals_closed || 0),
        revenue: acc.revenue + (m.revenue || 0),
        cash_collected: acc.cash_collected + (m.cash_collected || 0),
      }),
      {
        impressions: 0,
        clicks: 0,
        ad_spend: 0,
        leads: 0,
        qualified_leads: 0,
        intro_call_booked: 0,
        intro_call_showed: 0,
        demo_booked: 0,
        demo_showed: 0,
        qualified_showed: 0,
        qualified_intro_showed: 0,
        deals_closed: 0,
        revenue: 0,
        cash_collected: 0,
      }
    );
  }, [metrics]);

  const kpis = useMemo(() => {
    const safeDivide = (a: number, b: number) => (b > 0 ? a / b : 0);


    return {
      ctr: safeDivide(totals.clicks, totals.impressions) * 100,
      leadToIntroRate: safeDivide(totals.intro_call_booked, totals.leads) * 100,
      introShowUpRate: safeDivide(totals.intro_call_showed, totals.intro_call_booked) * 100,
      introToDemoRate: safeDivide(totals.demo_booked, totals.intro_call_showed) * 100,
      demoShowUpRate: safeDivide(totals.demo_showed, totals.demo_booked) * 100,
      closeRate: safeDivide(totals.deals_closed, totals.demo_showed) * 100,
      qualifiedIntroShowRate: safeDivide(totals.qualified_intro_showed, totals.intro_call_showed) * 100,
      cpl: safeDivide(totals.ad_spend, totals.leads),
      costPerQualifiedLead: safeDivide(totals.ad_spend, totals.qualified_leads),
      costPerIntroBooked: safeDivide(totals.ad_spend, totals.intro_call_booked),
      costPerIntroShowed: safeDivide(totals.ad_spend, totals.intro_call_showed),
      costPerDemoBooked: safeDivide(totals.ad_spend, totals.demo_booked),
      costPerDemoShowed: safeDivide(totals.ad_spend, totals.demo_showed),
      costPerQualifiedShown: safeDivide(totals.ad_spend, totals.qualified_showed),
      costPerQualifiedIntroShowed: safeDivide(totals.ad_spend, totals.qualified_intro_showed),
      cac: safeDivide(totals.ad_spend, totals.deals_closed),
      roas: safeDivide(totals.revenue, totals.ad_spend),
    };
  }, [totals]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">B2B Ads Metrics</h1>
          <p className="text-muted-foreground mt-1">Track your agency's B2B advertising performance</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button
            variant="outline"
            onClick={async () => {
              toast.info("Syncing B2B ads from Meta...");
              try {
                const { data, error } = await supabase.functions.invoke("sync-b2b-ads", {
                  body: { backfill_days: 1 },
                });
                if (error) throw error;
                toast.success(`Synced ${data?.days_synced || 0} days of B2B ad data`);
                fetchMetrics();
              } catch (err: any) {
                toast.error(err.message || "Sync failed");
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Meta
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData(initialFormData); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Row 1: Primary Volume Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Total Spend"
          value={formatCurrency(totals.ad_spend)}
          icon={DollarSign}
          variant="purple"
        />
        <KPICard
          title="Appointments Booked"
          value={formatNumber(totals.leads)}
          icon={Users}
          variant="purple"
        />
        <KPICard
          title="Intro Calls Booked"
          value={totals.intro_call_booked}
          icon={CalendarIconSolid}
          variant="purple"
        />
        <KPICard
          title="Demo Booked"
          value={totals.demo_booked}
          icon={CalendarIconSolid}
          variant="purple"
        />
      </div>

      {/* Row 2: Outcome Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Deals Closed"
          value={totals.deals_closed}
          icon={Handshake}
          variant="green"
        />
        <KPICard
          title="Cash Collected"
          value={formatCurrency(totals.cash_collected)}
          icon={DollarSign}
          variant="green"
        />
        <KPICard
          title="Revenue"
          value={formatCurrency(totals.revenue)}
          icon={TrendingUp}
          variant="green"
        />
      </div>

      {/* Row 3: Traffic & Show Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Impressions"
          value={formatNumber(totals.impressions)}
          icon={Eye}
        />
        <KPICard
          title="Clicks"
          value={formatNumber(totals.clicks)}
          subtitle={`${kpis.ctr.toFixed(2)}% CTR`}
          icon={MousePointer}
        />
        <KPICard
          title="Intro Calls Showed"
          value={totals.intro_call_showed}
          icon={CalendarIconSolid}
        />
        <KPICard
          title="Intro Show-Up Rate"
          value={`${kpis.introShowUpRate.toFixed(1)}%`}
          icon={Percent}
          variant="yellow"
        />
        <KPICard
          title="Qualified Intro Showed"
          value={totals.qualified_intro_showed}
          subtitle={`${kpis.qualifiedIntroShowRate.toFixed(1)}% of showed`}
          icon={Target}
          variant="yellow"
        />
        <KPICard
          title="Demo Showed"
          value={totals.demo_showed}
          icon={CalendarIconSolid}
        />
        <KPICard
          title="Demo Show-Up Rate"
          value={`${kpis.demoShowUpRate.toFixed(1)}%`}
          icon={Percent}
          variant="yellow"
        />
      </div>

      {/* Row 4: ROAS & Rates */}
      <div className="grid gap-4 md:grid-cols-5">
        <KPICard
          title="ROAS"
          value={`${kpis.roas.toFixed(2)}x`}
          icon={BarChart3}
        />
        <KPICard
          title="Lead → Intro Rate"
          value={`${kpis.leadToIntroRate.toFixed(1)}%`}
          icon={Percent}
        />
        <KPICard
          title="Intro → Demo Rate"
          value={`${kpis.introToDemoRate.toFixed(1)}%`}
          icon={Percent}
        />
        <KPICard
          title="Closing Rate"
          value={`${kpis.closeRate.toFixed(1)}%`}
          subtitle="Demo Showed → Deals"
          icon={Handshake}
          variant="green"
        />
        <KPICard
          title="Qualified Showed"
          value={totals.qualified_showed}
          icon={Target}
        />
      </div>

      {/* Row 5: Cost Metrics */}
      <div className="grid gap-4 md:grid-cols-6">
        <KPICard
          title="CPL"
          value={formatCurrency(kpis.cpl)}
          subtitle="Cost per Lead"
          icon={DollarSign}
        />
        <KPICard
          title="Cost / Intro Booked"
          value={formatCurrency(kpis.costPerIntroBooked)}
          icon={Target}
        />
        <KPICard
          title="Cost / Intro Showed"
          value={formatCurrency(kpis.costPerIntroShowed)}
          icon={Target}
        />
        <KPICard
          title="Cost / Demo Booked"
          value={formatCurrency(kpis.costPerDemoBooked)}
          icon={Target}
        />
        <KPICard
          title="Cost / Demo Showed"
          value={formatCurrency(kpis.costPerDemoShowed)}
          icon={Target}
        />
        <KPICard
          title="Cost / Qualified Showed"
          value={formatCurrency(kpis.costPerQualifiedShown)}
          icon={Target}
        />
        <KPICard
          title="Cost / Qual. Intro Showed"
          value={formatCurrency(kpis.costPerQualifiedIntroShowed)}
          icon={Target}
        />
        <KPICard
          title="CAC (Cost / Deal)"
          value={formatCurrency(kpis.cac)}
          icon={DollarSign}
          variant="green"
        />
      </div>

      {/* Entry Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingId(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Entry" : "Add New Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && handleInputChange("date", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Traffic Metrics */}
              <div className="space-y-2">
                <Label>Impressions</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.impressions}
                  onChange={(e) => handleInputChange("impressions", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Clicks</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.clicks}
                  onChange={(e) => handleInputChange("clicks", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ad Spend ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.ad_spend}
                  onChange={(e) => handleInputChange("ad_spend", e.target.value)}
                />
              </div>

              {/* Lead & Appointment Metrics */}
              <div className="space-y-2">
                <Label>Appointments Booked</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.leads}
                  onChange={(e) => handleInputChange("leads", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Intro Calls Booked</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.intro_call_booked}
                  onChange={(e) => handleInputChange("intro_call_booked", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Intro Calls Showed</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.intro_call_showed}
                  onChange={(e) => handleInputChange("intro_call_showed", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Demo Booked</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.demo_booked}
                  onChange={(e) => handleInputChange("demo_booked", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Demo Showed</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.demo_showed}
                  onChange={(e) => handleInputChange("demo_showed", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Qualified Showed</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.qualified_showed}
                  onChange={(e) => handleInputChange("qualified_showed", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Qualified Intro Showed</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.qualified_intro_showed}
                  onChange={(e) => handleInputChange("qualified_intro_showed", e.target.value)}
                />
              </div>

              {/* Outcome Metrics */}
              <div className="space-y-2">
                <Label>Deals Closed</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.deals_closed}
                  onChange={(e) => handleInputChange("deals_closed", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cash Collected ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cash_collected}
                  onChange={(e) => handleInputChange("cash_collected", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Revenue ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.revenue}
                  onChange={(e) => handleInputChange("revenue", e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="button" 
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(initialFormData);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metrics Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Metrics History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No metrics found for the selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Appts Bkd</TableHead>
                    <TableHead className="text-right">Intro Bkd</TableHead>
                    <TableHead className="text-right">Intro Shw</TableHead>
                    <TableHead className="text-right">Demo Bkd</TableHead>
                    <TableHead className="text-right">Demo Shw</TableHead>
                    <TableHead className="text-right">Qualified</TableHead>
                    <TableHead className="text-right">Qual. Intro</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">
                        {format(new Date(metric.date + "T00:00:00"), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(metric.ad_spend || 0)}</TableCell>
                      <TableCell className="text-right">{metric.leads || 0}</TableCell>
                      <TableCell className="text-right">{(metric as any).intro_call_booked || 0}</TableCell>
                      <TableCell className="text-right">{(metric as any).intro_call_showed || 0}</TableCell>
                      <TableCell className="text-right">{(metric as any).demo_booked || 0}</TableCell>
                      <TableCell className="text-right">{(metric as any).demo_showed || 0}</TableCell>
                      <TableCell className="text-right">{metric.qualified_showed || 0}</TableCell>
                      <TableCell className="text-right">{(metric as any).qualified_intro_showed || 0}</TableCell>
                      <TableCell className="text-right">{metric.deals_closed || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(metric.cash_collected || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(metric.revenue || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(metric)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(metric.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.ad_spend)}</TableCell>
                    <TableCell className="text-right">{totals.leads}</TableCell>
                    <TableCell className="text-right">{totals.intro_call_booked}</TableCell>
                    <TableCell className="text-right">{totals.intro_call_showed}</TableCell>
                    <TableCell className="text-right">{totals.demo_booked}</TableCell>
                    <TableCell className="text-right">{totals.demo_showed}</TableCell>
                    <TableCell className="text-right">{totals.qualified_showed}</TableCell>
                    <TableCell className="text-right">{totals.qualified_intro_showed}</TableCell>
                    <TableCell className="text-right">{totals.deals_closed}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.cash_collected)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.revenue)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
