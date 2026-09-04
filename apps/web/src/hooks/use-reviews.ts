'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { MyReviewDTO, ReviewDTO, ReviewSummaryDTO } from '@/types/api';

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export interface ProductReviews {
  reviews: ReviewDTO[];
  summary: ReviewSummaryDTO;
  page: number;
  totalPages: number;
  total: number;
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const envelope = await apiRequest<ReviewDTO>(`/products/${productId}/reviews`, {
        method: 'POST',
        body: input,
      });
      return envelope.data;
    },
    onSuccess: (_review) => {
      void queryClient.invalidateQueries({ queryKey: ['products', productId, 'reviews'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.productDetail(productId) });
    },
  });
}

export function useProductReviews(productId: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.productReviews(productId, limit),
    queryFn: async (): Promise<ProductReviews> => {
      const envelope = await apiRequest<ReviewDTO[]>(`/products/${productId}/reviews`, {
        query: { page: 1, limit },
      });
      const meta = envelope.meta as { summary?: ReviewSummaryDTO } & {
        page?: number;
        totalPages?: number;
        total?: number;
      };
      return {
        reviews: envelope.data ?? [],
        summary: meta.summary ?? { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        page: meta.page ?? 1,
        totalPages: meta.totalPages ?? 1,
        total: meta.total ?? 0,
      };
    },
    enabled: Boolean(productId),
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: queryKeys.myReviews(),
    queryFn: async (): Promise<MyReviewDTO[]> => {
      const envelope = await apiRequest<MyReviewDTO[]>('/reviews/me', { query: { limit: 50 } });
      return envelope.data ?? [];
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest(`/reviews/${reviewId}`, { method: 'DELETE' });
      return reviewId;
    },
    onSuccess: (reviewId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myReviews() });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      return reviewId;
    },
  });
}
