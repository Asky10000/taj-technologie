'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, FileText, Package, Warehouse, Truck,
  Wrench, FolderKanban, BarChart3, ArrowUpRight,
  Cctv, Network, Cable, Router, Wifi,
  RefreshCw, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { DashboardData, ApiResponse } from '@/types/api.types';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardData>>('/reports/dashboard');
      return data.data;
    },
    refetchInterval: 60_000,
  });
}

export default function HomePage() {
  const { data: kpi, isLoading, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#0a0f1e]">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-3 bg-[#0a0f1e] text-slate-300">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Impossible de charger l&apos;accueil</p>
        <button onClick={() => refetch()} className="text-xs text-sky-400 hover:underline">
          Réessayer
        </button>
      </div>
    );
  }

  const tiles: {
    href: string; label: string; metric: string;
    icon: React.ComponentType<{ className?: string }>; alert?: boolean;
  }[] = [
    { href: '/crm',        label: 'CRM',          metric: `${formatNumber(kpi.crm.totalCustomers)} clients`,  icon: Building2 },
    { href: '/sales',      label: 'Ventes',       metric: `${formatCurrency(kpi.sales.monthRevenue)} ce mois`, icon: FileText },
    { href: '/products',   label: 'Produits',     metric: 'Catalogue',                                        icon: Package },
    { href: '/inventory',  label: 'Inventaire',   metric: formatCurrency(kpi.inventory.totalStockValue),      icon: Warehouse, alert: kpi.inventory.outOfStock > 0 },
    { href: '/suppliers',  label: 'Fournisseurs', metric: `${kpi.purchases.pendingOrders} cmd. en attente`,   icon: Truck },
    { href: '/interventions', label: 'Interventions', metric: 'Visites terrain',                              icon: Wrench },
    { href: '/projects',   label: 'Projets',      metric: `${kpi.projects.active} actifs`,                    icon: FolderKanban, alert: kpi.projects.overBudget > 0 },
    { href: '/reports',    label: 'Rapports',     metric: 'Analyses',                                         icon: BarChart3 },
  ];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#0a0f1e] text-slate-100 flex flex-col overflow-hidden">
      {/* Fond thématique — caméras, RJ45, câbles réseau (filigrane) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Cctv  className="absolute top-[8%]  left-[6%]  w-20 h-20 text-sky-400/[0.06]" />
        <Network className="absolute top-[14%] right-[9%] w-16 h-16 text-sky-400/[0.06]" />
        <Cable className="absolute top-[46%] left-[4%]  w-16 h-16 text-sky-400/[0.06]" />
        <Router className="absolute bottom-[14%] right-[7%] w-20 h-20 text-sky-400/[0.06]" />
        <Cctv  className="absolute bottom-[10%] left-[12%] w-14 h-14 text-sky-400/[0.06]" />
        <Wifi  className="absolute top-[58%] right-[16%] w-14 h-14 text-sky-400/[0.06]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(130% 90% at 50% 40%, rgba(10,15,30,0.35), rgba(10,15,30,0.9))' }}
      />

      {/* Tuiles */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group relative rounded-2xl p-5 bg-[#0f172a]/85 border border-[#223049] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#38bdf8] hover:shadow-[0_18px_38px_-12px_rgba(56,189,248,0.55)]"
            >
              {t.alert && (
                <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]" />
              )}
              <div className="w-12 h-12 rounded-xl bg-[#0b2540] text-[#38bdf8] flex items-center justify-center mb-3 transition-colors group-hover:bg-[#0e3358]">
                <t.icon className="w-6 h-6" />
              </div>
              <div className="text-slate-100 font-semibold">{t.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.metric}</div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 absolute bottom-4 right-4 transition-all group-hover:text-[#38bdf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </div>

      {/* Version */}
      <div className="relative text-center text-[11px] text-slate-500 py-4">
        TAJ Technologie ERP · v{APP_VERSION} · usage interne uniquement
      </div>
    </div>
  );
}
