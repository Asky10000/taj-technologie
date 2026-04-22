import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Stock, StockMovement } from '@/types/inventory.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const inventoryKeys = {
  stocks:    (p?: object) => ['stocks',    p] as const,
  stock:     (id: string) => ['stocks',    id] as const,
  movements: (p?: object) => ['movements', p] as const,
};

// ── Stocks ────────────────────────────────────────────────────────

export function useStocks(params: { page?: number; limit?: number; search?: string; lowStock?: boolean } = {}) {
  return useQuery({
    queryKey: inventoryKeys.stocks(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Stock>>>(
        '/inventory/stocks', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useStock(id: string) {
  return useQuery({
    queryKey: inventoryKeys.stock(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Stock>>(`/inventory/stocks/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; unitCost?: number; notes?: string; reference?: string }) =>
      api.post<ApiResponse<StockMovement>>(`/inventory/stocks/${id}/adjust`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Stock ajusté');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

// ── Mouvements ────────────────────────────────────────────────────

export function useMovements(params: { page?: number; limit?: number; search?: string; type?: string; stockId?: string } = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<StockMovement>>>(
        '/inventory/movements', { params: { page: 1, limit: 30, ...params } },
      );
      return data.data;
    },
  });
}
