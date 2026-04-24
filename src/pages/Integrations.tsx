import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Facebook,
  Webhook,
  Phone,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Megaphone,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const WEBHOOKS = [
  { name: "Lead Received", path: "zogrow-lead-received", description: "GHL → new lead created" },
  { name: "Appointment Booked", path: "zogrow-appointment", description: "GHL → appointment booked" },
  { name: "Live Transfer", path: "zogrow-live-transfer", description: "Live transfer event" },
  { name: "Sales Team Booked", path: "zogrow-sales-team-booked", description: "Sales team booked call" },
  { name: "B2B Dial", path: "zogrow-b2b-dial", description: "B2B outbound dial logged" },
  { name: "B2B Pickup", path: "zogrow-b2b-pickup", description: "B2B call answered" },
  { name: "B2B Intro Booked", path: "zogrow-b2b-intro", description: "B2B intro call booked" },
  { name: "B2B Demo Booked", path: "zogrow-b2b-demo", description: "B2B demo booked" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="h-3.5 w-3.5 mr-1" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export default function Integrations() {
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncingB2B, setSyncingB2B] = useState(false);
  const [days, setDays] = useState(30);

  const runSync = async (fn: "sync-meta-ads" | "sync-b2b-ads") => {
    const setLoading = fn === "sync-meta-ads" ? setSyncingMeta : setSyncingB2B;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { days } });
      if (error) throw error;
      toast.success(`${fn === "sync-meta-ads" ? "Meta Ads" : "B2B Ads"} sync completed`, {
        description: data?.message || "Done",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast.error("Sync failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Manage external data sources, sync ad spend, and copy webhook URLs for GHL and other tools.
        </p>
      </div>

      {/* Meta / Facebook Ads */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Facebook className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Meta Ads (Facebook / Instagram)</CardTitle>
                <CardDescription className="mt-1">
                  Pull impressions, clicks, spend, and leads from your Meta ad accounts. Each client's ad
                  account ID is configured on the client itself.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Token configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="meta-days">Days back to sync</Label>
              <Input
                id="meta-days"
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 30))}
                className="w-32"
              />
            </div>
            <Button onClick={() => runSync("sync-meta-ads")} disabled={syncingMeta}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingMeta ? "animate-spin" : ""}`} />
              {syncingMeta ? "Syncing…" : "Sync client Meta Ads"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => runSync("sync-b2b-ads")}
              disabled={syncingB2B}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingB2B ? "animate-spin" : ""}`} />
              {syncingB2B ? "Syncing…" : "Sync B2B Ads"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            To rotate the Meta access token, open backend secrets and update{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-foreground">META_ACCESS_TOKEN</code>.
          </p>
        </CardContent>
      </Card>

      {/* GoHighLevel */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>GoHighLevel (GHL)</CardTitle>
                <CardDescription className="mt-1">
                  Receive lead, appointment, and call events from GHL workflows via webhooks below.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              API key configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add the webhook URLs from the section below to your GHL workflows. Each event auto-attributes
            to the correct client based on the inbound payload.
          </p>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Webhook URLs</CardTitle>
              <CardDescription className="mt-1">
                Paste these URLs into GHL workflow "Webhook" actions or any external automation tool.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEBHOOKS.map((wh, idx) => {
            const url = `${SUPABASE_URL}/functions/v1/${wh.path}`;
            return (
              <div key={wh.path}>
                {idx > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{wh.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        POST
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{wh.description}</p>
                    <code className="block mt-1.5 text-xs text-muted-foreground break-all bg-muted/40 px-2 py-1 rounded">
                      {url}
                    </code>
                  </div>
                  <CopyButton value={url} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Helpful links */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Setup references</CardTitle>
              <CardDescription className="mt-1">Documentation for the connected platforms.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://developers.facebook.com/docs/marketing-api/insights/" target="_blank" rel="noreferrer">
              Meta Insights API
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://highlevel.stoplight.io/" target="_blank" rel="noreferrer">
              GHL API Docs
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Need to add a new integration?</p>
            <p className="text-muted-foreground mt-1">
              Tell me which platform (e.g. Google Ads, TikTok, Calendly) and I'll wire it up here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
