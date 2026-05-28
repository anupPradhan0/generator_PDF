import axios from 'axios';

function getDefaultApiBaseUrl() {
  const explicit = (import.meta.env.VITE_API_URL || '').trim();
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:5000/api`;
    }
  }

  return '/api';
}

const ADMIN_API_URL = getDefaultApiBaseUrl();

const superAdminApi = axios.create({
  baseURL: ADMIN_API_URL,
});

superAdminApi.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  (config.headers as any)['Content-Type'] = (config.headers as any)['Content-Type'] || 'application/json';

  const token = localStorage.getItem('superAdminToken');
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdmin');
      if (!window.location.pathname.includes('/super-admin/login')) {
        window.location.href = '/super-admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default superAdminApi;

