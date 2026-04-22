'use client';

import { Loader2, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts';
import { useInventoryReport } from '@/hooks/useReports';
import { formatCurrency, cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name} :</span>
          <span className="font-medium">
            {p.name === 'Valeur' ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function InventoryReportPage() {
  const { data, isLoading } = useInventoryReport({});

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Produits en stock', value: data.summary.totalProducts, icon: Package, color: 'text-primary' },
          { label: 'Valeur totale',     value: formatCurrency(data.summary.totalValue), icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Stock bas',         value: data.summary.lowStockCount,  icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Rupture de stock',  value: data.summary.outOfStockCount, icon: TrendingDown, color: 'text-red-500' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border rounded-xl p-5 flex items-start gap-3">
            <div className={cn('w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0')}>
              <kpi.icon className={cn('w-4 h-4', kpi.color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par catégorie */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Valeur par catégorie</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCategory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Valeur" radius={[4, 4, 0, 0]}>
                {data.byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Évolution valeur stock */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Évolution de la valeur du stock</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.stockEvolution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Valeur" stroke="hsl(var(--primary))" fill="url(#stockGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top mouvements */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Top produits par activité</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Produit', 'Réf.', 'Entrées', 'Sorties', 'Net'].map((h) => (
                  <th key={h} className="pb-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.topMovements.map((row) => (
                <tr key={row.reference} className="hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 text-sm font-medium">{row.productName}</td>
                  <td className="py-2.5 text-xs font-mono text-muted-foreground">{row.reference}</td>
                  <td className="py-2.5 text-sm text-emerald-600 font-medium">+{row.inQty}</td>
                  <td className="py-2.5 text-sm text-red-500 font-medium">−{row.outQty}</td>
                  <td className={cn('py-2.5 text-sm font-semibold', row.netQty >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {row.netQty >= 0 ? '+' : ''}{row.netQty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
