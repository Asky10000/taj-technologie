import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Project, ProjectTask, TimeEntry, ProjectStatus, TaskStatus } from '@/types/projects.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const projectKeys = {
  list:        (p?: object) => ['projects', p]             as const,
  detail:      (id: string) => ['projects', id]            as const,
  tasks:       (id: string) => ['projects', id, 'tasks']   as const,
  timeEntries: (id: string) => ['projects', id, 'time']    as const,
  dashboard:   (id: string) => ['projects', id, 'dashboard'] as const,
  stats:                    () => ['projects', 'stats']    as const,
};

export function useProjects(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Project>>>(
        '/projects', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useProjectDashboard(id: string) {
  return useQuery({
    queryKey: projectKeys.dashboard(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(`/projects/${id}/dashboard`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectTask[]>>(`/projects/${projectId}/tasks`);
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectTimeEntries(projectId: string) {
  return useQuery({
    queryKey: projectKeys.timeEntries(projectId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TimeEntry[]>>(`/projects/${projectId}/time-entries`);
      return data.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: projectKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/projects/stats');
      return data.data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Project>) =>
      api.post<ApiResponse<Project>>('/projects', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projet créé avec succès');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      api.patch<ApiResponse<Project>>(`/projects/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: Partial<ProjectTask> }) =>
      api.post<ApiResponse<ProjectTask>>(`/projects/${projectId}/tasks`, payload).then((r) => r.data.data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
      toast.success('Tâche créée');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, payload }: {
      projectId: string; taskId: string; payload: Partial<ProjectTask>;
    }) =>
      api.patch<ApiResponse<ProjectTask>>(`/projects/${projectId}/tasks/${taskId}`, payload).then((r) => r.data.data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}

export function useLogTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: {
      projectId: string;
      payload: { hours: number; entryDate: string; taskId?: string; description?: string; isBillable?: boolean };
    }) =>
      api.post<ApiResponse<TimeEntry>>(`/projects/${projectId}/time-entries`, payload).then((r) => r.data.data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectKeys.timeEntries(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.dashboard(projectId) });
      toast.success('Temps enregistré');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });
}
