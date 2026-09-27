import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Quote, Order, Invoice, QuoteStatus, OrderStatus, InvoiceStatus, SaleLine } from '@/types/sales.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

function flattenPage<T>(raw: any): PaginatedResponse<T> {
  if (raw?.meta) {
    return {
      items:       raw.items,
      total:       raw.meta.totalItems,
      page:        raw.meta.page,
      limit:       raw.meta.limit,
      totalPages:  raw.meta.totalPages,
      hasNextPage: raw.meta.hasNextPage,
      hasPrevPage: raw.meta.hasPreviousPage,
    };
  }
  return raw as PaginatedResponse<T>;
}

export const salesKeys = {
  quotes:   (p?: object) => ['quotes',   p] as const,
  quote:    (id: string) => ['quotes',   id] as const,
  orders:   (p?: object) => ['orders',   p] as const,
  order:    (id: string) => ['orders',   id] as const,
  invoices: (p?: object) => ['invoices', p] as const,
  invoice:  (id: string) => ['invoices', id] as const,
};

// ── Devis ────────────────────────────────────────────────────────

export function useQuotes(params: { page?: number; limit?: number; search?: string; status?: string; customerId?: string; projectId?: string } = {}) {
  return useQuery({
    queryKey: salesKeys.quotes(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/sales/quotes', { params: { page: 1, limit: 20, ...params } },
      );
      return flattenPage<Quote>(data.data);
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
    mutationFn: (payload: { customerId: string; issueDate?: string; lines: Omit<SaleLine, 'id'>[]; validUntil?: string; notes?: string; globalDiscountPercent?: number }) =>
      api.post<ApiResponse<Quote>>('/sales/quotes', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Devis créé'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; validUntil?: string; notes?: string; globalDiscountPercent?: number; lines: Omit<SaleLine, 'id'>[] }) =>
      api.patch<ApiResponse<Quote>>(`/sales/quotes/${id}`, payload).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: salesKeys.quote(id) });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Devis mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sales/quotes/${id}`).then(() => id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast.success('Devis supprimé');
    },
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
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: salesKeys.quote(id) }); qc.invalidateQueries({ queryKey: ['quotes'] }); qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Statut mis à jour'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useConvertQuoteToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<{ projectId: string }>>(`/sales/quotes/${id}/convert-to-project`).then((r) => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: salesKeys.quote(id) });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Devis converti en projet');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useAttachQuoteToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      api.post<ApiResponse<Quote>>(`/sales/quotes/${id}/attach-to-project`, { projectId }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: salesKeys.quote(id) });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Devis rattaché au projet');
    },
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
      qc.invalidateQueries({ queryKey: ['reports'] });
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
      const { data } = await api.get<ApiResponse<any>>(
        '/sales/orders', { params: { page: 1, limit: 20, ...params } },
      );
      return flattenPage<Order>(data.data);
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

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; orderDate?: string; expectedDeliveryDate?: string; notes?: string; globalDiscountPercent?: number; lines: Omit<SaleLine, 'id'>[] }) =>
      api.patch<ApiResponse<Order>>(`/sales/orders/${id}`, payload).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: salesKeys.order(id) });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Commande mise à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sales/orders/${id}`).then(() => id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Commande supprimée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<ApiResponse<Order>>(`/sales/orders/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: salesKeys.order(id) }); qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['reports'] }); qc.invalidateQueries({ queryKey: ['stocks'] }); toast.success('Statut mis à jour'); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    // Il n'existe pas d'endpoint « order→invoice » côté API :
    // on charge la commande puis on crée la facture via POST /sales/invoices.
    mutationFn: async (orderId: string) => {
      const { data: od } = await api.get<ApiResponse<Order>>(`/sales/orders/${orderId}`);
      const order = od.data;
      const today = new Date().toISOString().split('T')[0];
      const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const payload = {
        customerId: order.customerId,
        orderId: order.id,
        issueDate: today,
        dueDate: due,
        lines: (order.lines ?? []).map((l) => ({
          productId: l.productId ?? undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountType: l.discountType ?? 'PERCENT',
          discountValue: Number(l.discountValue ?? 0),
          taxRate: Number(l.taxRate ?? 20),
          sortOrder: l.sortOrder ?? 0,
        })),
      };
      return api.post<ApiResponse<Invoice>>('/sales/invoices', payload).then((r) => r.data.data);
    },
    onSuccess: (_, orderId) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: salesKeys.order(orderId) });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast.success('Facture générée');
    },
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
      const { data } = await api.get<ApiResponse<any>>(
        '/sales/invoices', { params: { page: 1, limit: 20, ...params } },
      );
      return flattenPage<Invoice>(data.data);
    },
  });
}

export interface CustomerAccount {
  customerId: string; name: string; code: string | null;
  invoiced: number; paid: number; balance: number; count: number; overdue: number;
}

export function useCustomerAccounts() {
  return useQuery({
    queryKey: ['customer-accounts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CustomerAccount[]>>('/sales/customer-accounts');
      return data.data ?? [];
    },
    staleTime: 60_000,
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
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast.success('Paiement enregistré');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Invoice>>(`/sales/invoices/${id}/send`).then((r) => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(id) });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Facture envoyée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useRefundInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Invoice>>(`/sales/invoices/${id}/refund`).then((r) => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(id) });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast.success('Avoir créé — facture remboursée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Invoice>>(`/sales/invoices/${id}/cancel`).then((r) => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(id) });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast.success('Facture annulée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}
