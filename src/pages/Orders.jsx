import { useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Grid, Tabs, Tab, Badge, Button, Stack, Chip, Dialog, DialogTitle, DialogContent, Typography, Divider, Menu, MenuItem, ListItemIcon, Collapse, IconButton, TextField } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend as ReLegend,
} from 'recharts';
import PrintIcon from '@mui/icons-material/Print';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CircleIcon from '@mui/icons-material/Circle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { useActivity } from '../activity/ActivityContext';
import { PageHeader, rupees } from '../components/common';
import { printInvoice } from '../components/printInvoice';
import AdminTable from '../components/AdminTable';
import { moneyColumn, statusColumn } from '../components/tableHelpers';
import { PrimaryCellButton } from '../components/tableHelpers';

// Orders are gateway-paid; they enter as 'confirmed'. Admin advances forward only.
const FLOW = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const nextStatus = (cur) => { const i = FLOW.indexOf(cur); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null; };
const prettyStatus = (s) => String(s || '').replace(/_/g, ' ');
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Orders() {
  const [tab, setTab] = useState(0);
  const [newSupport, setNewSupport] = useState(0);
  const { clear, counts } = useActivity();
  useEffect(() => { clear('order'); }, [clear]); // reset the sidebar Orders badge on visit
  // Opening the Support tab clears its live badge.
  useEffect(() => { if (tab === 1) clear('order_support'); }, [tab, clear]);
  // Badge = the loaded "new" count once the tab has been opened, else the live
  // socket count — so a fresh request shows on the tab without opening it.
  const supportBadge = tab === 1 ? newSupport : Math.max(newSupport, counts.order_support || 0);
  return (
    <Box>
      <PageHeader title="Orders" subtitle="Manual fulfillment, customer notifications, and order help requests" />
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="Orders" />
          <Tab sx={{ pr: 3 }} label={
            <Badge color="error" badgeContent={supportBadge} max={99} sx={{ '& .MuiBadge-badge': { right: -12, top: -2 } }}>
              <span style={{ paddingRight: supportBadge ? 6 : 0 }}>Order Support</span>
            </Badge>
          } />
        </Tabs>
      </Card>
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}><OrdersTab /></Box>
      {tab === 1 && <OrderSupportTab onCount={setNewSupport} />}
    </Box>
  );
}

// Default range: last 30 days → today (YYYY-MM-DD for <input type=date>).
const isoDay = (d) => d.toISOString().slice(0, 10);
const defaultRange = () => {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - 30);
  return { from: isoDay(from), to: isoDay(to) };
};

