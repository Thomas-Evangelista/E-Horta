'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { NotificationDTO } from '@/types/api';

const PAGE_SIZE = 20;

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
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    enabled,
    retry: 1,
    refetchOnMount: 'always',
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const envelope = await apiRequest<NotificationDTO[]>('/notifications', {
        query: { page: pageParam, limit: PAGE_SIZE },
      });
      return {
        items: envelope.data ?? [],
        totalPages: envelope.meta?.totalPages ?? 1,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.totalPages ? nextPage : undefined;
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
