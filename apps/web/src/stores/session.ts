'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest, bindApiSession, bindTokenUpdater } from '@/lib/api-client';
import type { TokensDTO, UserDTO } from '@/types/api';

interface SessionState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: UserDTO, tokens: TokensDTO) => void;
  setUser: (user: UserDTO) => void;
  setTokens: (tokens: TokensDTO) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, tokens) =>
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'e-horta.session' },
  ),
);

bindApiSession({
  getSession: () => ({
    accessToken: useSessionStore.getState().accessToken,
    refreshToken: useSessionStore.getState().refreshToken,
  }),
  onSessionExpired: () => useSessionStore.getState().clearSession(),
  refreshTokens: async (refreshToken) => {
    const envelope = await apiRequest<TokensDTO>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    return envelope.data;
  },
});

bindTokenUpdater((tokens) => useSessionStore.getState().setTokens(tokens));

export async function loginRequest(input: {
  email: string;
  password: string;
  cartToken?: string;
}): Promise<{
  user: UserDTO;
  tokens: TokensDTO;
}> {
  const envelope = await apiRequest<{ user: UserDTO; tokens: TokensDTO }>('/auth/login', {
    method: 'POST',
    body: input,
  });
  return envelope.data;
}

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  cartToken?: string;
}): Promise<{ user: UserDTO; tokens: TokensDTO }> {
  const envelope = await apiRequest<{ user: UserDTO; tokens: TokensDTO }>('/auth/register', {
    method: 'POST',
    body: input,
  });
  return envelope.data;
}

export async function logoutRequest(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
}
