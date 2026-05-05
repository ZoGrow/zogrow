import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MetricRecord {
  id: string;
  date: string;
  client_id: string;
  campaign_id: string | null;
  impressions: number;
  clicks: number;
  ad_spend: number;
  leads: number;
  dials_made: number;
  pickups: number;
  appointments_booked: number;
  appointments_showed: number;
  deals_closed: number;
  revenue: number;
  live_transfers: number;
  self_booked: number;
  sales_team_booked: number;
}

interface CalculatedMetrics {
  impressions: number;
  clicks: number;
  ad_spend: number;
  leads: number;
  dials_made: number;
  pickups: number;
  appointments_booked: number;
  appointments_showed: number;
  deals_closed: number;
  revenue: number;
  live_transfers: number;
  self_booked: number;
  sales_team_booked: number;
  ctr: number;
  cpc: number;
  cpl: number;
  cost_per_appointment_booked: number;
  cost_per_appointment_showed: number;
  cost_per_live_transfer: number;
  cost_per_self_booked: number;
  cost_per_sales_team_booked: number;
  show_up_rate: number;
  lead_to_appointment_rate: number;
  cac: number;
  close_rate: number;
  roas: number;
}

interface ClientWithMetrics extends CalculatedMetrics {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: string;
  status: string;
}

interface AverageMetrics {
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
  avg_cost_per_live_transfer: number;
  avg_cost_per_self_booked: number;
  avg_cost_per_sales_team_booked: number;
  avg_show_up_rate: number;
  avg_lead_to_appointment_rate: number;
  avg_cac: number;
  avg_roas: number;
  avg_close_rate: number;
  client_count: number;
}

const safeDivide = (numerator: number, denominator: number): number => {
  return denominator === 0 ? 0 : numerator / denominator;
};

export const calculateKPIs = (metrics: MetricRecord[]): CalculatedMetrics => {
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      ad_spend: acc.ad_spend + (m.ad_spend || 0),
      leads: acc.leads + (m.leads || 0),
      dials_made: acc.dials_made + (m.dials_made || 0),
      pickups: acc.pickups + (m.pickups || 0),
      appointments_booked: acc.appointments_booked + (m.appointments_booked || 0),
      appointments_showed: acc.appointments_showed + (m.appointments_showed || 0),
      deals_closed: acc.deals_closed + (m.deals_closed || 0),
      revenue: acc.revenue + (m.revenue || 0),
      live_transfers: acc.live_transfers + (m.live_transfers || 0),
      self_booked: acc.self_booked + (m.self_booked || 0),
      sales_team_booked: acc.sales_team_booked + (m.sales_team_booked || 0),
    }),
    {
      impressions: 0,
      clicks: 0,
      ad_spend: 0,
      leads: 0,
      dials_made: 0,
      pickups: 0,
      appointments_booked: 0,
      appointments_showed: 0,
      deals_closed: 0,
      revenue: 0,
      live_transfers: 0,
      self_booked: 0,
      sales_team_booked: 0,
    }
  );

  return {
    ...totals,
    ctr: safeDivide(totals.clicks, totals.impressions) * 100,
    cpc: safeDivide(totals.ad_spend, totals.clicks),
    cpl: safeDivide(totals.ad_spend, totals.leads),
    cost_per_appointment_booked: safeDivide(totals.ad_spend, totals.appointments_booked),
    cost_per_appointment_showed: safeDivide(totals.ad_spend, totals.appointments_showed),
    cost_per_live_transfer: safeDivide(totals.ad_spend, totals.live_transfers),
    cost_per_self_booked: safeDivide(totals.ad_spend, totals.self_booked),
    cost_per_sales_team_booked: safeDivide(totals.ad_spend, totals.sales_team_booked),
    show_up_rate: safeDivide(totals.appointments_showed, totals.appointments_booked) * 100,
    lead_to_appointment_rate: safeDivide(totals.appointments_booked, totals.leads) * 100,
    cac: safeDivide(totals.ad_spend, totals.deals_closed),
    close_rate: safeDivide(totals.deals_closed, totals.leads) * 100,
    roas: safeDivide(totals.revenue, totals.ad_spend),
  };
};

interface Client {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: string;
  status: string;
}

