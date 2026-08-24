'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type {
  AddressDTO,
  CheckoutResponseDTO,
  OrderPaymentViewDTO,
  ShippingOptionDTO,
} from '@/types/api';

export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const envelope = await apiRequest<AddressDTO[]>('/addresses');
      return envelope.data;
    },
    staleTime: 60_000,
  });
}

export interface CreateAddressInput {
  label?: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAddressInput) => {
      const envelope = await apiRequest<AddressDTO>('/addresses', {
        method: 'POST',
        body: input,
      });
      return envelope.data;
    },
    onSuccess: (address) => queryClient.setQueryData(['addresses'], (current: AddressDTO[] | undefined) => [...(current ?? []), address]),
  });
}

export function useShippingQuote() {
  return useMutation({
    mutationFn: async (input: { addressId: string; items: Array<{ productId: string; quantity: number }> }) => {
      const envelope = await apiRequest<{ options: ShippingOptionDTO[] }>('/shipping/quote', {
        method: 'POST',
        body: input,
      });
      return envelope.data.options;
    },
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const envelope = await apiRequest('/cart/coupon', { method: 'POST', body: { code } });
      return envelope.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiRequest('/cart/coupon', { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      addressId: string;
      shippingMethod: 'STANDARD' | 'EXPRESS';
      paymentMethod: 'PIX' | 'CARD' | 'CASH';
      notes?: string;
    }) => {
      const envelope = await apiRequest<CheckoutResponseDTO>('/checkout', {
        method: 'POST',
        body: input,
      });
      return envelope.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSimulatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { paymentId: string; outcome: 'approved' | 'failed' }) => {
      const envelope = await apiRequest(`/payments/sandbox/${input.paymentId}/simulate`, {
        method: 'POST',
        body: { outcome: input.outcome },
      });
      return envelope.data as { received: boolean };
    },
    onSuccess: (_data, input) =>
      void queryClient.invalidateQueries({ queryKey: ['payment', input.paymentId] }),
  });
}

export function useOrderPayment(orderId: string | null) {
  return useQuery({
    queryKey: ['payment', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const envelope = await apiRequest<OrderPaymentViewDTO>(`/payments/order/${orderId}`);
      return envelope.data;
    },
  });
}
