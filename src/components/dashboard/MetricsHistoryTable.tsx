import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Pencil, Save, X, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MetricsRow {
  id: string;
  date: string;
  impressions: number | null;
  clicks: number | null;
  ad_spend: number | null;
  leads: number | null;
  dials_made: number | null;
  pickups: number | null;
  appointments_booked: number | null;
  self_booked: number | null;
  sales_team_booked: number | null;
  live_transfers: number | null;
  appointments_showed: number | null;
  contracts_signed: number | null;
  deals_closed: number | null;
  revenue: number | null;
}

interface MetricsHistoryTableProps {
  metricsData: MetricsRow[];
  onMetricsUpdated: () => void;
}

interface BulkEditRow {
  ad_spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  dials_made: number;
  pickups: number;
  self_booked: number;
  sales_team_booked: number;
  live_transfers: number;
  appointments_showed: number;
  contracts_signed: number;
  deals_closed: number;
  revenue: number;
}

type BulkEditField = keyof BulkEditRow;

export function MetricsHistoryTable({ metricsData, onMetricsUpdated }: MetricsHistoryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MetricsRow>>({});
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEdits, setBulkEdits] = useState<Record<string, Partial<BulkEditRow>>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Aggregate metrics by date
  const sortedData = useMemo(() => {
    const byDate = new Map<string, MetricsRow & { allIds: string[] }>();
    for (const row of metricsData) {
      const existing = byDate.get(row.date);
      if (existing) {
        existing.impressions = (existing.impressions || 0) + (row.impressions || 0);
        existing.clicks = (existing.clicks || 0) + (row.clicks || 0);
        existing.ad_spend = (existing.ad_spend || 0) + (row.ad_spend || 0);
        existing.leads = (existing.leads || 0) + (row.leads || 0);
        existing.dials_made = (existing.dials_made || 0) + (row.dials_made || 0);
        existing.pickups = (existing.pickups || 0) + (row.pickups || 0);
        existing.appointments_booked = (existing.appointments_booked || 0) + (row.appointments_booked || 0);
        existing.self_booked = (existing.self_booked || 0) + (row.self_booked || 0);
        existing.sales_team_booked = (existing.sales_team_booked || 0) + (row.sales_team_booked || 0);
        existing.live_transfers = (existing.live_transfers || 0) + (row.live_transfers || 0);
        existing.appointments_showed = (existing.appointments_showed || 0) + (row.appointments_showed || 0);
        existing.contracts_signed = (existing.contracts_signed || 0) + (row.contracts_signed || 0);
        existing.deals_closed = (existing.deals_closed || 0) + (row.deals_closed || 0);
        existing.revenue = (existing.revenue || 0) + (row.revenue || 0);
        existing.allIds.push(row.id);
      } else {
        byDate.set(row.date, { ...row, allIds: [row.id] });
      }
    }
    return Array.from(byDate.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [metricsData]);

  // --- Single row edit ---
  const startEditing = (row: MetricsRow) => {
    setEditingId(row.id);
    setEditData({
      impressions: row.impressions,
      clicks: row.clicks,
      ad_spend: row.ad_spend,
      leads: row.leads,
      dials_made: row.dials_made,
      pickups: row.pickups,
      self_booked: row.self_booked,
      sales_team_booked: row.sales_team_booked,
      live_transfers: row.live_transfers,
      appointments_showed: row.appointments_showed,
      contracts_signed: row.contracts_signed,
      deals_closed: row.deals_closed,
      revenue: row.revenue,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEditing = async () => {
    if (!editingId) return;
    setSaving(true);

    const selfBooked = editData.self_booked || 0;
    const salesTeamBooked = editData.sales_team_booked || 0;

    const { error } = await supabase
      .from("metrics")
      .update({
        impressions: editData.impressions || 0,
        clicks: editData.clicks || 0,
        ad_spend: editData.ad_spend || 0,
        leads: editData.leads || 0,
        dials_made: editData.dials_made || 0,
        pickups: editData.pickups || 0,
        appointments_booked: selfBooked + salesTeamBooked,
        self_booked: selfBooked,
        sales_team_booked: salesTeamBooked,
        live_transfers: editData.live_transfers || 0,
        appointments_showed: editData.appointments_showed || 0,
        contracts_signed: editData.contracts_signed || 0,
        deals_closed: editData.deals_closed || 0,
        revenue: editData.revenue || 0,
      })
      .eq("id", editingId);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Failed to update metrics");
    } else {
      toast.success("Metrics updated");
      setEditingId(null);
      setEditData({});
      onMetricsUpdated();
    }
  };

  const deleteMetric = async (id: string) => {
    const { error } = await supabase.from("metrics").delete().eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Failed to delete metrics");
    } else {
      toast.success("Metrics deleted");
      onMetricsUpdated();
    }
  };

  const handleInputChange = (field: keyof MetricsRow, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value === "" ? 0 : Number(value),
    }));
  };

  // --- Bulk edit ---
  const startBulkMode = () => {
    setBulkMode(true);
    setBulkEdits({});
  };

  const cancelBulkMode = () => {
    setBulkMode(false);
    setBulkEdits({});
  };

  const handleBulkChange = (date: string, field: BulkEditField, value: string) => {
    setBulkEdits((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value === "" ? 0 : Number(value),
      },
    }));
  };

  const getBulkValue = (row: MetricsRow, field: BulkEditField): number => {
    if (bulkEdits[row.date]?.[field] !== undefined) return bulkEdits[row.date][field]!;
    return (row[field] as number) || 0;
  };

  const saveBulkEdits = async () => {
    const changedDates = Object.keys(bulkEdits);
    if (changedDates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setBulkSaving(true);
    let successCount = 0;

    for (const date of changedDates) {
      const edit = bulkEdits[date];
      const row = sortedData.find((r) => r.date === date);
      if (!row) continue;

      const selfBooked = edit.self_booked ?? (row.self_booked || 0);
      const salesTeamBooked = edit.sales_team_booked ?? (row.sales_team_booked || 0);

      const updateData: Record<string, number> = {
        self_booked: selfBooked,
        sales_team_booked: salesTeamBooked,
        appointments_booked: selfBooked + salesTeamBooked,
      };

      // Include all changed fields
      const fields: BulkEditField[] = [
        "ad_spend", "impressions", "clicks", "leads", "dials_made", "pickups",
        "live_transfers", "appointments_showed", "contracts_signed", "deals_closed", "revenue"
      ];
      for (const f of fields) {
        if (edit[f] !== undefined) {
          updateData[f] = edit[f]!;
        }
      }

      const firstId = (row as any).allIds?.[0] || row.id;
      const { error } = await supabase
        .from("metrics")
        .update(updateData)
        .eq("id", firstId);

      if (!error) successCount++;
    }

    setBulkSaving(false);

    if (successCount > 0) {
      toast.success(`Updated metrics for ${successCount} date(s)`);
      setBulkMode(false);
      setBulkEdits({});
      onMetricsUpdated();
    } else {
      toast.error("Failed to save changes");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0";
    return `$${value.toLocaleString()}`;
  };

  if (metricsData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No metrics data entered yet</p>
      </div>
    );
  }

  const renderBulkInput = (row: MetricsRow, field: BulkEditField, width = "w-16") => (
    <Input
      type="number"
      value={getBulkValue(row, field)}
      onChange={(e) => handleBulkChange(row.date, field, e.target.value)}
      className={`${width} h-7 bg-secondary text-xs`}
    />
  );

  const renderEditInput = (field: keyof MetricsRow, width = "w-20") => (
    <Input
      type="number"
      value={editData[field] ?? ""}
      onChange={(e) => handleInputChange(field, e.target.value)}
      className={`${width} h-8 bg-secondary`}
    />
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Metrics History</h3>
        {bulkMode ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={cancelBulkMode} disabled={bulkSaving}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveBulkEdits} disabled={bulkSaving}>
              <Save className="h-3 w-3 mr-1" /> Save All
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={startBulkMode}>
            <Edit3 className="h-3 w-3 mr-1" /> Bulk Edit
          </Button>
        )}
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Date</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Spend</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Impressions</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Clicks</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Leads</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Dials</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Pickups</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Self Booked</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Team Booked</TableHead>
              <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Total Booked</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Live Transfers</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Appts Showed</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Contracts</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Deals</TableHead>
              <TableHead className={`font-medium whitespace-nowrap ${bulkMode ? "text-primary" : "text-muted-foreground"}`}>Revenue</TableHead>
              {!bulkMode && <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.id} className="border-b border-border">
                <TableCell className="font-medium whitespace-nowrap">
                  {format(new Date(row.date), "MMM d, yyyy")}
                </TableCell>
                {bulkMode ? (
                  <>
                    <TableCell>{renderBulkInput(row, "ad_spend", "w-20")}</TableCell>
                    <TableCell>{renderBulkInput(row, "impressions")}</TableCell>
                    <TableCell>{renderBulkInput(row, "clicks")}</TableCell>
                    <TableCell>{renderBulkInput(row, "leads")}</TableCell>
                    <TableCell>{renderBulkInput(row, "dials_made")}</TableCell>
                    <TableCell>{renderBulkInput(row, "pickups")}</TableCell>
                    <TableCell>{renderBulkInput(row, "self_booked")}</TableCell>
                    <TableCell>{renderBulkInput(row, "sales_team_booked")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getBulkValue(row, "self_booked") + getBulkValue(row, "sales_team_booked")}
                    </TableCell>
                    <TableCell>{renderBulkInput(row, "live_transfers")}</TableCell>
                    <TableCell>{renderBulkInput(row, "appointments_showed")}</TableCell>
                    <TableCell>{renderBulkInput(row, "contracts_signed")}</TableCell>
                    <TableCell>{renderBulkInput(row, "deals_closed")}</TableCell>
                    <TableCell>{renderBulkInput(row, "revenue", "w-20")}</TableCell>
                  </>
                ) : editingId === row.id ? (
                  <>
                    <TableCell>{renderEditInput("ad_spend")}</TableCell>
                    <TableCell>{renderEditInput("impressions")}</TableCell>
                    <TableCell>{renderEditInput("clicks")}</TableCell>
                    <TableCell>{renderEditInput("leads")}</TableCell>
                    <TableCell>{renderEditInput("dials_made")}</TableCell>
                    <TableCell>{renderEditInput("pickups")}</TableCell>
                    <TableCell>{renderEditInput("self_booked")}</TableCell>
                    <TableCell>{renderEditInput("sales_team_booked")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(editData.self_booked || 0) + (editData.sales_team_booked || 0)}
                    </TableCell>
                    <TableCell>{renderEditInput("live_transfers")}</TableCell>
                    <TableCell>{renderEditInput("appointments_showed")}</TableCell>
                    <TableCell>{renderEditInput("contracts_signed")}</TableCell>
                    <TableCell>{renderEditInput("deals_closed")}</TableCell>
                    <TableCell>{renderEditInput("revenue", "w-24")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={saveEditing} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing} disabled={saving}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{formatCurrency(row.ad_spend)}</TableCell>
                    <TableCell>{(row.impressions ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.clicks ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.leads ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.dials_made ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.pickups ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.self_booked ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.sales_team_booked ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.appointments_booked ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.live_transfers ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.appointments_showed ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.contracts_signed ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{(row.deals_closed ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Metrics Entry</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the metrics for{" "}
                                {format(new Date(row.date), "MMM d, yyyy")}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMetric(row.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
