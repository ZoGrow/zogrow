import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { PhoneCall, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RecentItem {
  client_id: string;
  client_name: string;
  updated_at: string;
  count: number;
}

export function RecentActivity({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<RecentItem[]>([]);
  const [appointments, setAppointments] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToday = async () => {
      // Metrics are bucketed by UTC date (GHL/Meta syncs), so match on UTC today
      const today = new Date().toISOString().split("T")[0];


      const [transferRes, apptRes] = await Promise.all([
        supabase
          .from("metrics")
          .select("client_id, updated_at, live_transfers, clients(client_name)")
          .eq("date", today)
          .gt("live_transfers", 0)
          .order("updated_at", { ascending: false }),
        supabase
          .from("metrics")
          .select("client_id, updated_at, appointments_booked, clients(client_name)")
          .eq("date", today)
          .gt("appointments_booked", 0)
          .order("updated_at", { ascending: false }),
      ]);

      setTransfers(
        (transferRes.data || []).map((r: any) => ({
          client_id: r.client_id,
          client_name: r.clients?.client_name || "Unknown",
          updated_at: r.updated_at,
          count: r.live_transfers,
        }))
      );
      setAppointments(
        (apptRes.data || []).map((r: any) => ({
          client_id: r.client_id,
          client_name: r.clients?.client_name || "Unknown",
          updated_at: r.updated_at,
          count: r.appointments_booked,
        }))
      );
      setLoading(false);
    };
    fetchToday();
  }, []);

  const ListCard = ({
    title,
    icon: Icon,
    items,
    iconBg,
    iconColor,
    label,
  }: {
    title: string;
    icon: typeof PhoneCall;
    items: RecentItem[];
    iconBg: string;
    iconColor: string;
    label: string;
  }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-1.5 rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="ml-auto text-xs text-muted-foreground">
          {items.reduce((s, i) => s + i.count, 0)} today
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No {label} today</p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.client_id}
              onClick={() => navigate(`/clients/${item.client_id}`)}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                </p>
              </div>
              <span className={cn("text-sm font-bold ml-2", iconColor)}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("grid md:grid-cols-2 gap-4", className)}>
      <ListCard
        title="Today's Live Transfers"
        icon={PhoneCall}
        items={transfers}
        iconBg="bg-success/10"
        iconColor="text-success"
        label="live transfers"
      />
      <ListCard
        title="Today's Appointments Booked"
        icon={CalendarPlus}
        items={appointments}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        label="appointments"
      />
    </div>
  );
}
