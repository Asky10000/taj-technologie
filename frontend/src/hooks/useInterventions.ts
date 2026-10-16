import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { Intervention, CreateInterventionInput } from '@/types/intervention.types';

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

export function useInterventions(params: {
  page?: number; limit?: number; search?: string; status?: string; customerId?: string;
} = {}) {
  return useQuery({
    queryKey: ['interventions', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/interventions', {
        params: { page: 1, limit: 20, ...params },
      });
      return flattenPage<Intervention>(data.data);
    },
  });
}

export function useIntervention(id: string) {
  return useQuery({
    queryKey: ['interventions', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Intervention>>(`/interventions/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInterventionInput) =>
      api.post<ApiResponse<Intervention>>('/interventions', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interventions'] });
      toast.success('Intervention enregistrée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de l\'enregistrement'));
    },
  });
}

export function useUpdateIntervention(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateInterventionInput>) =>
      api.patch<ApiResponse<Intervention>>(`/interventions/${id}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interventions'] });
      toast.success('Intervention mise à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur lors de la mise à jour'));
    },
  });
}

export function useDeleteIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/interventions/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interventions'] });
      toast.success('Intervention supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
}
