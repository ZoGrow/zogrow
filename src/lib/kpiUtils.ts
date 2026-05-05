// KPI utility functions for benchmarking, color status, and health scoring

import { CalculatedMetrics, safeDivide } from "./mockData";

export interface BenchmarkComparison {
  value: number;
  percentChange: number;
  vsAgencyAvg: number;
  status: 'good' | 'neutral' | 'bad';
}

export interface AgencyBenchmarks {
  cpl: number;
  cost_per_appointment_booked: number;
  cost_per_appointment_showed: number;
  show_up_rate: number;
  cac: number;
  roas: number;
}

// Determine if a metric is "lower is better" or "higher is better"
export const isLowerBetter = (metricKey: string): boolean => {
  const lowerBetterMetrics = ['cpl', 'cost_per_appointment_booked', 'cost_per_appointment_showed', 'cost_per_live_transfer', 'cost_per_self_booked', 'cost_per_sales_team_booked', 'cac', 'cpc'];
  return lowerBetterMetrics.includes(metricKey);
};

// Calculate status based on comparison to agency average
export const getKPIStatus = (
  value: number, 
  agencyAvg: number, 
  metricKey: string
): 'good' | 'neutral' | 'bad' => {
  if (agencyAvg === 0) return 'neutral';
  
  const percentDiff = ((value - agencyAvg) / agencyAvg) * 100;
  const lowerIsBetter = isLowerBetter(metricKey);
  
  if (lowerIsBetter) {
    // For cost metrics: lower than avg is good
    if (percentDiff < -10) return 'good';
    if (percentDiff > 10) return 'bad';
    return 'neutral';
  } else {
    // For performance metrics: higher than avg is good
    if (percentDiff > 10) return 'good';
    if (percentDiff < -10) return 'bad';
    return 'neutral';
  }
};

// Calculate percent change between periods
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Calculate percent difference vs agency average
export const calculateVsAgencyAvg = (value: number, agencyAvg: number): number => {
  if (agencyAvg === 0) return 0;
  return ((value - agencyAvg) / agencyAvg) * 100;
};

// Agency Health Score calculation (0-100)
export interface HealthScoreResult {
  score: number;
  status: 'good' | 'neutral' | 'bad';
  breakdown: {
    cpl: number;
    showUpRate: number;
    cac: number;
    roas: number;
  };
}

export const calculateHealthScore = (
  metrics: CalculatedMetrics,
  benchmarks: { cpl: number; showUpRate: number; cac: number; roas: number }
): HealthScoreResult => {
  // Scoring logic: compare to industry benchmarks
  // CPL: Target $50, Score 100 if <= $30, 0 if >= $100
  const cplScore = Math.max(0, Math.min(100, 100 - ((metrics.cpl - 30) / 70) * 100));
  
  // Show-Up Rate: Target 60%, Score 100 if >= 75%, 0 if <= 40%
  const showUpScore = Math.max(0, Math.min(100, ((metrics.show_up_rate - 40) / 35) * 100));
  
  // CAC: Target $3000, Score 100 if <= $2000, 0 if >= $8000
  const cacScore = Math.max(0, Math.min(100, 100 - ((metrics.cac - 2000) / 6000) * 100));
  
  // ROAS: Target 3x, Score 100 if >= 5x, 0 if <= 1x
  const roasScore = Math.max(0, Math.min(100, ((metrics.roas - 1) / 4) * 100));
  
  // Weighted average: CPL 30%, Show-Up 25%, CAC 25%, ROAS 20%
  const totalScore = (cplScore * 0.3) + (showUpScore * 0.25) + (cacScore * 0.25) + (roasScore * 0.2);
  
  let status: 'good' | 'neutral' | 'bad' = 'neutral';
  if (totalScore >= 70) status = 'good';
  else if (totalScore < 50) status = 'bad';
  
  return {
    score: Math.round(totalScore),
    status,
    breakdown: {
      cpl: Math.round(cplScore),
      showUpRate: Math.round(showUpScore),
      cac: Math.round(cacScore),
      roas: Math.round(roasScore),
    },
  };
};

// Funnel step data
export interface FunnelStep {
  name: string;
  value: number;
  conversionRate: number;
  costAtStage: number;
}

