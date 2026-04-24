import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface ClientLeaderboardProps {
  data: any[];
  metric: 'appointments_booked' | 'roas';
  title: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-semibold text-foreground mb-1">{data.client_name}</p>
      <p className="text-xs text-muted-foreground">{data.market}, {data.state}</p>
      <p className="text-sm font-medium text-primary mt-2">
        {payload[0].name === 'roas' 
          ? `${data.roas.toFixed(2)}x ROAS`
          : `${data.appointments_booked} Appointments`
        }
      </p>
    </div>
  );
};

const colors = [
  "hsl(160, 84%, 39%)",
  "hsl(160, 84%, 45%)",
  "hsl(160, 84%, 50%)",
  "hsl(160, 84%, 55%)",
  "hsl(160, 84%, 60%)",
];

export function ClientLeaderboard({ data, metric, title }: ClientLeaderboardProps) {
  const chartData = useMemo(() => {
    return data
      .filter(client => client.status === 'active')
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 5)
      .map(client => ({
        ...client,
        shortName: client.client_name.split(' ')[0],
      }));
  }, [data, metric]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(value) => 
                metric === 'roas' ? `${value.toFixed(1)}x` : value.toLocaleString()
              }
            />
            <YAxis 
              type="category"
              dataKey="shortName"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={metric} radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
