import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { getDataWarnings, DataWarning } from "@/lib/kpiUtils";
import { CalculatedMetrics } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface DataWarningsProps {
  metrics: CalculatedMetrics;
  lastUpdated?: Date;
  className?: string;
}

export function DataWarnings({ metrics, lastUpdated, className }: DataWarningsProps) {
  const warnings = getDataWarnings(metrics);
  
  // Calculate days since last update
  const daysSinceUpdate = lastUpdated 
    ? Math.floor((new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > 7;
  
  if (warnings.length === 0 && !isStale) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      {warnings.map((warning, index) => (
        <div 
          key={index}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            warning.type === 'error' 
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning"
          )}
        >
          {warning.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{warning.message}</span>
        </div>
      ))}
      
      {isStale && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-destructive/10 text-destructive">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Last data update: {daysSinceUpdate} days ago</span>
        </div>
      )}
    </div>
  );
}

// Compact inline version for headers
export function DataFreshnessIndicator({ lastUpdated }: { lastUpdated?: Date }) {
  if (!lastUpdated) return null;
  
  const daysSinceUpdate = Math.floor((new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceUpdate > 7;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
      isStale ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
    )}>
      <Clock className="h-3 w-3" />
      <span>Updated {daysSinceUpdate === 0 ? 'today' : `${daysSinceUpdate}d ago`}</span>
    </div>
  );
}
