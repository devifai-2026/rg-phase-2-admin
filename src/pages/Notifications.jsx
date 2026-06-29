import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Tabs, Tab, Button, Stack, Typography, TextField, MenuItem, Switch,
  FormControlLabel, Chip, Grid, Autocomplete, CircularProgress, Divider, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import toast from 'react-hot-toast';
import { NotificationsAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn, actionsColumn } from '../components/tableHelpers';
import EmojiPicker from '../components/EmojiPicker';

/** Format an ISO timestamp as a short local time for the retry badge. */
function shortTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

/** Turn a raw FCM/delivery failure code into readable plain text for the UI. */
const REASON_LABELS = {
  no_tokens: 'No device registered',
  'registration-token-not-registered': 'Device unregistered',
  'invalid-registration-token': 'Invalid device token',
  'invalid-argument': 'Invalid request',
  'message-rate-exceeded': 'Rate limited',
  'quota-exceeded': 'Quota exceeded',
  unavailable: 'FCM temporarily unavailable',
  'internal-error': 'FCM internal error',
  'mismatched-credential': 'Credential mismatch',
  fcm_error: 'Push error',
  mock: 'Mock (FCM off)',
};
function reasonLabel(code) {
  if (REASON_LABELS[code]) return REASON_LABELS[code];
  // Fallback: replace separators with spaces and sentence-case it.
  const s = String(code || '').replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
}

// Which app a notification concerns, derived from its audience. Drives the
// User-app / Astrologer-app segregation toggle. 'all'/'both'/single-user/segment
// can reach either app, so they show under both scopes.
const APP_SCOPES = [
  { key: 'all', label: 'All apps' },
  { key: 'user', label: 'User app' },
  { key: 'astrologer', label: 'Astrologer app' },
];
// Audiences visible under each scope (used to filter Logs + default Bulk).
// 'user' (a single recipient) is valid under either app scope — the picker's
// role switches to match the scope so you can target one astrologer too.
const SCOPE_AUDIENCES = {
  user: ['users', 'user', 'segment', 'all', 'both'],
  astrologer: ['astrologers', 'user', 'all', 'both'],
};

