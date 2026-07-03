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

/**
 * The tenant this admin instance manages (multi-tenant SaaS). Resolution order:
 *   1) VITE_TENANT build-time override (for a per-tenant admin build), else
 *   2) derived from the host subdomain: <slug>.admin.<root> or <slug>.<root>.
 * Empty on localhost / a bare host → single-tenant (backend default tenant).
 * Sent as the X-Tenant header by the API client and socket.
 */
function deriveTenantSlug() {
  const override = import.meta.env.VITE_TENANT;
  if (override) return String(override).toLowerCase();
  const host = (typeof window !== 'undefined' ? window.location.hostname : '') || '';
  // localhost / IP → no tenant (dev / single-tenant).
  if (/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(host)) return '';
  const parts = host.split('.');
  // Need at least <slug>.<something>.<tld>; take the leftmost label unless it's a
  // platform-reserved label.
  if (parts.length < 3) return '';
  const label = parts[0];
  if (['www', 'admin', 'owner', 'app', 'api'].includes(label)) return '';
  return label.toLowerCase();
}

export const TENANT_SLUG = deriveTenantSlug();
