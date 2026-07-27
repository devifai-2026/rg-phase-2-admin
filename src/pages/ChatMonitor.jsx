import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, List, ListItemButton, Stack, Avatar, Chip, Divider,
  TextField, Autocomplete, Button, Tooltip, keyframes, Tabs, Tab, Pagination,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import CircleIcon from '@mui/icons-material/Circle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

// A soft pulse for the "live" heartbeat dot.
const beat = keyframes`
  0%   { transform: scale(0.85); opacity: 0.6; }
  50%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.6; }
`;

const C_ADMIN = '#4B8FE0';
const C_ASTRO = '#3CCB7F';
const C_AVG = '#E0A93B';

/** Whole-rupee formatter with thousands separators. */
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Shared column template for the Chat History header + rows (kept in one place so
// they never drift): User · Astrologer · Status · Duration · Start · End · Admin ₹ · Astro ₹ · When.
const GRID_COLS = '1.4fr 1.2fr 0.8fr 0.8fr 0.7fr 0.7fr 0.8fr 0.8fr 0.7fr';

/** Seconds → "Xm Ys" / "Ys" (chat duration). */
function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

/** Date → compact "HH:MM" local time (start/end columns). '—' when missing. */
function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL = {
  completed: ['Completed', '#3CCB7F'],
  missed: ['Missed', '#E0A93B'],
  rejected: ['Rejected', '#ef4444'],
  cancelled: ['Cancelled', '#9A9DA8'],
  failed: ['Failed', '#ef4444'],
  accepted: ['Live', '#3CCB7F'],
  ongoing: ['Live', '#3CCB7F'],
};

const EMPTY_FILTERS = { user: null, astrologer: null, from: '', to: '' };

export default function ChatMonitor() {
  const { palette } = useTheme();
  const C = palette.brand;

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [live, setLive] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(null); // a session whose transcript is open
  const [messages, setMessages] = useState([]);
  const [showRecap, setShowRecap] = useState(false);
  const [recap, setRecap] = useState(undefined); // undefined = not loaded, null = none
  // 'human' = consultations with a real astrologer, 'ai' = AI astrologer chats.
  // Two different collections, so they are two panels rather than one filtered list.
  const [tab, setTab] = useState('human');

  // Build query params from the active filters (user/astrologer ids + dates).
  const queryParams = useMemo(() => {
    const p = {};
    if (filters.user?._id) p.user = filters.user._id;
    if (filters.astrologer?._id) p.astrologer = filters.astrologer._id;
    if (filters.from) p.from = filters.from;
    if (filters.to) p.to = `${filters.to}T23:59:59.999`;
    return p;
  }, [filters]);

  // Live chats poll every 8s (independent of filters — operators want them all),
  // but still respect a user/astrologer filter if set.
  const loadLive = useCallback(async () => {
    try {
      const { data } = await AdminAPI.liveChats();
      let items = data.data || [];
      if (filters.user?._id) items = items.filter((s) => String(s.user?._id) === String(filters.user._id));
      if (filters.astrologer?._id) items = items.filter((s) => String(s.astrologer?._id) === String(filters.astrologer._id));
      setLive(items);
    } catch { /* keep last */ }
  }, [filters.user, filters.astrologer]);
  useEffect(() => { loadLive(); const t = setInterval(loadLive, 8000); return () => clearInterval(t); }, [loadLive]);

  // History + analytics refetch whenever the filters change.
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await AdminAPI.chatLogs({ ...queryParams, page, limit: 12 });
      setHistory({ items: data.data.items || [], total: data.data.total || 0, page: data.data.page || 1 });
    } catch { toast.error('Failed to load chat history'); }
  }, [queryParams, page]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    AdminAPI.chatAnalytics(queryParams)
      .then(({ data }) => setStats(data.data))
      .catch(() => setStats(null));
  }, [queryParams]);

  const openSession = async (s) => {
    setActive(s);
    setShowRecap(false); // collapse any recap from the previously opened chat
    setRecap(undefined);
    try { const { data } = await AdminAPI.sessionMessages(s.sessionId); setMessages(data.data || []); }
    catch { setMessages([]); }
  };

  // Recap is fetched lazily on first open and then cached for this session.
  // `undefined` = loading, `null` = none exists (chat may still be running).
  const toggleRecap = async () => {
    const next = !showRecap;
    setShowRecap(next);
    if (!next || recap !== undefined || !active) return;
    try {
      const { data } = await AdminAPI.listRecaps({ sessionId: active.sessionId, limit: 1 });
      setRecap((data.data?.items || [])[0] || null);
    } catch {
      setRecap(null);
    }
  };

  const setF = (k) => (v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const anyFilter = filters.user || filters.astrologer || filters.from || filters.to;

  return (
    <Box>
      <PageHeader title="Live Chat Monitor" subtitle="Read-only quality & compliance oversight — live sessions, history & earnings" />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${C.border}`, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}
      >
        <Tab value="human" label="Consultations" />
        <Tab value="ai" label="AI Consultations" icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>

      {tab === 'ai' ? <AiConsultations C={C} /> : <>

      <ChatFilters C={C} filters={filters} setF={setF} onClear={() => { setFilters(EMPTY_FILTERS); setPage(1); }} anyFilter={anyFilter} />

      {stats && <ChatStats C={C} stats={stats} />}

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        {/* Active (live) chats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 560 }}>
            <CardContent sx={{ height: '100%', overflowY: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6">Active</Typography>
                <Chip size="small" label={live.length} sx={{ background: alpha(C.green, 0.2), color: C.green, fontWeight: 700 }} />
                {live.length > 0 && <Heartbeat C={C} />}
              </Stack>
              {live.length === 0 && <Typography sx={{ color: C.textDim, py: 3, textAlign: 'center' }}>No active chats</Typography>}
              <List dense>
                {live.map((s) => (
                  <ListItemButton key={s._id} selected={active?._id === s._id} onClick={() => openSession(s)}
                    sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { background: alpha(C.gold, 0.12) } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar sx={{ width: 36, height: 36 }}>{(s.user?.name || 'U')[0]}</Avatar>
                        <Box sx={{ position: 'absolute', right: -2, bottom: -2 }}><Heartbeat C={C} size={10} /></Box>
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap variant="body2" fontWeight={700}>{s.user?.name || s.user?.phone || 'User'}</Typography>
                        <Typography noWrap variant="caption" sx={{ color: C.textDim }}>with {s.astrologer?.name || 'Astrologer'}</Typography>
                      </Box>
                      <Chip size="small" label={s.status === 'ongoing' ? 'Live' : 'Connecting'} sx={{ height: 20, fontSize: 10, background: alpha(C.green, 0.16), color: C.green }} />
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Transcript viewer */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 560 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {!active ? (
                <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', color: C.textDim }}>Select a chat to view the conversation</Box>
              ) : (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">{active.user?.name || active.user?.phone || 'User'} ↔ {active.astrologer?.name || 'Astrologer'}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small" variant={showRecap ? 'contained' : 'outlined'}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
                        onClick={toggleRecap}
                      >
                        AI recap
                      </Button>
                      {isLive(active)
                        ? <Chip size="small" icon={<CircleIcon sx={{ fontSize: 10 }} />} label="Live" sx={{ background: alpha(C.green, 0.16), color: C.green, fontWeight: 700 }} />
                        : <Chip size="small" label={fmtDuration(active.durationSec)} sx={{ background: alpha(C.textFaint, 0.16), color: C.textDim, fontWeight: 700 }} />}
                    </Stack>
                  </Stack>
                  <Typography variant="caption" sx={{ color: C.textDim }}>
                    Read-only · session {String(active.sessionId).slice(0, 8)}
                    {!isLive(active) && active.totalAmount ? ` · ${inr(active.totalAmount)} · admin ${inr(active.adminEarning)} · astrologer ${inr(active.astrologerEarning)}` : ''}
                  </Typography>
                  <Divider sx={{ my: 1.5, borderColor: C.border }} />
                  {showRecap && (
                    <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${C.border}`, background: alpha(C.gold, 0.06), maxHeight: 200, overflowY: 'auto' }}>
                      {recap === undefined && <Typography variant="body2" sx={{ color: C.textDim }}>Loading recap…</Typography>}
                      {recap === null && (
                        <Typography variant="body2" sx={{ color: C.textDim }}>
                          No AI recap for this chat. Recaps are generated after a chat session ends.
                        </Typography>
                      )}
                      {recap && (
                        <Stack spacing={0.75}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: 0.4 }}>AI recap</Typography>
                            {recap.status && <Chip size="small" label={recap.status} sx={{ height: 18, fontSize: 10, background: alpha(C.textFaint, 0.16), color: C.textDim }} />}
                          </Stack>
                          {recap.summary && <Typography variant="body2">{recap.summary}</Typography>}
                          {Array.isArray(recap.keyTopics) && recap.keyTopics.length > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {recap.keyTopics.map((k, i) => (
                                <Chip key={i} size="small" label={k} sx={{ height: 18, fontSize: 10.5, background: alpha(C.textFaint, 0.14), color: C.textDim }} />
                              ))}
                            </Stack>
                          )}
                          {recap.sentiment && (
                            <Typography variant="caption" sx={{ color: C.textDim }}>Sentiment: {recap.sentiment}</Typography>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                    {messages.map((m) => {
                      const fromUser = String(m.sender?._id || m.sender) === String(active.user?._id);
                      return (
                        <Stack key={m._id} alignItems={fromUser ? 'flex-start' : 'flex-end'} sx={{ mb: 1 }}>
                          <Box sx={{ maxWidth: '70%', px: 1.5, py: 1, borderRadius: 2, background: fromUser ? alpha(C.surface2, 0.8) : alpha(C.gold, 0.15), border: `1px solid ${C.border}` }}>
                            {m.message && <Typography variant="body2">{m.message}</Typography>}
                            {m.mediaUrl && <img src={m.mediaUrl} alt="" style={{ maxWidth: 160, borderRadius: 8, marginTop: 4 }} />}
                            {/* A shared product carries no message text and no
                                mediaUrl, so without this it rendered as an empty
                                bubble — the transcript looked like it had a gap. */}
                            {m.product?.productId && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: m.message ? 0.75 : 0 }}>
                                {m.product.image && (
                                  <img src={m.product.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                )}
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" sx={{ color: C.gold, fontWeight: 700, display: 'block' }}>Shared product</Typography>
                                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{m.product.name || 'Product'}</Typography>
                                  {m.product.price != null && (
                                    <Typography variant="caption" sx={{ color: C.textDim }}>₹{m.product.price}</Typography>
                                  )}
                                </Box>
                              </Stack>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: C.textDim, mt: 0.3 }}>{new Date(m.timestamp).toLocaleTimeString()}</Typography>
                        </Stack>
                      );
                    })}
                    {messages.length === 0 && <Typography sx={{ color: C.textDim, textAlign: 'center', py: 4 }}>No messages</Typography>}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chat history */}
      <ChatHistory C={C} history={history} page={page} setPage={setPage} onOpen={openSession} />
      </>}
    </Box>
  );
}

