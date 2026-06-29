import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Tabs, Tab, Stack, Avatar, Chip, Grid, Button, Divider } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import { DataGrid } from '@mui/x-data-grid';
import EmptyState from '../components/EmptyState';

const dt = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
// Relative "last seen" — e.g. "3m ago", "2h ago", "yesterday".
const ago = (v) => {
  if (!v) return 'never';
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'yesterday';
  return `${Math.floor(s / 86400)}d ago`;
};
const cap = (s) => (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [d, setD] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => { AdminAPI.userDetail(id).then((r) => setD(r.data.data)).catch(() => toast.error('Failed to load')); }, [id]);

  if (!d) return <PageHeader title="User" subtitle="Loading…" />;
  const u = d.user;

  const stat = (label, value) => (
    <Grid item xs={6} md={3}>
      <Box sx={{ p: 1.5, borderRadius: 1.5, background: alpha(b.surface2, 0.6), border: `1px solid ${b.borderSoft}` }}>
        <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
        <Typography variant="h6">{value}</Typography>
      </Box>
    </Grid>
  );

  const grid = (rows, cols, h = 420, empty = 'Nothing here') => (
    <Box sx={{ height: h }}>
      <DataGrid rows={rows.map((r, i) => ({ id: r._id || i, ...r }))} columns={cols} disableRowSelectionOnClick
        rowHeight={52} pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: () => <EmptyState title={empty} /> }} sx={{ border: 'none' }} />
    </Box>
  );

  const txnCols = [
    { field: 'createdAt', headerName: 'When', width: 150, valueFormatter: dt },
    { field: 'type', headerName: 'Type', width: 90, renderCell: (p) => <StatusChip status={p.value === 'credit' ? 'completed' : 'failed'} /> },
    { field: 'source', headerName: 'Source', width: 120, valueFormatter: (v) => String(v).replace(/_/g, ' ') },
    { field: 'amount', headerName: 'Amount', width: 120, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <span style={{ color: p.row.type === 'credit' ? b.green : b.red, fontWeight: 700 }}>{p.row.type === 'credit' ? '+' : '−'}{rupees(p.value)}</span> },
    { field: 'balanceAfter', headerName: 'Balance', width: 110, type: 'number', align: 'right', headerAlign: 'right', valueFormatter: (v) => v == null ? '—' : rupees(v) },
    { field: 'description', headerName: 'Note', flex: 1, minWidth: 160, valueGetter: (v) => v || '—' },
  ];
  const sessionCols = [
    { field: 'type', headerName: 'Service', width: 90, renderCell: (p) => <Chip size="small" label={p.value} sx={{ textTransform: 'capitalize' }} /> },
    { field: 'astrologer', headerName: 'Astrologer', width: 150, valueGetter: (v) => v?.name || '—' },
    { field: 'startedAt', headerName: 'Started', width: 150, valueFormatter: dt },
    { field: 'durationSec', headerName: 'Duration', width: 100, valueFormatter: (v) => v ? `${Math.floor(v / 60)}m ${v % 60}s` : '—' },
    { field: 'billedMinutes', headerName: 'Billed', width: 80, valueFormatter: (v) => `${v || 0}m` },
    { field: 'totalAmount', headerName: 'Charged', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: b.red }}>{rupees(p.value)}</strong> },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  ];
  const orderCols = [
    { field: 'createdAt', headerName: 'When', width: 150, valueFormatter: dt },
    { field: 'items', headerName: 'Items', width: 80, valueGetter: (v) => (v || []).reduce((s, i) => s + i.qty, 0) },
    { field: 'total', headerName: 'Total', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: b.red }}>{rupees(p.value)}</strong> },
    { field: 'paymentStatus', headerName: 'Payment', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ color: b.textDim, mb: 1 }}>Back to users</Button>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={u.avatar} sx={{ width: 64, height: 64, fontSize: 26, background: b.surface2 }}>{(u.name || 'U')[0]}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5">{u.name || `+${u.phone}`}</Typography>
                <Chip size="small" label={d.online ? 'Online now' : 'Offline'} sx={{ background: alpha(d.online ? b.green : b.textFaint, 0.16), color: d.online ? b.green : b.textFaint, fontWeight: 700 }} />
                {u.isBlocked && <Chip size="small" label="Blocked" sx={{ background: alpha(b.red, 0.16), color: b.red, fontWeight: 700 }} />}
              </Stack>
              <Typography variant="body2" sx={{ color: b.textDim }}>+{u.phone} {u.email ? `· ${u.email}` : ''}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: b.textDim }}>Wallet balance</Typography>
              <Typography variant="h5" sx={{ color: b.red, fontWeight: 800 }}>{rupees(d.wallet.balance)}</Typography>
            </Box>
          </Stack>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {stat('Consultations', d.stats.completedSessions)}
            {stat('Total spent', rupees(d.stats.totalSpent))}
            {stat('Recharged', rupees(d.stats.totalRecharged))}
            {stat('Orders', d.stats.orders)}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, borderBottom: `1px solid ${b.border}` }}>
          <Tab label="Activity & Profile" />
          <Tab label={`Transactions (${d.transactions.length})`} />
          <Tab label={`Sessions (${d.sessions.length})`} />
          <Tab label={`Orders (${d.orders.length})`} />
          <Tab label={`Addresses (${d.addresses.length})`} />
          <Tab label={`Gifts (${d.giftsSent.length + d.giftsReceived.length})`} />
        </Tabs>
        <CardContent>
          {tab === 0 && <ActivityProfile d={d} b={b} />}
          {tab === 1 && grid(d.transactions, txnCols, 460, 'No transactions')}
          {tab === 2 && grid(d.sessions, sessionCols, 460, 'No sessions')}
          {tab === 3 && grid(d.orders, orderCols, 420, 'No orders')}
          {tab === 4 && (
            d.addresses.length === 0 ? <EmptyState title="No saved addresses" /> : (
              <Grid container spacing={2}>
                {d.addresses.map((a, i) => (
                  <Grid item xs={12} md={6} key={i}>
                    <Box sx={{ p: 2, borderRadius: 1.5, border: `1px solid ${b.borderSoft}` }}>
                      <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{a.label}</Typography>{a.isDefault && <Chip size="small" label="Default" sx={{ background: alpha(b.red, 0.14), color: b.red }} />}</Stack>
                      <Typography variant="body2" sx={{ color: b.textDim, mt: 0.5 }}>{[a.name, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</Typography>
                      {a.phone && <Typography variant="caption" sx={{ color: b.textFaint }}>{a.phone}</Typography>}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )
          )}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="overline" sx={{ color: b.textDim }}>Gifts sent</Typography>
                <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />} sx={{ mt: 1 }}>
                  {d.giftsSent.length === 0 ? <Typography variant="body2" sx={{ color: b.textFaint, py: 2 }}>None</Typography> :
                    d.giftsSent.map((g, i) => <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}><Typography variant="body2">{g.gift?.name || 'Gift'}</Typography><Typography variant="body2" sx={{ color: b.red }}>{rupees(g.amountRupees)}</Typography></Stack>)}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="overline" sx={{ color: b.textDim }}>Gifts received</Typography>
                <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />} sx={{ mt: 1 }}>
                  {d.giftsReceived.length === 0 ? <Typography variant="body2" sx={{ color: b.textFaint, py: 2 }}>None</Typography> :
                    d.giftsReceived.map((g, i) => <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}><Typography variant="body2">{g.gift?.name || 'Gift'}</Typography><Typography variant="body2" sx={{ color: b.green }}>{rupees(g.amountRupees)}</Typography></Stack>)}
                </Stack>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

/* ── Activity tracking + profile metadata + settings ── */
function ActivityProfile({ d, b }) {
  const u = d.user || {};
  const p = d.presence;
  const act = p?.activity || {};
  const prefs = u.preferences || {};
  const notif = u.notificationSettings || {};
  const perms = u.permissions || {};
  const loc = u.location || {};
  const meta = d.meta || {};
  const devices = d.devices || [];

  const Section = ({ title, children }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ color: b.textDim }}>{title}</Typography>
      <Box sx={{ mt: 0.75, p: 2, borderRadius: 1.5, border: `1px solid ${b.borderSoft}`, background: alpha(b.surface2, 0.4) }}>{children}</Box>
    </Box>
  );
  const Row = ({ k, v, accent }) => (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
      <Typography variant="body2" sx={{ color: b.textDim }}>{k}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: accent || b.text, textAlign: 'right' }}>{v}</Typography>
    </Stack>
  );
  const kpi = (label, value, color) => (
    <Grid item xs={6} sm={3}>
      <Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${b.borderSoft}`, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: color || b.text, fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
      </Box>
    </Grid>
  );

  return (
    <Grid container spacing={3}>
      {/* Left: activity tracking */}
      <Grid item xs={12} md={6}>
        <Section title="App activity (live tracking)">
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {kpi('Sessions/visits', act.visits || 0, b.blue)}
            {kpi('Screens opened', act.pageViews || 0)}
            {kpi('Searches', act.searches || 0)}
            {kpi('Status', d.online ? 'Online' : 'Offline', d.online ? b.green : b.textFaint)}
          </Grid>
          <Divider sx={{ borderColor: b.borderSoft, my: 1 }} />
          <Row k="In app right now" v={d.online ? `Yes · ${p?.socketCount || 0} device(s)` : 'No'} accent={d.online ? b.green : b.textFaint} />
          <Row k="Last seen" v={p ? `${ago(p.lastSeen)} (${dt(p.lastSeen)})` : 'never'} />
          <Row k="Last screen" v={cap(act.lastPage) || '—'} />
          <Row k="Last search" v={act.lastSearch || '—'} />
          <Row k="Last activity" v={act.lastActivityAt ? ago(act.lastActivityAt) : '—'} />
          {!p && <Typography variant="caption" sx={{ color: b.textFaint }}>No activity tracked yet (user hasn't connected since tracking was enabled).</Typography>}
        </Section>

        <Section title={`Logged-in devices (${devices.length})`}>
          {devices.length ? (
            <Stack spacing={1}>
              {devices.map((dev, i) => {
                const platLabel = dev.platform === 'ios' ? 'iOS' : dev.platform === 'web' ? 'Web' : 'Android';
                const platColor = dev.platform === 'ios' ? b.blue : dev.platform === 'web' ? b.amber : b.green;
                return (
                  <Box key={dev.deviceId || dev.tokenTail || i}
                    sx={{ p: 1.25, borderRadius: 1.5, border: `1px solid ${b.borderSoft}`, background: alpha(b.surface2, 0.6) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: b.text }}>
                          {dev.deviceName || dev.deviceModel || 'Unknown device'}
                        </Typography>
                        <Chip size="small" label={platLabel}
                          sx={{ height: 18, fontSize: 10, fontWeight: 700, background: alpha(platColor, 0.16), color: platColor }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: b.textDim }}>{ago(dev.lastUsedAt)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                      {dev.deviceModel && <Typography variant="caption" sx={{ color: b.textDim }}>Model: {dev.deviceModel}</Typography>}
                      {dev.osVersion && <Typography variant="caption" sx={{ color: b.textDim }}>OS: {dev.osVersion}</Typography>}
                      {dev.appVersion && <Typography variant="caption" sx={{ color: b.textDim }}>App: {dev.appVersion}</Typography>}
                    </Stack>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                      {dev.deviceId && <Typography variant="caption" sx={{ color: b.textFaint, fontFamily: 'monospace' }}>ID: {dev.deviceId}</Typography>}
                      {dev.tokenTail && <Typography variant="caption" sx={{ color: b.textFaint, fontFamily: 'monospace' }}>Token: {dev.tokenTail}</Typography>}
                      <Typography variant="caption" sx={{ color: b.textFaint }}>Added: {dt(dev.addedAt)}</Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="caption" sx={{ color: b.textFaint }}>No devices registered (no push token captured yet).</Typography>
          )}
        </Section>

        <Section title="Account">
          <Row k="Joined" v={dt(meta.joinedAt || u.createdAt)} />
          <Row k="Phone verified" v={u.isPhoneVerified ? 'Yes' : 'No'} />
          <Row k="Profile completed" v={u.profileCompleted ? 'Yes' : 'No'} />
          <Row k="Following astrologers" v={meta.followingCount ?? 0} />
          <Row k="Unread notifications" v={meta.unreadNotifs ?? 0} accent={meta.unreadNotifs ? b.amber : b.text} />
          <Row k="Push tokens (devices)" v={meta.fcmTokens ?? 0} />
          <Row k="Free chat minutes" v={u.freeChatMinutes || 0} />
        </Section>
      </Grid>

      {/* Right: profile metadata + settings */}
      <Grid item xs={12} md={6}>
        <Section title="Profile metadata">
          <Row k="Gender" v={cap(u.gender)} />
          <Row k="Language" v={cap(u.language)} />
          <Row k="Date of birth" v={u.birthDetails?.dob ? new Date(u.birthDetails.dob).toLocaleDateString('en-IN') : '—'} />
          <Row k="Time of birth" v={u.birthDetails?.timeKnown === false ? 'Unknown' : (u.birthDetails?.time || '—')} />
          <Row k="Place of birth" v={u.birthDetails?.place || '—'} />
        </Section>

        <Section title="Location">
          <Row k="City" v={loc.city || '—'} />
          <Row k="Coordinates" v={loc.lat != null ? `${loc.lat.toFixed(3)}, ${loc.lng?.toFixed(3)}` : '—'} />
          <Row k="Updated" v={loc.updatedAt ? ago(loc.updatedAt) : '—'} />
        </Section>

        <Section title="Astrology preferences">
          <Row k="Chart style" v={cap(prefs.chartStyle)} />
          <Row k="Month system" v={cap(prefs.monthSystem)} />
          <Row k="Ayanamsa" v={cap(prefs.ayanamsa)} />
          <Row k="Theme mode" v={cap(prefs.themeMode)} />
        </Section>

        <Section title="Notification settings">
          <Row k="Frequency" v={cap(notif.frequency)} />
          <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
            <Typography variant="body2" sx={{ color: b.textDim }}>Topics</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end" useFlexGap sx={{ maxWidth: '70%' }}>
              {(notif.topics || []).length ? notif.topics.map((t) => <Chip key={t} size="small" label={cap(t)} sx={{ height: 20, fontSize: 10 }} />) : <Typography variant="body2" sx={{ color: b.textFaint }}>None</Typography>}
            </Stack>
          </Stack>
        </Section>

        <Section title="Device permissions">
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {['notifications', 'microphone', 'camera', 'photos', 'location'].map((k) => (
              <Chip key={k} size="small" label={cap(k)}
                sx={{ height: 24, background: alpha(perms[k] ? b.green : b.textFaint, 0.16), color: perms[k] ? b.green : b.textFaint, fontWeight: 600 }} />
            ))}
          </Stack>
        </Section>
      </Grid>
    </Grid>
  );
}
