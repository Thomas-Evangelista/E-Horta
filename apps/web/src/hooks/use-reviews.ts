'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { ReviewDTO } from '@/types/api';

export interface CreateReviewInput {
  rating: number;
  comment?: string;
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
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
