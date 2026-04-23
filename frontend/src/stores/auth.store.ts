import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { tokenStorage } from '@/lib/api';
import { AuthUser, LoginResponse } from '@/types/api.types';

interface AuthState {
  user:          AuthUser | null;
  isAuthenticated: boolean;
  isLoading:     boolean;

  login:         (email: string, password: string) => Promise<void>;
  logout:        () => Promise<void>;
  refreshUser:   () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      isAuthenticated: false,
      isLoading:       false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<{ data: LoginResponse }>('/auth/login', {
            email,
            password,
          });
          const { accessToken, refreshToken, user } = data.data;
          tokenStorage.setTokens({ accessToken, refreshToken });
          // Cookie lisible par le middleware Next.js pour protéger les routes
          document.cookie = 'taj_session=1; path=/; max-age=604800; SameSite=Lax';
          set({ user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          const refreshToken = tokenStorage.getRefresh();
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken }).catch(() => {});
          }
        } finally {
          tokenStorage.clearTokens();
          document.cookie = 'taj_session=; path=/; max-age=0; SameSite=Lax';
          set({ user: null, isAuthenticated: false });
        }
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get<{ data: AuthUser }>('/auth/me');
          set({ user: data.data, isAuthenticated: true });
        } catch {
          tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'taj_auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
