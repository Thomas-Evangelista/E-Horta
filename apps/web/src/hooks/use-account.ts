'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useSessionStore } from '@/stores/session';
import type { AddressDTO, UserDTO } from '@/types/api';

export function useUpdateProfile() {
  const setUser = useSessionStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (input: { name?: string; phone?: string }) => {
      const envelope = await apiRequest<UserDTO>('/users/me', {
        method: 'PATCH',
        body: input,
      });
      return envelope.data;
    },
    onSuccess: (user) => setUser(user),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest(`/addresses/${addressId}`, { method: 'DELETE' });
    },
    onSuccess: (_data, addressId) =>
      queryClient.setQueryData(['addresses'], (current: AddressDTO[] | undefined) =>
        (current ?? []).filter((address) => address.id !== addressId),
      ),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      const envelope = await apiRequest<AddressDTO>(`/addresses/${addressId}/default`, {
        method: 'PATCH',
      });
      return envelope.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
