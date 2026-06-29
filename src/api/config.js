/**
 * Where the admin SPA finds the backend.
 *
 * - Dev: leave VITE_API_BASE unset. The API client uses the relative '/api'
 *   path and the socket uses window.location.origin, so Vite's dev proxy
 *   (see vite.config.js) forwards both to the local backend on :5050.
 * - Prod: set VITE_API_BASE to the backend's absolute origin (NO trailing /api,
 *   NO trailing slash), e.g.
 *       VITE_API_BASE=https://34-93-133-182.sslip.io
 *   Build with that in .env / .env.production and the deployed admin talks
 *   directly to the VM backend over HTTPS (REST + Socket.IO).
 */
const RAW = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

/** Backend origin root (no /api). Empty string in dev => same-origin/proxy. */
export const API_ORIGIN = RAW;

/** REST base for axios. '/api' (relative) in dev, '<origin>/api' in prod. */
export const API_BASE = RAW ? `https://34-93-133-182.sslip.io/api` : '/api';

/** Where Socket.IO connects. window.location.origin in dev, backend in prod. */
export const SOCKET_URL = RAW || window.location.origin;
