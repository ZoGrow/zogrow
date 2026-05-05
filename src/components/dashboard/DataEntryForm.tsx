import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  user_id: string;
  full_name: string | null;
}

interface DataEntryFormProps {
  clientId: string;
  clientName: string;
  onMetricsSaved?: () => void;
}

export function DataEntryForm({ clientId, clientName, onMetricsSaved }: DataEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState<Date>();
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Fetch only ISA role users for dropdown
  useEffect(() => {
    const fetchISAUsers = async () => {
      // First get user_ids with ISA role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "isa");
      
      if (roleError || !roleData || roleData.length === 0) {
        setUsers([]);
        return;
      }

      const isaUserIds = roleData.map(r => r.user_id);
      
      // Then fetch profiles for those users
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", isaUserIds)
        .order("full_name");
      
      if (!profileError && profileData) {
        setUsers(profileData);
      }
    };
    fetchISAUsers();
  }, []);
  const [formData, setFormData] = useState({
    impressions: "",
    clicks: "",
    ad_spend: "",
    leads: "",
    dials_made: "",
    pickups: "",
    self_booked: "",
    sales_team_booked: "",
    live_transfers: "",
    setter: "",
    appointments_showed: "",
    contracts_signed: "",
    deals_closed: "",
    revenue: "",
    notes: "",
  });

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

    // Use local date methods - the Calendar sets dates at midnight local time
    // Format as YYYY-MM-DD for Supabase DATE type
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    console.log('Saving date:', dateString, 'from date object:', date.toISOString());

    const selfBooked = parseInt(formData.self_booked) || 0;
    const salesTeamBooked = parseInt(formData.sales_team_booked) || 0;
    const liveTransfers = parseInt(formData.live_transfers) || 0;
    const totalBooked = liveTransfers + selfBooked + salesTeamBooked;

    const { error, data } = await supabase.from("metrics").insert({
      client_id: clientId,
      date: dateString,
      impressions: parseInt(formData.impressions) || 0,
      clicks: parseInt(formData.clicks) || 0,
      ad_spend: parseFloat(formData.ad_spend) || 0,
      leads: parseInt(formData.leads) || 0,
      dials_made: parseInt(formData.dials_made) || 0,
      pickups: parseInt(formData.pickups) || 0,
      appointments_booked: totalBooked,
      self_booked: selfBooked,
      sales_team_booked: salesTeamBooked,
      live_transfers: liveTransfers,
      setter: formData.setter || null,
      appointments_showed: parseInt(formData.appointments_showed) || 0,
      contracts_signed: parseInt(formData.contracts_signed) || 0,
      deals_closed: parseInt(formData.deals_closed) || 0,
      revenue: parseFloat(formData.revenue) || 0,
      notes: formData.notes || null,
    }).select();

    setIsSaving(false);

    if (error) {
      console.error('Insert error:', error);
      toast.error("Failed to save metrics: " + error.message);
      return;
    }

    console.log('Saved metrics:', data);

    // Format date display using the same local values we saved
    const displayDate = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    
    toast.success(`Metrics saved for ${clientName} on ${displayDate}`, {
      description: `$${parseFloat(formData.ad_spend) || 0} spend · ${parseInt(formData.leads) || 0} leads · ${totalBooked} appts`,
    });
    handleReset();
    setIsOpen(false);
    onMetricsSaved?.();
  };

  const handleReset = () => {
    setDate(undefined);
    setFormData({
      impressions: "",
      clicks: "",
      ad_spend: "",
      leads: "",
      dials_made: "",
      pickups: "",
      self_booked: "",
      sales_team_booked: "",
      live_transfers: "",
      setter: "",
      appointments_showed: "",
      contracts_signed: "",
      deals_closed: "",
      revenue: "",
      notes: "",
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Add Metrics</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            {isOpen ? "Close" : "Add Entry"}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-secondary border-border",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Traffic & Spend */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Traffic & Spend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Impressions *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.impressions}
                  onChange={(e) => handleInputChange("impressions", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Clicks *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.clicks}
                  onChange={(e) => handleInputChange("clicks", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Ad Spend ($) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.ad_spend}
                  onChange={(e) => handleInputChange("ad_spend", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Leads *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.leads}
                  onChange={(e) => handleInputChange("leads", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Calling & Appointments */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Calling & Appointments</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Dials Made</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.dials_made}
                  onChange={(e) => handleInputChange("dials_made", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Pickups</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.pickups}
                  onChange={(e) => handleInputChange("pickups", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Self Booked</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.self_booked}
                  onChange={(e) => handleInputChange("self_booked", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Sales Team Booked</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.sales_team_booked}
                  onChange={(e) => handleInputChange("sales_team_booked", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Live Transfers</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.live_transfers}
                  onChange={(e) => handleInputChange("live_transfers", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>ISA (Who Booked)</Label>
                <Select
                  value={formData.setter}
                  onValueChange={(value) => handleInputChange("setter", value)}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select ISA" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.full_name || user.user_id}>
                        {user.full_name || "Unnamed User"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Appts Showed</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.appointments_showed}
                  onChange={(e) => handleInputChange("appointments_showed", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Sales */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Sales & Revenue</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contracts Signed</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.contracts_signed}
                  onChange={(e) => handleInputChange("contracts_signed", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Deals Closed</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.deals_closed}
                  onChange={(e) => handleInputChange("deals_closed", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Revenue / GCI ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.revenue}
                  onChange={(e) => handleInputChange("revenue", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="min-h-[80px] bg-secondary border-border resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Metrics"}
            </Button>
          </div>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
