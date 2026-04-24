import { useMemo } from "react";
import { calculateFunnel, FunnelStep } from "@/lib/kpiUtils";
import { CalculatedMetrics } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface FunnelChartProps {
  metrics: CalculatedMetrics;
  title?: string;
  className?: string;
}

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const formatCurrency = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export function FunnelChart({ metrics, title = "Conversion Funnel", className }: FunnelChartProps) {
  const funnelData = useMemo(() => calculateFunnel(metrics), [metrics]);
  
  // Calculate max value for scaling bars
  const maxValue = funnelData[0]?.value || 1;
  
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6", className)}>
      <h3 className="text-lg font-semibold mb-6">{title}</h3>
      
      <div className="space-y-3">
        {funnelData.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const isFirst = index === 0;
          
          return (
            <div key={step.name} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">{step.name}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    {formatNumber(step.value)}
                  </span>
                  {!isFirst && (
                    <span className={cn(
                      "font-medium px-1.5 py-0.5 rounded",
                      step.conversionRate >= 50 ? "bg-success/10 text-success" :
                      step.conversionRate >= 20 ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    )}>
                      {step.conversionRate.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-muted-foreground min-w-[60px] text-right">
                    {step.costAtStage > 0 ? formatCurrency(step.costAtStage) : '-'}
                  </span>
                </div>
              </div>
              
              <div className="h-8 bg-secondary rounded-lg overflow-hidden relative">
                <div 
                  className={cn(
                    "h-full rounded-lg transition-all duration-500 ease-out",
                    index === 0 ? "bg-primary" :
                    index === 1 ? "bg-chart-2" :
                    index === 2 ? "bg-chart-3" :
                    index === 3 ? "bg-chart-4" :
                    index === 4 ? "bg-warning" :
                    "bg-success"
                  )}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                />
                
                {/* Connector line to next step */}
                {index < funnelData.length - 1 && (
                  <div className="absolute right-0 top-full h-3 w-px bg-border" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Volume</span>
          <span>Conv. Rate</span>
          <span>Cost/Stage</span>
        </div>
      </div>
    </div>
  );
}
