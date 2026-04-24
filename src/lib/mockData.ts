// Mock data for RizenEstate Metrics Hub

export interface Client {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: 'FTHB' | 'Downsizer' | 'New Construction' | 'Other';
  start_date: string;
  status: 'active' | 'inactive';
  notes: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  campaign_name: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Other';
  status: 'active' | 'paused' | 'completed';
}

export interface MetricRecord {
  id: string;
  date: string;
  client_id: string;
  campaign_id?: string;
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
  notes?: string;
}

export interface CalculatedMetrics {
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
  ctr: number;
  cpc: number;
  cpl: number;
  cost_per_appointment_booked: number;
  cost_per_appointment_showed: number;
  show_up_rate: number;
  lead_to_appointment_rate: number;
  cac: number;
  close_rate: number;
  roas: number;
}

// Helper function to safely divide
export const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0) return 0;
  return numerator / denominator;
};

// Calculate all KPIs from raw metrics
export const calculateKPIs = (metrics: MetricRecord[]): CalculatedMetrics => {
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      ad_spend: acc.ad_spend + m.ad_spend,
      leads: acc.leads + m.leads,
      dials_made: acc.dials_made + m.dials_made,
      pickups: acc.pickups + m.pickups,
      appointments_booked: acc.appointments_booked + m.appointments_booked,
      appointments_showed: acc.appointments_showed + m.appointments_showed,
      deals_closed: acc.deals_closed + m.deals_closed,
      revenue: acc.revenue + m.revenue,
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
    }
  );

  return {
    ...totals,
    ctr: safeDivide(totals.clicks, totals.impressions) * 100,
    cpc: safeDivide(totals.ad_spend, totals.clicks),
    cpl: safeDivide(totals.ad_spend, totals.leads),
    cost_per_appointment_booked: safeDivide(totals.ad_spend, totals.appointments_booked),
    cost_per_appointment_showed: safeDivide(totals.ad_spend, totals.appointments_showed),
    show_up_rate: safeDivide(totals.appointments_showed, totals.appointments_booked) * 100,
    lead_to_appointment_rate: safeDivide(totals.appointments_booked, totals.leads) * 100,
    cac: safeDivide(totals.ad_spend, totals.deals_closed),
    close_rate: safeDivide(totals.deals_closed, totals.leads) * 100,
    roas: safeDivide(totals.revenue, totals.ad_spend),
  };
};

// Seed Clients
export const clients: Client[] = [
  {
    id: '1',
    client_name: 'Coastal Realty Group',
    market: 'Miami',
    state: 'FL',
    niche: 'FTHB',
    start_date: '2024-01-15',
    status: 'active',
    notes: 'High-volume first-time homebuyer market',
  },
  {
    id: '2',
    client_name: 'Summit Properties',
    market: 'Denver',
    state: 'CO',
    niche: 'Downsizer',
    start_date: '2024-02-01',
    status: 'active',
    notes: 'Luxury downsizer segment',
  },
  {
    id: '3',
    client_name: 'Lone Star Homes',
    market: 'Austin',
    state: 'TX',
    niche: 'New Construction',
    start_date: '2024-03-10',
    status: 'active',
    notes: 'New construction focus in Austin metro',
  },
  {
    id: '4',
    client_name: 'Pacific Coast Estates',
    market: 'San Diego',
    state: 'CA',
    niche: 'FTHB',
    start_date: '2024-01-20',
    status: 'active',
    notes: 'Competitive California market',
  },
  {
    id: '5',
    client_name: 'Empire State Realtors',
    market: 'Manhattan',
    state: 'NY',
    niche: 'Other',
    start_date: '2023-11-01',
    status: 'inactive',
    notes: 'Paused campaign - budget reallocation',
  },
];

// Seed Campaigns
export const campaigns: Campaign[] = [
  { id: '1', client_id: '1', campaign_name: 'FTHB Lead Gen - Q4', platform: 'Meta', status: 'active' },
  { id: '2', client_id: '1', campaign_name: 'Brand Awareness', platform: 'Google', status: 'active' },
  { id: '3', client_id: '2', campaign_name: 'Downsizer Retargeting', platform: 'Meta', status: 'active' },
  { id: '4', client_id: '3', campaign_name: 'New Build Showcase', platform: 'Meta', status: 'active' },
  { id: '5', client_id: '3', campaign_name: 'TikTok Awareness', platform: 'TikTok', status: 'paused' },
  { id: '6', client_id: '4', campaign_name: 'SoCal Buyers', platform: 'Google', status: 'active' },
  { id: '7', client_id: '5', campaign_name: 'NYC Luxury', platform: 'Meta', status: 'completed' },
];