export default function Notifications() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [tab, setTab] = useState(0);
  // App segregation: 'all' | 'user' | 'astrologer'. Applies to Logs + Bulk.
  const [appScope, setAppScope] = useState('all');

  return (
    <Box>
      <PageHeader title="Notifications" subtitle="Send broadcasts, manage system templates, and review delivery logs" />

      {/* App segregation — view/compose for the User app vs the Astrologer app. */}
      <Card sx={{ mb: 2, p: 0.5 }}>
        <Tabs value={appScope} onChange={(e, v) => setAppScope(v)} sx={{ px: 1.5, minHeight: 40 }}>
          {APP_SCOPES.map((s) => <Tab key={s.key} value={s.key} label={s.label} sx={{ minHeight: 40 }} />)}
        </Tabs>
      </Card>

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Logs" />
          <Tab label="Bulk Trigger" />
          <Tab label="Templates" />
        </Tabs>
      </Card>
      {tab === 0 && <LogsTab b={b} appScope={appScope} />}
      {tab === 1 && <BulkTab b={b} appScope={appScope} />}
      {tab === 2 && <TemplatesTab b={b} />}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────── Logs ──

const AUDIENCE_LABEL = {
  all: 'Everyone', users: 'All Users', astrologers: 'All Astrologers',
  both: 'Users + Astrologers', user: 'Single User', segment: 'Segment',
};

function audienceText(row) {
  if (row.audience === 'user') return row.targetUser?.name || row.targetUser?.phone || 'Single user';
  if (row.audience === 'segment' && row.segment) {
    if (row.segment.kind === 'topic') return `Topic · ${row.segment.topic}`;
    if (row.segment.kind === 'activity') return `Activity · ${row.segment.filter}`;
  }
  return AUDIENCE_LABEL[row.audience] || row.audience;
}

const EMPTY_FILTERS = { status: '', audience: '', channel: '', source: '', q: '', from: '', to: '' };

function LogsTab({ b, appScope = 'all' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pm, setPm] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stats, setStats] = useState(null);
  const [statsDays, setStatsDays] = useState(14); // graph window, up to 1 year
  const [toDelete, setToDelete] = useState(null); // a row pending delete-confirm
  const [clearOpen, setClearOpen] = useState(false); // clear-filtered confirm
  const [busy, setBusy] = useState(false); // delete in flight

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pm.page + 1, limit: pm.pageSize };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      // Segregate by app — the backend matches role-based audiences plus
      // single-user notifications whose recipient has that role.
      if (appScope !== 'all') params.appScope = appScope;
      // Make the "to" date inclusive of the whole selected day.
      if (params.to) params.to = `${params.to}T23:59:59.999`;
      const { data } = await NotificationsAPI.log(params);
      setRows((data.data.items || []).map((r) => ({ id: r._id, ...r })));
      setRowCount(data.data.total);
    } catch { toast.error('Failed to load logs'); } finally { setLoading(false); }
  }, [pm.page, pm.pageSize, filters, appScope]);
  useEffect(() => { load(); }, [load]);

  // Aggregate graph data (from BigQuery). Refetches when the window OR the app
  // scope changes, so the graphs segregate by app like the table does.
  const loadStats = useCallback(() => {
    const params = { days: statsDays };
    if (appScope !== 'all') params.appScope = appScope;
    return NotificationsAPI.logStats(params)
      .then(({ data }) => setStats(data.data))
      .catch(() => setStats(null));
  }, [statsDays, appScope]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const retry = async (id) => {
    try { await NotificationsAPI.retry(id); toast.success('Re-sent'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Retry failed'); }
  };

  // Delete one log (after confirm). Refresh both the list and the graphs.
  const remove = async (id) => {
    setBusy(true);
    try {
      await NotificationsAPI.removeLog(id);
      toast.success('Log deleted');
      setToDelete(null);
      load(); loadStats();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
    finally { setBusy(false); }
  };

  // Clear every log matching the current filters/app scope (after confirm).
  const clearFiltered = async () => {
    setBusy(true);
    try {
      const params = {};
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      if (appScope !== 'all') params.appScope = appScope;
      if (params.to) params.to = `${params.to}T23:59:59.999`;
      // No filters at all → explicit confirm so we don't wipe everything silently.
      if (!Object.keys(params).length) params.confirm = 'all';
      const { data } = await NotificationsAPI.clearLogs(params);
      toast.success(`Deleted ${data.data.deleted} log${data.data.deleted === 1 ? '' : 's'}`);
      setClearOpen(false);
      setPm((p) => ({ ...p, page: 0 }));
      load(); loadStats();
    } catch (e) { toast.error(e.response?.data?.message || 'Clear failed'); }
    finally { setBusy(false); }
  };

  // Whether any filter (incl. app scope) is active — drives the Clear button label.
  const anyFilter = appScope !== 'all' || Object.values(filters).some(Boolean);

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPm((p) => ({ ...p, page: 0 })); };

  const failuresText = (failures) =>
    Object.entries(failures || {}).map(([reason, count]) => `${reasonLabel(reason)}: ${count}`).join(', ') || 'failed';

  const columns = [
    {
      field: 'title', headerName: 'Notification', flex: 1.4, minWidth: 240, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.5 }}>
          <Avatar variant="rounded" sx={{ width: 38, height: 38, bgcolor: alpha(b.RED.main, 0.15), color: b.RED.main }}><GroupsIcon fontSize="small" /></Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{row.title}</Typography>
            <Typography variant="caption" noWrap sx={{ color: b.textFaint, display: 'block', maxWidth: 260 }}>{row.body}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'audience', headerName: 'Audience', width: 180, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography variant="body2" noWrap>{audienceText(row)}</Typography>
          <Typography variant="caption" noWrap sx={{ color: b.textFaint, display: 'block' }}>
            {row.source === 'template' ? `Template · ${row.templateEvent}`
              : row.source === 'point' ? `System · ${row.notifType || 'notification'}`
              : row.channel === 'push_only' ? 'Push only' : 'In-app + push'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'outcome', headerName: 'Delivery', width: 330, sortable: false,
      renderCell: ({ row }) => {
        const metric = (label, value, color, tip) => {
          const el = (
            <Stack alignItems="center" sx={{ minWidth: 46 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1, color: value == null ? b.textFaint : color }}>
                {value == null ? '—' : value}
              </Typography>
              <Typography sx={{ fontSize: 10, color: b.textFaint, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Typography>
            </Stack>
          );
          return tip ? <Tooltip title={tip}>{el}</Tooltip> : el;
        };
        const recorded = row.statsRecorded;
        return (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
            {metric('Sent', row.recipients ?? 0, b.text, `${row.recipients ?? 0} recipients targeted`)}
            {metric('Accepted', recorded ? row.accepted : null, '#4B8FE0', 'Accepted/queued by FCM (not proof of device receipt)')}
            {metric('Delivered', recorded ? row.delivered : null, '#22c55e', 'Confirmed received on a device (app ACK)')}
            {metric('Failed', recorded ? row.failed : null, '#ef4444', recorded && row.failed > 0 ? failuresText(row.failures) : 'Rejected by FCM')}
            {metric('Clicks', recorded ? row.clicked : null, b.RED.main)}
          </Stack>
        );
      },
    },
    {
      field: 'status', headerName: 'Status', width: 200, sortable: false,
      renderCell: ({ row }) => {
        // Show the auto-retry badge with the scheduled time when retrying.
        if (row.status === 'retrying' && row.nextRetryAt) {
          return (
            <Tooltip title={`Auto-retry of failed recipients · attempt ${(row.retryCount || 0) + 1}`}>
              <Chip
                size="small" icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                label={`Next retry: ${shortTime(row.nextRetryAt)}`}
                sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: alpha('#f59e0b', 0.16), color: '#f59e0b' }}
              />
            </Tooltip>
          );
        }
        const map = {
          completed: ['Completed', '#22c55e'], sending: ['Sending…', b.RED.main],
          queued: ['Queued', b.textDim], failed: ['Failed', '#ef4444'],
        };
        const [label, color] = map[row.status] || [row.status, b.textDim];
        return <Chip size="small" label={label} sx={{ height: 24, fontSize: 11, fontWeight: 600, bgcolor: alpha(color, 0.14), color }} />;
      },
    },
    dateColumn({ field: 'createdAt', headerName: 'Sent', width: 140 }),
    actionsColumn({
      count: 3,
      getActions: (row) => [
        { tip: 'Details', icon: <InfoOutlinedIcon fontSize="small" />, onClick: () => setDetail(row) },
        // Retry is only offered when there were failed deliveries to re-attempt.
        row.failed > 0 && { tip: 'Retry failed', icon: <ReplayIcon fontSize="small" />, onClick: () => retry(row._id) },
        { tip: 'Delete log', icon: <DeleteOutlineIcon fontSize="small" />, onClick: () => setToDelete(row) },
      ],
    }),
  ];

  return (
    <>
      {stats && <LogStats stats={stats} b={b} days={statsDays} onDays={setStatsDays} />}

      {/* Filters */}
      <Card sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField size="small" label="Search title" value={filters.q} onChange={setF('q')} sx={{ minWidth: 180 }} />
          <TextField size="small" select label="Status" value={filters.status} onChange={setF('status')} sx={{ minWidth: 130 }}>
            {['', 'completed', 'sending', 'retrying', 'queued', 'failed'].map((s) => <MenuItem key={s} value={s}>{s === '' ? 'All' : s}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Audience" value={filters.audience} onChange={setF('audience')} sx={{ minWidth: 140 }}>
            {['', 'all', 'users', 'astrologers', 'both', 'user', 'segment']
              .filter((s) => s === '' || appScope === 'all' || SCOPE_AUDIENCES[appScope].includes(s))
              .map((s) => <MenuItem key={s} value={s}>{s === '' ? 'All' : (AUDIENCE_LABEL[s] || s)}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Channel" value={filters.channel} onChange={setF('channel')} sx={{ minWidth: 130 }}>
            {['', 'inapp_push', 'push_only'].map((s) => <MenuItem key={s} value={s}>{s === '' ? 'All' : (s === 'push_only' ? 'Push only' : 'In-app + push')}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Source" value={filters.source} onChange={setF('source')} sx={{ minWidth: 120 }}>
            {['', 'manual', 'template', 'point'].map((s) => <MenuItem key={s} value={s}>{s === '' ? 'All' : s === 'point' ? 'System' : s}</MenuItem>)}
          </TextField>
          {/* Date range — query notifications sent within a particular window. */}
          <TextField
            size="small" type="date" label="From" value={filters.from}
            onChange={setF('from')} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
          />
          <TextField
            size="small" type="date" label="To" value={filters.to}
            onChange={setF('to')} InputLabelProps={{ shrink: true }}
            inputProps={{ min: filters.from || undefined }} sx={{ minWidth: 150 }}
          />
          {Object.values(filters).some(Boolean) && (
            <Button size="small" onClick={() => { setFilters(EMPTY_FILTERS); setPm((p) => ({ ...p, page: 0 })); }}>Clear</Button>
          )}
        </Stack>
      </Card>

      <AdminTable
        rows={rows} columns={columns} loading={loading}
        title="Broadcast log"
        paginationMode="server" rowCount={rowCount}
        paginationModel={pm} onPaginationModelChange={setPm}
        emptyTitle="No broadcasts yet" emptyHint="Sent notifications appear here with delivery stats"
        toolbarActions={rowCount > 0 && (
          <Button
            size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />}
            onClick={() => setClearOpen(true)} sx={{ flexShrink: 0 }}
          >
            {anyFilter ? 'Clear filtered' : 'Clear all'}
          </Button>
        )}
      />
      <LogDetailDialog row={detail} onClose={() => setDetail(null)} onRetry={retry} b={b} />

      {/* Delete a single log */}
      <Dialog open={!!toDelete} onClose={() => !busy && setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this log?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: b.textDim }}>
            “{toDelete?.title}” will be removed from the broadcast log. This doesn’t recall any
            notification already delivered — it only deletes the record. This can’t be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => remove(toDelete._id)}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear filtered / all logs */}
      <Dialog open={clearOpen} onClose={() => !busy && setClearOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{anyFilter ? 'Clear filtered logs?' : 'Clear ALL logs?'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: b.textDim }}>
            {anyFilter
              ? `This deletes the ${rowCount} log${rowCount === 1 ? '' : 's'} matching your current filters / app scope.`
              : `This deletes every broadcast log (${rowCount} total).`}
            {' '}It only removes the records, not any notifications already delivered. This can’t be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={clearFiltered}>
            {busy ? 'Deleting…' : (anyFilter ? 'Clear filtered' : 'Clear all')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 1 year' },
];

// Semantic series colors (kept consistent across every panel below).
const C_OK = '#3CCB7F';   // delivered / good
const C_BAD = '#ef4444';  // failed / bad
const C_WARN = '#E0A93B'; // mid threshold

/** A Grafana-style panel: titled card with a thin top accent + subdued chrome. */
function Panel({ title, subtitle, accent, b, children, sx }) {
  return (
    <Card sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...sx }}>
      {accent && <Box sx={{ height: 3, background: `linear-gradient(90deg, ${accent} 0%, ${alpha(accent, 0.25)} 100%)` }} />}
      <Box sx={{ px: 1.75, pt: 1.25, pb: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: b.textDim }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: b.textFaint }}>{subtitle}</Typography>}
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</Box>
      </Box>
    </Card>
  );
}

/** Grafana "Stat" panel — big number, colored accent, and a background sparkline. */
function StatPanel({ label, value, color, b, spark, suffix, hint }) {
  const labelEl = (
    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: b.textDim, cursor: hint ? 'help' : 'default', borderBottom: hint ? `1px dotted ${alpha(b.textFaint, 0.5)}` : 'none', display: 'inline-block' }}>{label}</Typography>
  );
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: color }} />
      {spark && spark.length >= 2 && spark.some((v) => v > 0) && (
        <Box sx={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: 38, opacity: 0.5, pointerEvents: 'none' }}>
          <SparkLineChart data={spark} height={38} area color={color} curve="monotoneX"
            sx={{ '& .MuiAreaElement-root': { fill: alpha(color, 0.18) } }} />
        </Box>
      )}
      <Box sx={{ px: 1.75, py: 1.4, position: 'relative' }}>
        {hint ? <Tooltip title={hint} arrow>{labelEl}</Tooltip> : labelEl}
        <Typography sx={{ fontWeight: 800, fontSize: 30, lineHeight: 1.15, color }}>
          {value}{suffix && <Typography component="span" sx={{ fontSize: 16, fontWeight: 700, color: alpha(color, 0.8), ml: 0.25 }}>{suffix}</Typography>}
        </Typography>
      </Box>
    </Card>
  );
}

