'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { OrderDetailDTO, RepeatOrderResultDTO } from '@/types/api';

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    enabled: Boolean(orderId),
    retry: 1,
    refetchOnMount: 'always',
    queryFn: async () => {
      const envelope = await apiRequest<OrderDetailDTO>(`/orders/${orderId}`);
      return envelope.data;
    },
  });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason?: string) => {
      const envelope = await apiRequest<OrderDetailDTO>(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: reason ? { reason } : {},
      });
      return envelope.data;
    },
    onSuccess: (order) => {
      queryClient.setQueryData(['orders', 'detail', orderId], order);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRepeatOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const envelope = await apiRequest<RepeatOrderResultDTO>(`/orders/${orderId}/repeat`, {
        method: 'POST',
      });
      return envelope.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
