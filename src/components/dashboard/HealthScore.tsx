import { useMemo } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { calculateHealthScore } from "@/lib/kpiUtils";
import { CalculatedMetrics } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface HealthScoreProps {
  metrics: CalculatedMetrics;
  previousScore?: number;
  className?: string;
}

export function HealthScore({ metrics, previousScore, className }: HealthScoreProps) {
  const healthData = useMemo(() => {
    return calculateHealthScore(metrics, {
      cpl: 50,
      showUpRate: 60,
      cac: 4000,
      roas: 3,
    });
  }, [metrics]);
  
  const scoreDiff = previousScore !== undefined ? healthData.score - previousScore : null;
  
  const statusColors = {
    good: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success/30' },
    neutral: { bg: 'bg-warning/10', text: 'text-warning', ring: 'ring-warning/30' },
    bad: { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive/30' },
  };
  
  const colors = statusColors[healthData.status];
  
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Agency Health Score</h3>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className={cn(
          "relative h-28 w-28 rounded-full flex items-center justify-center ring-4",
          colors.bg,
          colors.ring
        )}>
          <div className="text-center">
            <span className={cn("text-4xl font-bold", colors.text)}>
              {healthData.score}
            </span>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">CPL (30%)</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${healthData.breakdown.cpl}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{healthData.breakdown.cpl}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Show-Up (25%)</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${healthData.breakdown.showUpRate}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{healthData.breakdown.showUpRate}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">CAC (25%)</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${healthData.breakdown.cac}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{healthData.breakdown.cac}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ROAS (20%)</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${healthData.breakdown.roas}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{healthData.breakdown.roas}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trend */}
      {scoreDiff !== null && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
          {scoreDiff > 0 ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : scoreDiff < 0 ? (
            <TrendingDown className="h-4 w-4 text-destructive" />
          ) : null}
          <span className={cn(
            "text-sm font-medium",
            scoreDiff > 0 ? "text-success" : scoreDiff < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {scoreDiff > 0 ? '+' : ''}{scoreDiff} pts vs last period
          </span>
        </div>
      )}
    </div>
  );
}
