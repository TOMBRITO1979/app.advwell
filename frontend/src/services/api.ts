import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// A URL da API será configurável via variável de ambiente
const API_URL = import.meta.env.VITE_API_URL || 'https://api.advwell.pro/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiplos refreshes simultâneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação com refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 402 Payment Required (subscription expired)
    if (error.response?.status === 402) {
      const responseData = error.response.data as { code?: string; redirectTo?: string };
      if (responseData?.code === 'SUBSCRIPTION_EXPIRED') {
        // Only redirect if not already on subscription page
        if (!window.location.pathname.includes('/subscription')) {
          window.location.href = '/subscription';
        }
      }
      return Promise.reject(error);
    }

    // Se não é erro 401 ou já tentou retry, rejeita
    if (error.response?.status !== 401 || originalRequest._retry) {
      // Se é 401 e já tentou refresh, faz logout
      if (error.response?.status === 401 && originalRequest._retry) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Verifica se é rota de auth (não precisa refresh)
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Se já está fazendo refresh, adiciona na fila
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
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

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', newRefreshToken);

      originalRequest.headers.Authorization = `Bearer ${token}`;

      processQueue(null, token);

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
