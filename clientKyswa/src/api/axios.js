/**
 * Instance Axios centralisée — Kyswa Travel
 *
 * Gère :
 * - URL de base configurable via VITE_API_URL (fallback proxy Vite /api)
 * - Timeout global de 15 secondes
 * - Injection automatique du Bearer token JWT
 * - Refresh token automatique sur 401
 * - Redirection vers /login si le refresh échoue
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Intercepteur requête : injecter le token JWT ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log('📤', config.method?.toUpperCase(), config.baseURL + config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête:', error);
    return Promise.reject(error);
  }
);

// ── Intercepteur réponse : refresh token automatique sur 401 ─────────────────
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('📥', response.status, response.config.url);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await api.post('/auth/refresh', { refreshToken });
          const newToken = res.data.token;
          localStorage.setItem('token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    if (import.meta.env.DEV) {
      console.error('❌ Erreur API:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
