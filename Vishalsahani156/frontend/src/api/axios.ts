import axios from 'axios';

function getDefaultApiBaseUrl() {
  // Prefer an explicit env var (works in dev/prod).
  const explicit = (import.meta.env.VITE_API_URL || '').trim();
  if (explicit) return explicit;

  // In local dev, API runs on :5000 while Vite runs on :5173.
  // Using a relative `/api` relies on Vite's dev proxy, which is not active in `vite preview`.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:5000/api`;
    }
  }

  // Fallback for deployments where frontend and backend share origin under `/api`.
  return '/api';
}

const API_URL = getDefaultApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  // If we're sending FormData, do not force a JSON content-type.
  // Let the browser/axios set `multipart/form-data; boundary=...` automatically.
  if (config.data instanceof FormData) {
    if (config.headers) {
      // AxiosHeader types vary across versions; use best-effort deletes.
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  } else {
    config.headers = config.headers ?? {};
    (config.headers as any)['Content-Type'] = (config.headers as any)['Content-Type'] || 'application/json';
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