function OrdersTab() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [showTimeline, setShowTimeline] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  // Filters
  const [range, setRange] = useState(defaultRange);
  const [status, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const params = useCallback(() => ({
    from: range.from || undefined,
    to: range.to || undefined,
    status: status || undefined,
    q: search.trim() || undefined,
  }), [range, status, search]);

  const openDetail = async (order) => {
    setDetail(order); setInvoice(null); setShowTimeline(true);
    if (order.paymentStatus === 'paid') {
      try { const { data } = await AdminAPI.orderInvoice(order._id); setInvoice(data.data); } catch { /* no invoice */ }
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, analyticsRes] = await Promise.all([
        AdminAPI.listOrders(params()),
        AdminAPI.ordersAnalytics(params()),
      ]);
      setRows(ordersRes.data.data.map((o) => ({ id: o._id, ...o, userName: o.user?.name || o.user?.phone || '—', pincode: o.address?.pincode || '—', itemCount: (o.items || []).reduce((s, i) => s + i.qty, 0) })));
      setAnalytics(analyticsRes.data.data);
    } catch { toast.error('Failed to load orders'); } finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const resetFilters = () => { setRange(defaultRange()); setStatusFilter(''); setSearch(''); };

  const setStatus = async (order, next) => {
    if (!next) return;
    try {
      await AdminAPI.updateOrderStatus(order._id, next);
      toast.success(`Marked ${prettyStatus(next)} — customer notified`);
      load();
      if (detail?._id === order._id) {
        const { data } = await AdminAPI.listOrders(params());
        const fresh = data.data.find((o) => o._id === order._id);
        if (fresh) setDetail({ ...fresh, userName: fresh.user?.name || fresh.user?.phone || '—' });
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
  };

  const advance = (order) => setStatus(order, nextStatus(order.status));

  const regenerate = async (order) => {
    if (order.paymentStatus !== 'paid') { toast.error('Invoice exists only for paid orders'); return; }
    try {
      const { data } = await AdminAPI.orderInvoice(order._id);
      await AdminAPI.regenerateInvoice(data.data._id);
      toast.success('Invoice regenerated');
      if (detail?._id === order._id) openDetail(order);
    } catch (e) { toast.error(e.response?.data?.message || 'Regenerate failed'); }
  };

  const openMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };
  const closeMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  // Compact, fits-without-overflow columns. Customer flexes; everything else fixed.
  const columns = [
    { field: 'id', headerName: 'Order', width: 96, renderCell: (p) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{String(p.value).slice(-6)}</span> },
    { field: 'userName', headerName: 'Customer', flex: 1, minWidth: 130 },
    { field: 'pincode', headerName: 'Pincode', width: 92 },
    { field: 'itemCount', headerName: 'Items', width: 64, type: 'number', align: 'center', headerAlign: 'center' },
    moneyColumn({ field: 'total', headerName: 'Total', accent: true, width: 110 }),
    statusColumn({ field: 'status', headerName: 'Status', width: 120 }),
    {
      field: '__fulfil', headerName: 'Fulfillment', width: 230, sortable: false, align: 'right', headerAlign: 'right',
      renderCell: (p) => {
        const next = nextStatus(p.row.status);
        return (
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', width: '100%' }}>
            <Button size="small" variant="outlined" onClick={() => openDetail(p.row)}>View</Button>
            {next ? <PrimaryCellButton onClick={() => advance(p.row)}>{prettyStatus(next)}</PrimaryCellButton>
              : <Chip size="small" label="Done" sx={{ background: `${b.green}22`, color: b.green }} />}
            <IconButton size="small" onClick={(e) => openMenu(e, p.row)}><MoreVertIcon fontSize="small" /></IconButton>
          </Stack>
        );
      },
    },
  ];

  const filterBar = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
      <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} sx={{ width: 150 }} />
      <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} sx={{ width: 150 }} />
      <TextField select size="small" label="Status" value={status} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
        <MenuItem value="">All statuses</MenuItem>
        {['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
          <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{prettyStatus(s)}</MenuItem>
        ))}
      </TextField>
      <TextField size="small" label="Search" placeholder="Order, customer, pincode…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 220 }} />
      <Button size="small" onClick={resetFilters} sx={{ color: b.textDim }}>Reset</Button>
    </Stack>
  );

  return (
    <>
      <OrdersAnalytics data={analytics} b={b} loading={loading} />

      <Box sx={{ mb: 2 }}>{filterBar}</Box>

      <AdminTable rows={rows} columns={columns} loading={loading} title={`Orders (${rows.length})`}
        emptyTitle="No orders match" emptyHint="Try widening the date range or clearing filters" />

      {/* Per-row "More actions" menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { const r = menuRow; closeMenu(); openDetail(r); }}>
          <ListItemIcon><TimelineIcon fontSize="small" /></ListItemIcon>View details & timeline
        </MenuItem>
        <MenuItem disabled={menuRow?.status !== 'confirmed' && menuRow?.status !== 'packed'} onClick={() => { const r = menuRow; closeMenu(); setStatus(r, 'shipped'); }}>
          <ListItemIcon><LocalShippingIcon fontSize="small" /></ListItemIcon>Mark shipped
        </MenuItem>
        <MenuItem disabled={menuRow?.status === 'delivered'} onClick={() => { const r = menuRow; closeMenu(); setStatus(r, 'delivered'); }}>
          <ListItemIcon><DoneAllIcon fontSize="small" /></ListItemIcon>Mark delivered
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { const r = menuRow; closeMenu(); regenerate(r); }}>
          <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>Regenerate invoice
        </MenuItem>
      </Menu>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Order #{String(detail?._id || '').slice(-6)}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          {detail && (
            <Stack spacing={2}>
              <Box2 label="Customer" b={b}>{detail.userName}</Box2>
              <Box2 label="Shipping address" b={b}>
                {[detail.address?.name, detail.address?.line1, detail.address?.line2, detail.address?.city, detail.address?.state, detail.address?.pincode].filter(Boolean).join(', ')}
                <Typography variant="body2" sx={{ color: b.textDim }}>{detail.address?.phone}</Typography>
              </Box2>
              <Box2 label="Placed on" b={b}>{fmtDateTime(detail.createdAt)}</Box2>
              <Divider sx={{ borderColor: b.borderSoft }} />
              <Box>
                <Typography variant="overline" sx={{ color: b.textDim }}>Items</Typography>
                {(detail.items || []).map((it, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                    <Typography variant="body2">{it.nameSnapshot} × {it.qty}</Typography>
                    <Typography variant="body2">{rupees(it.priceSnapshot * it.qty)}</Typography>
                  </Stack>
                ))}
                <Divider sx={{ my: 1, borderColor: b.borderSoft }} />
                {detail.discount > 0 && <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: b.textDim }}>Discount{detail.couponCode ? ` (${detail.couponCode})` : ''}</Typography><Typography variant="body2" sx={{ color: b.green }}>− {rupees(detail.discount)}</Typography></Stack>}
                <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Total</Typography><Typography fontWeight={700} sx={{ color: b.red }}>{rupees(detail.total)}</Typography></Stack>
              </Box>

              {/* Activity timeline (tap to expand/collapse) */}
              <Divider sx={{ borderColor: b.borderSoft }} />
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ cursor: 'pointer' }} onClick={() => setShowTimeline((v) => !v)}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TimelineIcon fontSize="small" sx={{ color: b.textDim }} />
                    <Typography variant="overline" sx={{ color: b.textDim }}>Activity timeline</Typography>
                  </Stack>
                  {showTimeline ? <ExpandLessIcon sx={{ color: b.textDim }} /> : <ExpandMoreIcon sx={{ color: b.textDim }} />}
                </Stack>
                <Collapse in={showTimeline}>
                  <OrderTimeline order={detail} b={b} />
                </Collapse>
              </Box>

              {/* Auto-generated invoice */}
              <Divider sx={{ borderColor: b.borderSoft }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="overline" sx={{ color: b.textDim }}>Invoice</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {invoice ? invoice.invoiceNo : (detail.paymentStatus === 'paid' ? 'Generating…' : 'Not paid')}
                  </Typography>
                  {invoice?.template?.name && <Typography variant="caption" sx={{ color: b.textDim }}>Template: {invoice.template.name}</Typography>}
                </Box>
                {invoice && <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => printInvoice(invoice, invoice.template)}>Print / Download</Button>}
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Build the timeline rows: prefer the stored order.timeline; fall back to a
// derived "created → (paid) → status" view for legacy orders without a log.
function OrderTimeline({ order, b }) {
  let events = (order.timeline || []).map((t) => ({ label: t.label || t.status, at: t.at, note: t.note }));
  if (events.length === 0) {
    events = [{ label: 'Order placed', at: order.createdAt }];
    if (order.paymentStatus === 'paid') events.push({ label: 'Payment received', at: order.createdAt });
    if (order.status && order.status !== 'created') events.push({ label: `Order ${order.status}`, at: order.updatedAt });
  }
  return (
    <Stack spacing={0} sx={{ pt: 1, pl: 0.5 }}>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <Stack key={i} direction="row" spacing={1.2} alignItems="flex-start">
            <Stack alignItems="center" sx={{ pt: 0.3 }}>
              <CircleIcon sx={{ fontSize: 11, color: b.red }} />
              {!last && <Box sx={{ width: '2px', flexGrow: 1, minHeight: 22, background: b.borderSoft }} />}
            </Stack>
            <Box sx={{ pb: last ? 0 : 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.label}</Typography>
              <Typography variant="caption" sx={{ color: b.textDim }}>{fmtDateTime(e.at)}{e.note ? ` · ${e.note}` : ''}</Typography>
            </Box>
          </Stack>
        );
      })}
      {/* Show pending future steps faintly so the journey is legible. */}
      {nextStatus(order.status) && (
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ opacity: 0.5, mt: 0.5 }}>
          <RadioButtonUncheckedIcon sx={{ fontSize: 11, color: b.textDim }} />
          <Typography variant="caption" sx={{ color: b.textDim }}>Next: {prettyStatus(nextStatus(order.status))}</Typography>
        </Stack>
      )}
    </Stack>
  );
}

