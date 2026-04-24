import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Quote, Order, Invoice, QuoteStatus, OrderStatus, InvoiceStatus, SaleLine } from '@/types/sales.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const salesKeys = {
  quotes:   (p?: object) => ['quotes',   p] as const,
  quote:    (id: string) => ['quotes',   id] as const,
  orders:   (p?: object) => ['orders',   p] as const,
  order:    (id: string) => ['orders',   id] as const,
  invoices: (p?: object) => ['invoices', p] as const,
  invoice:  (id: string) => ['invoices', id] as const,
};

// ── Devis ────────────────────────────────────────────────────────

export function useQuotes(params: { page?: number; limit?: number; search?: string; status?: string; customerId?: string } = {}) {
  return useQuery({
    queryKey: salesKeys.quotes(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Quote>>>(
        '/sales/quotes', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: salesKeys.quote(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Quote>>(`/sales/quotes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { customerId: string; lines: Omit<SaleLine, 'id'>[]; validUntil?: string; notes?: string; globalDiscountPercent?: number }) =>
      api.post<ApiResponse<Quote>>('/sales/quotes', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Devis créé'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      api.patch<ApiResponse<Quote>>(`/sales/quotes/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: salesKeys.quote(id) }); qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Statut mis à jour'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useConvertQuoteToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Order>>(`/sales/quotes/${id}/convert`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Devis converti en commande');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

// ── Commandes ────────────────────────────────────────────────────

export function useOrders(params: { page?: number; limit?: number; search?: string; status?: string; customerId?: string } = {}) {
  return useQuery({
    queryKey: salesKeys.orders(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Order>>>(
        '/sales/orders', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: salesKeys.order(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Order>>(`/sales/orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<ApiResponse<Order>>(`/sales/orders/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: salesKeys.order(id) }); qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Statut mis à jour'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<ApiResponse<Invoice>>(`/sales/orders/${orderId}/invoice`).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Facture générée'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

// ── Factures ─────────────────────────────────────────────────────

export function useInvoices(params: { page?: number; limit?: number; search?: string; status?: string; customerId?: string } = {}) {
  return useQuery({
    queryKey: salesKeys.invoices(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Invoice>>>(
        '/sales/invoices', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: salesKeys.invoice(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Invoice>>(`/sales/invoices/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, paymentMethod }: { id: string; amount: number; paymentMethod?: string }) =>
      api.post<ApiResponse<Invoice>>(`/sales/invoices/${id}/payment`, { amount, paymentMethod }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(id) });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Paiement enregistré');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}
