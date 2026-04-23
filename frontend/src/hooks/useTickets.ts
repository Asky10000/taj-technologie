import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Ticket, TicketComment, TicketStatus } from '@/types/tickets.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const ticketKeys = {
  list:    (p?: object) => ['tickets', p]       as const,
  detail:  (id: string) => ['tickets', id]      as const,
  stats:               () => ['tickets', 'stats'] as const,
};

export function useTickets(params: {
  page?: number; limit?: number; search?: string;
  status?: string; priority?: string;
} = {}) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Ticket>>>(
        '/tickets', { params: { page: 1, limit: 25, ...params } },
      );
      return data.data;
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Ticket>>(`/tickets/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/tickets/stats');
      return data.data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Ticket>) =>
      api.post<ApiResponse<Ticket>>('/tickets', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket créé avec succès');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      api.patch<ApiResponse<Ticket>>(`/tickets/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      api.patch<ApiResponse<Ticket>>(`/tickets/${id}/assign`, { assigneeId }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      toast.success('Ticket assigné');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, payload }: {
      ticketId: string;
      payload: { content: string; isInternal?: boolean; timeSpentMinutes?: number };
    }) =>
      api.post<ApiResponse<TicketComment>>(`/tickets/${ticketId}/comments`, payload).then((r) => r.data.data),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      toast.success('Commentaire ajouté');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}

export function useRateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) =>
      api.patch<ApiResponse<Ticket>>(`/tickets/${id}/satisfaction`, { satisfactionScore: score }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      toast.success('Note enregistrée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Une erreur est survenue'));
    },
  });
}
