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

/** REST base for axios. Relative '/api' when VITE_API_BASE is empty (dev proxy,
 * or same-origin behind Caddy on <slug>.admin.devifai.in); '<origin>/api' when
 * an absolute backend origin is configured. */
export const API_BASE = RAW ? `${RAW}/api` : '/api';

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
  // 1) Explicit build-time override — pins THIS build to one tenant (e.g. a
  //    per-tenant Vercel project, or local testing): VITE_TENANT=rudraganga.
  const override = import.meta.env.VITE_TENANT;
  if (override) return String(override).toLowerCase();

  // 1b) Runtime override stored in the browser — set on a generic host (e.g.
  //     *.vercel.app with no tenant subdomain) via the login workspace field.
  //     Lets the one admin build serve any tenant without a wildcard domain.
  try {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('tenantSlug')) || '';
    if (saved) return saved.toLowerCase();
  } catch (_) { /* ignore */ }

  const host = (typeof window !== 'undefined' ? window.location.hostname : '') || '';
  // localhost / IP → no tenant (dev / single-tenant).
  if (/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(host)) return '';

  // 2) Subdomain of the tenant-admin root domain. Only treat the leftmost label
  //    as a tenant when the host actually sits under our admin root
  //    (VITE_ADMIN_ROOT, e.g. "admin.devifai.in" or "devifai.in"). This avoids
  //    inventing a bogus slug from a generic host like rg-phase-2-admin.vercel.app.
  const root = (import.meta.env.VITE_ADMIN_ROOT || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (root && host.endsWith('.' + root)) {
    const label = host.slice(0, host.length - root.length - 1).split('.')[0];
    if (label && !['www', 'admin', 'owner', 'app', 'api'].includes(label)) return label.toLowerCase();
  }

  // Generic/unknown host (e.g. *.vercel.app) → no tenant. The app then prompts
  // for a workspace instead of guessing (see WORKSPACE_REQUIRED below).
  return '';
}

/**
 * True when the app is running on a multi-tenant host but couldn't determine
 * which tenant (no override, not under the admin root). The login screen uses
 * this to ask the operator for their workspace slug instead of silently failing.
 */
export const ADMIN_ROOT = (import.meta.env.VITE_ADMIN_ROOT || '').toLowerCase();

export const TENANT_SLUG = deriveTenantSlug();
