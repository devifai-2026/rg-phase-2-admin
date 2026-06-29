# Rudraganga — Premium Admin Dashboard

React 18 + Vite + MUI v6 + MUI X (DataGrid/Charts) admin panel for the Astrology
Super-App. Dark-navy + antique-gold "wealth & wisdom" theme with glassmorphism,
animated KPIs, and strict role-based access control.

## Run

```bash
# 1) Start the backend (from ../backend)
cd ../backend && npm run dev          # serves on :5000

# 2) Start the admin app
cd ../admin && npm install && npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to the backend on `:5000`
(see `vite.config.js`). If your backend runs on another port, change the proxy
target there.

## Roles & access (RBAC)

Two roles, enforced both in the backend (route middleware) and the frontend
(route guards + conditional sidebar):

- **Super Admin** — everything, plus **Settings**, **Admin Management**, and
  **Audit Logs**.
- **Admin** — operational: astrologers, KYC, users + wallet recharge, products,
  orders, monitors, withdrawals, escalations. Blocked (403) from the three
  super-admin sections; bank details shown masked.

Seeded logins (dev OTP `123456`):

| Role        | Phone        |
|-------------|--------------|
| Super Admin | `9999900000` |
| Admin       | `9999911111` |

## Pages

Dashboard (KPIs + revenue area chart + service doughnut + quick actions) ·
Astrologers (CRUD, per-service rates + ₹/min admin commission) · Astrologer
detail (rates + call logs with Play Recording) · KYC queue · Users & Wallets
(manual recharge modal) · Categories · Products (ImageBB upload + low-stock
alerts) · Orders (forward-only manual fulfillment) · Live Chat Monitor
(read-only) · Calls & Recordings · Withdrawals (masked bank, Process Payout) ·
Escalations · Settings / Admin Management / Audit Logs (super-admin only).

## Notes

- Money is whole rupees end-to-end (no paise, no decimals).
- All mutations show toast notifications; tables use MUI X DataGrid.
- Auth uses JWT access + refresh with a silent-refresh axios interceptor.
# rg-phase-2-admin
