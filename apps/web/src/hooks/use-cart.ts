'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { getStoredCartToken, storeCartToken } from '@/lib/cart-token';
import type { CartDTO } from '@/types/api';

const CART_QUERY_KEY = ['cart'] as const;

function cartHeaders(): Record<string, string> {
  const token = getStoredCartToken();
  return token ? { 'x-cart-token': token } : {};
}

/**
 * Wrapper das chamadas de carrinho: persiste o `meta.cartToken` emitido pela
 * API na primeira interação anônima para reutilizar nas próximas requisições.
 */
async function cartRequest(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<CartDTO> {
  const envelope = await apiRequest<CartDTO>(path, options);
  const issuedToken = (envelope.meta as { cartToken?: string }).cartToken;
  if (issuedToken) storeCartToken(issuedToken);
  return envelope.data;
}

export function useCart() {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartRequest('/cart', { headers: cartHeaders() }),
    staleTime: 30_000,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; quantity?: number }) =>
      cartRequest('/cart/items', {
        method: 'POST',
        body: { productId: input.productId, quantity: input.quantity ?? 1 },
        headers: cartHeaders(),
      }),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { itemId: string; quantity: number }) =>
      cartRequest(`/cart/items/${input.itemId}`, {
        method: 'PATCH',
        body: { quantity: input.quantity },
        headers: cartHeaders(),
      }),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      cartRequest(`/cart/items/${itemId}`, { method: 'DELETE', headers: cartHeaders() }),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartRequest('/cart', { method: 'DELETE', headers: cartHeaders() }),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}
