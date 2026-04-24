import { useState, useEffect, forwardRef } from "react";
import { User, Building2, Bell, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  full_name: string | null;
  agency_name: string | null;
  agency_website: string | null;
  email_alerts: boolean;
  low_roas_alert: boolean;
  high_cpl_alert: boolean;
  weekly_reports: boolean;
}

const Settings = forwardRef<HTMLDivElement>(function Settings(props, ref) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    agency_name: "",
    agency_website: "",
    email_alerts: true,
    low_roas_alert: true,
    high_cpl_alert: false,
    weekly_reports: true,
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          agency_name: data.agency_name || "",
          agency_website: data.agency_website || "",
          email_alerts: data.email_alerts ?? true,
          low_roas_alert: data.low_roas_alert ?? true,
          high_cpl_alert: data.high_cpl_alert ?? false,
          weekly_reports: data.weekly_reports ?? true,
        });
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        full_name: profile.full_name || null,
        agency_name: profile.agency_name || null,
        agency_website: profile.agency_website || null,
        email_alerts: profile.email_alerts,
        low_roas_alert: profile.low_roas_alert,
        high_cpl_alert: profile.high_cpl_alert,
        weekly_reports: profile.weekly_reports,
      }, { onConflict: "user_id" });

    if (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={ref} className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Your personal information</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input 
              value={profile.full_name || ""} 
              onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
              className="bg-secondary border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email" 
              value={user?.email || ""} 
              disabled
              className="bg-secondary border-border opacity-50" 
            />
          </div>
        </div>
      </div>

      {/* Agency Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agency</h2>
            <p className="text-sm text-muted-foreground">Your agency details</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Agency Name</Label>
            <Input 
              value={profile.agency_name || ""} 
              onChange={(e) => setProfile(p => ({ ...p, agency_name: e.target.value }))}
              placeholder="Your agency name"
              className="bg-secondary border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input 
              value={profile.agency_website || ""} 
              onChange={(e) => setProfile(p => ({ ...p, agency_website: e.target.value }))}
              placeholder="https://youragency.com"
              className="bg-secondary border-border" 
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">Configure alert preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Alerts</p>
              <p className="text-sm text-muted-foreground">Receive alerts via email</p>
            </div>
            <Switch 
              checked={profile.email_alerts}
              onCheckedChange={(checked) => 
                setProfile(p => ({ ...p, email_alerts: checked }))
              }
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low ROAS Alert</p>
              <p className="text-sm text-muted-foreground">Alert when client ROAS drops below 2x</p>
            </div>
            <Switch 
              checked={profile.low_roas_alert}
              onCheckedChange={(checked) => 
                setProfile(p => ({ ...p, low_roas_alert: checked }))
              }
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">High CPL Alert</p>
              <p className="text-sm text-muted-foreground">Alert when CPL exceeds threshold</p>
            </div>
            <Switch 
              checked={profile.high_cpl_alert}
              onCheckedChange={(checked) => 
                setProfile(p => ({ ...p, high_cpl_alert: checked }))
              }
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Reports</p>
              <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
            </div>
            <Switch 
              checked={profile.weekly_reports}
              onCheckedChange={(checked) => 
                setProfile(p => ({ ...p, weekly_reports: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Data & Privacy</h2>
            <p className="text-sm text-muted-foreground">Manage your data</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Export All Data</p>
              <p className="text-sm text-muted-foreground">Download all your metrics data</p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
            </div>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
});

export default Settings;