import { useState, useEffect, useMemo } from "react";
import { subDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Headphones, Calendar, CalendarCheck, Percent, Building2, Users, TrendingUp, Target, Phone, PhoneCall, CalendarDays, Clock } from "lucide-react";
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
  dials_made: number | null;
  pickups: number | null;
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

interface CallLog {
  id: string;
  client_id: string;
  agent_name: string | null;
  disposition: string | null;
  call_status: string | null;
  duration_seconds: number | null;
  dialed_at: string;
  contact_phone: string | null;
}

interface ISAClientStats {
  clientId: string;
  clientName: string;
  leads: number;
  dials: number;
  pickups: number;
  pickupRatePerLead: number;
  booked: number;
  showed: number;
  deals: number;
  contracts: number;
  leadToApptRate: number;
  leadToLiveTransferRate: number;
  pickupToLiveTransferRate: number;
  pickupToAppointmentRate: number;
  pickupToTotalRate: number;
  showUpRate: number;
}

interface ISASummary {
  name: string;
  totalLeads: number;
  totalDials: number;
  totalPickups: number;
  totalBooked: number;
  totalShowed: number;
  totalDeals: number;
  totalContracts: number;
}

// ISAs who don't have app accounts yet still appear in the dropdown
const DEFAULT_ISA_NAMES = ["Christian Mendiola"];

