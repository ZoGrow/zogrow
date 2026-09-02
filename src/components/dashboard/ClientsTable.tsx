import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { getKPIStatus } from "@/lib/kpiUtils";
import { cn } from "@/lib/utils";

interface ClientWithMetrics {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: string;
  status: string;
  ad_spend: number;
  leads: number;
  appointments_booked: number;
  sales_team_booked: number;
  lead_to_sales_team_booked: number;
  show_up_rate: number;
  deals_closed: number;
  cac: number;
  roas: number;
  cpl: number;
}

interface AgencyAvg {
  avg_show_up_rate: number;
  avg_cac: number;
  avg_roas: number;
  avg_cpl: number;
}

interface ClientsTableProps {
  data: ClientWithMetrics[];
  agencyAvg?: AgencyAvg;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const statusColors = {
  good: 'text-success',
  neutral: 'text-foreground',
  bad: 'text-destructive',
};

export function ClientsTable({ data, agencyAvg }: ClientsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Client</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Spend</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Leads</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Appts Booked</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Sales Team Booked</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Show-Up Rate</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Deals</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Cost/Deal</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((client) => (
            <TableRow 
              key={client.id}
              className="border-b border-border cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {client.client_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{client.client_name}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {client.market}, {client.state}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(client.ad_spend)}
              </TableCell>
              <TableCell className="text-right">{client.leads.toLocaleString()}</TableCell>
              <TableCell className="text-right">{client.appointments_booked.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <div className="font-medium">{client.sales_team_booked.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{client.lead_to_sales_team_booked.toFixed(1)}% of leads</div>
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  agencyAvg && statusColors[getKPIStatus(client.show_up_rate, agencyAvg.avg_show_up_rate, 'show_up_rate')]
                )}>
                  {client.show_up_rate.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right">{client.deals_closed}</TableCell>
              <TableCell className="text-right font-medium">
                <span className={cn(
                  agencyAvg && statusColors[getKPIStatus(client.cac, agencyAvg.avg_cac, 'cac')]
                )}>
                  {client.cac > 0 ? formatCurrency(client.cac) : 'N/A'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant="secondary"
                  className={cn(
                    agencyAvg && getKPIStatus(client.roas, agencyAvg.avg_roas, 'roas') === 'good'
                      ? "bg-success/10 text-success border-success/20" 
                      : agencyAvg && getKPIStatus(client.roas, agencyAvg.avg_roas, 'roas') === 'bad'
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  {client.roas.toFixed(2)}x
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
