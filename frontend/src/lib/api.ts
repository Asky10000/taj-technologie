import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { TokenPair } from '@/types/api.types';

// ── Clés localStorage ────────────────────────────────────────────
const ACCESS_TOKEN_KEY  = 'taj_access_token';
const REFRESH_TOKEN_KEY = 'taj_refresh_token';

export const tokenStorage = {
  getAccess:     () => (typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  getRefresh:    () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setTokens:     (pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>) => {
    localStorage.setItem(ACCESS_TOKEN_KEY,  pair.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
  },
  clearTokens:   () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ── Instance principale ──────────────────────────────────────────
// Uses the Next.js rewrite proxy (/api/* → backend/api/v1/*)
// to avoid browser CORS issues with direct Railway calls.
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Intercepteur requête — injecte le Bearer token ───────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Flag anti-boucle refresh ─────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// ── Intercepteur réponse — refresh automatique sur 401 ──────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // File d'attente pendant le refresh
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ data: TokenPair }>(
          '/api/auth/refresh',
          { refreshToken },
        );
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        tokenStorage.setTokens({ accessToken, refreshToken: newRefreshToken });
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
