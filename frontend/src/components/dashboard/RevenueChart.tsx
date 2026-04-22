'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface DataPoint {
  period:     string;
  revenueHT:  number;
  revenueTTC: number;
}

interface RevenueChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.dataKey === 'revenueHT' ? 'HT' : 'TTC'}
          </span>
          <span className="font-medium text-foreground ml-auto pl-4">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(221,83%,53%)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorTTC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(142,76%,36%)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(142,76%,36%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: 'hsl(215,16%,47%)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.slice(0, 7)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(215,16%,47%)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
          }
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenueHT"
          stroke="hsl(221,83%,53%)"
          strokeWidth={2}
          fill="url(#colorHT)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="revenueTTC"
          stroke="hsl(142,76%,36%)"
          strokeWidth={2}
          fill="url(#colorTTC)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