function isLive(s) {
  return s.status === 'accepted' || s.status === 'ongoing';
}

/** The pulsing green "live" dot. */
function Heartbeat({ C, size = 12 }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: C.green, animation: `${beat} 1.4s ease-in-out infinite` }} />
    </Box>
  );
}

/** Filters: user (search), astrologer (search), date range. */
function ChatFilters({ C, filters, setF, onClear, anyFilter }) {
  return (
    <Card sx={{ p: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignItems="center">
        <UserSearch C={C} role="user" label="User" value={filters.user} onChange={setF('user')} />
        <UserSearch C={C} role="astrologer" label="Astrologer" value={filters.astrologer} onChange={setF('astrologer')} />
        <TextField size="small" type="date" label="From" value={filters.from} onChange={(e) => setF('from')(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
        <TextField size="small" type="date" label="To" value={filters.to} onChange={(e) => setF('to')(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: filters.from || undefined }} sx={{ minWidth: 150 }} />
        {anyFilter && <Button size="small" onClick={onClear}>Clear</Button>}
      </Stack>
    </Card>
  );
}

/** Debounced name/phone search → resolves to a User doc (carries _id). */
function UserSearch({ C, role, label, value, onChange }) {
  const [opts, setOpts] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = setTimeout(async () => {
      try { const { data } = await AdminAPI.searchUsers(q, role); setOpts(data.data.items || []); }
      catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(h);
  }, [q, role]);
  return (
    <Autocomplete
      size="small" options={opts} value={value}
      getOptionLabel={(o) => (o ? `${o.name || 'Unnamed'} · ${o.phone || ''}` : '')}
      isOptionEqualToValue={(o, v) => o._id === v._id}
      onChange={(e, v) => onChange(v)}
      onInputChange={(e, v) => setQ(v)}
      sx={{ minWidth: 220 }}
      renderInput={(params) => <TextField {...params} label={label} placeholder="name / phone" />}
    />
  );
}

/** Stat cards + the three analytics graphs. */
function ChatStats({ C, stats }) {
  const t = stats.totals || {};
  const daily = stats.daily || [];
  const days = daily.map((d) => d.day.slice(5)); // MM-DD
  const CHART_H = 220;

  const stat = (label, value, color, hint) => (
    <Grid item xs={6} md={2.4}>
      <Card sx={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: color }} />
        <Box sx={{ px: 1.75, py: 1.4 }}>
          <Tooltip title={hint || ''} arrow disableHoverListener={!hint}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: C.textDim, display: 'inline-block', cursor: hint ? 'help' : 'default' }}>{label}</Typography>
          </Tooltip>
          <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.15, color }}>{value}</Typography>
        </Box>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ mb: 1 }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stat('Chats', t.chats || 0, C.RED.main, 'All chat sessions in range')}
        {stat('Admin earned', inr(t.adminEarned), C_ADMIN, "Platform's cut from completed chats")}
        {stat('Astrologers earned', inr(t.astrologerEarned), C_ASTRO, 'Astrologer payout from completed chats')}
        {stat('Avg duration', fmtDuration(t.avgDurationSec), C_AVG, 'Average completed-chat length')}
        {stat('Total minutes', (t.totalMinutes || 0).toLocaleString('en-IN'), C.violet, 'Billed minutes across completed chats')}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        {/* Earnings per day — admin vs astrologer (stacked bars) */}
        <Grid item xs={12} md={6}>
          <Panel C={C} title="Earnings by day" accent={C_ADMIN}>
            {daily.length ? (
              <BarChart
                height={CHART_H}
                xAxis={[{ scaleType: 'band', data: days }]}
                series={[
                  { data: daily.map((d) => d.adminEarned || 0), label: 'Admin', color: C_ADMIN, stack: 'e' },
                  { data: daily.map((d) => d.astrologerEarned || 0), label: 'Astrologers', color: C_ASTRO, stack: 'e' },
                ]}
                margin={{ left: 52, right: 16, top: 16, bottom: 28 }}
                slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' }, labelStyle: { fontSize: 11 } } }}
              />
            ) : <Empty C={C} h={CHART_H} />}
          </Panel>
        </Grid>

        {/* Chats per day (user chat volume) + avg duration line */}
        <Grid item xs={12} md={6}>
          <Panel C={C} title="Chats & avg duration by day" accent={C_AVG}>
            {daily.length ? (
              <LineChart
                height={CHART_H}
                xAxis={[{ scaleType: 'point', data: days }]}
                yAxis={[{ id: 'count' }, { id: 'dur' }]}
                series={[
                  // showMark must be ON with only one or two days of data: a line
                  // between fewer than 2 points draws NOTHING, so the panel looked
                  // empty and the value only appeared on hover. Marks are hidden
                  // again once there is enough history for the line to read
                  // cleanly.
                  { yAxisId: 'count', data: daily.map((d) => d.chats || 0), label: 'Chats', color: C.RED.main, curve: 'monotoneX', showMark: daily.length <= 2 },
                  { yAxisId: 'dur', data: daily.map((d) => Math.round((d.avgDurationSec || 0) / 60)), label: 'Avg min', color: C_AVG, curve: 'monotoneX', showMark: daily.length <= 2 },
                ]}
                margin={{ left: 40, right: 40, top: 16, bottom: 28 }}
                slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' }, labelStyle: { fontSize: 11 } } }}
              />
            ) : <Empty C={C} h={CHART_H} />}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

