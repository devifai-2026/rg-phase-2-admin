import axios from 'axios';
import { API_BASE, TENANT_SLUG } from './config';

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Attach access token + tenant. In multi-tenant deployments each client admin is
// served from its own subdomain (clientA.admin.<root>); TENANT_SLUG is derived
// from that host and sent as X-Tenant so the backend routes to the right tenant
// DB. Empty on a single-tenant/localhost deploy → backend uses the default tenant.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (TENANT_SLUG) config.headers['X-Tenant'] = TENANT_SLUG;
  return config;
});

let isRefreshing = false;
let queue = [];

// On 401, try a one-time refresh, then replay.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && !original._retry && localStorage.getItem('refreshToken')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject, original }));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: localStorage.getItem('refreshToken') });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        queue.forEach((p) => { p.original.headers.Authorization = `Bearer ${data.data.accessToken}`; p.resolve(api(p.original)); });
        queue = [];
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (e) {
        queue.forEach((p) => p.reject(e));
        queue = [];
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
