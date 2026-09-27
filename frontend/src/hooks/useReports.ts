import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardReport, SalesReport, FinancialReport, InventoryReport, ReportQuery } from '@/types/report.types';
import type { ApiResponse } from '@/types/api.types';

export const reportKeys = {
  dashboard:  ()         => ['reports', 'dashboard'] as const,
  sales:      (q: ReportQuery) => ['reports', 'sales', q] as const,
  financial:  (q: ReportQuery) => ['reports', 'financial', q] as const,
  inventory:  (q: ReportQuery) => ['reports', 'inventory', q] as const,
};

export function useDashboardReport() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardReport>>('/reports/dashboard');
      return data.data;
    },
    staleTime: 15_000,
    // Rafraîchit le tableau de bord quand on revient dessus (onglet/fenêtre)
    refetchOnWindowFocus: true,
  });
}

export function useSalesReport(query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.sales(query),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SalesReport>>('/reports/sales', { params: query });
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useFinancialReport(query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.financial(query),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/reports/financial', { params: query });
      const raw = data.data ?? {};
      const s = raw.summary ?? {};
      const ab = raw.agingBalance;

      // L'API renvoie agingBalance sous forme d'objet {current, days30…} et
      // des noms de champs summary différents : on normalise vers FinancialReport.
      const financial: FinancialReport = {
        summary: {
          totalRevenue:     Number(s.totalRevenue     ?? s.totalEmitted ?? 0),
          totalReceived:    Number(s.totalReceived    ?? s.totalPaid    ?? 0),
          totalOutstanding: Number(s.totalOutstanding ?? s.totalUnpaid  ?? 0),
          totalOverdue:     Number(s.totalOverdue     ?? 0),
        },
        byStatus: Array.isArray(raw.byStatus) ? raw.byStatus : [],
        agingBalance: Array.isArray(ab)
          ? ab
          : [
              { bracket: 'À échoir', amount: Number(ab?.current ?? 0), count: 0 },
              { bracket: '0-30j',    amount: Number(ab?.days30  ?? 0), count: 0 },
              { bracket: '31-60j',   amount: Number(ab?.days60  ?? 0), count: 0 },
              { bracket: '61-90j',   amount: Number(ab?.days90  ?? 0), count: 0 },
              { bracket: '90j+',     amount: Number(ab?.over90  ?? 0), count: 0 },
            ],
      };
      return financial;
    },
    staleTime: 60_000,
  });
}

export function useInventoryReport(query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.inventory(query),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/reports/inventory', { params: query });
      const raw = data.data ?? {};
      const s = raw.summary ?? {};

      // Normalisation vers InventoryReport (noms de champs API différents).
      const inventory: InventoryReport = {
        summary: {
          totalProducts:   Number(s.totalProducts ?? 0),
          totalValue:      Number(s.totalValue ?? s.totalStockValue ?? 0),
          lowStockCount:   Number(s.lowStockCount ?? s.lowStock ?? 0),
          outOfStockCount: Number(s.outOfStockCount ?? s.outOfStock ?? 0),
        },
        byCategory: (Array.isArray(raw.byCategory) ? raw.byCategory : []).map((c: any) => ({
          category: c.category ?? c.name ?? '—',
          products: Number(c.products ?? c.productCount ?? 0),
          value:    Number(c.value ?? c.stockValue ?? 0),
          quantity: Number(c.quantity ?? 0),
        })),
        topMovements: (Array.isArray(raw.topMovements) ? raw.topMovements : []).map((m: any) => {
          const inQty  = Number(m.inQty ?? m.totalIn ?? 0);
          const outQty = Number(m.outQty ?? m.totalOut ?? 0);
          return {
            productName: m.productName ?? m.name ?? '—',
            reference:   m.reference ?? m.sku ?? '',
            inQty,
            outQty,
            netQty: m.netQty ?? inQty - outQty,
          };
        }),
        stockEvolution: (Array.isArray(raw.stockEvolution) ? raw.stockEvolution : []).map((e: any) => ({
          date:  e.date ?? e.period ?? '',
          value: Number(e.value ?? (Number(e.totalIn ?? 0) - Number(e.totalOut ?? 0))),
        })),
      };
      return inventory;
    },
    staleTime: 60_000,
  });
}
