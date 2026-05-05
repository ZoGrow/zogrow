import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PreviewRow {
  date: string;
  client: string;
  impressions: number;
  clicks: number;
  ad_spend: number;
  leads: number;
  appointments_booked: number;
  live_transfers: number;
  self_booked: number;
  sales_team_booked: number;
  appointments_showed: number;
  deals_closed: number;
  revenue: number;
}

interface ClientMap {
  [name: string]: string;
}

export default function Import() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "text/csv" || droppedFile?.name.endsWith(".csv")) {
      processFile(droppedFile);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());

      const requiredHeaders = [
        "date",
        "client",
        "impressions",
        "clicks",
        "ad_spend",
        "leads",
        "appointments_booked",
      ];

      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h) && !headers.includes(h.replace("_", " "))
      );

      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(", ")}`]);
        return;
      }

      const data: PreviewRow[] = [];
      const parseErrors: string[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(",").map((v) => v.trim());
        
        try {
          const liveTransfers = parseInt(values[headers.indexOf("live_transfers")] || "0") || 0;
          const selfBooked = parseInt(values[headers.indexOf("self_booked")] || "0") || 0;
          const salesTeamBooked = parseInt(values[headers.indexOf("sales_team_booked")] || "0") || 0;
          const legacyBooked = parseInt(values[headers.indexOf("appointments_booked")] || "0") || 0;
          const combinedBooked = liveTransfers + selfBooked + salesTeamBooked;

          data.push({
            date: values[headers.indexOf("date")] || "",
            client: values[headers.indexOf("client")] || "",
            impressions: parseInt(values[headers.indexOf("impressions")]) || 0,
            clicks: parseInt(values[headers.indexOf("clicks")]) || 0,
            ad_spend: parseFloat(values[headers.indexOf("ad_spend")]) || 0,
            leads: parseInt(values[headers.indexOf("leads")]) || 0,
            appointments_booked: combinedBooked || legacyBooked,
            live_transfers: liveTransfers,
            self_booked: selfBooked || (combinedBooked === 0 ? legacyBooked : 0),
            sales_team_booked: salesTeamBooked,
            appointments_showed: parseInt(values[headers.indexOf("appointments_showed")] || "0") || 0,
            deals_closed: parseInt(values[headers.indexOf("deals_closed")] || "0") || 0,
            revenue: parseFloat(values[headers.indexOf("revenue")] || "0") || 0,
          });
        } catch {
          parseErrors.push(`Error parsing row ${i}`);
        }
      }

      setPreviewData(data);
      if (parseErrors.length > 0) {
        setErrors(parseErrors);
      }
    };

    reader.readAsText(uploadedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setErrors([]);

    try {
      // Fetch all clients to map names to IDs
      const { data: clients, error: clientError } = await supabase
        .from("clients")
        .select("id, client_name");

      if (clientError) {
        throw new Error("Failed to fetch clients");
      }

      const clientMap: ClientMap = {};
      clients?.forEach(c => {
        clientMap[c.client_name.toLowerCase()] = c.id;
      });

      // Read and parse the full file
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());

      const metricsToInsert: Array<{
        client_id: string;
        date: string;
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
      }> = [];
      const importErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(",").map((v) => v.trim());
        const clientName = values[headers.indexOf("client")]?.toLowerCase();
        const clientId = clientMap[clientName];

        if (!clientId) {
          importErrors.push(`Row ${i}: Client "${values[headers.indexOf("client")]}" not found`);
          continue;
        }

        metricsToInsert.push({
          client_id: clientId,
          date: values[headers.indexOf("date")] || new Date().toISOString().split("T")[0],
          impressions: parseInt(values[headers.indexOf("impressions")]) || 0,
          clicks: parseInt(values[headers.indexOf("clicks")]) || 0,
          ad_spend: parseFloat(values[headers.indexOf("ad_spend")]) || 0,
          leads: parseInt(values[headers.indexOf("leads")]) || 0,
          dials_made: parseInt(values[headers.indexOf("dials_made")] || "0") || 0,
          pickups: parseInt(values[headers.indexOf("pickups")] || "0") || 0,
          appointments_booked: parseInt(values[headers.indexOf("appointments_booked")]) || 0,
          appointments_showed: parseInt(values[headers.indexOf("appointments_showed")] || "0") || 0,
          deals_closed: parseInt(values[headers.indexOf("deals_closed")] || "0") || 0,
          revenue: parseFloat(values[headers.indexOf("revenue")] || "0") || 0,
        });
      }

      if (metricsToInsert.length === 0) {
        setErrors(importErrors.length > 0 ? importErrors : ["No valid records to import"]);
        setIsImporting(false);
        return;
      }

      // Insert metrics (upsert based on client_id and date)
      const { error: insertError } = await supabase
        .from("metrics")
        .upsert(metricsToInsert, { onConflict: "client_id,date" });

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      if (importErrors.length > 0) {
        toast.warning(`Imported ${metricsToInsert.length} records. ${importErrors.length} rows skipped.`);
        setErrors(importErrors);
      } else {
        toast.success(`Successfully imported ${metricsToInsert.length} records`);
        setFile(null);
        setPreviewData([]);
        setErrors([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import CSV</h1>
        <p className="text-muted-foreground">
          Upload a CSV file with your metrics data
        </p>
      </div>

      {/* Upload Area */}
      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-12 transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-center">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              Drag and drop your CSV file
            </h3>
            <p className="text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button variant="outline">Browse Files</Button>
          </div>
        </div>
      )}

      {/* File Selected */}
      {file && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear} disabled={isImporting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive mb-2">Import Errors</p>
              <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewData.length > 0 && errors.length === 0 && (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">
                  Preview ({previewData.length} rows)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Impressions</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Clicks</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Spend</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Leads</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Appts</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Showed</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deals</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.client}</td>
                      <td className="px-4 py-3 text-right">{row.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${row.ad_spend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.leads}</td>
                      <td className="px-4 py-3 text-right">{row.appointments_booked}</td>
                      <td className="px-4 py-3 text-right">{row.appointments_showed}</td>
                      <td className="px-4 py-3 text-right">{row.deals_closed}</td>
                      <td className="px-4 py-3 text-right">${row.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClear} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} className="bg-primary hover:bg-primary/90" disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Records
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Expected Format */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Expected CSV Format</h2>
        <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-muted-foreground">
{`date,client,impressions,clicks,ad_spend,leads,appointments_booked,appointments_showed,deals_closed,revenue
2024-01-15,Coastal Realty Group,12500,425,350.00,42,8,5,1,12500.00
2024-01-16,Summit Properties,9800,312,280.00,35,6,4,0,0.00`}
          </pre>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-2">Required Columns:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• date (YYYY-MM-DD format)</li>
              <li>• client (must match existing client name)</li>
              <li>• impressions, clicks, ad_spend</li>
              <li>• leads, appointments_booked</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Optional Columns:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• campaign</li>
              <li>• appointments_showed</li>
              <li>• dials_made, pickups</li>
              <li>• deals_closed, revenue</li>
              <li>• notes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}