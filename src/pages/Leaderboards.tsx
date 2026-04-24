import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getKPIStatus } from "@/lib/kpiUtils";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import type { DateRange } from "react-day-picker";
import { useRealMetrics } from "@/hooks/useRealMetrics";

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const leaderboardConfigs = [
  { key: 'roas', label: 'ROAS', icon: TrendingUp, format: (v: number) => `${v.toFixed(2)}x`, higherIsBetter: true },
  { key: 'cpl', label: 'CPL', icon: DollarSign, format: formatCurrency, higherIsBetter: false },
  { key: 'show_up_rate', label: 'Show-Up Rate', icon: Target, format: (v: number) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'cac', label: 'Cost/Deal', icon: DollarSign, format: formatCurrency, higherIsBetter: false },
  { key: 'close_rate', label: 'Close Rate', icon: Target, format: (v: number) => `${v.toFixed(2)}%`, higherIsBetter: true },
  { key: 'cost_per_appointment_booked', label: 'Cost/Appt Booked', icon: DollarSign, format: formatCurrency, higherIsBetter: false },
  { key: 'cost_per_appointment_showed', label: 'Cost/Appt Showed', icon: DollarSign, format: formatCurrency, higherIsBetter: false },
  { key: 'lead_to_appointment_rate', label: 'Lead→Appt Rate', icon: Target, format: (v: number) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, format: formatCurrency, higherIsBetter: true },
  { key: 'deals_closed', label: 'Deals Closed', icon: Target, format: (v: number) => v.toFixed(0), higherIsBetter: true },
];

export default function Leaderboards() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'roas', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('roas');

  const { loading, clientPerformance, avgMetrics } = useRealMetrics(dateRange);

  const handleDateRangeChange = (range: DateRange) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
    }
  };

  const sortedData = useMemo(() => {
    const config = leaderboardConfigs.find(c => c.key === activeTab);
    if (!config) return clientPerformance;

    return [...clientPerformance].sort((a, b) => {
      const aVal = a[config.key as keyof typeof a] as number;
      const bVal = b[config.key as keyof typeof b] as number;
      
      if (sortConfig.direction === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [clientPerformance, activeTab, sortConfig]);

  const handleSort = () => {
    setSortConfig(prev => ({
      key: activeTab,
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading leaderboards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Leaderboards</h1>
          <p className="text-muted-foreground">
            Compare client performance across all key metrics
          </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Tabs for different metrics */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        const config = leaderboardConfigs.find(c => c.key === v);
        setSortConfig({ key: v, direction: config?.higherIsBetter ? 'desc' : 'asc' });
      }}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {leaderboardConfigs.map((config) => (
            <TabsTrigger 
              key={config.key} 
              value={config.key}
              className="text-xs px-3 py-1.5"
            >
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {leaderboardConfigs.map((config) => (
          <TabsContent key={config.key} value={config.key} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <config.icon className="h-5 w-5 text-primary" />
                    <CardTitle>{config.label} Leaderboard</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSort}>
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    {sortConfig.direction === 'desc' ? 'Highest First' : 'Lowest First'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No metrics data available. Import data or add metrics to see leaderboards.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Market</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={handleSort}>
                          <div className="flex items-center justify-end gap-1">
                            {config.label}
                            {sortConfig.direction === 'desc' ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">vs Avg</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((client, index) => {
                        const value = client[config.key as keyof typeof client] as number;
                        const avgKey = `avg_${config.key}` as keyof typeof avgMetrics;
                        const avgValue = (avgMetrics[avgKey] as number) || 0;
                        const vsAvg = avgValue ? ((value - avgValue) / avgValue) * 100 : 0;
                        const status = getKPIStatus(value, avgValue, config.key);
                        
                        // For metrics where lower is better, invert the comparison
                        const displayVsAvg = config.higherIsBetter ? vsAvg : -vsAvg;
                        
                        return (
                          <TableRow 
                            key={client.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <TableCell>
                              <span className={cn(
                                "font-bold",
                                index === 0 && "text-yellow-500",
                                index === 1 && "text-gray-400",
                                index === 2 && "text-amber-600"
                              )}>
                                #{index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{client.client_name}</TableCell>
                            <TableCell className="text-muted-foreground">{client.market}, {client.state}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {config.format(value)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              displayVsAvg > 0 ? "text-success" : displayVsAvg < 0 ? "text-destructive" : ""
                            )}>
                              {displayVsAvg > 0 ? '+' : ''}{displayVsAvg.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                status === 'good' && "bg-success/20 text-success",
                                status === 'neutral' && "bg-warning/20 text-warning",
                                status === 'bad' && "bg-destructive/20 text-destructive"
                              )}>
                                {status === 'good' ? 'Above Avg' : status === 'neutral' ? 'Near Avg' : 'Below Avg'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
