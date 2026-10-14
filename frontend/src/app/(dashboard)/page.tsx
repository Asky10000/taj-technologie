'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote, Building2, FileText, Package, Warehouse, Truck,
  Ticket, FolderKanban, BarChart3, ArrowUpRight,
  AlertTriangle, TrendingUp, RefreshCw,
} from 'lucide-react';
import { KpiCard }      from '@/components/dashboard/KpiCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import api from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
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

  // Tuiles de modules (style « néon sombre ») avec un chiffre clé + alerte.
  const tiles: {
    href: string; label: string; metric: string;
    icon: React.ComponentType<{ className?: string }>; alert?: boolean;
  }[] = [
    { href: '/crm',        label: 'CRM',          metric: `${formatNumber(kpi.crm.totalCustomers)} clients`,        icon: Building2 },
    { href: '/sales',      label: 'Ventes',       metric: `${formatCurrency(kpi.sales.monthRevenue)} ce mois`,      icon: FileText },
    { href: '/products',   label: 'Produits',     metric: 'Catalogue',                                              icon: Package },
    { href: '/inventory',  label: 'Inventaire',   metric: formatCurrency(kpi.inventory.totalStockValue),            icon: Warehouse, alert: kpi.inventory.outOfStock > 0 },
    { href: '/suppliers',  label: 'Fournisseurs', metric: `${kpi.purchases.pendingOrders} cmd. en attente`,         icon: Truck },
    { href: '/tickets',    label: 'Tickets',      metric: `${kpi.tickets.open} ouverts`,                            icon: Ticket, alert: kpi.tickets.critical > 0 },
    { href: '/projects',   label: 'Projets',      metric: `${kpi.projects.active} actifs`,                          icon: FolderKanban, alert: kpi.projects.overBudget > 0 },
    { href: '/reports',    label: 'Rapports',     metric: 'Analyses',                                               icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
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

      {/* Grille de tuiles — accès rapide aux modules */}
      <div className="mx-auto max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative rounded-2xl p-5 bg-[#0f172a] border border-[#1e293b] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#38bdf8] hover:shadow-[0_16px_34px_-12px_rgba(56,189,248,0.5)]"
          >
            {t.alert && (
              <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]" />
            )}
            <div className="w-11 h-11 rounded-xl bg-[#0b2540] text-[#38bdf8] flex items-center justify-center mb-3 transition-colors group-hover:bg-[#0e3358]">
              <t.icon className="w-5 h-5" />
            </div>
            <div className="text-slate-100 font-semibold">{t.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{t.metric}</div>
            <ArrowUpRight className="w-4 h-4 text-slate-600 absolute bottom-4 right-4 transition-all group-hover:text-[#38bdf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>

      {/* Indicateurs clés — Ventes & Facturation */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ventes & Facturation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="CA du mois (TTC)"
            value={formatCurrency(kpi.sales.monthRevenue)}
            subtitle="Factures émises ce mois"
            icon={Banknote}
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
            icon={Banknote}
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

      {/* Évolution du chiffre d'affaires */}
      <div className="bg-card border rounded-xl p-5">
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
    </div>
  );
}
