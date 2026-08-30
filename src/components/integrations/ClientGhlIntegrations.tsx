import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, RefreshCw, CheckCircle2 } from "lucide-react";

interface ClientRow {
  id: string;
  client_name: string;
  market: string;
  state: string;
}

interface IntegrationRow {
  client_id: string;
  ghl_api_key: string | null;
  ghl_location_id: string | null;
  ghl_pipeline_name: string | null;
  last_synced_at: string | null;
}

interface DraftValue {
  apiKey: string;
  locationId: string;
  pipelineName: string;
}

export function ClientGhlIntegrations() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [lastSynced, setLastSynced] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = async () => {
    const [{ data: clientData }, { data: integrationData }] = await Promise.all([
      supabase.from("clients").select("id, client_name, market, state").order("client_name"),
      supabase
        .from("client_integrations")
        .select("client_id, ghl_api_key, ghl_location_id, ghl_pipeline_name, last_synced_at"),
    ]);

    const nextDrafts: Record<string, DraftValue> = {};
    const nextSynced: Record<string, string | null> = {};
    (clientData || []).forEach((c) => {
      nextDrafts[c.id] = { apiKey: "", locationId: "", pipelineName: "" };
    });
    ((integrationData || []) as IntegrationRow[]).forEach((i) => {
      nextDrafts[i.client_id] = {
        apiKey: i.ghl_api_key || "",
        locationId: i.ghl_location_id || "",
        pipelineName: i.ghl_pipeline_name || "",
      };
      nextSynced[i.client_id] = i.last_synced_at;
    });

    setClients((clientData || []) as ClientRow[]);
    setDrafts(nextDrafts);
    setLastSynced(nextSynced);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectedCount = useMemo(
    () => Object.values(drafts).filter((d) => d.apiKey.trim() && d.locationId.trim()).length,
    [drafts]
  );

  const update = (clientId: string, patch: Partial<DraftValue>) =>
    setDrafts((prev) => ({ ...prev, [clientId]: { ...prev[clientId], ...patch } }));

  const save = async (clientId: string) => {
    const draft = drafts[clientId];
    setSavingId(clientId);
    const { error } = await supabase.from("client_integrations").upsert(
      {
        client_id: clientId,
        ghl_api_key: draft.apiKey.trim() || null,
        ghl_location_id: draft.locationId.trim() || null,
        ghl_pipeline_name: draft.pipelineName.trim() || null,
      },
      { onConflict: "client_id" }
    );
    setSavingId(null);
    if (error) {
      toast.error("Failed to save GHL credentials", { description: error.message });
    } else {
      toast.success("GHL credentials saved");
    }
  };

  const sync = async (clientId?: string) => {
    if (clientId) setSyncingId(clientId);
    else setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-ghl-client-pipeline", {
        body: clientId ? { action: "sync", clientId } : { action: "sync" },
      });
      if (error) throw error;
      const results = (data?.results || []) as Array<{ status: string }>;
      const ok = results.filter((r) => r.status === "ok").length;
      toast.success("GHL pipeline sync complete", {
        description: `${ok} of ${results.length} client pipeline(s) updated.`,
      });
      load();
    } catch (e: unknown) {
      toast.error("GHL sync failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSyncingId(null);
      setSyncingAll(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Client GHL Pipelines (B2C)</CardTitle>
              <CardDescription className="mt-1">
                Add each client's GHL API key and Location ID to auto-track their pipeline numbers —
                leads, appointments booked, shows, closes and revenue — exactly like the B2B pipeline.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {connectedCount} connected
            </Badge>
            <Button size="sm" onClick={() => sync()} disabled={syncingAll || connectedCount === 0}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingAll ? "animate-spin" : ""}`} />
              {syncingAll ? "Syncing…" : "Sync all"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading clients…</p>}
        {!loading && clients.length === 0 && (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        )}
        {clients.map((client, idx) => {
          const draft = drafts[client.id] || { apiKey: "", locationId: "", pipelineName: "" };
          const connected = draft.apiKey.trim() && draft.locationId.trim();
          return (
            <div key={client.id}>
              {idx > 0 && <Separator className="my-4" />}
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium">{client.client_name}</p>
                <span className="text-xs text-muted-foreground">
                  {client.market}, {client.state}
                </span>
                {connected ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Not connected
                  </Badge>
                )}
                {lastSynced[client.id] && (
                  <span className="text-xs text-muted-foreground">
                    last sync {new Date(lastSynced[client.id] as string).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`key-${client.id}`} className="text-xs">
                    GHL API Key
                  </Label>
                  <Input
                    id={`key-${client.id}`}
                    type="password"
                    placeholder="pit-xxxxxxxx"
                    value={draft.apiKey}
                    onChange={(e) => update(client.id, { apiKey: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`loc-${client.id}`} className="text-xs">
                    Location ID
                  </Label>
                  <Input
                    id={`loc-${client.id}`}
                    placeholder="knEiXKCriAscTUMZSzbr"
                    value={draft.locationId}
                    onChange={(e) => update(client.id, { locationId: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pipe-${client.id}`} className="text-xs">
                    Pipeline name (optional)
                  </Label>
                  <Input
                    id={`pipe-${client.id}`}
                    placeholder="e.g. Meta Ads"
                    value={draft.pipelineName}
                    onChange={(e) => update(client.id, { pipelineName: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => save(client.id)}
                  disabled={savingId === client.id}
                >
                  {savingId === client.id ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sync(client.id)}
                  disabled={!connected || syncingId === client.id}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingId === client.id ? "animate-spin" : ""}`} />
                  {syncingId === client.id ? "Syncing…" : "Sync now"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
