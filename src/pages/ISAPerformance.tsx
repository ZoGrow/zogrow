import { useState, useEffect, useMemo } from "react";
import { subDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Headphones, Calendar, CalendarCheck, Percent, Building2, Users, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface MetricRow {
  id: string;
  client_id: string;
  setter: string | null;
  leads: number | null;
  appointments_booked: number | null;
  appointments_showed: number | null;
  deals_closed: number | null;
  contracts_signed: number | null;
  date: string;
}

interface Client {
  id: string;
  client_name: string;
}

interface ISAClientStats {
  clientId: string;
  clientName: string;
  leads: number;
  booked: number;
  showed: number;
  deals: number;
  contracts: number;
  leadToApptRate: number;
  showUpRate: number;
}

interface ISASummary {
  name: string;
  totalLeads: number;
  totalBooked: number;
  totalShowed: number;
  totalDeals: number;
  totalContracts: number;
}

export default function ISAPerformance() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isaUsers, setIsaUsers] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedISA, setSelectedISA] = useState<string>("all");

  // Fetch ISA users from user_roles
  useEffect(() => {
    const fetchISAUsers = async () => {
      // Get users with ISA role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "isa");
      
      if (roleError || !roleData || roleData.length === 0) {
        setIsaUsers([]);
        return;
      }

      const isaUserIds = roleData.map(r => r.user_id);
      
      // Fetch profiles for those users
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .in("user_id", isaUserIds)
        .order("full_name");
      
      if (!profileError && profileData) {
        setIsaUsers(profileData.filter(p => p.full_name).map(p => ({ name: p.full_name! })));
      }
    };
    fetchISAUsers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const fromDate = dateRange?.from 
        ? format(dateRange.from, "yyyy-MM-dd") 
        : format(subDays(new Date(), 30), "yyyy-MM-dd");
      const toDate = dateRange?.to 
        ? format(dateRange.to, "yyyy-MM-dd") 
        : format(new Date(), "yyyy-MM-dd");

      const [metricsRes, clientsRes] = await Promise.all([
        supabase
          .from("metrics")
          .select("id, client_id, setter, leads, appointments_booked, appointments_showed, deals_closed, contracts_signed, date")
          .gte("date", fromDate)
          .lte("date", toDate),
        supabase.from("clients").select("id, client_name"),
      ]);

      if (!metricsRes.error) {
        setMetrics(metricsRes.data || []);
      }
      if (!clientsRes.error) {
        setClients(clientsRes.data || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [dateRange]);

  const clientMap = useMemo(() => {
    return new Map(clients.map(c => [c.id, c.client_name]));
  }, [clients]);

  // Get unique ISA names
  const isaNames = useMemo(() => {
    const names = new Set<string>();
    metrics.forEach(m => {
      if (m.setter) names.add(m.setter);
    });
    return Array.from(names).sort();
  }, [metrics]);

  // Filter metrics by selected ISA
  const filteredMetrics = useMemo(() => {
    if (selectedISA === "all") return metrics;
    return metrics.filter(m => m.setter === selectedISA);
  }, [metrics, selectedISA]);

  // Calculate stats per client for selected ISA(s)
  const clientStats = useMemo(() => {
    const statsMap = new Map<string, {
      leads: number;
      booked: number;
      showed: number;
      deals: number;
      contracts: number;
    }>();

    filteredMetrics.forEach((m) => {
      const current = statsMap.get(m.client_id) || { 
        leads: 0, booked: 0, showed: 0, deals: 0, contracts: 0 
      };
      statsMap.set(m.client_id, {
        leads: current.leads + (m.leads || 0),
        booked: current.booked + (m.appointments_booked || 0),
        showed: current.showed + (m.appointments_showed || 0),
        deals: current.deals + (m.deals_closed || 0),
        contracts: current.contracts + (m.contracts_signed || 0),
      });
    });

    const result: ISAClientStats[] = [];
    statsMap.forEach((stats, clientId) => {
      result.push({
        clientId,
        clientName: clientMap.get(clientId) || "Unknown Client",
        leads: stats.leads,
        booked: stats.booked,
        showed: stats.showed,
        deals: stats.deals,
        contracts: stats.contracts,
        leadToApptRate: stats.leads > 0 ? (stats.booked / stats.leads) * 100 : 0,
        showUpRate: stats.booked > 0 ? (stats.showed / stats.booked) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.booked - a.booked);
  }, [filteredMetrics, clientMap]);

  // Calculate totals
  const totals = useMemo(() => {
    return clientStats.reduce(
      (acc, client) => ({
        leads: acc.leads + client.leads,
        booked: acc.booked + client.booked,
        showed: acc.showed + client.showed,
        deals: acc.deals + client.deals,
        contracts: acc.contracts + client.contracts,
      }),
      { leads: 0, booked: 0, showed: 0, deals: 0, contracts: 0 }
    );
  }, [clientStats]);

  // ISA summary for dropdown display
  const isaSummaries = useMemo(() => {
    const summaryMap = new Map<string, ISASummary>();
    
    metrics.forEach(m => {
      if (!m.setter) return;
      const current = summaryMap.get(m.setter) || {
        name: m.setter,
        totalLeads: 0,
        totalBooked: 0,
        totalShowed: 0,
        totalDeals: 0,
        totalContracts: 0,
      };
      summaryMap.set(m.setter, {
        ...current,
        totalLeads: current.totalLeads + (m.leads || 0),
        totalBooked: current.totalBooked + (m.appointments_booked || 0),
        totalShowed: current.totalShowed + (m.appointments_showed || 0),
        totalDeals: current.totalDeals + (m.deals_closed || 0),
        totalContracts: current.totalContracts + (m.contracts_signed || 0),
      });
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.totalBooked - a.totalBooked);
  }, [metrics]);

  const leadToApptRate = totals.leads > 0 ? (totals.booked / totals.leads) * 100 : 0;
  const showUpRate = totals.booked > 0 ? (totals.showed / totals.booked) * 100 : 0;
  const apptToContractRate = totals.showed > 0 ? (totals.contracts / totals.showed) * 100 : 0;
  const apptToDealRate = totals.showed > 0 ? (totals.deals / totals.showed) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading ISA performance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">ISA Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track appointments and conversions by ISA across all clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedISA} onValueChange={setSelectedISA}>
            <SelectTrigger className="w-[200px] bg-card border-border">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" />
                <SelectValue placeholder="Select ISA" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All ISAs ({isaUsers.length})
                </div>
              </SelectItem>
              {isaUsers.map((isa) => {
                const summary = isaSummaries.find(s => s.name === isa.name);
                return (
                  <SelectItem key={isa.name} value={isa.name}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{isa.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {summary?.totalBooked || 0} booked
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Leads"
          value={totals.leads.toLocaleString()}
          icon={Users}
          variant="primary"
        />
        <KPICard
          title="Appts Booked"
          value={totals.booked.toLocaleString()}
          icon={Calendar}
          variant="primary"
        />
        <KPICard
          title="Appts Showed"
          value={totals.showed.toLocaleString()}
          icon={CalendarCheck}
          variant="success"
        />
        <KPICard
          title="Lead → Appt Rate"
          value={`${leadToApptRate.toFixed(1)}%`}
          icon={TrendingUp}
          variant={leadToApptRate >= 30 ? "success" : "warning"}
        />
        <KPICard
          title="Show-Up Rate"
          value={`${showUpRate.toFixed(1)}%`}
          icon={Percent}
          variant={showUpRate >= 60 ? "success" : "warning"}
        />
        <KPICard
          title="Contracts"
          value={totals.contracts.toLocaleString()}
          icon={Target}
          variant="success"
        />
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{leadToApptRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Lead → Appt Booked</p>
              <p className="text-xs text-muted-foreground">{totals.leads} leads → {totals.booked} booked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{showUpRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Show-Up Rate</p>
              <p className="text-xs text-muted-foreground">{totals.booked} booked → {totals.showed} showed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{apptToContractRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Showed → Contract</p>
              <p className="text-xs text-muted-foreground">{totals.showed} showed → {totals.contracts} contracts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{totals.deals}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Deals Closed</p>
              <p className="text-xs text-muted-foreground">{apptToDealRate.toFixed(1)}% close rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Performance by Client
            {selectedISA !== "all" && (
              <Badge variant="secondary" className="ml-2">
                <Headphones className="h-3 w-3 mr-1" />
                {selectedISA}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientStats.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No ISA data found for this date range</p>
              <p className="text-sm text-muted-foreground mt-1">
                Assign an ISA when adding metrics to track their performance
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground text-right">Leads</TableHead>
                  <TableHead className="text-muted-foreground text-right">Booked</TableHead>
                  <TableHead className="text-muted-foreground text-right">Showed</TableHead>
                  <TableHead className="text-muted-foreground text-right">Lead→Appt</TableHead>
                  <TableHead className="text-muted-foreground text-right">Show Rate</TableHead>
                  <TableHead className="text-muted-foreground text-right">Contracts</TableHead>
                  <TableHead className="text-muted-foreground text-right">Deals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientStats.map((client) => (
                  <TableRow key={client.clientId} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{client.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{client.leads}</TableCell>
                    <TableCell className="text-right font-medium">{client.booked}</TableCell>
                    <TableCell className="text-right font-medium text-success">{client.showed}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={client.leadToApptRate >= 30 ? "default" : "secondary"}
                        className={client.leadToApptRate >= 30 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.leadToApptRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={client.showUpRate >= 60 ? "default" : "secondary"}
                        className={client.showUpRate >= 60 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.showUpRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{client.contracts}</TableCell>
                    <TableCell className="text-right">{client.deals}</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="border-t-2 border-border bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.leads}</TableCell>
                  <TableCell className="text-right">{totals.booked}</TableCell>
                  <TableCell className="text-right text-success">{totals.showed}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{leadToApptRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{showUpRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{totals.contracts}</TableCell>
                  <TableCell className="text-right">{totals.deals}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