// Generate metrics for given clients dynamically
const generateMetricsForClients = (clientList: Client[]): MetricRecord[] => {
  const metricsData: MetricRecord[] = [];
  const today = new Date();
  
  clientList.forEach((client) => {
    const clientCampaigns = campaigns.filter((c) => c.client_id === client.id);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Randomize metrics based on client size/performance
      const baseMultiplier = client.status === 'active' ? 1 : 0.3;
      // Use client id as seed for consistent random values
      const seed = client.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + i;
      const seededRandom = () => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      const dayMultiplier = 0.7 + seededRandom() * 0.6;
      
      const impressions = Math.floor((8000 + seededRandom() * 12000) * baseMultiplier * dayMultiplier);
      const clicks = Math.floor(impressions * (0.015 + seededRandom() * 0.02));
      const ad_spend = Math.floor((150 + seededRandom() * 350) * baseMultiplier * dayMultiplier);
      const leads = Math.floor(clicks * (0.08 + seededRandom() * 0.12));
      const dials_made = Math.floor(leads * (0.8 + seededRandom() * 0.4));
      const pickups = Math.floor(dials_made * (0.25 + seededRandom() * 0.25));
      const appointments_booked = Math.floor(pickups * (0.4 + seededRandom() * 0.3));
      const appointments_showed = Math.floor(appointments_booked * (0.5 + seededRandom() * 0.35));
      const deals_closed = Math.floor(appointments_showed * (0.1 + seededRandom() * 0.15));
      const revenue = deals_closed * (8000 + seededRandom() * 12000);

      metricsData.push({
        id: `${client.id}-${i}`,
        date: dateStr,
        client_id: client.id,
        campaign_id: clientCampaigns[0]?.id,
        impressions,
        clicks,
        ad_spend,
        leads,
        dials_made,
        pickups,
        appointments_booked,
        appointments_showed,
        deals_closed,
        revenue,
      });
    }
  });
  
  return metricsData;
};

// Default metrics using hardcoded clients (for backward compatibility)
export const metrics: MetricRecord[] = generateMetricsForClients(clients);

// Generate metrics for dynamic client list
export const generateMetricsForClientList = (clientList: Client[]): MetricRecord[] => {
  return generateMetricsForClients(clientList);
};

// Get metrics for a specific client
export const getClientMetrics = (clientId: string, startDate?: Date, endDate?: Date): MetricRecord[] => {
  return metrics.filter((m) => {
    if (m.client_id !== clientId) return false;
    if (startDate && new Date(m.date) < startDate) return false;
    if (endDate && new Date(m.date) > endDate) return false;
    return true;
  });
};

// Get all metrics within date range
export const getAllMetrics = (startDate?: Date, endDate?: Date): MetricRecord[] => {
  return metrics.filter((m) => {
    if (startDate && new Date(m.date) < startDate) return false;
    if (endDate && new Date(m.date) > endDate) return false;
    return true;
  });
};

