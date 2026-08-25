'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { NotificationDTO } from '@/types/api';

export function useUnreadNotificationsCount(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async () => {
      const envelope = await apiRequest<{ total: number }>('/notifications/unread-count');
      return envelope.data.total;
    },
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    enabled,
    retry: 1,
    refetchOnMount: 'always',
    queryFn: async () => {
      const envelope = await apiRequest<NotificationDTO[]>('/notifications', {
        query: { limit: 50 },
      });
      return envelope.data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