const normalizeMetric = (m: any): MetricRecord => ({
  id: m.id,
  date: m.date,
  client_id: m.client_id,
  campaign_id: m.campaign_id,
  impressions: m.impressions || 0,
  clicks: m.clicks || 0,
  ad_spend: Number(m.ad_spend) || 0,
  leads: m.leads || 0,
  dials_made: m.dials_made || 0,
  pickups: m.pickups || 0,
  appointments_booked: m.appointments_booked || 0,
  appointments_showed: m.appointments_showed || 0,
  deals_closed: m.deals_closed || 0,
  revenue: Number(m.revenue) || 0,
  live_transfers: m.live_transfers || 0,
  self_booked: m.self_booked || 0,
  sales_team_booked: m.sales_team_booked || 0,
});

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Paginated fetch — Supabase caps each query at 1000 rows by default
async function fetchAllMetrics(from?: string, to?: string): Promise<MetricRecord[]> {
  const PAGE = 1000;
  const all: MetricRecord[] = [];
  let offset = 0;
  while (true) {
    let q = supabase.from("metrics").select("*").order("date", { ascending: true }).range(offset, offset + PAGE - 1);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) {
      console.error("metrics fetch error", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data.map(normalizeMetric));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

export function useRealMetrics(dateRange: { from?: Date; to?: Date }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [previousPeriodMetrics, setPreviousPeriodMetrics] = useState<MetricRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const fromStr = dateRange.from ? toDateStr(dateRange.from) : undefined;
      const toStr = dateRange.to ? toDateStr(dateRange.to) : undefined;

      // Compute previous period of equal length (immediately before "from")
      let prevFromStr: string | undefined;
      let prevToStr: string | undefined;
      if (dateRange.from && dateRange.to) {
        const span = dateRange.to.getTime() - dateRange.from.getTime();
        const prevTo = new Date(dateRange.from.getTime() - 24 * 60 * 60 * 1000);
        const prevFrom = new Date(prevTo.getTime() - span);
        prevFromStr = toDateStr(prevFrom);
        prevToStr = toDateStr(prevTo);
      }

      const [clientsRes, currentMetrics, prevMetrics] = await Promise.all([
        supabase.from("clients").select("*").order("client_name"),
        fetchAllMetrics(fromStr, toStr),
        prevFromStr && prevToStr ? fetchAllMetrics(prevFromStr, prevToStr) : Promise.resolve([] as MetricRecord[]),
      ]);

      setClients(clientsRes.data || []);
      setMetrics(currentMetrics);
      setPreviousPeriodMetrics(prevMetrics);
      setLoading(false);
    };

    fetchData();
  }, [dateRange.from?.getTime(), dateRange.to?.getTime()]);

  const totalMetrics = useMemo(() => calculateKPIs(metrics), [metrics]);

  const previousMetrics = useMemo(() => {
    if (previousPeriodMetrics.length === 0) return null;
    return calculateKPIs(previousPeriodMetrics);
  }, [previousPeriodMetrics]);

  const clientPerformance = useMemo((): ClientWithMetrics[] => {
    return clients.map(client => {
      const clientMetrics = metrics.filter(m => m.client_id === client.id);
      const kpis = calculateKPIs(clientMetrics);
      return {
        id: client.id,
        client_name: client.client_name,
        market: client.market,
        state: client.state,
        niche: client.niche,
        status: client.status,
        ...kpis,
      };
    });
  }, [clients, metrics]);

  // Weighted averages: aggregate raw totals across active clients first,
  // THEN derive ratios. This is the correct way to benchmark.
  const avgMetrics = useMemo((): AverageMetrics => {
    const activeClientIds = new Set(clients.filter(c => c.status === "active").map(c => c.id));
    const activeMetrics = metrics.filter(m => activeClientIds.has(m.client_id));
    const count = activeClientIds.size;

    const empty: AverageMetrics = {
      avg_impressions: 0, avg_clicks: 0, avg_spend: 0, avg_leads: 0, avg_dials_made: 0,
      avg_pickups: 0, avg_appointments_booked: 0, avg_appointments_showed: 0, avg_deals_closed: 0,
      avg_revenue: 0, avg_ctr: 0, avg_cpc: 0, avg_cpl: 0, avg_cost_per_appointment_booked: 0,
      avg_cost_per_appointment_showed: 0, avg_cost_per_live_transfer: 0, avg_cost_per_self_booked: 0,
      avg_cost_per_sales_team_booked: 0, avg_show_up_rate: 0, avg_lead_to_appointment_rate: 0,
      avg_cac: 0, avg_roas: 0, avg_close_rate: 0, client_count: 0,
    };
    if (count === 0) return empty;

    const totals = calculateKPIs(activeMetrics);

    return {
      // Per-client averages for volume metrics
      avg_impressions: totals.impressions / count,
      avg_clicks: totals.clicks / count,
      avg_spend: totals.ad_spend / count,
      avg_leads: totals.leads / count,
      avg_dials_made: totals.dials_made / count,
      avg_pickups: totals.pickups / count,
      avg_appointments_booked: totals.appointments_booked / count,
      avg_appointments_showed: totals.appointments_showed / count,
      avg_deals_closed: totals.deals_closed / count,
      avg_revenue: totals.revenue / count,
      // Ratio metrics: derived from aggregated totals (weighted) — the only correct way
      avg_ctr: totals.ctr,
      avg_cpc: totals.cpc,
      avg_cpl: totals.cpl,
      avg_cost_per_appointment_booked: totals.cost_per_appointment_booked,
      avg_cost_per_appointment_showed: totals.cost_per_appointment_showed,
      avg_cost_per_live_transfer: totals.cost_per_live_transfer,
      avg_cost_per_self_booked: totals.cost_per_self_booked,
      avg_cost_per_sales_team_booked: totals.cost_per_sales_team_booked,
      avg_show_up_rate: totals.show_up_rate,
      avg_lead_to_appointment_rate: totals.lead_to_appointment_rate,
      avg_cac: totals.cac,
      avg_roas: totals.roas,
      avg_close_rate: totals.close_rate,
      client_count: count,
    };
  }, [clients, metrics]);

  const chartData = useMemo(() => {
    const grouped = metrics.reduce((acc, m) => {
      if (!acc[m.date]) {
        acc[m.date] = {
          date: m.date,
          ad_spend: 0,
          leads: 0,
          appointments_booked: 0,
          appointments_showed: 0,
          deals_closed: 0,
          revenue: 0,
        };
      }
      acc[m.date].ad_spend += m.ad_spend;
      acc[m.date].leads += m.leads;
      acc[m.date].appointments_booked += m.appointments_booked;
      acc[m.date].appointments_showed += m.appointments_showed;
      acc[m.date].deals_closed += m.deals_closed;
      acc[m.date].revenue += m.revenue;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [metrics]);

  return {
    clients,
    metrics,
    loading,
    totalMetrics,
    previousMetrics,
    clientPerformance,
    avgMetrics,
    chartData,
  };
}