// Get metrics grouped by date for charts
export const getMetricsByDate = (clientId?: string, startDate?: Date, endDate?: Date) => {
  const filtered = clientId 
    ? getClientMetrics(clientId, startDate, endDate)
    : getAllMetrics(startDate, endDate);
  
  const grouped = filtered.reduce((acc, m) => {
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
};

// Get client performance for leaderboard (uses default clients)
export const getClientPerformance = (startDate?: Date, endDate?: Date) => {
  return getClientPerformanceForList(clients, startDate, endDate);
};

// Get client performance for dynamic client list
export const getClientPerformanceForList = (clientList: Client[], startDate?: Date, endDate?: Date) => {
  const dynamicMetrics = generateMetricsForClientList(clientList);
  
  return clientList.map((client) => {
    const clientMetrics = dynamicMetrics.filter((m) => {
      if (m.client_id !== client.id) return false;
      if (startDate && new Date(m.date) < startDate) return false;
      if (endDate && new Date(m.date) > endDate) return false;
      return true;
    });
    const kpis = calculateKPIs(clientMetrics);
    return {
      ...client,
      ...kpis,
    };
  }).sort((a, b) => b.appointments_booked - a.appointments_booked);
};

// Get average metrics across all clients (uses default)
export const getAverageMetrics = (startDate?: Date, endDate?: Date) => {
  return getAverageMetricsForList(clients, startDate, endDate);
};

// Get average metrics for dynamic client list
export const getAverageMetricsForList = (clientList: Client[], startDate?: Date, endDate?: Date) => {
  const clientPerformance = getClientPerformanceForList(clientList, startDate, endDate);
  const activeClients = clientPerformance.filter(c => c.status === 'active');
  const count = activeClients.length || 1;
  
  return {
    avg_impressions: activeClients.reduce((acc, c) => acc + c.impressions, 0) / count,
    avg_clicks: activeClients.reduce((acc, c) => acc + c.clicks, 0) / count,
    avg_spend: activeClients.reduce((acc, c) => acc + c.ad_spend, 0) / count,
    avg_leads: activeClients.reduce((acc, c) => acc + c.leads, 0) / count,
    avg_dials_made: activeClients.reduce((acc, c) => acc + c.dials_made, 0) / count,
    avg_pickups: activeClients.reduce((acc, c) => acc + c.pickups, 0) / count,
    avg_appointments_booked: activeClients.reduce((acc, c) => acc + c.appointments_booked, 0) / count,
    avg_appointments_showed: activeClients.reduce((acc, c) => acc + c.appointments_showed, 0) / count,
    avg_deals_closed: activeClients.reduce((acc, c) => acc + c.deals_closed, 0) / count,
    avg_revenue: activeClients.reduce((acc, c) => acc + c.revenue, 0) / count,
    avg_ctr: activeClients.reduce((acc, c) => acc + c.ctr, 0) / count,
    avg_cpc: activeClients.reduce((acc, c) => acc + c.cpc, 0) / count,
    avg_cpl: activeClients.reduce((acc, c) => acc + c.cpl, 0) / count,
    avg_cost_per_appointment_booked: activeClients.reduce((acc, c) => acc + c.cost_per_appointment_booked, 0) / count,
    avg_cost_per_appointment_showed: activeClients.reduce((acc, c) => acc + c.cost_per_appointment_showed, 0) / count,
    avg_show_up_rate: activeClients.reduce((acc, c) => acc + c.show_up_rate, 0) / count,
    avg_lead_to_appointment_rate: activeClients.reduce((acc, c) => acc + c.lead_to_appointment_rate, 0) / count,
    avg_cac: activeClients.reduce((acc, c) => acc + c.cac, 0) / count,
    avg_roas: activeClients.reduce((acc, c) => acc + c.roas, 0) / count,
    avg_close_rate: activeClients.reduce((acc, c) => acc + c.close_rate, 0) / count,
    client_count: count,
  };
};

// Get previous period metrics for comparison
export const getPreviousPeriodMetrics = (startDate?: Date, endDate?: Date) => {
  if (!startDate || !endDate) return null;
  
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1); // Day before current start
  const prevStart = new Date(prevEnd.getTime() - periodLength);
  
  const allMetrics = getAllMetrics(prevStart, prevEnd);
  return calculateKPIs(allMetrics);
};

// Get client's previous period metrics
export const getClientPreviousPeriodMetrics = (clientId: string, startDate?: Date, endDate?: Date) => {
  if (!startDate || !endDate) return null;
  
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodLength);
  
  const clientMetrics = getClientMetrics(clientId, prevStart, prevEnd);
  return calculateKPIs(clientMetrics);
};

// Get last update date for a client
export const getClientLastUpdate = (clientId: string): Date => {
  const clientRecords = metrics.filter(m => m.client_id === clientId);
  if (clientRecords.length === 0) return new Date();
  
  const dates = clientRecords.map(m => new Date(m.date));
  return new Date(Math.max(...dates.map(d => d.getTime())));
};
