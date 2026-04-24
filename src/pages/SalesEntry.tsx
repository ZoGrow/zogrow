import { useState, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import { CalendarIcon, Save, Trash2, Pencil, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SalesMetricRow {
  id: string;
  date: string;
  period_type: string;
  new_calls_scheduled: number;
  followup_calls_scheduled: number;
  new_calls_taken: number;
  qualified_calls_taken: number;
  followup_calls_taken: number;
  no_shows: number;
  cancelled: number;
  rescheduled: number;
  new_closes: number;
  new_mrr: number;
  upsell_mrr: number;
  otp: number;
  cash_committed: number;
  total_cash_collected: number;
  base_starting_mrr: number;
  base_clients: number;
  lost_clients: number;
  lost_mrr: number;
  notes: string | null;
}

const defaultFormData = {
  new_calls_scheduled: "",
  followup_calls_scheduled: "",
  new_calls_taken: "",
  qualified_calls_taken: "",
  followup_calls_taken: "",
  no_shows: "",
  cancelled: "",
  rescheduled: "",
  new_closes: "",
  new_mrr: "",
  upsell_mrr: "",
  otp: "",
  cash_committed: "",
  total_cash_collected: "",
  base_starting_mrr: "",
  base_clients: "",
  lost_clients: "",
  lost_mrr: "",
  notes: "",
};

export default function SalesEntry() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState<Date>();
  const [periodType, setPeriodType] = useState<"daily" | "monthly">("daily");
  const [formData, setFormData] = useState(defaultFormData);
  const [metricsData, setMetricsData] = useState<SalesMetricRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from("sales_metrics")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching sales metrics:", error);
      toast.error("Failed to load sales metrics");
    } else {
      setMetricsData(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setIsSaving(true);

    const dateToUse = periodType === "monthly" ? startOfMonth(date) : date;
    const year = dateToUse.getFullYear();
    const month = String(dateToUse.getMonth() + 1).padStart(2, "0");
    const day = String(dateToUse.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    const { error } = await supabase.from("sales_metrics").upsert({
      date: dateString,
      period_type: periodType,
      new_calls_scheduled: parseInt(formData.new_calls_scheduled) || 0,
      followup_calls_scheduled: parseInt(formData.followup_calls_scheduled) || 0,
      new_calls_taken: parseInt(formData.new_calls_taken) || 0,
      qualified_calls_taken: parseInt(formData.qualified_calls_taken) || 0,
      followup_calls_taken: parseInt(formData.followup_calls_taken) || 0,
      no_shows: parseInt(formData.no_shows) || 0,
      cancelled: parseInt(formData.cancelled) || 0,
      rescheduled: parseInt(formData.rescheduled) || 0,
      new_closes: parseInt(formData.new_closes) || 0,
      new_mrr: parseFloat(formData.new_mrr) || 0,
      upsell_mrr: parseFloat(formData.upsell_mrr) || 0,
      otp: parseFloat(formData.otp) || 0,
      cash_committed: parseFloat(formData.cash_committed) || 0,
      total_cash_collected: parseFloat(formData.total_cash_collected) || 0,
      base_starting_mrr: parseFloat(formData.base_starting_mrr) || 0,
      base_clients: parseInt(formData.base_clients) || 0,
      lost_clients: parseInt(formData.lost_clients) || 0,
      lost_mrr: parseFloat(formData.lost_mrr) || 0,
      notes: formData.notes || null,
    }, { onConflict: "date,period_type" });

    setIsSaving(false);

    if (error) {
      console.error("Insert error:", error);
      toast.error("Failed to save: " + error.message);
      return;
    }

    toast.success(`Sales metrics saved for ${format(dateToUse, "MMM d, yyyy")}`);
    handleReset();
    setIsOpen(false);
    fetchMetrics();
  };

  const handleReset = () => {
    setDate(undefined);
    setFormData(defaultFormData);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("sales_metrics").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Entry deleted");
      fetchMetrics();
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Data Entry</h1>
          <p className="text-muted-foreground">
            Add and manage frontend sales metrics
          </p>
        </div>
      </div>

      {/* Entry Form */}
      <Card className="glass-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Sales Entry
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {isOpen ? "Collapse" : "Expand"}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date & Period Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Period Type</Label>
                    <Select value={periodType} onValueChange={(v) => setPeriodType(v as "daily" | "monthly")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Call Activity */}
                <div>
                  <h3 className="font-medium mb-3">Call Activity</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>New Calls Scheduled</Label>
                      <Input
                        type="number"
                        value={formData.new_calls_scheduled}
                        onChange={(e) => handleInputChange("new_calls_scheduled", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Follow-Up Scheduled</Label>
                      <Input
                        type="number"
                        value={formData.followup_calls_scheduled}
                        onChange={(e) => handleInputChange("followup_calls_scheduled", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Calls Taken</Label>
                      <Input
                        type="number"
                        value={formData.new_calls_taken}
                        onChange={(e) => handleInputChange("new_calls_taken", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qualified Calls</Label>
                      <Input
                        type="number"
                        value={formData.qualified_calls_taken}
                        onChange={(e) => handleInputChange("qualified_calls_taken", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Follow-Up Taken</Label>
                      <Input
                        type="number"
                        value={formData.followup_calls_taken}
                        onChange={(e) => handleInputChange("followup_calls_taken", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No-Shows</Label>
                      <Input
                        type="number"
                        value={formData.no_shows}
                        onChange={(e) => handleInputChange("no_shows", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cancelled</Label>
                      <Input
                        type="number"
                        value={formData.cancelled}
                        onChange={(e) => handleInputChange("cancelled", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rescheduled</Label>
                      <Input
                        type="number"
                        value={formData.rescheduled}
                        onChange={(e) => handleInputChange("rescheduled", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Revenue */}
                <div>
                  <h3 className="font-medium mb-3">Revenue & Closes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>New Closes</Label>
                      <Input
                        type="number"
                        value={formData.new_closes}
                        onChange={(e) => handleInputChange("new_closes", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New MRR ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.new_mrr}
                        onChange={(e) => handleInputChange("new_mrr", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Upsell MRR ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.upsell_mrr}
                        onChange={(e) => handleInputChange("upsell_mrr", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>One-Time Payments ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.otp}
                        onChange={(e) => handleInputChange("otp", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cash Committed ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cash_committed}
                        onChange={(e) => handleInputChange("cash_committed", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Cash Collected ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_cash_collected}
                        onChange={(e) => handleInputChange("total_cash_collected", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Client Retention */}
                <div>
                  <h3 className="font-medium mb-3">Client Retention (Monthly)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Base Clients</Label>
                      <Input
                        type="number"
                        value={formData.base_clients}
                        onChange={(e) => handleInputChange("base_clients", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Base MRR ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.base_starting_mrr}
                        onChange={(e) => handleInputChange("base_starting_mrr", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lost Clients</Label>
                      <Input
                        type="number"
                        value={formData.lost_clients}
                        onChange={(e) => handleInputChange("lost_clients", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lost MRR ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.lost_mrr}
                        onChange={(e) => handleInputChange("lost_mrr", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Entry"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* History Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Entry History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : metricsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet. Add your first sales entry above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Calls Sched.</TableHead>
                    <TableHead>Calls Taken</TableHead>
                    <TableHead>Closes</TableHead>
                    <TableHead>New MRR</TableHead>
                    <TableHead>Cash Collected</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{format(new Date(row.date + "T00:00:00"), "MMM d, yyyy")}</TableCell>
                      <TableCell className="capitalize">{row.period_type}</TableCell>
                      <TableCell>{row.new_calls_scheduled + row.followup_calls_scheduled}</TableCell>
                      <TableCell>{row.new_calls_taken + row.followup_calls_taken}</TableCell>
                      <TableCell>{row.new_closes}</TableCell>
                      <TableCell>{formatCurrency(Number(row.new_mrr))}</TableCell>
                      <TableCell>{formatCurrency(Number(row.total_cash_collected))}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this entry? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(row.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
