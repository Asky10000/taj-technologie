import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { Payment } from '@/types/payment.types';

export function usePayments(params: { invoiceId?: string; purchaseOrderId?: string }) {
  const key = params.invoiceId ?? params.purchaseOrderId ?? '';
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment[]>>('/payments', { params });
      return data.data;
    },
    enabled: !!key,
  });
}

/** Upload d'une image de preuve ; retourne l'URL (relative) du fichier. */
export async function uploadPaymentProof(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiResponse<{ url: string }>>('/uploads/payment-proof', form);
  return data.data.url;
}
