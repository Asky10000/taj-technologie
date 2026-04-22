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
    staleTime: 60_000,
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
      const { data } = await api.get<ApiResponse<FinancialReport>>('/reports/financial', { params: query });
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useInventoryReport(query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.inventory(query),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<InventoryReport>>('/reports/inventory', { params: query });
      return data.data;
    },
    staleTime: 60_000,
  });
}