// Categorical-dimension labels for the scatter (audience / channel / source).
const DIM_LABEL = {
  audience: { all: 'Everyone', users: 'All Users', astrologers: 'All Astrologers', both: 'Users + Astrologers', user: 'Single User', segment: 'Segment' },
  channel: { inapp_push: 'In-app + Push', push_only: 'Push only' },
  source: { manual: 'Manual', template: 'Template', point: 'System' },
};
// A small qualitative palette for distinct categories within a dimension.
const CAT_COLORS = ['#4B8FE0', '#3CCB7F', '#E0A93B', '#8C6FF0', '#E25C4D', '#42C7C7', '#D571C4', '#9BA84B'];

/** Delivery dashboard for the Logs tab (data from BigQuery) — Grafana-style panels. */
function LogStats({ stats, b, days: rangeDays, onDays }) {
  const daily = stats.daily || [];
  // accepted = FCM took the push (successCount). delivered = device-confirmed
  // (the app ACKed receipt). failed = FCM rejected. accepted ≥ delivered always.
  const totals = stats.totals || { accepted: 0, delivered: 0, failed: 0, campaigns: 0 };
  const campaigns = stats.campaigns || [];

  const accepted = totals.accepted || 0;
  const attempts = accepted + (totals.failed || 0); // total FCM send attempts
  // Delivery rate = of the pushes FCM accepted, how many a device confirmed.
  const deliveryRate = accepted ? Math.round((totals.delivered / accepted) * 100) : null;
  const rateColor = deliveryRate == null ? b.textFaint : deliveryRate >= 80 ? C_OK : deliveryRate >= 50 ? C_WARN : C_BAD;
  const pending = Math.max(0, accepted - (totals.delivered || 0)); // accepted but not yet device-confirmed
  const CHART_H = 220;

  // Sparklines for the stat panels (need ≥2 days to draw a line).
  const sparkOk = daily.map((d) => d.delivered || 0);
  const sparkAcc = daily.map((d) => d.accepted || 0);
  const sparkBad = daily.map((d) => d.failed || 0);

  // Scatter: one point per campaign. x = reach (recipients), y = delivery-rate %
  // (device-confirmed / accepted). Grouped into one ScatterChart series per
  // distinct category of the chosen dimension, so points are color-coded.
  const [scatterDim, setScatterDim] = useState('channel'); // audience | channel | source
  const groups = {};
  campaigns.forEach((c) => {
    const acc = c.accepted || 0;
    const reach = c.recipients || acc;
    const rate = acc ? Math.round((c.delivered / acc) * 100) : 0;
    const key = c[scatterDim] || '—';
    (groups[key] ||= []).push({ x: reach || 0.5, y: rate, id: c.id, title: c.title, recipients: c.recipients, accepted: acc, delivered: c.delivered, failed: c.failed });
  });
  const scatterSeries = Object.entries(groups).map(([key, pts], i) => ({
    label: DIM_LABEL[scatterDim]?.[key] || key,
    color: CAT_COLORS[i % CAT_COLORS.length],
    data: pts,
    valueFormatter: (v) => `${v?.title || 'Campaign'} · ${v?.delivered ?? 0}/${v?.accepted ?? 0} confirmed`,
    markerSize: 7, highlightScope: { highlight: 'item' },
  }));

  return (
    <Box sx={{ mb: 2 }}>
      {/* Toolbar: range selector */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: b.textDim }}>Delivery analytics</Typography>
        <TextField
          select size="small" value={rangeDays}
          onChange={(e) => onDays(Number(e.target.value))}
          sx={{ minWidth: 160 }}
        >
          {RANGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {/* Row 1 — Stat panels. Delivered (device-confirmed) vs Accepted (FCM). */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <StatPanel label="Delivered" hint="Confirmed received on a device (app ACK)" value={totals.delivered || 0} color={C_OK} b={b} spark={sparkOk} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatPanel label="Accepted" hint="Accepted/queued by FCM — not yet proof of device receipt" value={accepted} color={b.blue} b={b} spark={sparkAcc} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatPanel label="Failed" hint="Rejected by FCM (e.g. no/invalid device token)" value={totals.failed || 0} color={C_BAD} b={b} spark={sparkBad} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatPanel label="Campaigns" value={totals.campaigns || 0} color={b.RED.main} b={b} />
        </Grid>
      </Grid>

      {/* Row 2 — Gauge · Time series · Donut */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Panel title="Delivery rate" subtitle="confirmed / accepted" accent={rateColor} b={b}>
            {accepted ? (
              <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
                <Gauge
                  height={CHART_H} value={deliveryRate} valueMax={100} startAngle={-110} endAngle={110}
                  cornerRadius="50%" text={({ value }) => `${value}%`}
                  sx={{
                    [`& .${gaugeClasses.valueText}`]: { fontSize: 30, fontWeight: 800, fill: rateColor },
                    [`& .${gaugeClasses.valueArc}`]: { fill: rateColor },
                    [`& .${gaugeClasses.referenceArc}`]: { fill: alpha(b.textFaint, 0.18) },
                  }}
                />
                <Typography variant="caption" sx={{ color: b.textFaint, mt: -1, textAlign: 'center' }}>
                  {totals.delivered || 0} device-confirmed<br />of {accepted} accepted
                </Typography>
              </Box>
            ) : <EmptyChart b={b} h={CHART_H} />}
          </Panel>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${b.blue} 0%, ${alpha(b.blue, 0.25)} 100%)` }} />
            <Box sx={{ px: 1.75, pt: 1.25, pb: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: b.textDim }}>
                  Campaign reach vs delivery
                </Typography>
                {/* Dimension toggle: color points by audience / channel / source. */}
                <TextField
                  select size="small" value={scatterDim} onChange={(e) => setScatterDim(e.target.value)}
                  sx={{ minWidth: 130, '& .MuiInputBase-input': { py: 0.4, fontSize: 12 } }}
                >
                  <MenuItem value="audience">By audience</MenuItem>
                  <MenuItem value="channel">By channel</MenuItem>
                  <MenuItem value="source">By source</MenuItem>
                </TextField>
              </Stack>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {campaigns.length ? (
                  <ScatterChart
                    height={CHART_H}
                    margin={{ left: 44, right: 16, top: 10, bottom: 40 }}
                    grid={{ horizontal: true, vertical: true }}
                    xAxis={[{ label: 'Recipients (reach)', min: 0 }]}
                    yAxis={[{ label: 'Delivery %', min: 0, max: 100 }]}
                    series={scatterSeries}
                    sx={{ '& .MuiChartsGrid-line': { stroke: alpha(b.textFaint, 0.12) } }}
                    slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' }, labelStyle: { fontSize: 11 } } }}
                  />
                ) : <EmptyChart b={b} h={CHART_H} label={attempts ? 'No campaigns in range' : 'No data yet'} />}
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Panel title="Delivery split" accent={C_OK} b={b}>
            {attempts ? (
              <PieChart
                height={CHART_H}
                margin={{ top: 8, bottom: 36, left: 8, right: 8 }}
                series={[{
                  innerRadius: 48, outerRadius: 80, paddingAngle: 2, cornerRadius: 4,
                  data: [
                    { id: 0, value: totals.delivered || 0, label: 'Delivered', color: C_OK },
                    { id: 1, value: pending, label: 'Pending', color: b.blue },
                    { id: 2, value: totals.failed || 0, label: 'Failed', color: C_BAD },
                  ].filter((d) => d.value > 0),
                }]}
                slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' }, labelStyle: { fontSize: 11 } } }}
              />
            ) : <EmptyChart b={b} h={CHART_H} />}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

function EmptyChart({ b, label = 'No data yet', h = 200 }) {
  return (
    <Box sx={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="caption" sx={{ color: b.textFaint }}>{label}</Typography>
    </Box>
  );
}

function LogDetailDialog({ row, onClose, onRetry, b }) {
  if (!row) return null;
  const recorded = row.statsRecorded;
  const stat = (label, value, color, tip) => {
    const box = (
      <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(color, 0.1), textAlign: 'center', cursor: tip ? 'help' : 'default' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 20, color: value == null ? b.textFaint : color }}>{value == null ? '—' : value}</Typography>
        <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
      </Box>
    );
    return (
      <Grid item xs={2.4}>
        {tip ? <Tooltip title={tip} arrow>{box}</Tooltip> : box}
      </Grid>
    );
  };
  return (
    <Dialog open={!!row} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{row.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: b.textDim }}>{row.body}</Typography>
        <Grid container spacing={1} sx={{ mb: recorded ? 2 : 1 }}>
          {stat('Recipients', row.recipients ?? 0, b.text, 'Users targeted by this broadcast')}
          {stat('Accepted', recorded ? row.accepted : null, '#4B8FE0', 'Accepted/queued by FCM — not proof of device receipt')}
          {stat('Delivered', recorded ? row.delivered : null, '#22c55e', 'Confirmed received on a device (app ACK)')}
          {stat('Failed', recorded ? row.failed : null, '#ef4444', 'Rejected by FCM')}
          {stat('Clicks', recorded ? row.clicked : null, b.RED.main, 'Users who tapped the notification')}
        </Grid>
        {!recorded && (
          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: b.textFaint }}>
            Delivery analytics weren’t recorded for this campaign (sent before analytics were enabled). New sends will show full stats.
          </Typography>
        )}
        {row.status === 'retrying' && row.nextRetryAt && (
          <Chip
            size="small" icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
            label={`Next retry scheduled at ${shortTime(row.nextRetryAt)}`}
            sx={{ mb: 2, fontWeight: 700, bgcolor: alpha('#f59e0b', 0.16), color: '#f59e0b' }}
          />
        )}
        {!!Object.keys(row.failures || {}).length && (
          <>
            <Typography variant="overline" sx={{ color: b.textFaint }}>Failure reasons</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(row.failures).map(([reason, count], i) => (
                <Chip key={i} size="small" label={`${reasonLabel(reason)} · ${count}`} sx={{ bgcolor: alpha('#ef4444', 0.14), color: '#ef4444' }} />
              ))}
            </Stack>
          </>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" sx={{ color: b.textFaint }}>
          Audience: {audienceText(row)} · {row.channel === 'push_only' ? 'Push only' : 'In-app + push'}
          {row.retryCount ? ` · retried ${row.retryCount}×` : ''}
        </Typography>
      </DialogContent>
      <DialogActions>
        {row.failed > 0 && <Button startIcon={<ReplayIcon />} onClick={() => { onRetry(row._id); onClose(); }}>Retry failed</Button>}
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────── Bulk Trigger ──

const TOPICS = ['cricket', 'share_market', 'bollywood', 'magazine', 'follow', 'festivals', 'horoscope'];
const ACTIVITY = [
  { value: 'never_recharged', label: 'Never recharged' },
  { value: 'has_balance', label: 'Has wallet balance' },
  { value: 'new_this_week', label: 'New this week' },
];

// Deep-link targets the admin can attach to a broadcast. Value is the URI
// stored in data.deeplink; the apps route on it. '' = no link (just opens app).
// The two apps have different navigation, so the offered targets depend on the
// app scope (see linkTargetsFor below).
const USER_LINK_TARGETS = [
  { value: '', label: 'No link (just opens the app)' },
  { value: 'rudraganga://notifications', label: 'Notifications' },
  { value: 'rudraganga://wallet', label: 'Wallet' },
  { value: 'rudraganga://astrologers', label: 'Astrologers' },
  { value: 'rudraganga://pooja', label: 'Pooja' },
  { value: 'rudraganga://profile', label: 'My Profile' },
  { value: 'rudraganga://settings', label: 'Notification settings' },
  { value: '__custom__', label: 'Custom URL…' },
];
// Astrologer-app routes (must match AstroDeepLink in the astrologer Flutter app).
const ASTRO_LINK_TARGETS = [
  { value: '', label: 'No link (just opens the app)' },
  { value: 'rudraganga://astro/home', label: 'Home (dashboard)' },
  { value: 'rudraganga://astro/requests', label: 'Requests' },
  { value: 'rudraganga://astro/notifications', label: 'Notifications' },
  { value: 'rudraganga://astro/earnings', label: 'Earnings' },
  { value: 'rudraganga://astro/storefront', label: 'My Storefront' },
  { value: 'rudraganga://astro/live', label: 'Go Live' },
  { value: 'rudraganga://astro/profile', label: 'My Profile' },
  { value: 'rudraganga://astro/settings', label: 'Settings & Presets' },
  { value: '__custom__', label: 'Custom URL…' },
];
// Pick the right target list for the current app scope. Under "All apps" we
// can't know which app a recipient uses, so only the safe options (no link /
// notifications / custom) are offered to avoid sending a route the other app
// can't open.
function linkTargetsFor(scope) {
  if (scope === 'astrologer') return ASTRO_LINK_TARGETS;
  if (scope === 'user') return USER_LINK_TARGETS;
  return [
    { value: '', label: 'No link (just opens the app)' },
    { value: 'rudraganga://notifications', label: 'Notifications (user app)' },
    { value: 'rudraganga://astro/notifications', label: 'Notifications (astrologer app)' },
    { value: '__custom__', label: 'Custom URL…' },
  ];
}

// Default compose audience for an app scope.
const SCOPE_DEFAULT_AUDIENCE = { all: 'all', user: 'users', astrologer: 'astrologers' };

function BulkTab({ b, appScope = 'all' }) {
  const [form, setForm] = useState({ title: '', body: '', channel: 'inapp_push', audience: SCOPE_DEFAULT_AUDIENCE[appScope] || 'all' });

  // When the app scope changes, snap the audience to that app's default and the
  // specific-user role to that app's audience so the composer matches the
  // segregation tab the admin picked.
  useEffect(() => {
    setForm((f) => ({ ...f, audience: SCOPE_DEFAULT_AUDIENCE[appScope] || 'all' }));
    setUserRole(appScope === 'astrologer' ? 'astrologer' : 'user');
    // The tap-target list is app-specific — clear any stale (wrong-app) link.
    setLinkTarget('');
    setCustomLink('');
  }, [appScope]);
  const [linkTarget, setLinkTarget] = useState(''); // a linkTargetsFor() value
  const [customLink, setCustomLink] = useState(''); // when linkTarget === '__custom__'
  const [segKind, setSegKind] = useState('topic'); // when audience === 'segment'
  const [segTopic, setSegTopic] = useState('horoscope');
  const [segActivity, setSegActivity] = useState('never_recharged');
  // For the specific-user search. Under the Astrologer-app scope, default the
  // role to astrologer so "a specific astrologer" finds the right people.
  const [userRole, setUserRole] = useState(appScope === 'astrologer' ? 'astrologer' : 'user');
  const [userOpts, setUserOpts] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const addEmoji = (k, emoji) => setForm((f) => ({ ...f, [k]: (f[k] || '') + emoji }));

  // Build the audience/segment payload from the current selections.
  const buildTarget = useCallback(() => {
    const t = { audience: form.audience };
    if (form.audience === 'user') t.targetUser = targetUser?._id;
    if (form.audience === 'segment') {
      t.segment = segKind === 'topic' ? { kind: 'topic', topic: segTopic } : { kind: 'activity', filter: segActivity };
    }
    return t;
  }, [form.audience, targetUser, segKind, segTopic, segActivity]);

  // Live audience-size estimate whenever the target changes.
  useEffect(() => {
    let alive = true;
    const t = buildTarget();
    if (t.audience === 'user' && !t.targetUser) { setEstimate(null); return; }
    setEstimating(true);
    NotificationsAPI.estimate(t)
      .then(({ data }) => { if (alive) setEstimate(data.data.count); })
      .catch(() => { if (alive) setEstimate(null); })
      .finally(() => { if (alive) setEstimating(false); });
    return () => { alive = false; };
  }, [buildTarget]);

  // Debounced user search for the specific-user picker.
  useEffect(() => {
    if (form.audience !== 'user') return;
    const h = setTimeout(async () => {
      try { const { data } = await NotificationsAPI.searchUsers(userQuery, userRole); setUserOpts(data.data.items); }
      catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(h);
  }, [userQuery, userRole, form.audience]);

  const send = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.audience === 'user' && !targetUser) return toast.error('Pick a user');
    setSending(true);
    try {
      // Resolve the deep-link target into data.deeplink (tap destination).
      const deeplink = linkTarget === '__custom__' ? customLink.trim() : linkTarget;
      const payload = {
        ...buildTarget(), title: form.title, body: form.body, channel: form.channel,
        ...(deeplink ? { data: { deeplink } } : {}),
      };
      const { data } = await NotificationsAPI.send(payload);
      const r = data.data;
      // Delivery counts are recorded asynchronously (BigQuery) and shown in the
      // Logs tab — the immediate response only knows the recipient count.
      const n = r.recipients ?? 0;
      toast.success(n ? `Sent to ${n} recipient${n === 1 ? '' : 's'} · see Logs for delivery` : 'Broadcast queued');
      setForm((f) => ({ ...f, title: '', body: '' }));
      setLinkTarget(''); setCustomLink('');
    } catch (e) { toast.error(e.response?.data?.message || 'Send failed'); }
    finally { setSending(false); }
  };

  const ALL_AUDIENCE_OPTIONS = [
    { value: 'all', label: 'Everyone (users + astrologers)' },
    { value: 'users', label: 'All Users' },
    { value: 'astrologers', label: 'All Astrologers' },
    { value: 'both', label: 'Users + Astrologers' },
    { value: 'segment', label: 'Segment (topic / activity)' },
    // Label tracks the app scope so it reads "a specific astrologer" there.
    { value: 'user', label: appScope === 'astrologer' ? 'A specific astrologer' : 'A specific user' },
  ];
  // Limit the options to those valid for the selected app scope.
  const audienceOptions = appScope === 'all'
    ? ALL_AUDIENCE_OPTIONS
    : ALL_AUDIENCE_OPTIONS.filter((o) => SCOPE_AUDIENCES[appScope].includes(o.value));

  return (
    <Grid container spacing={2}>
      {/* Compose */}
      <Grid item xs={12} md={7}>
        <Card sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Compose</Typography>
          <Stack spacing={2}>
            <TextField
              label="Title" fullWidth size="small" value={form.title} onChange={set('title')} inputProps={{ maxLength: 80 }}
              InputProps={{ endAdornment: <EmojiPicker onSelect={(e) => addEmoji('title', e)} /> }}
            />
            <TextField
              label="Message" fullWidth size="small" multiline minRows={3} value={form.body} onChange={set('body')} inputProps={{ maxLength: 240 }}
              InputProps={{ endAdornment: <Box sx={{ alignSelf: 'flex-start', mt: 0.5 }}><EmojiPicker onSelect={(e) => addEmoji('body', e)} /></Box> }}
            />

            <Divider />

            {/* Audience */}
            <TextField select label="Audience" fullWidth size="small" value={form.audience}
              onChange={(e) => { setForm((f) => ({ ...f, audience: e.target.value })); setTargetUser(null); }}>
              {audienceOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>

            {form.audience === 'segment' && (
              <Stack direction="row" spacing={1.5}>
                <TextField select label="Segment type" size="small" sx={{ width: 160 }} value={segKind} onChange={(e) => setSegKind(e.target.value)}>
                  <MenuItem value="topic">By topic</MenuItem>
                  <MenuItem value="activity">By activity</MenuItem>
                </TextField>
                {segKind === 'topic' ? (
                  <TextField select label="Topic" size="small" fullWidth value={segTopic} onChange={(e) => setSegTopic(e.target.value)}>
                    {TOPICS.map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                  </TextField>
                ) : (
                  <TextField select label="Filter" size="small" fullWidth value={segActivity} onChange={(e) => setSegActivity(e.target.value)}>
                    {ACTIVITY.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                  </TextField>
                )}
              </Stack>
            )}

            {form.audience === 'user' && (
              <Stack direction="row" spacing={1.5}>
                {/* Under the Astrologer-app scope the role is locked to astrologer
                    (segregation); otherwise the admin can pick user/astrologer. */}
                {appScope !== 'astrologer' && (
                  <TextField select label="Role" size="small" sx={{ width: 140 }} value={userRole} onChange={(e) => { setUserRole(e.target.value); setTargetUser(null); }}>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="astrologer">Astrologer</MenuItem>
                  </TextField>
                )}
                <Autocomplete
                  fullWidth size="small" options={userOpts} value={targetUser}
                  getOptionLabel={(o) => (o ? `${o.name || 'Unnamed'} · ${o.phone}` : '')}
                  isOptionEqualToValue={(o, v) => o._id === v._id}
                  onChange={(e, v) => setTargetUser(v)}
                  onInputChange={(e, v) => setUserQuery(v)}
                  renderInput={(params) => <TextField {...params} label={appScope === 'astrologer' ? 'Search astrologer by name / phone' : 'Search by name / phone'} />}
                />
              </Stack>
            )}

            {/* Delivery channel (admin's choice) */}
            <TextField select label="Delivery" fullWidth size="small" value={form.channel} onChange={set('channel')}
              helperText={form.channel === 'push_only' ? 'Push only — not saved to the in-app bell' : 'Saved in-app (bell) AND sent as a push'}>
              <MenuItem value="inapp_push">In-app + Push</MenuItem>
              <MenuItem value="push_only">Push only</MenuItem>
            </TextField>

            {/* Deep-link target: where tapping the notification takes the user.
                Options track the app scope so they match that app's routes. */}
            <TextField select label="On tap, open" fullWidth size="small" value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
              helperText={appScope === 'astrologer'
                ? 'Where the astrologer app opens when the push is tapped.'
                : appScope === 'user'
                ? 'Where the user app opens when the push is tapped.'
                : 'Tap destination. Under “All apps”, only cross-app-safe targets are offered.'}>
              {linkTargetsFor(appScope).map((o) => <MenuItem key={o.value || 'none'} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            {linkTarget === '__custom__' && (
              <TextField fullWidth size="small" label="Custom deep link"
                placeholder="rudraganga://wallet  or  https://rudraganga.app/offers"
                value={customLink} onChange={(e) => setCustomLink(e.target.value)} />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button variant="contained" startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />} disabled={sending} onClick={send}>
                {sending ? 'Sending…' : 'Send notification'}
              </Button>
              <Typography variant="caption" sx={{ color: b.textDim }}>
                {estimating ? 'Estimating…' : estimate != null ? `≈ ${estimate} recipient${estimate === 1 ? '' : 's'}` : ''}
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Grid>

      {/* Live preview */}
      <Grid item xs={12} md={5}>
        <Card sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Preview</Typography>
          <Box sx={{ p: 1.75, borderRadius: 3, bgcolor: alpha(b.surface2, 0.6), border: `1px solid ${b.border}` }}>
            <Stack direction="row" spacing={1.25}>
              <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: b.RED.main, fontSize: 16 }}>र</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{form.title || 'Notification title'}</Typography>
                <Typography variant="caption" sx={{ color: b.textDim, display: 'block', whiteSpace: 'pre-wrap' }}>
                  {form.body || 'Your message text appears here.'}
                </Typography>
                <Typography variant="caption" sx={{ color: b.textFaint, display: 'block', mt: 0.75 }}>Rudraganga · now</Typography>
              </Box>
            </Stack>
          </Box>
          <Typography variant="caption" sx={{ color: b.textFaint, mt: 1.5, display: 'block' }}>
            This is how it appears on the device.
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
}

// ──────────────────────────────────────────────────────── Templates ──

function TemplatesTab({ b }) {
  const [templates, setTemplates] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await NotificationsAPI.listTemplates();
      setTemplates(data.data.templates); setMeta(data.data.meta);
    } catch { toast.error('Failed to load templates'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (t) => {
    try {
      await NotificationsAPI.updateTemplate(t.event, { enabled: !t.enabled });
      setTemplates((ts) => ts.map((x) => (x.event === t.event ? { ...x, enabled: !x.enabled } : x)));
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <>
      <Stack spacing={1.5}>
        {templates.map((t) => {
          const m = meta[t.event] || {};
          return (
            <Card key={t.event} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: alpha(b.RED.main, 0.12), color: b.RED.main }}>🔔</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.label || t.event}</Typography>
                    <Chip size="small" label={t.enabled ? 'On' : 'Off'} sx={{ height: 20, fontSize: 10, bgcolor: alpha(t.enabled ? '#22c55e' : b.textFaint, 0.16), color: t.enabled ? '#22c55e' : b.textFaint }} />
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }} noWrap>{t.title}</Typography>
                  <Typography variant="caption" sx={{ color: b.textDim, display: 'block' }} noWrap>{t.body}</Typography>
                </Box>
                <FormControlLabel control={<Switch checked={t.enabled} onChange={() => toggle(t)} />} label="" sx={{ m: 0 }} />
                <Button size="small" variant="outlined" onClick={() => setEdit(t)}>Edit</Button>
              </Stack>
            </Card>
          );
        })}
      </Stack>
      <TemplateEditDialog template={edit} meta={meta} onClose={() => setEdit(null)} onSaved={load} b={b} />
    </>
  );
}

function TemplateEditDialog({ template, meta, onClose, onSaved, b }) {
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (template) setForm({ title: template.title || '', body: template.body || '' });
  }, [template]);
  if (!template) return null;
  const m = meta[template.event] || {};

  const save = async () => {
    setSaving(true);
    try { await NotificationsAPI.updateTemplate(template.event, form); toast.success('Template saved'); onSaved(); onClose(); }
    catch (e) { toast.error(e.response?.data?.message || 'Save failed'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!template} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{m.label || template.event}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {!!(m.vars || []).length && (
            <Box>
              <Typography variant="caption" sx={{ color: b.textDim }}>Available variables (tap to copy):</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {m.vars.map((v) => (
                  <Chip key={v} size="small" label={`{{${v}}}`} onClick={() => { navigator.clipboard?.writeText(`{{${v}}}`); toast.success('Copied'); }}
                    sx={{ cursor: 'pointer', fontFamily: 'monospace', bgcolor: alpha(b.RED.main, 0.1), color: b.RED.main }} />
                ))}
              </Stack>
            </Box>
          )}
          <TextField
            label="Title" fullWidth size="small" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            InputProps={{ endAdornment: <EmojiPicker onSelect={(emo) => setForm((f) => ({ ...f, title: (f.title || '') + emo }))} /> }}
          />
          <TextField
            label="Message" fullWidth size="small" multiline minRows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            InputProps={{ endAdornment: <Box sx={{ alignSelf: 'flex-start', mt: 0.5 }}><EmojiPicker onSelect={(emo) => setForm((f) => ({ ...f, body: (f.body || '') + emo }))} /></Box> }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
