import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'CLIENT';
  companyId?: string;
  companyName?: string;
  clientId?: string;
  hideSidebar?: boolean;
}

interface ConsentData {
  type: 'PRIVACY_POLICY' | 'TERMS_OF_USE' | 'MARKETING_EMAIL' | 'DATA_PROCESSING';
  version: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    cnpj?: string;
    consents?: ConsentData[];
  }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, refreshToken, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, token });
  },

  register: async (data) => {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, token, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false });
    }
  },

  setToken: (token: string) => {
    set({ token });
  },

  setUser: (user: User) => {
    set({ user, isLoading: false });
  },
}));
