import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, AlertTriangle, TrendingDown, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getKPIStatus } from "@/lib/kpiUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ClientPerformance {
  id: string;
  client_name: string;
  roas: number;
  cpl: number;
  show_up_rate: number;
  cac: number;
  status: string;
}

interface PerformanceListsProps {
  clients: ClientPerformance[];
  agencyAvg: {
    avg_roas: number;
    avg_cpl: number;
    avg_show_up_rate: number;
    avg_cac: number;
  };
  className?: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

type MetricType = 'roas' | 'cpl' | 'show_up_rate' | 'cac';

interface LeaderboardConfig {
  title: string;
  icon: typeof Rocket;
  iconBg: string;
  metricKey: MetricType;
  formatFn: (v: number) => string;
  agencyKey: 'avg_roas' | 'avg_cpl' | 'avg_show_up_rate' | 'avg_cac';
  sortDesc: boolean; // true = higher is better at top, false = lower is better at top
}

const leaderboardConfigs: LeaderboardConfig[] = [
  {
    title: 'Top Clients by ROAS',
    icon: Rocket,
    iconBg: 'bg-success/10',
    metricKey: 'roas',
    formatFn: (v) => `${v.toFixed(2)}x`,
    agencyKey: 'avg_roas',
    sortDesc: true,
  },
  {
    title: 'Clients by CPL',
    icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    metricKey: 'cpl',
    formatFn: formatCurrency,
    agencyKey: 'avg_cpl',
    sortDesc: false, // Lower CPL is better
  },
  {
    title: 'Clients by Show-Up Rate',
    icon: TrendingDown,
    iconBg: 'bg-destructive/10',
    metricKey: 'show_up_rate',
    formatFn: (v) => `${v.toFixed(1)}%`,
    agencyKey: 'avg_show_up_rate',
    sortDesc: true, // Higher show-up is better
  },
  {
    title: 'Clients by Cost/Deal',
    icon: DollarSign,
    iconBg: 'bg-destructive/10',
    metricKey: 'cac',
    formatFn: formatCurrency,
    agencyKey: 'avg_cac',
    sortDesc: false, // Lower CAC is better
  },
];

function FullLeaderboard({ 
  clients, 
  config, 
  agencyAvg 
}: { 
  clients: ClientPerformance[]; 
  config: LeaderboardConfig;
  agencyAvg: PerformanceListsProps['agencyAvg'];
}) {
  const navigate = useNavigate();
  const activeClients = clients.filter(c => c.status === 'active');
  
  const sortedClients = [...activeClients].sort((a, b) => {
    const aVal = a[config.metricKey];
    const bVal = b[config.metricKey];
    return config.sortDesc ? bVal - aVal : aVal - bVal;
  });

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {sortedClients.map((client, index) => {
        const value = client[config.metricKey];
        const status = getKPIStatus(value, agencyAvg[config.agencyKey], config.metricKey);
        
        return (
          <div 
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-border"
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                index === 0 ? "bg-primary text-primary-foreground" :
                index === 1 ? "bg-primary/70 text-primary-foreground" :
                index === 2 ? "bg-primary/50 text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </span>
              <span className="font-medium">{client.client_name}</span>
            </div>
            <span className={cn(
              "text-sm font-bold",
              status === 'good' ? 'text-success' : status === 'bad' ? 'text-destructive' : 'text-warning'
            )}>
              {config.formatFn(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PerformanceLists({ clients, agencyAvg, className }: PerformanceListsProps) {
  const navigate = useNavigate();
  const activeClients = clients.filter(c => c.status === 'active');

  const ListCard = ({ config }: { config: LeaderboardConfig }) => {
    const Icon = config.icon;
    
    const sortedClients = [...activeClients]
      .sort((a, b) => {
        const aVal = a[config.metricKey];
        const bVal = b[config.metricKey];
        return config.sortDesc ? bVal - aVal : aVal - bVal;
      })
      .slice(0, 5);

    return (
      <Dialog>
        <div className="rounded-xl border border-border bg-card p-4">
          <DialogTrigger asChild>
            <div className="flex items-center justify-between mb-3 cursor-pointer group">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", config.iconBg)}>
                  <Icon className={cn(
                    "h-4 w-4",
                    config.iconBg.includes('success') ? 'text-success' :
                    config.iconBg.includes('warning') ? 'text-warning' : 'text-destructive'
                  )} />
                </div>
                <h4 className="text-sm font-semibold">{config.title.replace('Clients by ', '').replace('Top Clients by ', 'Top ')}</h4>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground group-hover:text-primary">
                View All
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </DialogTrigger>
          
          <div className="space-y-1">
            {sortedClients.map(client => {
              const value = client[config.metricKey];
              const status = getKPIStatus(value, agencyAvg[config.agencyKey], config.metricKey);
              
              return (
                <div 
                  key={client.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clients/${client.id}`);
                  }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium truncate flex-1">{client.client_name}</span>
                  <span className={cn(
                    "text-sm font-bold ml-2",
                    status === 'good' ? 'text-success' : status === 'bad' ? 'text-destructive' : 'text-warning'
                  )}>
                    {config.formatFn(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn(
                "h-5 w-5",
                config.iconBg.includes('success') ? 'text-success' :
                config.iconBg.includes('warning') ? 'text-warning' : 'text-destructive'
              )} />
              {config.title}
            </DialogTitle>
          </DialogHeader>
          <FullLeaderboard clients={clients} config={config} agencyAvg={agencyAvg} />
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className={cn("grid md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {leaderboardConfigs.map(config => (
        <ListCard key={config.metricKey} config={config} />
      ))}
    </div>
  );
}
