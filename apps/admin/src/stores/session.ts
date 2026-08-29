'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken, bindApiSession, bindTokenUpdater, apiRequest } from '@/lib/api-client';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SessionState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: User, access: string, refresh: string) => void;
  clearSession: () => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, access, refresh) => {
        set({ user, accessToken: access, refreshToken: refresh });
        setAccessToken(access);
      },
      clearSession: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        setAccessToken(null);
      },
      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
        }
        get().clearSession();
      },
    }),
    { name: 'e-horta.admin-session' },
  ),
);

bindApiSession({
  getToken: () => useSessionStore.getState().accessToken,
  refreshTokens: async () => {
    const { refreshToken, user } = useSessionStore.getState();
    if (!refreshToken) return null;
    try {
      const env = await apiRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      });
      if (env.data) {
        useSessionStore.setState({
          user,
          accessToken: env.data.accessToken,
          refreshToken: env.data.refreshToken,
        });
        setAccessToken(env.data.accessToken);
        return env.data.accessToken;
      }
    } catch {
      useSessionStore.getState().clearSession();
    }
    return null;
  },
  onSessionExpired: () => useSessionStore.getState().clearSession(),
});

bindTokenUpdater((token) => useSessionStore.setState({ accessToken: token }));
