import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Supplier, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderLine } from '@/types/supplier.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const supplierKeys = {
  suppliers: (p?: object) => ['suppliers', p] as const,
  supplier:  (id: string) => ['suppliers', id] as const,
  orders:    (p?: object) => ['purchase-orders', p] as const,
  order:     (id: string) => ['purchase-orders', id] as const,
};

// ── Fournisseurs ──────────────────────────────────────────────────

export function useSuppliers(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: supplierKeys.suppliers(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Supplier>>>(
        '/suppliers', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Supplier>) =>
      api.post<ApiResponse<Supplier>>('/suppliers', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Fournisseur créé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<Supplier>) =>
      api.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, payload).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: supplierKeys.supplier(id) });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

// ── Bons de commande ──────────────────────────────────────────────

export function usePurchaseOrders(params: { page?: number; limit?: number; search?: string; status?: string; supplierId?: string } = {}) {
  return useQuery({
    queryKey: supplierKeys.orders(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>(
        '/suppliers/orders', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: supplierKeys.order(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PurchaseOrder>>(`/suppliers/orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      supplierId: string;
      lines: Omit<PurchaseOrderLine, 'id' | 'receivedQuantity' | 'product'>[];
      expectedDeliveryDate?: string;
      notes?: string;
    }) => api.post<ApiResponse<PurchaseOrder>>('/suppliers/orders', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('Bon de commande créé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useUpdatePurchaseOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrderStatus }) =>
      api.patch<ApiResponse<PurchaseOrder>>(`/suppliers/orders/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: supplierKeys.order(id) });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useReceiveGoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: { lineId: string; receivedQuantity: number }[] }) =>
      api.post<ApiResponse<PurchaseOrder>>(`/suppliers/orders/${id}/receive`, { lines }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: supplierKeys.order(id) });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Réception enregistrée — stock mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useRecordPurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, paymentMethod }: { id: string; amount: number; paymentMethod?: string }) =>
      api.post<ApiResponse<PurchaseOrder>>(`/suppliers/orders/${id}/payment`, { amount, paymentMethod }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: supplierKeys.order(id) });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Paiement enregistré');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}
