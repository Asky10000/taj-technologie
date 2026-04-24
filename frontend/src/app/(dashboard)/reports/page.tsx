'use client';

import {
  Euro, Users, Package, AlertTriangle, Ticket,
  FolderKanban, Truck, TrendingUp, Loader2,
} from 'lucide-react';
import { useDashboardReport } from '@/hooks/useReports';
import { formatCurrency, cn } from '@/lib/utils';

function KpiCard({
  label, value, sub, icon: Icon, color = 'text-primary', bg = 'bg-primary/10',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

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
    <div className="space-y-8">

      {/* ── Finances ────────────────────────────────────────── */}
      <Section title="Finances">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="CA ce mois (TTC)"
            value={formatCurrency(data.sales.monthRevenue)}
            sub={`Annuel : ${formatCurrency(data.sales.yearRevenue)}`}
            icon={Euro}
            color="text-emerald-600"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <KpiCard
            label="CA ce mois (HT)"
            value={formatCurrency(data.sales.monthRevenueHT)}
            icon={TrendingUp}
            color="text-primary"
            bg="bg-primary/10"
          />
          <KpiCard
            label="Factures en retard"
            value={data.sales.overdueCount}
            sub={formatCurrency(data.sales.overdueInvoicesAmount)}
            icon={AlertTriangle}
            color="text-red-500"
            bg="bg-red-50 dark:bg-red-900/20"
          />
          <KpiCard
            label="En attente de paiement"
            value={formatCurrency(data.sales.pendingInvoicesAmount)}
            icon={Euro}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>
      </Section>

      {/* ── CRM ─────────────────────────────────────────────── */}
      <Section title="CRM">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Clients totaux"
            value={data.crm.totalCustomers}
            sub={`+${data.crm.newCustomersThisMonth} ce mois`}
            icon={Users}
            color="text-violet-600"
            bg="bg-violet-50 dark:bg-violet-900/20"
          />
          <KpiCard
            label="Prospects actifs"
            value={data.crm.activeProspects}
            sub={`${data.crm.totalProspects} au total`}
            icon={Users}
            color="text-sky-600"
            bg="bg-sky-50 dark:bg-sky-900/20"
          />
        </div>
      </Section>

      {/* ── Opérations ──────────────────────────────────────── */}
      <Section title="Opérations">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Tickets ouverts"
            value={data.tickets.open}
            sub={`En cours : ${data.tickets.inProgress}`}
            icon={Ticket}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-900/20"
          />
          <KpiCard
            label="Tickets critiques"
            value={data.tickets.critical}
            sub={`${data.tickets.slaBreached} SLA dépassés`}
            icon={AlertTriangle}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-900/20"
          />
          <KpiCard
            label="Projets actifs"
            value={data.projects.active}
            sub={`${data.projects.overBudget} hors budget`}
            icon={FolderKanban}
            color="text-teal-600"
            bg="bg-teal-50 dark:bg-teal-900/20"
          />
          <KpiCard
            label="Budget projets"
            value={formatCurrency(data.projects.totalBudget)}
            sub={`Réel : ${formatCurrency(data.projects.totalActualCost)}`}
            icon={FolderKanban}
            color="text-primary"
            bg="bg-primary/10"
          />
        </div>
      </Section>

      {/* ── Stock & Achats ───────────────────────────────────── */}
      <Section title="Stock & Achats">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Valeur du stock"
            value={formatCurrency(data.inventory.totalStockValue)}
            sub={`${data.inventory.lowStock} produits sous seuil`}
            icon={Package}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-900/20"
          />
          <KpiCard
            label="Ruptures de stock"
            value={data.inventory.outOfStock}
            icon={Package}
            color="text-red-500"
            bg="bg-red-50 dark:bg-red-900/20"
          />
          <KpiCard
            label="Commandes fournisseurs"
            value={data.purchases.pendingOrders}
            sub={`Valeur : ${formatCurrency(data.purchases.pendingOrdersAmount)}`}
            icon={Truck}
            color="text-slate-600"
            bg="bg-slate-100 dark:bg-slate-800/40"
          />
        </div>
      </Section>

    </div>
  );
}
