import { Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { metricTooltips } from "@/lib/kpiUtils";

interface AverageMetricsProps {
  avgMetrics: {
    avg_impressions: number;
    avg_clicks: number;
    avg_spend: number;
    avg_leads: number;
    avg_dials_made: number;
    avg_pickups: number;
    avg_appointments_booked: number;
    avg_appointments_showed: number;
    avg_deals_closed: number;
    avg_revenue: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_cpl: number;
    avg_cost_per_appointment_booked: number;
    avg_cost_per_appointment_showed: number;
    avg_show_up_rate: number;
    avg_lead_to_appointment_rate: number;
    avg_cac: number;
    avg_aov: number;
    avg_roas: number;
    avg_close_rate: number;
    client_count: number;
  };
  className?: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

interface MetricItemProps {
  label: string;
  value: string;
  metricKey?: string;
  highlight?: 'success' | 'warning' | 'destructive';
}

function MetricItem({ label, value, metricKey, highlight }: MetricItemProps) {
  const tooltipInfo = metricKey ? metricTooltips[metricKey] : null;
  
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {tooltipInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm mb-1">{tooltipInfo.description}</p>
              <p className="text-xs text-muted-foreground">{tooltipInfo.benchmark}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={cn(
        "text-xl font-bold",
        highlight === 'success' && "text-success",
        highlight === 'warning' && "text-warning",
        highlight === 'destructive' && "text-destructive"
      )}>
        {value}
      </p>
    </div>
  );
}

export function AverageMetricsSection({ avgMetrics, className }: AverageMetricsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">
          Average Metrics Per Partner ({avgMetrics.client_count} active)
        </h2>
      </div>
      
      {/* Traffic Metrics */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Traffic Metrics</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Avg Impressions" value={formatNumber(avgMetrics.avg_impressions)} />
          <MetricItem label="Avg Clicks" value={formatNumber(avgMetrics.avg_clicks)} />
          <MetricItem 
            label="Avg CTR" 
            value={`${avgMetrics.avg_ctr.toFixed(2)}%`}
            metricKey="ctr"
          />
          <MetricItem 
            label="Avg CPC" 
            value={formatCurrency(avgMetrics.avg_cpc)}
            metricKey="cpc"
          />
        </div>
      </div>
      
      {/* Volume Metrics */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Volume Metrics</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricItem label="Avg Spend" value={formatCurrency(avgMetrics.avg_spend)} />
          <MetricItem label="Avg Leads" value={formatNumber(avgMetrics.avg_leads)} />
          <MetricItem label="Avg Dials" value={formatNumber(avgMetrics.avg_dials_made)} />
          <MetricItem label="Avg Pickups" value={formatNumber(avgMetrics.avg_pickups)} />
          <MetricItem label="Avg Appts Booked" value={formatNumber(avgMetrics.avg_appointments_booked)} />
          <MetricItem label="Avg Appts Showed" value={formatNumber(avgMetrics.avg_appointments_showed)} />
        </div>
      </div>

      {/* Results Metrics */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Results</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricItem label="Avg Deals Closed" value={avgMetrics.avg_deals_closed.toFixed(1)} />
          <MetricItem 
            label="Avg Revenue" 
            value={formatCurrency(avgMetrics.avg_revenue)} 
            highlight="success"
          />
          <MetricItem 
            label="Avg ROAS" 
            value={`${avgMetrics.avg_roas.toFixed(2)}x`}
            metricKey="roas"
            highlight={avgMetrics.avg_roas >= 3 ? 'success' : avgMetrics.avg_roas >= 1 ? 'warning' : 'destructive'}
          />
        </div>
      </div>
      
      {/* Cost Metrics */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Cost Metrics</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem 
            label="Avg CPL" 
            value={formatCurrency(avgMetrics.avg_cpl)} 
            metricKey="cpl"
          />
          <MetricItem 
            label="Avg Cost / Appt Booked" 
            value={formatCurrency(avgMetrics.avg_cost_per_appointment_booked)} 
            metricKey="cost_per_appointment_booked"
          />
          <MetricItem 
            label="Avg Cost / Appt Showed" 
            value={formatCurrency(avgMetrics.avg_cost_per_appointment_showed)} 
            metricKey="cost_per_appointment_showed"
          />
          <MetricItem 
            label="Avg CAC (Cost/Deal)" 
            value={formatCurrency(avgMetrics.avg_cac)} 
            metricKey="cac"
          />
          <MetricItem 
            label="Avg AOV (Revenue/Deal)" 
            value={formatCurrency(avgMetrics.avg_aov)} 
            metricKey="aov"
          />
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Conversion Rates</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricItem 
            label="Avg Lead → Appt Rate" 
            value={`${avgMetrics.avg_lead_to_appointment_rate.toFixed(1)}%`}
            metricKey="lead_to_appointment_rate"
          />
          <MetricItem 
            label="Avg Show-Up Rate" 
            value={`${avgMetrics.avg_show_up_rate.toFixed(1)}%`}
            metricKey="show_up_rate"
            highlight={avgMetrics.avg_show_up_rate >= 60 ? 'success' : avgMetrics.avg_show_up_rate >= 45 ? 'warning' : 'destructive'}
          />
          <MetricItem 
            label="Avg Close Rate" 
            value={`${avgMetrics.avg_close_rate.toFixed(2)}%`}
            metricKey="close_rate"
          />
        </div>
      </div>
    </div>
  );
}
