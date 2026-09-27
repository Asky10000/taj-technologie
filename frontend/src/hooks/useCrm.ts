import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type {
  Customer, Prospect, Contact, Interaction,
} from '@/types/crm.types';
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

// ── Clés de cache ────────────────────────────────────────────────
export const crmKeys = {
  customers:     (params?: object) => ['customers', params] as const,
  customer:      (id: string)      => ['customers', id]     as const,
  prospects:     (params?: object) => ['prospects', params] as const,
  prospect:      (id: string)      => ['prospects', id]     as const,
  pipeline:                         () => ['prospects', 'pipeline'] as const,
  interactions:  (type: string, id: string) => ['interactions', type, id] as const,
};

// ── Clients ──────────────────────────────────────────────────────

export function useCustomers(params: {
  page?: number; limit?: number; search?: string; status?: string;
} = {}) {
  return useQuery({
    queryKey: crmKeys.customers(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/crm/customers',
        { params: { page: 1, limit: 20, ...params } },
      );
      return flattenPage<Customer>(data.data);
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: crmKeys.customer(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Customer>>(`/crm/customers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) =>
      api.post<ApiResponse<Customer>>('/crm/customers', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client créé avec succès');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de la création'));
    },
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) =>
      api.patch<ApiResponse<Customer>>(`/crm/customers/${id}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.customer(id) });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de la mise à jour'));
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crm/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client supprimé');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Impossible de supprimer ce client'));
    },
  });
}

// ── Contacts ─────────────────────────────────────────────────────

export function useCustomerContacts(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Contact[]>>(
        `/crm/customers/${customerId}/contacts`,
      );
      return data.data;
    },
    enabled: !!customerId,
  });
}

export function useCreateContact(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Contact>) =>
      api.post<ApiResponse<Contact>>(`/crm/customers/${customerId}/contacts`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
      toast.success('Contact ajouté');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

// ── Interactions ─────────────────────────────────────────────────

export function useCustomerInteractions(customerId: string) {
  return useQuery({
    queryKey: crmKeys.interactions('customer', customerId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Interaction[]>>(
        `/crm/customers/${customerId}/interactions`,
      );
      return data.data;
    },
    enabled: !!customerId,
  });
}

export function useCreateInteraction(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Interaction>) =>
      api.post<ApiResponse<Interaction>>(`/crm/customers/${customerId}/interactions`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.interactions('customer', customerId) });
      toast.success('Interaction enregistrée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

// ── Prospects ────────────────────────────────────────────────────

export function useProspects(params: {
  page?: number; limit?: number; search?: string; status?: string;
} = {}) {
  return useQuery({
    queryKey: crmKeys.prospects(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        '/crm/prospects',
        { params: { page: 1, limit: 50, ...params } },
      );
      return flattenPage<Prospect>(data.data);
    },
  });
}

export function useProspect(id: string) {
  return useQuery({
    queryKey: crmKeys.prospect(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Prospect>>(`/crm/prospects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: crmKeys.pipeline(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<
        Record<string, { count: number; totalBudget: number }>
      >>('/crm/prospects/pipeline');
      return data.data;
    },
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Prospect>) =>
      api.post<ApiResponse<Prospect>>('/crm/prospects', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect créé avec succès');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de la création'));
    },
  });
}

export function useUpdateProspectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<ApiResponse<Prospect>>(`/crm/prospects/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.prospect(id) });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

export function useConvertProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Customer>>(`/crm/prospects/${id}/convert`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Prospect converti en client');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de la conversion'));
    },
  });
}
