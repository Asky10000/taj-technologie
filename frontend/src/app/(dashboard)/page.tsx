'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Euro, Users, Ticket, FolderKanban, Package,
  AlertTriangle, Truck, TrendingUp, RefreshCw,
} from 'lucide-react';
import { KpiCard }      from '@/components/dashboard/KpiCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import api from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { DashboardData, SalesReportData, ApiResponse } from '@/types/api.types';
import { cn } from '@/lib/utils';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardData>>('/reports/dashboard');
      return data.data;
    },
    refetchInterval: 60_000, // actualise chaque minute
  });
}

function useSalesTimeline() {
  return useQuery({
    queryKey: ['reports', 'sales', 'timeline'],
    queryFn: async () => {
      const year  = new Date().getFullYear();
      const { data } = await api.get<ApiResponse<SalesReportData>>(
        `/reports/sales?from=${year}-01-01&groupBy=month`,
      );
      return data.data.timeline;
    },
  });
}

export default function DashboardPage() {
  const { data: kpi, isLoading, error, refetch, isFetching } = useDashboard();
  const { data: timeline = [] } = useSalesTimeline();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Impossible de charger le tableau de bord
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs text-primary hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vue d'ensemble</h2>
          <p className="text-sm text-muted-foreground">
            Données en temps réel —{' '}
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Grille KPIs — ligne 1 : Ventes */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ventes & Facturation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="CA du mois (TTC)"
            value={formatCurrency(kpi.sales.monthRevenue)}
            subtitle="Factures émises ce mois"
            icon={Euro}
          />
          <KpiCard
            title="CA de l'année (TTC)"
            value={formatCurrency(kpi.sales.yearRevenue)}
            subtitle={`HT : ${formatCurrency(kpi.sales.monthRevenueHT)}`}
            icon={TrendingUp}
          />
          <KpiCard
            title="Factures en attente"
            value={formatCurrency(kpi.sales.pendingInvoicesAmount)}
            subtitle="À encaisser"
            icon={Euro}
            alert={kpi.sales.pendingInvoicesAmount > 0}
          />
          <KpiCard
            title="Créances en retard"
            value={formatCurrency(kpi.sales.overdueInvoicesAmount)}
            subtitle={`${kpi.sales.overdueCount} facture(s) en retard`}
            icon={AlertTriangle}
            alert={kpi.sales.overdueCount > 0}
          />
        </div>
      </section>

      {/* Graphique CA + KPIs CRM */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Graphique */}
        <div className="xl:col-span-2 bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Évolution du chiffre d'affaires</h3>
              <p className="text-xs text-muted-foreground">Année en cours — par mois</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
                HT
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-600 rounded-full inline-block" />
                TTC
              </span>
            </div>
          </div>
          <RevenueChart data={timeline} />
        </div>

        {/* CRM */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">CRM</h3>
          <div className="space-y-3">
            {[
              { label: 'Clients actifs',          value: formatNumber(kpi.crm.totalCustomers) },
              { label: 'Nouveaux ce mois',        value: `+${kpi.crm.newCustomersThisMonth}`, color: 'text-emerald-600' },
              { label: 'Prospects totaux',        value: formatNumber(kpi.crm.totalProspects) },
              { label: 'Prospects actifs',        value: formatNumber(kpi.crm.activeProspects), color: 'text-primary' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn('text-sm font-semibold', item.color ?? 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ligne 3 — Tickets, Projets, Stock, Achats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Tickets */}
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Tickets SAV</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Ouverts',       value: kpi.tickets.open,       color: 'bg-yellow-400' },
              { label: 'En cours',      value: kpi.tickets.inProgress,  color: 'bg-blue-500' },
              { label: 'Critiques',     value: kpi.tickets.critical,    color: 'bg-destructive', alert: kpi.tickets.critical > 0 },
              { label: 'SLA dépassé',   value: kpi.tickets.slaBreached, color: 'bg-orange-500',  alert: kpi.tickets.slaBreached > 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.color)} />
                <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                <span className={cn('text-xs font-bold', item.alert && item.value > 0 ? 'text-destructive' : 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projets */}
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Projets</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Projets actifs',     value: kpi.projects.active },
              { label: 'En dépassement',     value: kpi.projects.overBudget, alert: kpi.projects.overBudget > 0 },
              { label: 'Budget total',       value: formatCurrency(kpi.projects.totalBudget) },
              { label: 'Coût réel cumulé',   value: formatCurrency(kpi.projects.totalActualCost) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn('text-xs font-bold', (item as any).alert && (item as any).value > 0 ? 'text-destructive' : 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventaire */}
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Inventaire</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Valeur stock',       value: formatCurrency(kpi.inventory.totalStockValue) },
              { label: 'Rupture de stock',   value: kpi.inventory.outOfStock,  alert: kpi.inventory.outOfStock > 0 },
              { label: 'Stock bas',          value: kpi.inventory.lowStock,    alert: kpi.inventory.lowStock > 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn('text-xs font-bold', (item as any).alert && (item as any).value > 0 ? 'text-destructive' : 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Achats */}
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Achats fournisseurs</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Commandes en attente', value: kpi.purchases.pendingOrders },
              { label: 'Montant en attente',   value: formatCurrency(kpi.purchases.pendingOrdersAmount) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
