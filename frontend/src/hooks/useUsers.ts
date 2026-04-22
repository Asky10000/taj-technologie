import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { User, UserRole } from '@/types/user.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const userKeys = {
  list: (p?: object) => ['users', p] as const,
  one:  (id: string) => ['users', id] as const,
};

export function useUsers(params: { page?: number; limit?: number; search?: string; role?: UserRole } = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<User>>>(
        '/users', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; email: string; password: string; role: UserRole }) =>
      api.post<ApiResponse<User>>('/users', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur créé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; firstName?: string; lastName?: string; role?: UserRole }) =>
      api.patch<ApiResponse<User>>(`/users/${id}`, payload).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.one(id) });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<ApiResponse<User>>(`/users/${id}`, { isActive }).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Statut mis à jour'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}
