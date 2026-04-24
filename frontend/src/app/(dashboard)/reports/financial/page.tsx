'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFinancialReport } from '@/hooks/useReports';
import { formatCurrency, cn } from '@/lib/utils';

const AGING_COLORS: Record<string, string> = {
  '0-30j':  '#10b981',
  '31-60j': '#f59e0b',
  '61-90j': '#f97316',
  '90j+':   '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT:          'Brouillon',
  PENDING:        'En attente',
  PARTIALLY_PAID: 'Part. payée',
  PAID:           'Payée',
  OVERDUE:        'En retard',
  CANCELLED:      'Annulée',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.name} :</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FinancialReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const { data, isLoading } = useFinancialReport({ from: from || undefined, to: to || undefined });

  return (
    <div className="space-y-6">
      {/* Filtres dates */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Période :</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        <span className="text-xs text-muted-foreground">→</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CA Facturé',    value: formatCurrency(data.summary.totalRevenue),     color: 'text-foreground' },
              { label: 'Encaissé',      value: formatCurrency(data.summary.totalReceived),    color: 'text-emerald-600' },
              { label: 'En attente',    value: formatCurrency(data.summary.totalOutstanding), color: 'text-amber-600' },
              { label: 'En retard',     value: formatCurrency(data.summary.totalOverdue),     color: 'text-red-500' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card border rounded-xl p-5">
                <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Balance âgée */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold">Balance âgée des créances</h3>
              {data.summary.totalOverdue > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {formatCurrency(data.summary.totalOverdue)} en retard
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graphique */}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.agingBalance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bracket" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Montant" radius={[4, 4, 0, 0]}>
                    {data.agingBalance.map((entry) => (
                      <Cell key={entry.bracket} fill={AGING_COLORS[entry.bracket] ?? '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Tableau */}
              <div className="space-y-2">
                {data.agingBalance.map((row) => (
                  <div key={row.bracket} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium" style={{ color: AGING_COLORS[row.bracket] ?? '#6366f1' }}>
                      {row.bracket}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${data.summary.totalOutstanding > 0 ? (row.amount / data.summary.totalOutstanding) * 100 : 0}%`,
                          backgroundColor: AGING_COLORS[row.bracket] ?? '#6366f1',
                        }} />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-semibold">{formatCurrency(row.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{row.count} facture{row.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Par statut */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Répartition par statut</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Statut', 'Nombre', 'Montant total'].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byStatus.map((row) => (
                    <tr key={row.status} className="hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 text-sm">{STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="py-2.5 text-sm text-muted-foreground">{row.count}</td>
                      <td className="py-2.5 text-sm font-medium">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
