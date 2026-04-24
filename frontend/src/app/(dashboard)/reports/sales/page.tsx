'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useSalesReport } from '@/hooks/useReports';
import { formatCurrency, cn } from '@/lib/utils';
import type { ReportQuery } from '@/types/report.types';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name} :</span>
          <span className="font-medium">{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const GROUP_OPTIONS: { label: string; value: ReportQuery['groupBy'] }[] = [
  { label: 'Par jour',    value: 'day' },
  { label: 'Par semaine', value: 'week' },
  { label: 'Par mois',   value: 'month' },
];

export default function SalesReportPage() {
  const [groupBy, setGroupBy] = useState<ReportQuery['groupBy']>('month');
  const [from, setFrom] = useState('');
  const [to, setTo]   = useState('');

  const { data, isLoading } = useSalesReport({ groupBy, from: from || undefined, to: to || undefined });

  const totalRevenueHT = data?.timeline.reduce((s, r) => s + r.revenueHT, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
          {GROUP_OPTIONS.map((g) => (
            <button key={g.value} onClick={() => setGroupBy(g.value)}
              className={cn('px-3 py-1 rounded text-xs font-medium transition-colors',
                groupBy === g.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          <span className="text-xs text-muted-foreground">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CA HT (période)', value: formatCurrency(totalRevenueHT) },
              { label: 'Total devis',     value: data.conversionRate.totalQuotes },
              { label: 'Devis convertis', value: data.conversionRate.convertedQuotes },
              { label: 'Taux de conv.',   value: `${data.conversionRate.rate.toFixed(1)} %` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Évolution CA */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Évolution du chiffre d&apos;affaires</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.timeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ttcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenueHT"  name="CA HT"  stroke="hsl(var(--primary))" fill="url(#caGrad)"  strokeWidth={2}   dot={false} />
                <Area type="monotone" dataKey="revenueTTC" name="CA TTC" stroke="#6366f1"              fill="url(#ttcGrad)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top clients */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Top clients</h3>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {data.topCustomers.slice(0, 6).map((c, i) => {
                    const max = data.topCustomers[0]?.revenueHT ?? 1;
                    return (
                      <div key={c.customerId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground font-medium truncate max-w-[180px]">{c.name}</span>
                          <span className="text-xs font-semibold text-primary">{formatCurrency(c.revenueHT)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${(c.revenueHT / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.invoiceCount} facture{c.invoiceCount > 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top produits */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Top produits</h3>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topProducts.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenueHT" name="CA HT" radius={[0, 4, 4, 0]}>
                      {data.topProducts.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Par type de produit */}
          {data.byProductType.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Répartition par type de produit</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byProductType} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenueHT" name="CA HT" radius={[4, 4, 0, 0]}>
                    {data.byProductType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