function Panel({ C, title, accent, children }) {
  return (
    <Card sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
      {accent && <Box sx={{ height: 3, background: `linear-gradient(90deg, ${accent} 0%, ${alpha(accent, 0.25)} 100%)` }} />}
      <Box sx={{ px: 1.75, pt: 1.25, pb: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: C.textDim, mb: 1 }}>{title}</Typography>
        {children}
      </Box>
    </Card>
  );
}

function Empty({ C, h }) {
  return <Box sx={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" sx={{ color: C.textFaint }}>No data in range</Typography></Box>;
}

/** Paginated chat history table. Each ended chat shows its duration + money. */
function ChatHistory({ C, history, page, setPage, onOpen }) {
  const totalPages = Math.max(1, Math.ceil((history.total || 0) / 12));
  return (
    <Card sx={{ mt: 2.5 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Chat History <Chip size="small" label={history.total} sx={{ ml: 1, background: alpha(C.textFaint, 0.18), color: C.textDim }} /></Typography>
        </Stack>

        {/* Header row — compact, now with Start + End time columns. */}
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID_COLS, gap: 1, px: 1, py: 0.4, color: C.textFaint, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          <Box>User</Box><Box>Astrologer</Box><Box>Status</Box><Box>Duration</Box><Box>Start</Box><Box>End</Box><Box>Admin ₹</Box><Box>Astro ₹</Box><Box>When</Box>
        </Box>
        <Divider sx={{ borderColor: C.border, mb: 0.25 }} />

        {history.items.length === 0 && <Typography sx={{ color: C.textDim, py: 4, textAlign: 'center' }}>No chats match these filters</Typography>}

        {history.items.map((s) => {
          const [label, color] = STATUS_LABEL[s.status] || [s.status, C.textDim];
          const done = s.status === 'completed';
          return (
            <Box key={s._id} onClick={() => onOpen(s)}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: GRID_COLS }, gap: 1, alignItems: 'center', px: 1, py: 0.55, borderRadius: 1.5, cursor: 'pointer', '&:hover': { background: alpha(C.surface2, 0.6) } }}>
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>{(s.user?.name || 'U')[0]}</Avatar>
                <Typography noWrap variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>{s.user?.name || s.user?.phone || 'User'}</Typography>
              </Stack>
              <Typography noWrap variant="body2" sx={{ fontSize: 13, color: C.textDim, display: { xs: 'none', md: 'block' } }}>{s.astrologer?.name || '—'}</Typography>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Chip size="small" label={label} sx={{ height: 19, fontSize: 10.5, fontWeight: 600, background: alpha(color, 0.16), color }} />
              </Box>
              <Typography variant="body2" sx={{ fontSize: 12.5, color: C.text, display: { xs: 'none', md: 'block' } }}>{done ? fmtDuration(s.durationSec) : '—'}</Typography>
              <Typography variant="caption" sx={{ fontSize: 12, color: C.textDim, display: { xs: 'none', md: 'block' } }}>{fmtTime(s.startedAt)}</Typography>
              <Typography variant="caption" sx={{ fontSize: 12, color: C.textDim, display: { xs: 'none', md: 'block' } }}>{fmtTime(s.endedAt)}</Typography>
              <Typography variant="body2" sx={{ fontSize: 12.5, color: C_ADMIN, display: { xs: 'none', md: 'block' } }}>{done ? inr(s.adminEarning) : '—'}</Typography>
              <Typography variant="body2" sx={{ fontSize: 12.5, color: C_ASTRO, display: { xs: 'none', md: 'block' } }}>{done ? inr(s.astrologerEarning) : '—'}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                <Typography noWrap variant="caption" sx={{ fontSize: 11.5, color: C.textDim, display: { xs: 'none', md: 'block' } }}>{new Date(s.createdAt).toLocaleDateString()}</Typography>
                <VisibilityOutlinedIcon sx={{ fontSize: 15, color: C.textFaint }} />
              </Stack>
            </Box>
          );
        })}

        {history.total > 12 && (
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 1.5 }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Typography variant="caption" sx={{ color: C.textDim }}>Page {page} / {totalPages}</Typography>
            <Button size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// ── AI consultations ────────────────────────────────────────────────────────
// AI chats live in their own collection (AiChatSession) with no astrologer and
// no earnings split — 100% of the fee is platform revenue. That is why this is a
// separate panel rather than a filter on the human chat list: almost none of the
// columns above apply.

/** Colour + label per AI session status. */
const AI_STATUS = {
  completed: ['Ended', '#3CCB7F'],
  ongoing: ['Live', '#E0A93B'],
  open: ['Not started', '#9A9DA8'],
};

/** Why a session closed, in words the admin can act on. */
const AI_END_REASON = {
  user_ended: 'User ended',
  low_balance: 'Balance ran out',
  max_minutes: 'Hit the time cap',
  crisis: 'Crisis — escalated',
  stuck: 'Auto-closed (stuck)',
};

function AiConsultations({ C }) {
  const [rows, setRows] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);   // { session, messages }
  // Ended chats are the default view: an ongoing one has nothing to review yet.
  const [status, setStatus] = useState('completed');
  const [reviewOnly, setReviewOnly] = useState(false);

  const LIMIT = 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    AdminAPI.aiChats({ status: status || undefined, needsReview: reviewOnly || undefined, page, limit: LIMIT })
      .then(({ data }) => { if (!cancelled) setRows(data.data || { items: [], total: 0 }); })
      .catch(() => { if (!cancelled) toast.error('Could not load AI consultations'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, reviewOnly, page]);

  const open = async (s) => {
    try {
      const { data } = await AdminAPI.aiChat(s.aiSessionId);
      setActive(data.data);
    } catch { toast.error('Could not load the transcript'); }
  };

  const pages = Math.max(1, Math.ceil((rows.total || 0) / LIMIT));

  return (
    <Grid container spacing={2.5}>
      {/* List */}
      <Grid item xs={12} md={5}>
        <Card sx={{ height: 620 }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
                AI consultations {rows.total ? `(${rows.total})` : ''}
              </Typography>
              {[['completed', 'Ended'], ['ongoing', 'Live'], ['', 'All']].map(([v, label]) => (
                <Chip
                  key={label} size="small" label={label}
                  onClick={() => { setStatus(v); setPage(1); }}
                  sx={{
                    fontWeight: 700, cursor: 'pointer',
                    background: status === v ? alpha(C.gold, 0.18) : alpha(C.textFaint, 0.12),
                    color: status === v ? C.gold : C.textDim,
                  }}
                />
              ))}
              {/* A crisis-flagged chat must be one click away. */}
              <Chip
                size="small" label="Needs review"
                onClick={() => { setReviewOnly((v) => !v); setPage(1); }}
                sx={{
                  fontWeight: 700, cursor: 'pointer',
                  background: reviewOnly ? alpha('#ef4444', 0.18) : alpha(C.textFaint, 0.12),
                  color: reviewOnly ? '#ef4444' : C.textDim,
                }}
              />
            </Stack>
            <Divider sx={{ mb: 1, borderColor: C.border }} />

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {loading && <Typography sx={{ color: C.textDim, textAlign: 'center', py: 4 }}>Loading…</Typography>}
              {!loading && rows.items.length === 0 && (
                <Typography sx={{ color: C.textDim, textAlign: 'center', py: 4 }}>No AI consultations yet</Typography>
              )}
              <List dense disablePadding>
                {rows.items.map((s) => {
                  const [label, colour] = AI_STATUS[s.status] || [s.status, C.textDim];
                  return (
                    <ListItemButton
                      key={s._id}
                      selected={active?.session?.aiSessionId === s.aiSessionId}
                      onClick={() => open(s)}
                      sx={{ borderRadius: 2, mb: 0.5, border: `1px solid ${C.border}` }}
                    >
                      <Stack sx={{ width: '100%', minWidth: 0 }} spacing={0.4}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(C.gold, 0.2), color: C.gold, fontSize: 12 }}>
                            <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 700, flex: 1 }}>
                            {s.user?.name || s.user?.phone || 'Unknown'}
                          </Typography>
                          {s.needsReview && (
                            <Chip size="small" label="Review" sx={{ height: 18, fontSize: 10, fontWeight: 800, background: alpha('#ef4444', 0.18), color: '#ef4444' }} />
                          )}
                          <Chip size="small" label={label} sx={{ height: 18, fontSize: 10, fontWeight: 700, background: alpha(colour, 0.16), color: colour }} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: C.textDim }} noWrap>
                          {s.persona?.name || 'AI astrologer'}
                          {s.topic ? ` · ${s.topic}` : ''}
                          {` · ${s.billedMinutes || 0} min · ${inr(s.totalAmount)}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: C.textFaint }}>
                          {new Date(s.createdAt).toLocaleString()}
                        </Typography>
                      </Stack>
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>

            {pages > 1 && (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Pagination size="small" count={pages} page={page} onChange={(_, p) => setPage(p)} />
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Transcript */}
      <Grid item xs={12} md={7}>
        <Card sx={{ height: 620 }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {!active && (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                <Typography sx={{ color: C.textDim }}>Select a consultation to read its transcript</Typography>
              </Stack>
            )}
            {active && <AiTranscript C={C} data={active} />}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/** One AI consultation: header facts, then the turns. Read-only by design —
 *  there is no astrologer to moderate and no recap to approve. */
function AiTranscript({ C, data }) {
  const s = data.session || {};
  const messages = data.messages || [];
  const [label, colour] = AI_STATUS[s.status] || [s.status, C.textDim];
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
          {s.user?.name || s.user?.phone || 'Unknown'} · {s.persona?.name || 'AI astrologer'}
        </Typography>
        {s.needsReview && (
          <Chip size="small" label="Needs review" sx={{ fontWeight: 800, background: alpha('#ef4444', 0.18), color: '#ef4444' }} />
        )}
        <Chip size="small" label={label} sx={{ fontWeight: 700, background: alpha(colour, 0.16), color: colour }} />
      </Stack>
      <Typography variant="caption" sx={{ color: C.textDim }}>
        Read-only · {String(s.aiSessionId || '').slice(0, 8)}
        {` · ${s.billedMinutes || 0} min · ${inr(s.totalAmount)} at ${inr(s.ratePerMin)}/min`}
        {/* 100% platform revenue: an AI chat has no astrologer to pay. */}
        {s.endReason ? ` · ${AI_END_REASON[s.endReason] || s.endReason}` : ''}
      </Typography>
      <Divider sx={{ my: 1.5, borderColor: C.border }} />
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
        {messages.map((m, i) => {
          const fromUser = m.role === 'user';
          return (
            <Stack key={m._id || i} alignItems={fromUser ? 'flex-start' : 'flex-end'} sx={{ mb: 1 }}>
              <Box sx={{
                maxWidth: '75%', px: 1.5, py: 1, borderRadius: 2,
                background: fromUser ? alpha(C.surface2, 0.8) : alpha(C.gold, 0.15),
                border: `1px solid ${C.border}`,
              }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: C.textDim, mt: 0.3 }}>
                {fromUser ? 'Seeker' : 'AI'} · {new Date(m.createdAt).toLocaleTimeString()}
              </Typography>
            </Stack>
          );
        })}
        {messages.length === 0 && <Typography sx={{ color: C.textDim, textAlign: 'center', py: 4 }}>No messages</Typography>}
      </Box>
    </>
  );
}
