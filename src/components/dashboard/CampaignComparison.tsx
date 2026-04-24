import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  campaign_name: string;
  platform: string | null;
  status: string | null;
}

interface MetricsRow {
  id: string;
  date: string;
  campaign_id: string | null;
  impressions: number | null;
  clicks: number | null;
  ad_spend: number | null;
  leads: number | null;
  appointments_booked: number | null;
  appointments_showed: number | null;
  deals_closed: number | null;
  revenue: number | null;
}

interface CampaignComparisonProps {
  campaigns: Campaign[];
  metricsData: MetricsRow[];
}

const fmt = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toLocaleString();
};

const fmtCur = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export function CampaignComparison({ campaigns, metricsData }: CampaignComparisonProps) {
  const campaignMetrics = useMemo(() => {
    return campaigns.map((campaign) => {
      const rows = metricsData.filter((m) => m.campaign_id === campaign.id);
      const totals = rows.reduce(
        (acc, m) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          ad_spend: acc.ad_spend + (m.ad_spend || 0),
          leads: acc.leads + (m.leads || 0),
          appointments_booked: acc.appointments_booked + (m.appointments_booked || 0),
          appointments_showed: acc.appointments_showed + (m.appointments_showed || 0),
          deals_closed: acc.deals_closed + (m.deals_closed || 0),
          revenue: acc.revenue + (m.revenue || 0),
        }),
        { impressions: 0, clicks: 0, ad_spend: 0, leads: 0, appointments_booked: 0, appointments_showed: 0, deals_closed: 0, revenue: 0 }
      );

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpl = totals.leads > 0 ? totals.ad_spend / totals.leads : 0;
      const roas = totals.ad_spend > 0 ? totals.revenue / totals.ad_spend : 0;

      return { campaign, totals, ctr, cpl, roas };
    });
  }, [campaigns, metricsData]);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        No campaigns found. Sync Meta Ads to auto-create campaigns.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium min-w-[200px]">Campaign</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Spend</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Impressions</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Clicks</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">CTR</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Leads</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">CPL</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Booked</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Showed</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Deals</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Revenue</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignMetrics.map(({ campaign, totals, ctr, cpl, roas }) => (
              <TableRow key={campaign.id} className="border-b border-border">
                <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={campaign.status === "active" ? "default" : "secondary"}
                    className={
                      campaign.status === "active"
                        ? "bg-success/10 text-success border-success/20"
                        : campaign.status === "paused"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{fmtCur(totals.ad_spend)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.impressions)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.clicks)}</TableCell>
                <TableCell className="text-right font-mono">{ctr.toFixed(2)}%</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.leads)}</TableCell>
                <TableCell className="text-right font-mono">{fmtCur(cpl)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.appointments_booked)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.appointments_showed)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.deals_closed)}</TableCell>
                <TableCell className="text-right font-mono">{fmtCur(totals.revenue)}</TableCell>
                <TableCell className="text-right font-mono">
                  <span className={roas >= 3 ? "text-success" : roas >= 1 ? "text-warning" : "text-destructive"}>
                    {roas.toFixed(2)}x
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
