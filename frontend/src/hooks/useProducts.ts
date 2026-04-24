import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Product, ProductCategory, ProductStatus, ProductType, CreateProductPayload } from '@/types/product.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export const productKeys = {
  list:       (p?: object)   => ['products', p]            as const,
  one:        (id: string)   => ['products', id]           as const,
  categories: ()             => ['product-categories']     as const,
};

// ── Catégories ────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn:  async () => {
      const { data } = await api.get<ApiResponse<ProductCategory[]>>('/products/categories');
      return data.data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiResponse<ProductCategory>>('/products/categories', { name })
         .then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.categories() });
      toast.success('Catégorie créée');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

// ── Produits ──────────────────────────────────────────────────────

export function useProductsList(params: {
  page?:   number;
  limit?:  number;
  search?: string;
  type?:   ProductType;
  status?: ProductStatus;
} = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Product>>>(
        '/products', { params: { page: 1, limit: 20, ...params } },
      );
      return data.data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.one(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      api.post<ApiResponse<Product>>('/products', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produit créé');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<CreateProductPayload> & { id: string }) =>
      api.patch<ApiResponse<Product>>(`/products/${id}`, payload).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productKeys.one(id) });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produit mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

export function useUpdateProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      api.patch<ApiResponse<Product>>(`/products/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produit supprimé');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erreur'));
    },
  });
}
