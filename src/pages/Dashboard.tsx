import { useState } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
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
} from "lucide-react";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { EnhancedKPICard } from "@/components/dashboard/EnhancedKPICard";

import { PerformanceLists } from "@/components/dashboard/PerformanceLists";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AverageMetricsSection } from "@/components/dashboard/AverageMetricsSection";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";
import { useRealMetrics } from "@/hooks/useRealMetrics";

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

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const {
    loading,
    totalMetrics: metrics,
    previousMetrics,
    clientPerformance,
    avgMetrics,
    chartData,
  } = useRealMetrics({ from: dateRange?.from, to: dateRange?.to });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agency Dashboard</h1>
          <p className="text-muted-foreground">
            Nationwide performance across all clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeToggle />
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>


      {/* Most Recent Activity */}
      <RecentActivity />

      {/* Performance Intelligence Lists - Clickable to full leaderboards */}
      <PerformanceLists clients={clientPerformance} agencyAvg={avgMetrics} />

      {/* Average Metrics Per Partner - All metrics */}
      <AverageMetricsSection avgMetrics={avgMetrics} />

      {/* Primary Volume KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <EnhancedKPICard
          title="Total Spend"
          value={formatCurrency(metrics.ad_spend)}
          rawValue={metrics.ad_spend}
          previousValue={previousMetrics?.ad_spend}
          icon={Wallet}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Total Leads"
          value={formatNumber(metrics.leads)}
          rawValue={metrics.leads}
          previousValue={previousMetrics?.leads}
          icon={Users}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Appointments Booked"
          value={formatNumber(metrics.appointments_booked)}
          rawValue={metrics.appointments_booked}
          previousValue={previousMetrics?.appointments_booked}
          icon={Calendar}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Sales Team Booked"
          value={formatNumber(metrics.sales_team_booked)}
          rawValue={metrics.sales_team_booked}
          previousValue={previousMetrics?.sales_team_booked}
          subtitle={`${metrics.lead_to_sales_team_booked.toFixed(1)}% of leads`}
          icon={Calendar}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Deals Closed"
          value={metrics.deals_closed}
          rawValue={metrics.deals_closed}
          previousValue={previousMetrics?.deals_closed}
          icon={Handshake}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Revenue (GCI)"
          value={formatCurrency(metrics.revenue)}
          rawValue={metrics.revenue}
          previousValue={previousMetrics?.revenue}
          icon={TrendingUp}
          showComparisons={false}
        />
      </div>

      {/* Secondary KPIs - Traffic */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <EnhancedKPICard
          title="Impressions"
          value={formatNumber(metrics.impressions)}
          rawValue={metrics.impressions}
          previousValue={previousMetrics?.impressions}
          icon={Eye}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Clicks"
          value={formatNumber(metrics.clicks)}
          rawValue={metrics.clicks}
          previousValue={previousMetrics?.clicks}
          icon={MousePointerClick}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Live Transfers"
          value={formatNumber(metrics.appointments_showed)}
          rawValue={metrics.appointments_showed}
          previousValue={previousMetrics?.appointments_showed}
          icon={CalendarCheck}
          showComparisons={false}
        />
        <EnhancedKPICard
          title="Show-Up Rate"
          value={`${metrics.show_up_rate.toFixed(1)}%`}
          rawValue={metrics.show_up_rate}
          previousValue={previousMetrics?.show_up_rate}
          agencyAvg={avgMetrics.avg_show_up_rate}
          metricKey="show_up_rate"
          icon={Percent}
        />
        <EnhancedKPICard
          title="ROAS"
          value={`${metrics.roas.toFixed(2)}x`}
          rawValue={metrics.roas}
          previousValue={previousMetrics?.roas}
          agencyAvg={avgMetrics.avg_roas}
          metricKey="roas"
          icon={BarChart3}
        />
      </div>

      {/* Cost KPIs with full benchmarking */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EnhancedKPICard
          title="CPL"
          value={formatCurrency(metrics.cpl)}
          rawValue={metrics.cpl}
          previousValue={previousMetrics?.cpl}
          agencyAvg={avgMetrics.avg_cpl}
          metricKey="cpl"
          icon={DollarSign}
        />
        <EnhancedKPICard
          title="Cost / Appt Booked"
          value={formatCurrency(metrics.cost_per_appointment_booked)}
          rawValue={metrics.cost_per_appointment_booked}
          previousValue={previousMetrics?.cost_per_appointment_booked}
          agencyAvg={avgMetrics.avg_cost_per_appointment_booked}
          metricKey="cost_per_appointment_booked"
          icon={Target}
        />
        <EnhancedKPICard
          title="Cost / Appt Showed"
          value={formatCurrency(metrics.cost_per_appointment_showed)}
          rawValue={metrics.cost_per_appointment_showed}
          previousValue={previousMetrics?.cost_per_appointment_showed}
          agencyAvg={avgMetrics.avg_cost_per_appointment_showed}
          metricKey="cost_per_appointment_showed"
          icon={Target}
        />
        <EnhancedKPICard
          title="CAC (Cost / Deal)"
          value={formatCurrency(metrics.cac)}
          rawValue={metrics.cac}
          previousValue={previousMetrics?.cac}
          agencyAvg={avgMetrics.avg_cac}
          metricKey="cac"
          icon={DollarSign}
        />
      </div>

      {/* Trend Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <MetricsChart
          data={chartData}
          type="area"
          dataKey="ad_spend"
          title="Spend Over Time"
          color="hsl(var(--chart-2))"
          valueFormatter={formatCurrency}
        />
        <MetricsChart
          data={chartData}
          type="area"
          dataKey="leads"
          title="Leads Over Time"
          color="hsl(var(--primary))"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MetricsChart
          data={chartData}
          type="bar"
          dataKey="appointments_booked"
          title="Appointments Booked"
          color="hsl(var(--primary))"
        />
        <MetricsChart
          data={chartData}
          type="bar"
          dataKey="deals_closed"
          title="Deals Closed"
          color="hsl(var(--success))"
        />
      </div>

      {/* Clients Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Client Performance</h2>
        <ClientsTable data={clientPerformance} agencyAvg={avgMetrics} />
      </div>
    </div>
  );
}