export default function ISAPerformance() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
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

      const [metricsRes, clientsRes, callsRes] = await Promise.all([
        supabase
          .from("metrics")
          .select("id, client_id, setter, leads, dials_made, pickups, appointments_booked, appointments_showed, deals_closed, contracts_signed, date")
          .gte("date", fromDate)
          .lte("date", toDate),
        supabase.from("clients").select("id, client_name"),
        supabase
          .from("dial_logs")
          .select("id, client_id, agent_name, disposition, call_status, duration_seconds, dialed_at, contact_phone")
          .gte("dialed_at", `${fromDate}T00:00:00`)
          .lte("dialed_at", `${toDate}T23:59:59`)
          .order("dialed_at", { ascending: false })
          .limit(5000),
      ]);

      if (!metricsRes.error) {
        setMetrics(metricsRes.data || []);
      }
      if (!clientsRes.error) {
        setClients(clientsRes.data || []);
      }
      if (!callsRes.error) {
        setCallLogs((callsRes.data as CallLog[]) || []);
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

  // Merge account-based ISAs with the default list for the dropdown
  const isaOptions = useMemo(() => {
    const names = new Set<string>(DEFAULT_ISA_NAMES);
    isaUsers.forEach(u => names.add(u.name));
    return Array.from(names).sort().map(name => ({ name }));
  }, [isaUsers]);

  // Filter metrics by selected ISA
  const filteredMetrics = useMemo(() => {
    if (selectedISA === "all") return metrics;
    return metrics.filter(m => m.setter === selectedISA);
  }, [metrics, selectedISA]);

  // Calculate stats per client for selected ISA(s)
  const clientStats = useMemo(() => {
    const statsMap = new Map<string, {
      leads: number;
      dials: number;
      pickups: number;
      booked: number;
      showed: number;
      deals: number;
      contracts: number;
    }>();

    filteredMetrics.forEach((m) => {
      const current = statsMap.get(m.client_id) || { 
        leads: 0, dials: 0, pickups: 0, booked: 0, showed: 0, deals: 0, contracts: 0 
      };
      statsMap.set(m.client_id, {
        leads: current.leads + (m.leads || 0),
        dials: current.dials + (m.dials_made || 0),
        pickups: current.pickups + (m.pickups || 0),
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
        dials: stats.dials,
        pickups: stats.pickups,
        pickupRatePerLead: stats.leads > 0 ? (stats.pickups / stats.leads) * 100 : 0,
        booked: stats.booked,
        showed: stats.showed,
        deals: stats.deals,
        contracts: stats.contracts,
        leadToApptRate: stats.leads > 0 ? (stats.booked / stats.leads) * 100 : 0,
        leadToLiveTransferRate: stats.leads > 0 ? (stats.showed / stats.leads) * 100 : 0,
        pickupToLiveTransferRate: stats.pickups > 0 ? (stats.showed / stats.pickups) * 100 : 0,
        pickupToAppointmentRate: stats.pickups > 0 ? (stats.booked / stats.pickups) * 100 : 0,
        pickupToTotalRate: stats.pickups > 0 ? ((stats.showed + stats.booked) / stats.pickups) * 100 : 0,
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
        dials: acc.dials + client.dials,
        pickups: acc.pickups + client.pickups,
        booked: acc.booked + client.booked,
        showed: acc.showed + client.showed,
        deals: acc.deals + client.deals,
        contracts: acc.contracts + client.contracts,
      }),
      { leads: 0, dials: 0, pickups: 0, booked: 0, showed: 0, deals: 0, contracts: 0 }
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
        totalDials: 0,
        totalPickups: 0,
        totalBooked: 0,
        totalShowed: 0,
        totalDeals: 0,
        totalContracts: 0,
      };
      summaryMap.set(m.setter, {
        ...current,
        totalLeads: current.totalLeads + (m.leads || 0),
        totalDials: current.totalDials + (m.dials_made || 0),
        totalPickups: current.totalPickups + (m.pickups || 0),
        totalBooked: current.totalBooked + (m.appointments_booked || 0),
        totalShowed: current.totalShowed + (m.appointments_showed || 0),
        totalDeals: current.totalDeals + (m.deals_closed || 0),
        totalContracts: current.totalContracts + (m.contracts_signed || 0),
      });
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.totalBooked - a.totalBooked);
  }, [metrics]);

  const pickupRatePerLead = totals.leads > 0 ? (totals.pickups / totals.leads) * 100 : 0;

  // Daily breakdown of dials / pickups
  const dailyStats = useMemo(() => {
    const map = new Map<string, { date: string; dials: number; pickups: number; leads: number; booked: number; showed: number }>();
    filteredMetrics.forEach((m) => {
      const cur = map.get(m.date) || { date: m.date, dials: 0, pickups: 0, leads: 0, booked: 0, showed: 0 };
      cur.dials += m.dials_made || 0;
      cur.pickups += m.pickups || 0;
      cur.leads += m.leads || 0;
      cur.booked += m.appointments_booked || 0;
      cur.showed += m.appointments_showed || 0;
      map.set(m.date, cur);
    });
    return Array.from(map.values())
      .filter((d) => d.dials > 0 || d.pickups > 0 || d.leads > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredMetrics]);

  const leadToApptRate = totals.leads > 0 ? (totals.booked / totals.leads) * 100 : 0;
  const leadToLiveTransferRate = totals.leads > 0 ? (totals.showed / totals.leads) * 100 : 0;
  const pickupToLiveTransferRate = totals.pickups > 0 ? (totals.showed / totals.pickups) * 100 : 0;
  const pickupToAppointmentRate = totals.pickups > 0 ? (totals.booked / totals.pickups) * 100 : 0;
  const pickupToTotalRate = totals.pickups > 0 ? ((totals.showed + totals.booked) / totals.pickups) * 100 : 0;
  const showUpRate = totals.booked > 0 ? (totals.showed / totals.booked) * 100 : 0;
  const apptToContractRate = totals.showed > 0 ? (totals.contracts / totals.showed) * 100 : 0;
  const apptToDealRate = totals.showed > 0 ? (totals.deals / totals.showed) * 100 : 0;

  // ----- Dialer call log stats (HotProspector) -----
  const callStats = useMemo(() => {
    const relevant = callLogs;
    const totalTalkSeconds = relevant.reduce((s, c) => s + (c.duration_seconds || 0), 0);
    const connected = relevant.filter((c) => (c.duration_seconds || 0) > 0);
    const dispositions = new Map<string, number>();
    relevant.forEach((c) => {
      const label = (c.disposition || c.call_status || "Unknown").trim();
      dispositions.set(label, (dispositions.get(label) || 0) + 1);
    });
    return {
      totalCalls: relevant.length,
      totalTalkSeconds,
      avgTalkSeconds: connected.length > 0 ? totalTalkSeconds / connected.length : 0,
      dispositions: Array.from(dispositions.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [callLogs]);

  const formatDuration = (seconds: number) => {
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };



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
                  All ISAs ({isaOptions.length})
                </div>
              </SelectItem>
              {isaOptions.map((isa) => {
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
          title="Dials Made"
          value={totals.dials.toLocaleString()}
          icon={PhoneCall}
          variant="primary"
        />
        <KPICard
          title="Pickups"
          value={totals.pickups.toLocaleString()}
          icon={Phone}
          variant="primary"
        />
        <KPICard
          title="Pickup Rate / Lead"
          value={`${pickupRatePerLead.toFixed(1)}%`}
          subtitle={`${totals.pickups} pickups / ${totals.leads} leads`}
          icon={Percent}
          variant={pickupRatePerLead >= 60 ? "success" : "warning"}
        />
        <KPICard
          title="Appts Booked"
          value={totals.booked.toLocaleString()}
          icon={Calendar}
          variant="primary"
        />
        <KPICard
          title="Live Transfers"
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
          title="Lead → Live Transfer Rate"
          value={`${leadToLiveTransferRate.toFixed(1)}%`}
          subtitle={`${totals.showed} transfers / ${totals.leads} leads`}
          icon={TrendingUp}
          variant={leadToLiveTransferRate >= 10 ? "success" : "warning"}
        />
        <KPICard
          title="Pickup → Live Transfer"
          value={`${pickupToLiveTransferRate.toFixed(1)}%`}
          subtitle={`${totals.showed} transfers / ${totals.pickups} pickups`}
          icon={PhoneCall}
          variant={pickupToLiveTransferRate >= 15 ? "success" : "warning"}
        />
        <KPICard
          title="Pickup → Appt Rate"
          value={`${pickupToAppointmentRate.toFixed(1)}%`}
          subtitle={`${totals.booked} booked / ${totals.pickups} pickups`}
          icon={Calendar}
          variant={pickupToAppointmentRate >= 30 ? "success" : "warning"}
        />
        <KPICard
          title="Pickup → Total Rate"
          value={`${pickupToTotalRate.toFixed(1)}%`}
          subtitle={`${totals.showed + totals.booked} outcomes / ${totals.pickups} pickups`}
          icon={Percent}
          variant={pickupToTotalRate >= 45 ? "success" : "warning"}
        />
        <KPICard
          title="Total Talk Time"
          value={formatDuration(callStats.totalTalkSeconds)}
          subtitle={`${callStats.totalCalls.toLocaleString()} dialer calls logged`}
          icon={Clock}
          variant="primary"
        />
        <KPICard
          title="Avg Talk Time"
          value={formatDuration(callStats.avgTalkSeconds)}
          subtitle="per connected call"
          icon={Clock}
          variant="primary"
        />
      </div>

      {/* Dialer dispositions */}
      {callStats.dispositions.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Call Dispositions (Dialer)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {callStats.dispositions.map((d) => (
                <Badge key={d.label} variant="secondary" className="text-sm">
                  {d.label}: {d.count.toLocaleString()}
                  <span className="ml-1 text-muted-foreground">
                    ({callStats.totalCalls > 0 ? ((d.count / callStats.totalCalls) * 100).toFixed(1) : "0.0"}%)
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}



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
              <p className="text-3xl font-bold text-primary">{leadToLiveTransferRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Lead → Live Transfer</p>
              <p className="text-xs text-muted-foreground">{totals.leads} leads → {totals.showed} transfers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{pickupToLiveTransferRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pickup → Live Transfer</p>
              <p className="text-xs text-muted-foreground">{totals.pickups} pickups → {totals.showed} transfers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{pickupToAppointmentRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pickup → Appt Booked</p>
              <p className="text-xs text-muted-foreground">{totals.pickups} pickups → {totals.booked} booked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{pickupToTotalRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pickup → Total Outcomes</p>
              <p className="text-xs text-muted-foreground">{totals.pickups} pickups → {totals.showed + totals.booked} outcomes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{totals.deals}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Deals Closed</p>
              <p className="text-xs text-muted-foreground">{apptToDealRate.toFixed(1)}% close rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Dials & Pickups */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Daily Dials & Pickup Rate
            {selectedISA !== "all" && (
              <Badge variant="secondary" className="ml-2">
                <Headphones className="h-3 w-3 mr-1" />
                {selectedISA}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No daily dial activity in this date range</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground text-right">Dials Made</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickups</TableHead>
                  <TableHead className="text-muted-foreground text-right">Leads</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup Rate / Lead</TableHead>
                  <TableHead className="text-muted-foreground text-right">Booked</TableHead>
                  <TableHead className="text-muted-foreground text-right">Live Transfers</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup→Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyStats.map((d) => {
                  const rate = d.leads > 0 ? (d.pickups / d.leads) * 100 : 0;
                  const pickupToTotal = d.pickups > 0 ? ((d.showed + d.booked) / d.pickups) * 100 : 0;
                  return (
                    <TableRow key={d.date} className="border-border">
                      <TableCell className="font-medium">
                        {format(new Date(`${d.date}T00:00:00`), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{d.dials}</TableCell>
                      <TableCell className="text-right">{d.pickups}</TableCell>
                      <TableCell className="text-right">{d.leads}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={rate >= 60 ? "default" : "secondary"}
                          className={rate >= 60 ? "bg-success/10 text-success border-success/20" : ""}
                        >
                          {rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{d.booked}</TableCell>
                      <TableCell className="text-right text-success">{d.showed}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={pickupToTotal >= 45 ? "default" : "secondary"}
                          className={pickupToTotal >= 45 ? "bg-success/10 text-success border-success/20" : ""}
                        >
                          {pickupToTotal.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                  <TableHead className="text-muted-foreground text-right">Dials</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickups</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup/Lead</TableHead>
                  <TableHead className="text-muted-foreground text-right">Booked</TableHead>
                  <TableHead className="text-muted-foreground text-right">Live Transfers</TableHead>
                  <TableHead className="text-muted-foreground text-right">Lead→Appt</TableHead>
                  <TableHead className="text-muted-foreground text-right">Lead→LT</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup→LT</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup→Appt</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pickup→Total</TableHead>
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
                    <TableCell className="text-right">{client.dials}</TableCell>
                    <TableCell className="text-right">{client.pickups}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={client.pickupRatePerLead >= 60 ? "default" : "secondary"}
                        className={client.pickupRatePerLead >= 60 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.pickupRatePerLead.toFixed(1)}%
                      </Badge>
                    </TableCell>
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
                        variant={client.leadToLiveTransferRate >= 10 ? "default" : "secondary"}
                        className={client.leadToLiveTransferRate >= 10 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.leadToLiveTransferRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={client.pickupToLiveTransferRate >= 15 ? "default" : "secondary"}
                        className={client.pickupToLiveTransferRate >= 15 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.pickupToLiveTransferRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={client.pickupToAppointmentRate >= 30 ? "default" : "secondary"}
                        className={client.pickupToAppointmentRate >= 30 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.pickupToAppointmentRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={client.pickupToTotalRate >= 45 ? "default" : "secondary"}
                        className={client.pickupToTotalRate >= 45 ? "bg-success/10 text-success border-success/20" : ""}
                      >
                        {client.pickupToTotalRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{client.deals}</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="border-t-2 border-border bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.leads}</TableCell>
                  <TableCell className="text-right">{totals.dials}</TableCell>
                  <TableCell className="text-right">{totals.pickups}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{pickupRatePerLead.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{totals.booked}</TableCell>
                  <TableCell className="text-right text-success">{totals.showed}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{leadToApptRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{leadToLiveTransferRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{pickupToLiveTransferRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{pickupToAppointmentRate.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{pickupToTotalRate.toFixed(1)}%</Badge>
                  </TableCell>
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
