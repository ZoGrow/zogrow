import { useState, useEffect, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  UserCheck,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Percent,
  Megaphone,
  Handshake,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";

interface SalesMetrics {
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

interface B2BMetrics {
  appointments_booked: number;
  appointments_showed: number;
  qualified_showed: number;
  deals_closed: number;
  leads: number;
  ad_spend: number;
  revenue: number;
  cash_collected: number;
}

const defaultMetrics: SalesMetrics = {
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
};

const defaultB2BMetrics: B2BMetrics = {
  appointments_booked: 0,
  appointments_showed: 0,
  qualified_showed: 0,
  deals_closed: 0,
  leads: 0,
  ad_spend: 0,
  revenue: 0,
  cash_collected: 0,
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics>(defaultMetrics);
  const [b2bMetrics, setB2BMetrics] = useState<B2BMetrics>(defaultB2BMetrics);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      
      // Fetch sales metrics
      let salesQuery = supabase.from("sales_metrics").select("*").eq("period_type", "daily");
      
      if (dateRange?.from) {
        salesQuery = salesQuery.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        salesQuery = salesQuery.lte("date", format(dateRange.to, "yyyy-MM-dd"));
      }

      // Fetch B2B ads metrics
      let b2bQuery = supabase.from("b2b_ads_metrics").select("*");
      
      if (dateRange?.from) {
        b2bQuery = b2bQuery.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        b2bQuery = b2bQuery.lte("date", format(dateRange.to, "yyyy-MM-dd"));
      }

      const [salesResult, b2bResult] = await Promise.all([salesQuery, b2bQuery]);

      if (salesResult.error) {
        console.error("Error fetching sales metrics:", salesResult.error);
      }

      if (b2bResult.error) {
        console.error("Error fetching B2B ads metrics:", b2bResult.error);
      }

      // Aggregate sales metrics
      const aggregatedSales = (salesResult.data || []).reduce((acc, row) => ({
        new_calls_scheduled: acc.new_calls_scheduled + (row.new_calls_scheduled || 0),
        followup_calls_scheduled: acc.followup_calls_scheduled + (row.followup_calls_scheduled || 0),
        new_calls_taken: acc.new_calls_taken + (row.new_calls_taken || 0),
        qualified_calls_taken: acc.qualified_calls_taken + (row.qualified_calls_taken || 0),
        followup_calls_taken: acc.followup_calls_taken + (row.followup_calls_taken || 0),
        no_shows: acc.no_shows + (row.no_shows || 0),
        cancelled: acc.cancelled + (row.cancelled || 0),
        rescheduled: acc.rescheduled + (row.rescheduled || 0),
        new_closes: acc.new_closes + (row.new_closes || 0),
        new_mrr: acc.new_mrr + Number(row.new_mrr || 0),
        upsell_mrr: acc.upsell_mrr + Number(row.upsell_mrr || 0),
        otp: acc.otp + Number(row.otp || 0),
        cash_committed: acc.cash_committed + Number(row.cash_committed || 0),
        total_cash_collected: acc.total_cash_collected + Number(row.total_cash_collected || 0),
        base_starting_mrr: acc.base_starting_mrr + Number(row.base_starting_mrr || 0),
        base_clients: acc.base_clients + (row.base_clients || 0),
        lost_clients: acc.lost_clients + (row.lost_clients || 0),
        lost_mrr: acc.lost_mrr + Number(row.lost_mrr || 0),
      }), defaultMetrics);

      // Aggregate B2B ads metrics
      const aggregatedB2B = (b2bResult.data || []).reduce((acc, row) => ({
        appointments_booked: acc.appointments_booked + (row.appointments_booked || 0),
        appointments_showed: acc.appointments_showed + (row.appointments_showed || 0),
        qualified_showed: acc.qualified_showed + (row.qualified_showed || 0),
        deals_closed: acc.deals_closed + (row.deals_closed || 0),
        leads: acc.leads + (row.leads || 0),
        ad_spend: acc.ad_spend + Number(row.ad_spend || 0),
        revenue: acc.revenue + Number(row.revenue || 0),
        cash_collected: acc.cash_collected + Number(row.cash_collected || 0),
      }), defaultB2BMetrics);

      setMetrics(aggregatedSales);
      setB2BMetrics(aggregatedB2B);
      setLoading(false);
    }

    fetchMetrics();
  }, [dateRange]);

  // Calculate rates
  const totalCallsScheduled = metrics.new_calls_scheduled + metrics.followup_calls_scheduled;
  const totalCallsTaken = metrics.new_calls_taken + metrics.followup_calls_taken;
  const showRate = totalCallsScheduled > 0 ? (totalCallsTaken / totalCallsScheduled) * 100 : 0;
  const qualifiedShowRate = totalCallsTaken > 0 ? (metrics.qualified_calls_taken / totalCallsTaken) * 100 : 0;
  const bookedCloseRate = totalCallsScheduled > 0 ? (metrics.new_closes / totalCallsScheduled) * 100 : 0;
  const showCloseRate = totalCallsTaken > 0 ? (metrics.new_closes / totalCallsTaken) * 100 : 0;
  const churnRate = metrics.base_clients > 0 ? (metrics.lost_clients / metrics.base_clients) * 100 : 0;
  const cashPerCallBooked = totalCallsScheduled > 0 ? metrics.total_cash_collected / totalCallsScheduled : 0;
  const avgCloseCash = metrics.new_closes > 0 ? metrics.total_cash_collected / metrics.new_closes : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading sales dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            Frontend sales performance and closing metrics
          </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* B2B Ads Metrics (from b2b_ads_metrics table) */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          B2B Ads Pipeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b2bMetrics.leads}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Appointments Booked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b2bMetrics.appointments_booked}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Appointments Showed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b2bMetrics.appointments_showed}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Qualified Showed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b2bMetrics.qualified_showed}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Deals Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{b2bMetrics.deals_closed}</div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ad Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(b2bMetrics.ad_spend)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(b2bMetrics.revenue)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Cash Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(b2bMetrics.cash_collected)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">B2B Show-Up Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {b2bMetrics.appointments_booked > 0 
                  ? ((b2bMetrics.appointments_showed / b2bMetrics.appointments_booked) * 100).toFixed(1) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Call Activity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">New Calls Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.new_calls_scheduled}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Follow-Up Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.followup_calls_scheduled}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">New Calls Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.new_calls_taken}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Qualified Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.qualified_calls_taken}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">No-Shows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.no_shows}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Rates */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Performance Rates
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Show Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{showRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Qualified Show %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qualifiedShowRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Booked → Close %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookedCloseRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Show → Close %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{showCloseRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Churn Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{churnRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue & Cash */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue & Cash
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">New Closes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.new_closes}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">New MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(metrics.new_mrr)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Cash Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(metrics.total_cash_collected)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Cash Per Call Booked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(cashPerCallBooked)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Close Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgCloseCash)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Client Retention */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Client Retention
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Base Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.base_clients}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Base MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.base_starting_mrr)}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Lost Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.lost_clients}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Lost MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(metrics.lost_mrr)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
