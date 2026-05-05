import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
  Calendar,
  CalendarCheck,
  Percent,
  Handshake,
  TrendingUp,
  Target,
  Wallet,
  BarChart3,
  StickyNote,
  Trash2,
  FileSignature,
  RefreshCw,
  Phone,
  PhoneIncoming,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { KPICard } from "@/components/dashboard/KPICard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { DataEntryForm } from "@/components/dashboard/DataEntryForm";
import { MetricsHistoryTable } from "@/components/dashboard/MetricsHistoryTable";
import { CampaignComparison } from "@/components/dashboard/CampaignComparison";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const getEffectiveToDate = (date?: Date) => {
  const selectedDate = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const localToday = format(new Date(), "yyyy-MM-dd");
  const utcToday = new Date().toISOString().split("T")[0];

  return selectedDate === localToday && utcToday > selectedDate ? utcToday : selectedDate;
};

interface Client {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: string;
  status: string;
  meta_ad_account_id: string | null;
}

interface Campaign {
  id: string;
  campaign_name: string;
  platform: string | null;
  status: string | null;
}

interface MetricsRow {
  id: string;
  date: string;
  campaign_id: string | null;
  impressions: number | null;
  clicks: number | null;
  ad_spend: number | null;
  leads: number | null;
  dials_made: number | null;
  pickups: number | null;
  appointments_booked: number | null;
  self_booked: number | null;
  sales_team_booked: number | null;
  appointments_showed: number | null;
  live_transfers: number | null;
  contracts_signed: number | null;
  deals_closed: number | null;
  revenue: number | null;
  setter: string | null;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaAdAccountId, setMetaAdAccountId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchData = useCallback(async () => {
    if (!id) return;

    const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
    const toDate = getEffectiveToDate(dateRange?.to);

    const [clientRes, campaignsRes, metricsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("campaigns").select("*").eq("client_id", id),
      supabase
        .from("metrics")
        .select("*")
        .eq("client_id", id)
        .gte("date", fromDate)
        .lte("date", toDate),
    ]);

    if (clientRes.error) {
      console.error(clientRes.error);
      toast.error("Failed to load client");
    }

    if (metricsRes.error) {
      console.error(metricsRes.error);
      toast.error("Failed to load metrics");
    }

    setClient(clientRes.data);
    if (clientRes.data?.meta_ad_account_id) {
      setMetaAdAccountId(clientRes.data.meta_ad_account_id);
    }
    // Exclude VAM campaign for Alonso Garcia
    const allCampaigns = campaignsRes.data || [];
    const allMetrics = (metricsRes.data || []) as unknown as MetricsRow[];
    const excludedCampaignIds = allCampaigns
      .filter(c => clientRes.data?.client_name === "Alonso Garcia" && c.campaign_name?.toLowerCase().includes("vam"))
      .map(c => c.id);
    
    setCampaigns(allCampaigns.filter(c => !excludedCampaignIds.includes(c.id)));
    setMetricsData(allMetrics.filter(m => !m.campaign_id || !excludedCampaignIds.includes(m.campaign_id)));
    setLoading(false);
  }, [id, dateRange]);

  const handleSaveMetaId = async () => {
    if (!client) return;
    setIsSavingMeta(true);
    const { error } = await supabase
      .from("clients")
      .update({ meta_ad_account_id: metaAdAccountId || null } as any)
      .eq("id", client.id);
    if (error) {
      toast.error("Failed to save Meta Ad Account ID");
    } else {
      toast.success("Meta Ad Account ID saved");
    }
    setIsSavingMeta(false);
  };

  const handleSyncMeta = async () => {
    if (!client) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-meta-ads", {
        body: { client_id: client.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Meta Ads synced: ${data.synced} client(s) updated`);
        fetchData();
      } else {
        toast.error(data?.error || "Sync failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Meta Ads");
    }
    setIsSyncing(false);
  };


  useEffect(() => {
    void fetchData();

    // Refresh when user returns to the tab — no aggressive polling
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchData();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchData]);

  const metrics = useMemo(() => {
    const totals = metricsData.reduce(
      (acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        ad_spend: acc.ad_spend + (m.ad_spend || 0),
        leads: acc.leads + (m.leads || 0),
        dials_made: acc.dials_made + (m.dials_made || 0),
        pickups: acc.pickups + (m.pickups || 0),
        appointments_booked: acc.appointments_booked + (m.appointments_booked || 0),
        self_booked: acc.self_booked + (m.self_booked || 0),
        sales_team_booked: acc.sales_team_booked + (m.sales_team_booked || 0),
        live_transfers: acc.live_transfers + (m.live_transfers || 0),
        appointments_showed: acc.appointments_showed + (m.appointments_showed || 0),
        contracts_signed: acc.contracts_signed + (m.contracts_signed || 0),
        deals_closed: acc.deals_closed + (m.deals_closed || 0),
        revenue: acc.revenue + (m.revenue || 0),
      }),
      { impressions: 0, clicks: 0, ad_spend: 0, leads: 0, dials_made: 0, pickups: 0, appointments_booked: 0, self_booked: 0, sales_team_booked: 0, live_transfers: 0, appointments_showed: 0, contracts_signed: 0, deals_closed: 0, revenue: 0 }
    );

    return {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpl: totals.leads > 0 ? totals.ad_spend / totals.leads : 0,
      cac: totals.deals_closed > 0 ? totals.ad_spend / totals.deals_closed : 0,
      roas: totals.ad_spend > 0 ? totals.revenue / totals.ad_spend : 0,
      show_up_rate: totals.appointments_booked > 0 ? (totals.appointments_showed / totals.appointments_booked) * 100 : 0,
      cost_per_appointment_booked: (totals.live_transfers + totals.self_booked + totals.sales_team_booked) > 0 ? totals.ad_spend / (totals.live_transfers + totals.self_booked + totals.sales_team_booked) : 0,
      cost_per_appointment_showed: totals.appointments_showed > 0 ? totals.ad_spend / totals.appointments_showed : 0,
      cost_per_contract: totals.contracts_signed > 0 ? totals.ad_spend / totals.contracts_signed : 0,
      lead_to_live_transfer: totals.leads > 0 ? (totals.live_transfers / totals.leads) * 100 : 0,
      lead_to_booked: totals.leads > 0 ? (totals.appointments_booked / totals.leads) * 100 : 0,
      lead_to_self_booked: totals.leads > 0 ? (totals.self_booked / totals.leads) * 100 : 0,
      pickup_rate: totals.dials_made > 0 ? (totals.pickups / totals.dials_made) * 100 : 0,
    };
  }, [metricsData]);

  const chartData = useMemo(() => {
    return metricsData
      .map((m) => ({
        date: m.date,
        ad_spend: m.ad_spend || 0,
        leads: m.leads || 0,
        appointments_booked: m.appointments_booked || 0,
        deals_closed: m.deals_closed || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metricsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading client...</p>
      </div>
    );
  }

  if (!client || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clients")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{client.client_name}</h1>
                <Badge 
                  variant={client.status === 'active' ? 'default' : 'secondary'}
                  className={client.status === 'active' 
                    ? 'bg-success/10 text-success border-success/20' 
                    : 'bg-muted text-muted-foreground'
                  }
                >
                  {client.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {client.market}, {client.state} • {client.niche}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {client.client_name}? This action cannot be undone and will remove all associated campaigns and metrics.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("clients")
                      .delete()
                      .eq("id", client.id);
                    
                    if (error) {
                      toast.error("Failed to delete client");
                      console.error(error);
                    } else {
                      toast.success(`${client.client_name} has been deleted`);
                      navigate("/clients");
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Meta Ads Integration */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Meta Ads Integration</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="metaAdAccountId">Meta Ad Account ID</Label>
            <Input
              id="metaAdAccountId"
              placeholder="e.g., act_123456789 or 123456789"
              value={metaAdAccountId}
              onChange={(e) => setMetaAdAccountId(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <Button onClick={handleSaveMetaId} disabled={isSavingMeta} variant="outline">
            {isSavingMeta ? "Saving..." : "Save"}
          </Button>
          <Button onClick={handleSyncMeta} disabled={isSyncing || !metaAdAccountId} className="bg-primary hover:bg-primary/90">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Meta Ads"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pulls today's Impressions, Clicks, Spend & Leads from Meta Ads automatically.
        </p>
      </div>

      <DataEntryForm 
        clientId={client.id} 
        clientName={client.client_name} 
        onMetricsSaved={fetchData}
      />


      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Spend"
          value={formatCurrency(metrics.ad_spend)}
          icon={Wallet}
          variant="default"
        />
        <KPICard
          title="Total Leads"
          value={formatNumber(metrics.leads)}
          icon={Users}
          variant="primary"
        />
        <KPICard
          title="Self Booked"
          value={formatNumber(metrics.self_booked)}
          subtitle={`${metrics.lead_to_self_booked.toFixed(1)}% of leads`}
          icon={Calendar}
          variant="primary"
        />
        <KPICard
          title="Sales Team Booked"
          value={formatNumber(metrics.sales_team_booked)}
          icon={Calendar}
          variant="primary"
        />
        <KPICard
          title="Total Booked"
          value={formatNumber(metrics.appointments_booked)}
          subtitle={`${metrics.lead_to_booked.toFixed(1)}% of leads`}
          icon={Calendar}
          variant="primary"
        />
        <KPICard
          title="Dials Made"
          value={formatNumber(metrics.dials_made)}
          icon={Phone}
          variant="default"
        />
        <KPICard
          title="Pickups"
          value={formatNumber(metrics.pickups)}
          subtitle={`${metrics.pickup_rate.toFixed(1)}% pickup rate`}
          icon={PhoneIncoming}
          variant={metrics.pickup_rate >= 30 ? "success" : "warning"}
        />
        <KPICard
          title="Live Transfers"
          value={formatNumber(metrics.live_transfers)}
          subtitle={`${metrics.lead_to_live_transfer.toFixed(1)}% of leads`}
          icon={Users}
          variant="primary"
        />
        <KPICard
          title="Contracts Signed"
          value={metrics.contracts_signed}
          icon={FileSignature}
          variant="primary"
        />
        <KPICard
          title="Deals Closed"
          value={metrics.deals_closed}
          icon={Handshake}
          variant="success"
        />
        <KPICard
          title="Revenue (GCI)"
          value={formatCurrency(metrics.revenue)}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard
          title="Impressions"
          value={formatNumber(metrics.impressions)}
          icon={Eye}
        />
        <KPICard
          title="Clicks"
          value={formatNumber(metrics.clicks)}
          subtitle={`${metrics.ctr.toFixed(2)}% CTR`}
          icon={MousePointerClick}
        />
        <KPICard
          title="Appointments Showed"
          value={formatNumber(metrics.appointments_showed)}
          icon={CalendarCheck}
        />
        <KPICard
          title="Show-Up Rate"
          value={`${metrics.show_up_rate.toFixed(1)}%`}
          icon={Percent}
          variant={metrics.show_up_rate >= 60 ? "success" : "warning"}
        />
        <KPICard
          title="ROAS"
          value={`${metrics.roas.toFixed(2)}x`}
          icon={BarChart3}
          variant={metrics.roas >= 3 ? "success" : metrics.roas >= 1 ? "warning" : "default"}
        />
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="CPL"
          value={formatCurrency(metrics.cpl)}
          subtitle="Cost per Lead"
          icon={DollarSign}
        />
        <KPICard
          title="Cost / Appt Booked"
          value={formatCurrency(metrics.cost_per_appointment_booked)}
          icon={Target}
        />
        <KPICard
          title="Cost / Appt Showed"
          value={formatCurrency(metrics.cost_per_appointment_showed)}
          icon={Target}
        />
        <KPICard
          title="Cost / Contract"
          value={formatCurrency(metrics.cost_per_contract)}
          icon={FileSignature}
        />
        <KPICard
          title="CAC (Cost / Deal)"
          value={formatCurrency(metrics.cac)}
          icon={DollarSign}
          variant={metrics.cac < 5000 ? "success" : "warning"}
        />
      </div>



      {/* Campaign Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Campaign Breakdown</h2>
        <CampaignComparison campaigns={campaigns} metricsData={metricsData as any} />
      </div>


      {/* Metrics History Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Metrics History</h2>
        <MetricsHistoryTable 
          metricsData={metricsData} 
          onMetricsUpdated={fetchData} 
        />
      </div>

      {/* Notes Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Notes</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Textarea
            placeholder="Add notes about this client..."
            className="min-h-[100px] bg-secondary border-border resize-none"
          />
          <div className="flex justify-end mt-3">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Save Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
