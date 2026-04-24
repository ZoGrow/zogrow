import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

interface MetricsChartProps {
  data: any[];
  type: 'area' | 'bar';
  dataKey: string;
  title: string;
  color?: string;
  valueFormatter?: (value: number) => string;
}

const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  valueFormatter 
}: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm text-muted-foreground mb-1">
        {format(new Date(label), "MMM d, yyyy")}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
          {valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function MetricsChart({ 
  data, 
  type, 
  dataKey, 
  title, 
  color = "hsl(var(--primary))",
  valueFormatter 
}: MetricsChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      dateFormatted: format(new Date(item.date), "MMM d"),
    }));
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false} 
              />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => 
                  valueFormatter ? valueFormatter(value) : value.toLocaleString()
                }
                dx={-10}
              />
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${dataKey})`}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false} 
              />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => 
                  valueFormatter ? valueFormatter(value) : value.toLocaleString()
                }
                dx={-10}
              />
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
