import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getKPIStatus, metricTooltips } from "@/lib/kpiUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  metricKey?: string;
  rawValue?: number;
  agencyAvg?: number;
  previousValue?: number;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
  showComparisons?: boolean;
}

export function EnhancedKPICard({ 
  title, 
  value, 
  metricKey,
  rawValue,
  agencyAvg,
  previousValue,
  subtitle,
  icon: Icon, 
  className,
  showComparisons = true,
}: EnhancedKPICardProps) {
  // Calculate comparisons
  const hasAgencyComparison = agencyAvg !== undefined && rawValue !== undefined && metricKey;
  const hasPeriodComparison = previousValue !== undefined && rawValue !== undefined;
  
  // Determine status based on agency average
  const status = hasAgencyComparison 
    ? getKPIStatus(rawValue, agencyAvg, metricKey)
    : 'neutral';
  
  // Calculate percent changes
  const vsAgencyPercent = hasAgencyComparison && agencyAvg !== 0
    ? ((rawValue - agencyAvg) / agencyAvg) * 100
    : 0;
    
  const vsPreviousPercent = hasPeriodComparison && previousValue !== 0
    ? ((rawValue - previousValue) / previousValue) * 100
    : 0;

  // Get tooltip info
  const tooltipInfo = metricKey ? metricTooltips[metricKey] : null;
  
  // Determine if lower is better for this metric
  const lowerIsBetter = metricKey && ['cpl', 'cost_per_appointment_booked', 'cost_per_appointment_showed', 'cost_per_live_transfer', 'cost_per_self_booked', 'cost_per_sales_team_booked', 'cac', 'cpc'].includes(metricKey);
  
  // For display: flip the meaning of positive/negative for "lower is better" metrics
  const periodIsGood = lowerIsBetter ? vsPreviousPercent < 0 : vsPreviousPercent > 0;
  const agencyIsGood = lowerIsBetter ? vsAgencyPercent < 0 : vsAgencyPercent > 0;

  const statusStyles = {
    good: 'bg-success/5 border-success/30',
    neutral: 'bg-card border-border',
    bad: 'bg-destructive/5 border-destructive/30',
  };

  const iconStyles = {
    good: 'bg-success/10 text-success',
    neutral: 'bg-muted text-muted-foreground',
    bad: 'bg-destructive/10 text-destructive',
  };

  const statusGlowStyles = {
    good: 'bg-success',
    neutral: 'bg-muted-foreground',
    bad: 'bg-destructive',
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        statusStyles[status],
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {tooltipInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm mb-1">{tooltipInfo.description}</p>
                <p className="text-xs text-muted-foreground">{tooltipInfo.benchmark}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn("rounded-lg p-2", iconStyles[status])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1 mb-2">{subtitle}</p>
      )}
      
      {!subtitle && <div className="mb-2" />}
      
      {showComparisons && (hasPeriodComparison || hasAgencyComparison) && (
        <div className="space-y-1">
          {hasPeriodComparison && (
            <div className="flex items-center gap-1.5">
              {vsPreviousPercent > 0 ? (
                <TrendingUp className={cn("h-3 w-3", periodIsGood ? "text-success" : "text-destructive")} />
              ) : vsPreviousPercent < 0 ? (
                <TrendingDown className={cn("h-3 w-3", periodIsGood ? "text-success" : "text-destructive")} />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(
                "text-xs font-medium",
                periodIsGood ? "text-success" : vsPreviousPercent === 0 ? "text-muted-foreground" : "text-destructive"
              )}>
                {vsPreviousPercent > 0 ? '+' : ''}{vsPreviousPercent.toFixed(1)}% vs last period
              </span>
            </div>
          )}
          
          {hasAgencyComparison && (
            <div className="flex items-center gap-1.5">
              {vsAgencyPercent > 0 ? (
                <TrendingUp className={cn("h-3 w-3", agencyIsGood ? "text-success" : "text-destructive")} />
              ) : vsAgencyPercent < 0 ? (
                <TrendingDown className={cn("h-3 w-3", agencyIsGood ? "text-success" : "text-destructive")} />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(
                "text-xs font-medium",
                agencyIsGood ? "text-success" : vsAgencyPercent === 0 ? "text-muted-foreground" : "text-destructive"
              )}>
                {vsAgencyPercent > 0 ? '+' : ''}{vsAgencyPercent.toFixed(1)}% vs agency avg
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Status glow */}
      <div 
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl",
          statusGlowStyles[status]
        )}
      />
    </div>
  );
}
