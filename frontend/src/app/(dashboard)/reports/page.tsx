'use client';

import { TrendingUp, TrendingDown, Euro, Users, FileText, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardReport } from '@/hooks/useReports';
import { formatCurrency, cn } from '@/lib/utils';

function KpiCard({ label, value, sub, trend, icon: Icon, color = 'text-primary' }: {
  label: string; value: string | number; sub?: string; trend?: number;
  icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center', color.replace('text-', 'text-'))}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs mois dernier
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name} :</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsOverviewPage() {
  const { data, isLoading } = useDashboardReport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI row 1 — Revenus */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CA ce mois"
          value={formatCurrency(data.revenue.thisMonth)}
          sub={`Total : ${formatCurrency(data.revenue.total)}`}
          trend={data.revenue.growth}
          icon={Euro}
        />
        <KpiCard
          label="Factures en retard"
          value={data.invoices.overdue}
          sub={formatCurrency(data.invoices.overdueAmount)}
          icon={AlertTriangle}
          color="text-red-500"
        />
        <KpiCard
          label="Clients"
          value={data.customers.total}
          sub={`+${data.customers.newThisMonth} ce mois`}
          icon={Users}
          color="text-violet-500"
        />
        <KpiCard
          label="Valeur stock"
          value={formatCurrency(data.inventory.totalValue)}
          sub={`${data.inventory.lowStockCount} produits sous seuil`}
          icon={Package}
          color="text-amber-500"
        />
      </div>

      {/* KPI row 2 — Opérations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Devis en attente"  value={data.quotes.pending}   sub={`Taux conv. ${data.quotes.conversionRate.toFixed(0)}%`} icon={FileText} />
        <KpiCard label="Commandes actives" value={data.orders.active}    sub={`${data.orders.delivered} livrées`}                   icon={FileText} color="text-emerald-500" />
        <KpiCard label="Tickets ouverts"   value={data.tickets.open}     sub={`${data.tickets.slaBreached} SLA dépassés`}           icon={AlertTriangle} color="text-orange-500" />
        <KpiCard label="Projets actifs"    value={data.projects.active}  sub={`${data.projects.overBudget} hors budget`}            icon={FileText} color="text-sky-500" />
      </div>

      {/* Graphique revenus vs achats */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Revenus vs Achats (12 derniers mois)</h3>
        {data.timeline?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.timeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => v === 'revenue' ? 'Revenus' : 'Achats'} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue"   name="revenue"   stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="purchases" name="purchases" stroke="#f97316"              fill="url(#buyGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Pas de données disponibles.</p>
        )}
      </div>

      {/* Prospects pipeline */}
      {data.prospects.byStage && Object.keys(data.prospects.byStage).length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline prospects</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(data.prospects.byStage).map(([stage, count]) => (
              <div key={stage} className="flex-1 min-w-[100px] bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{count as number}</p>
                <p className="text-xs text-muted-foreground mt-1">{stage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