export const calculateFunnel = (metrics: CalculatedMetrics): FunnelStep[] => {
  const { impressions, clicks, leads, appointments_booked, appointments_showed, deals_closed, ad_spend, live_transfers, self_booked, sales_team_booked } = metrics as any;
  const totalBooked = (live_transfers || 0) + (self_booked || 0) + (sales_team_booked || 0);
  
  return [
    {
      name: 'Impressions',
      value: impressions,
      conversionRate: 100,
      costAtStage: safeDivide(ad_spend, impressions) * 1000, // CPM
    },
    {
      name: 'Clicks',
      value: clicks,
      conversionRate: safeDivide(clicks, impressions) * 100,
      costAtStage: safeDivide(ad_spend, clicks),
    },
    {
      name: 'Leads',
      value: leads,
      conversionRate: safeDivide(leads, clicks) * 100,
      costAtStage: safeDivide(ad_spend, leads),
    },
    {
      name: 'Appts Booked',
      value: totalBooked,
      conversionRate: safeDivide(totalBooked, leads) * 100,
      costAtStage: safeDivide(ad_spend, totalBooked),
    },
    {
      name: 'Appts Showed',
      value: appointments_showed,
      conversionRate: safeDivide(appointments_showed, totalBooked) * 100,
      costAtStage: safeDivide(ad_spend, appointments_showed),
    },
    {
      name: 'Deals Closed',
      value: deals_closed,
      conversionRate: safeDivide(deals_closed, appointments_showed) * 100,
      costAtStage: safeDivide(ad_spend, deals_closed),
    },
  ];
};

// Data integrity warnings
export interface DataWarning {
  type: 'error' | 'warning';
  message: string;
}

export const getDataWarnings = (metrics: CalculatedMetrics): DataWarning[] => {
  const warnings: DataWarning[] = [];
  
  if (metrics.deals_closed > 0 && metrics.revenue === 0) {
    warnings.push({ type: 'warning', message: 'Revenue missing - ROAS incomplete' });
  }
  
  const totalBooked = ((metrics as any).live_transfers || 0) + ((metrics as any).self_booked || 0) + ((metrics as any).sales_team_booked || 0) || metrics.appointments_booked;

  if (totalBooked > 0 && metrics.appointments_showed === 0) {
    warnings.push({ type: 'warning', message: 'Show data missing - Show-Up Rate incomplete' });
  }
  
  if (metrics.leads === 0 && metrics.ad_spend > 0) {
    warnings.push({ type: 'error', message: 'No leads recorded despite ad spend' });
  }
  
  return warnings;
};

// Tooltip definitions for metrics
export const metricTooltips: Record<string, { description: string; benchmark: string }> = {
  cpl: {
    description: 'Cost Per Lead - Total ad spend divided by number of leads generated.',
    benchmark: 'Industry avg: $30-60 for real estate',
  },
  cost_per_appointment_booked: {
    description: 'Total ad spend divided by live transfers, self-booked, and sales-team-booked appointments combined.',
    benchmark: 'Target: $100-200 per booked appointment',
  },
  cost_per_appointment_showed: {
    description: 'Total ad spend divided by appointments that actually showed up.',
    benchmark: 'Target: $150-300 per showed appointment',
  },
  show_up_rate: {
    description: '% of booked appointments that actually showed up.',
    benchmark: 'Industry avg: 55-65%',
  },
  cac: {
    description: 'Customer Acquisition Cost - Total ad spend divided by deals closed.',
    benchmark: 'Target: $2,000-5,000 per closed deal',
  },
  roas: {
    description: 'Return On Ad Spend - Revenue generated divided by ad spend.',
    benchmark: 'Target: 3x or higher',
  },
  ctr: {
    description: 'Click-Through Rate - % of impressions that resulted in clicks.',
    benchmark: 'Industry avg: 1.5-3%',
  },
  cpc: {
    description: 'Cost Per Click - Total ad spend divided by number of clicks.',
    benchmark: 'Industry avg: $1-3 for real estate',
  },
  close_rate: {
    description: '% of leads that converted to closed deals.',
    benchmark: 'Industry avg: 2-5%',
  },
  lead_to_appointment_rate: {
    description: '% of leads that convert to booked appointments.',
    benchmark: 'Industry avg: 15-30%',
  },
};
