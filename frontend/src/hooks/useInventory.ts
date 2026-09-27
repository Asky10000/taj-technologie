import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Stock, StockMovement } from '@/types/inventory.types';
import type { ApiResponse } from '@/types/api.types';

/* ── Type paginé (compatible avec la réponse backend) ─────────── */
export interface PagedResult<T> {
  items:      T[];
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNextPage:  boolean;
  hasPrevPage:  boolean;
}

/* Aplatit le wrapper { items, meta } retourné par paginate() */
function flattenPage<T>(raw: { items: T[]; meta: { page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }): PagedResult<T> {
  return {
    items:       raw.items,
    page:        raw.meta.page,
    limit:       raw.meta.limit,
    total:       raw.meta.totalItems,
    totalPages:  raw.meta.totalPages,
    hasNextPage: raw.meta.hasNextPage,
    hasPrevPage: raw.meta.hasPreviousPage,
  };
}

export interface ProductOption {
  id:           string;
  sku:          string;
  name:         string;
  sellingPrice: number;
  taxRate:      number;
  unit:         string;
}

export const inventoryKeys = {
  stocks:    (p?: object) => ['stocks',    p] as const,
  stock:     (id: string) => ['stocks',    id] as const,
  movements: (p?: object) => ['movements', p] as const,
  products:  (p?: object) => ['inv-products', p] as const,
};

// ── Produits (catalogue, pour les pickers) ────────────────────────

export function useProducts(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: inventoryKeys.products(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/products', { params: { page: 1, limit: 100, ...params } },
      );
      // Le backend peut retourner { items, meta } ou { items, page, ... }
      const raw = data.data;
      if (raw?.meta) return flattenPage<ProductOption>(raw);
      return raw as PagedResult<ProductOption>;
    },
  });
}

// ── Stocks ────────────────────────────────────────────────────────

export function useStocks(params: { page?: number; limit?: number; search?: string; lowStock?: boolean } = {}) {
  return useQuery({
    queryKey: inventoryKeys.stocks(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/inventory/stocks', { params: { page: 1, limit: 20, ...params } },
      );
      const raw = data.data;
      if (raw?.meta) return flattenPage<Stock>(raw);
      return raw as PagedResult<Stock>;
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
    mutationFn: ({ id, ...payload }: {
      id: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      unitCost?: number;
      notes?: string;
      reference?: string;
    }) =>
      api.post<ApiResponse<StockMovement>>(`/inventory/stocks/${id}/adjust`, payload)
         .then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Mouvement enregistré');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

// ── Mouvements ────────────────────────────────────────────────────

export function useMovements(params: { page?: number; limit?: number; search?: string; type?: string; stockId?: string } = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/inventory/movements', { params: { page: 1, limit: 30, ...params } },
      );
      const raw = data.data;
      if (raw?.meta) return flattenPage<StockMovement>(raw);
      return raw as PagedResult<StockMovement>;
    },
  });
}