function Box2({ label, children, b }) {
  return (
    <div>
      <Typography variant="overline" sx={{ color: b.textDim }}>{label}</Typography>
      <Typography variant="body2">{children}</Typography>
    </div>
  );
}

/* ───────────────────────── Orders analytics ───────────────────────── */
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
// Compact ₹ for axis ticks so labels stay narrow and never clip: ₹4k, ₹1.2L, ₹3C.
const compactInr = (v) => {
  const n = Number(v || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 1)}C`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}k`;
  return `₹${n}`;
};

function Kpi({ label, value, sub, b }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.75 }}>
        <Typography variant="caption" sx={{ color: b.textDim, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="caption" sx={{ color: b.textDim }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function ChartBox({ title, hasData, children, b, height = 300 }) {
  return (
    <Card sx={{ height }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasData ? children : <Typography variant="body2" sx={{ color: b.textDim }}>No data for this range</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

function OrdersAnalytics({ data, b }) {
  if (!data) return null;
  const k = data.kpis || {};
  const series = data.series || [];
  const axisSx = {
    '& .MuiChartsAxis-line': { stroke: b.borderSoft }, '& .MuiChartsAxis-tick': { stroke: b.borderSoft },
    '& .MuiChartsAxis-tickLabel': { fill: b.textDim, fontSize: 11 },
  };
  const buckets = data.retentionBuckets || { '1': 0, '2': 0, '3': 0, '4+': 0 };
  const bucketKeys = ['1', '2', '3', '4+'];
  const topRepeat = data.topRepeat || [];

  return (
    <Box sx={{ mb: 2 }}>
      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><Kpi label="Revenue" value={inr(k.revenue)} sub={`${k.orderCount || 0} orders`} b={b} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Avg order value" value={inr(k.aov)} b={b} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Customers" value={k.totalCustomers || 0} sub={`${k.repeatCustomers || 0} repeat`} b={b} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Repeat rate" value={`${k.repeatRate || 0}%`} sub="ordered 2+ times" b={b} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Revenue + orders over time — Recharts (smooth lines, visible dots,
            dual Y-axis). Recharts renders a single point as a dot, so no
            bar-fallback is needed. */}
        <Grid item xs={12} md={7}>
          <ChartBox title="Revenue & orders over time" hasData={series.length > 0} b={b}>
            <ReLineChart
              responsive
              style={{ width: '100%', height: '100%' }}
              data={series.map((s) => ({ ...s, day: s.date.slice(5) }))}
              margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid stroke={b.borderSoft} strokeDasharray="5 5" vertical={false} />
              <XAxis dataKey="day" stroke={b.textDim} tick={{ fill: b.textDim, fontSize: 11 }} />
              {/* Left axis = revenue (₹). Compact labels (₹4k) + fixed width so
                  they never clip. allowDecimals off avoids 0.5-style ticks. */}
              <YAxis yAxisId="left" width={52} allowDecimals={false} stroke={b.textDim}
                tick={{ fill: b.textDim, fontSize: 11 }} tickFormatter={compactInr} />
              {/* Right axis = order count (whole numbers). */}
              <YAxis yAxisId="right" orientation="right" width={32} allowDecimals={false} stroke={b.textDim}
                tick={{ fill: b.textDim, fontSize: 11 }} />
              <ReTooltip
                contentStyle={{ background: b.surface, border: `1px solid ${b.border}`, borderRadius: 8, color: b.text }}
                labelStyle={{ color: b.textDim }}
                formatter={(value, name) => (name === 'Revenue (₹)' ? [inr(value), name] : [value, name])}
              />
              <ReLegend wrapperStyle={{ fontSize: 12, color: b.textDim }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue (₹)"
                stroke={b.red}
                strokeWidth={2}
                dot={{ fill: b.surface, stroke: b.red, strokeWidth: 2, r: 4 }}
                activeDot={{ fill: b.red, stroke: b.surface, r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke={b.blue}
                strokeWidth={2}
                dot={{ fill: b.surface, stroke: b.blue, strokeWidth: 2, r: 4 }}
                activeDot={{ fill: b.blue, stroke: b.surface, r: 5 }}
              />
            </ReLineChart>
          </ChartBox>
        </Grid>

        {/* Retention: how many customers ordered N times */}
        <Grid item xs={12} md={5}>
          <ChartBox title="Customer retention (orders per customer)" hasData={(k.totalCustomers || 0) > 0} b={b}>
            <BarChart
              height={232}
              margin={{ left: 44, right: 16, top: 14, bottom: 28 }}
              xAxis={[{ scaleType: 'band', data: bucketKeys.map((x) => `${x}×`) }]}
              series={[{ data: bucketKeys.map((x) => buckets[x] || 0), color: b.red, label: 'Customers' }]}
              sx={axisSx}
              slotProps={{ legend: { hidden: true } }}
            />
          </ChartBox>
        </Grid>

        {/* Top repeat buyers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Top repeat customers</Typography>
              {topRepeat.length === 0
                ? <Typography variant="body2" sx={{ color: b.textDim }}>No repeat customers in this range yet</Typography>
                : (
                  <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />}>
                    {topRepeat.map((u, i) => (
                      <Stack key={u.user} direction="row" alignItems="center" spacing={2} sx={{ py: 0.75 }}>
                        <Typography variant="body2" sx={{ color: b.textDim, width: 22 }}>{i + 1}</Typography>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{u.name}</Typography>
                        <Chip size="small" label={`${u.orders} orders`} sx={{ background: alpha(b.red, 0.14), color: b.red, fontWeight: 700 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: b.red, width: 96, textAlign: 'right' }}>{inr(u.spent)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ───────────────────────── Order Support sub-tab ───────────────────────── */
const SUPPORT_CATEGORY = {
  delivery: 'Delivery issue', damaged: 'Damaged item', wrong_item: 'Wrong item',
  missing_item: 'Missing item', payment: 'Payment', cancel: 'Cancellation', other: 'Other',
};

function OrderSupportTab({ onCount }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | new | done
  const [view, setView] = useState(null); // request being viewed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listOrderSupport();
      const list = data.data || [];
      setRows(list.map((r) => ({ id: r._id, ...r, userName: r.user?.name || r.user?.phone || '—' })));
      onCount?.(list.filter((r) => r.status === 'new').length);
    } catch { toast.error('Failed to load support requests'); }
    finally { setLoading(false); }
  }, [onCount]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (row, status) => {
    try {
      await AdminAPI.setOrderSupportStatus(row._id, status);
      toast.success(status === 'done' ? 'Marked done' : 'Reopened');
      load();
      if (view?._id === row._id) setView({ ...view, status });
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
  };

  const shown = rows.filter((r) => filter === 'all' || r.status === filter);

  const columns = [
    { field: 'orderNoSnapshot', headerName: 'Order', width: 100, valueFormatter: (v) => `#${v || ''}` },
    { field: 'userName', headerName: 'Customer', flex: 1, minWidth: 130 },
    { field: 'category', headerName: 'Reason', width: 140, valueFormatter: (v) => SUPPORT_CATEGORY[v] || v },
    { field: 'message', headerName: 'Message', flex: 1.4, minWidth: 180, renderCell: (p) => <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.value}</span> },
    { field: 'createdAt', headerName: 'Raised', width: 130, valueFormatter: (v) => fmtDateTime(v) },
    {
      field: 'status', headerName: 'Status', width: 90, renderCell: (p) => (
        <Chip size="small" label={p.value === 'new' ? 'New' : 'Done'}
          sx={{ background: p.value === 'new' ? `${b.red}22` : `${b.green}22`, color: p.value === 'new' ? b.red : b.green, fontWeight: 700 }} />
      ),
    },
    {
      field: '__act', headerName: 'Action', width: 200, sortable: false, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', width: '100%' }}>
          <Button size="small" variant="outlined" onClick={() => setView(p.row)}>View</Button>
          {p.row.status === 'new'
            ? <PrimaryCellButton onClick={() => setStatus(p.row, 'done')}>Mark as done</PrimaryCellButton>
            : <Button size="small" sx={{ color: b.textDim }} onClick={() => setStatus(p.row, 'new')}>Reopen</Button>}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {['all', 'new', 'done'].map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f === 'new' ? 'New' : 'Done'} onClick={() => setFilter(f)}
            variant={filter === f ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, ...(filter === f ? { background: b.red, color: '#fff' } : {}) }} />
        ))}
      </Stack>
      <AdminTable rows={shown} columns={columns} loading={loading} title="Order help requests"
        emptyTitle="No support requests" emptyHint={<><SupportAgentIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />Requests raised from the app's “Need help” will appear here</>} />

      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Help · Order #{view?.orderNoSnapshot}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          {view && (
            <Stack spacing={1.5}>
              <Box2 label="Customer" b={b}>{view.user?.name || view.user?.phone || '—'}</Box2>
              {view.contactPhone && <Box2 label="Contact" b={b}>{view.contactPhone}</Box2>}
              <Box2 label="Reason" b={b}>{SUPPORT_CATEGORY[view.category] || view.category}</Box2>
              <Box2 label="Raised" b={b}>{fmtDateTime(view.createdAt)}</Box2>
              <Box>
                <Typography variant="overline" sx={{ color: b.textDim }}>Message</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{view.message}</Typography>
              </Box>
              <Divider sx={{ borderColor: b.borderSoft }} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {view.status === 'new'
                  ? <Button variant="contained" startIcon={<DoneAllIcon />} onClick={() => { setStatus(view, 'done'); setView(null); }}>Mark as done</Button>
                  : <Button variant="outlined" onClick={() => { setStatus(view, 'new'); setView(null); }}>Reopen</Button>}
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
