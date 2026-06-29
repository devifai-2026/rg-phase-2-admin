import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Stack, Avatar, Skeleton, Chip, Divider, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import CountUp from 'react-countup';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import StarIcon from '@mui/icons-material/AutoAwesome';
import SwapIcon from '@mui/icons-material/SwapVert';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VerifiedIcon from '@mui/icons-material/VerifiedUser';
import PayoutIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningIcon from '@mui/icons-material/ReportProblem';
import SupportIcon from '@mui/icons-material/SupportAgent';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, rupees } from '../components/common';
import EmptyState from '../components/EmptyState';

const ago = (v) => {
  if (!v) return 'offline';
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function Delta({ value, b }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color: up ? b.green : b.red }}>
      {up ? <ArrowUpwardIcon sx={{ fontSize: 12 }} /> : <ArrowDownwardIcon sx={{ fontSize: 12 }} />}
      <Typography variant="caption" sx={{ fontWeight: 700 }}>{Math.abs(value)}%</Typography>
    </Stack>
  );
}

function Kpi({ icon, label, value, prefix = '', accent, delta, onClick, b }) {
  return (
    <Card onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default', transition: 'border-color .15s', '&:hover': onClick ? { borderColor: alpha(accent, 0.5) } : {} }}>
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
          <Avatar variant="rounded" sx={{ background: alpha(accent, 0.14), color: accent, width: 32, height: 32 }}>{icon}</Avatar>
          <Delta value={delta} b={b} />
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 800, color: b.text, lineHeight: 1.15 }}>
          {prefix}<CountUp end={value} duration={1.1} separator="," />
        </Typography>
        <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, height = 280, children, hasData, emptyHint }) {
  return (
    <Card sx={{ height }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Box sx={{ flex: 1, minHeight: 0 }}>{hasData ? children : <EmptyState title="No data yet" hint={emptyHint} />}</Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [d, setD] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setD(null);
    AdminAPI.dashboard({ days }).then((r) => setD(r.data.data)).catch(() => setD({ kpis: {}, revenueTrend: [], serviceDistribution: {}, ordersByStatus: {}, topAstrologers: [], newUsersTrend: [], sessionsTrend: [] }));
  }, [days]);

  if (!d) {
    return (<><PageHeader title="Dashboard" subtitle="Loading insights…" /><Grid container spacing={2}>{[...Array(6)].map((_, i) => <Grid key={i} item xs={6} md={2}><Skeleton variant="rounded" height={92} /></Grid>)}</Grid></>);
  }

  const k = d.kpis || {};
  const pend = k.pending || {};
  const trend = d.revenueTrend || [];
  const dist = d.serviceDistribution || {};
  const obs = d.ordersByStatus || {};
  const top = d.topAstrologers || [];

  const distData = [
    { id: 0, value: dist.call || 0, label: 'Calls', color: b.red },
    { id: 1, value: dist.video || 0, label: 'Video', color: b.violet },
    { id: 2, value: dist.chat || 0, label: 'Chat', color: b.blue },
    { id: 3, value: dist.pooja || 0, label: 'Pooja', color: b.green },
    { id: 4, value: dist.ecommerce || 0, label: 'Store', color: b.amber },
  ].filter((x) => x.value > 0);

  const needs = [
    { label: 'KYC to verify (optional)', count: pend.kyc || 0, icon: <VerifiedIcon fontSize="small" />, to: '/kyc', color: b.amber },
    { label: 'Pending Withdrawals', count: pend.withdrawals || 0, icon: <PayoutIcon fontSize="small" />, to: '/withdrawals', color: b.red },
    { label: 'Open Escalations', count: pend.escalations || 0, icon: <WarningIcon fontSize="small" />, to: '/escalations', color: b.red },
    { label: 'Support Tickets', count: pend.tickets || 0, icon: <SupportIcon fontSize="small" />, to: '/dashboard', color: b.blue },
    { label: 'Low Stock', count: pend.lowStock || 0, icon: <InventoryIcon fontSize="small" />, to: '/products', color: b.amber },
  ];

  const eng = d.engagement || {};
  const recentActive = d.recentActive || [];
  const content = d.content || {};

  const orderStatuses = ['created', 'paid', 'processing', 'shipped', 'delivered'];
  const orderData = orderStatuses.map((s) => obs[s] || 0);
  const hasOrders = orderData.some((x) => x > 0);

  const axisSx = { '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: alpha(b.border, 0.8) }, '& .MuiChartsAxis-tickLabel': { fill: `${b.textDim} !important`, fontSize: 11 } };

  const dayToggle = (
    <ToggleButtonGroup size="small" exclusive value={days} onChange={(e, v) => v && setDays(v)}>
      <ToggleButton value={7}>7d</ToggleButton>
      <ToggleButton value={30}>30d</ToggleButton>
      <ToggleButton value={90}>90d</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Platform performance at a glance" action={dayToggle} />

      {/* KPI strip */}
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} accent={b.red} label="Revenue Today" prefix="₹" value={k.revenueToday || 0} delta={k.revenueTodayDelta} onClick={() => navigate('/transactions')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} accent={b.green} label="Revenue · 30d" prefix="₹" value={k.revenueMonth || 0} delta={k.revenueMonthDelta} onClick={() => navigate('/transactions')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<SwapIcon sx={{ fontSize: 18 }} />} accent={b.amber} label="Net Wallet Flow" prefix="₹" value={k.netFlow || 0} onClick={() => navigate('/transactions')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<PeopleIcon sx={{ fontSize: 18 }} />} accent={b.blue} label="Active Users" value={k.activeUsers || 0} onClick={() => navigate('/users')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<StarIcon sx={{ fontSize: 18 }} />} accent={b.violet} label="Online Astrologers" value={k.onlineAstrologers || 0} onClick={() => navigate('/astrologers')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<BoltIcon sx={{ fontSize: 18 }} />} accent={b.red} label="Needs Action" value={k.pendingTotal || 0} onClick={() => navigate('/kyc')} /></Grid>
      </Grid>

      {/* Quick action CTAs */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
        {[
          { label: 'Add Astrologer', to: '/astrologers/new' },
          { label: 'Add Product', to: '/products/new' },
          { label: 'Recharge Wallet', to: '/users' },
          { label: 'Review KYC', to: '/kyc' },
          { label: 'Process Payouts', to: '/withdrawals' },
          { label: 'Create Coupon', to: '/coupons' },
        ].map((a) => (
          <Button key={a.label} variant="outlined" size="small" onClick={() => navigate(a.to)}
            sx={{ borderColor: b.border, color: b.text, '&:hover': { borderColor: b.red, color: b.red } }}>{a.label}</Button>
        ))}
      </Stack>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Revenue · Last 30 Days" hasData={trend.length > 0} emptyHint="Completed consultations will chart here">
            <LineChart height={232} margin={{ left: 52, right: 16, top: 12, bottom: 24 }}
              xAxis={[{ scaleType: 'point', data: trend.map((t) => t.date.slice(5)) }]}
              series={[
                { data: trend.map((t) => t.gross), label: 'Gross', color: alpha(b.violet, 0.7), area: true },
                { data: trend.map((t) => t.revenue), label: 'Platform', color: b.red, area: true },
              ]}
              sx={{ '& .MuiAreaElement-series-auto-generated-id-0': {}, ...axisSx }}
              slotProps={{ legend: { hidden: false, labelStyle: { fill: b.textDim, fontSize: 12 }, itemMarkWidth: 10, itemMarkHeight: 10, position: { vertical: 'top', horizontal: 'right' } } }} />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard title="Revenue by Service" hasData={distData.length > 0} emptyHint="No service revenue yet">
            <PieChart height={232} series={[{ data: distData, innerRadius: 52, paddingAngle: 2, cornerRadius: 5, highlightScope: { faded: 'global', highlighted: 'item' } }]}
              slotProps={{ legend: { labelStyle: { fill: b.textDim, fontSize: 11.5 }, itemMarkWidth: 9, itemMarkHeight: 9 } }} />
          </ChartCard>
        </Grid>
      </Grid>

      {/* Needs attention + orders */}
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ height: '100%', overflowY: 'auto' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Needs Attention</Typography>
              <Stack spacing={1}>
                {needs.map((n) => {
                  const active = n.count > 0;
                  return (
                    <Stack key={n.label} direction="row" alignItems="center" spacing={1.5}
                      sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${active ? alpha(n.color, 0.4) : b.borderSoft}`, borderLeft: `3px solid ${active ? n.color : b.borderSoft}`, opacity: active ? 1 : 0.55, background: active ? alpha(n.color, 0.05) : 'transparent' }}>
                      <Avatar variant="rounded" sx={{ width: 30, height: 30, background: alpha(active ? n.color : b.textFaint, 0.14), color: active ? n.color : b.textFaint }}>{n.icon}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: b.text }}>{n.label}</Typography>
                      <Chip size="small" label={n.count} sx={{ background: alpha(active ? n.color : b.textFaint, 0.16), color: active ? n.color : b.textFaint, fontWeight: 700, minWidth: 30 }} />
                      {active && <Button size="small" onClick={() => navigate(n.to)} sx={{ color: n.color, minWidth: 0, px: 1 }}>Review</Button>}
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Orders by Status" height={300} hasData={hasOrders} emptyHint="No orders yet">
            <BarChart height={232} margin={{ left: 40, right: 16, top: 12, bottom: 28 }}
              xAxis={[{ scaleType: 'band', data: orderStatuses.map((s) => s[0].toUpperCase() + s.slice(1)) }]}
              series={[{ data: orderData, color: b.red }]}
              sx={axisSx} slotProps={{ legend: { hidden: true } }} />
          </ChartCard>
        </Grid>
      </Grid>

      {/* Growth trends */}
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="New Users" hasData={(d.newUsersTrend || []).length > 0} emptyHint="New signups will chart here">
            <LineChart height={232} margin={{ left: 40, right: 16, top: 12, bottom: 24 }}
              xAxis={[{ scaleType: 'point', data: (d.newUsersTrend || []).map((t) => t.date.slice(5)) }]}
              series={[{ data: (d.newUsersTrend || []).map((t) => t.count), color: b.blue, area: true, label: 'New users' }]}
              sx={axisSx} slotProps={{ legend: { hidden: true } }} />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Consultations" hasData={(d.sessionsTrend || []).length > 0} emptyHint="Completed sessions will chart here">
            <LineChart height={232} margin={{ left: 40, right: 16, top: 12, bottom: 24 }}
              xAxis={[{ scaleType: 'point', data: (d.sessionsTrend || []).map((t) => t.date.slice(5)) }]}
              series={[{ data: (d.sessionsTrend || []).map((t) => t.count), color: b.green, area: true, label: 'Sessions' }]}
              sx={axisSx} slotProps={{ legend: { hidden: true } }} />
          </ChartCard>
        </Grid>
      </Grid>

      {/* User Activity & Engagement */}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 3, mb: 1.5 }}>User Activity & Engagement</Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<BoltIcon sx={{ fontSize: 18 }} />} accent={b.green} label="Online now" value={eng.onlineUsersNow || 0} onClick={() => navigate('/users')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<PeopleIcon sx={{ fontSize: 18 }} />} accent={b.blue} label="Active today" value={eng.activeToday || 0} onClick={() => navigate('/users')} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} accent={b.violet} label="App opens" value={eng.totalVisits || 0} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<SwapIcon sx={{ fontSize: 18 }} />} accent={b.amber} label="Screens viewed" value={eng.totalPageViews || 0} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<StarIcon sx={{ fontSize: 18 }} />} accent={b.red} label="Searches" value={eng.totalSearches || 0} /></Grid>
        <Grid item xs={6} md={2}><Kpi b={b} icon={<PeopleIcon sx={{ fontSize: 18 }} />} accent={b.blue} label="Tracked users" value={eng.trackedUsers || 0} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        {/* Who's active now */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: 320 }}>
            <CardContent sx={{ height: '100%', overflowY: 'auto' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recently Active Users</Typography>
                <Button size="small" onClick={() => navigate('/users')} sx={{ color: b.red }}>All users →</Button>
              </Stack>
              {recentActive.length === 0 ? <EmptyState title="No activity yet" hint="User activity appears once the app reports heartbeats" /> : (
                <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />}>
                  {recentActive.map((u) => (
                    <Stack key={u.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1, cursor: 'pointer' }} onClick={() => navigate(`/users/${u.id}`)}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar src={u.avatar} sx={{ width: 32, height: 32, fontSize: 13, background: b.surface2 }}>{(u.name || 'U')[0]}</Avatar>
                        <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: u.online ? b.green : b.textFaint, border: `2px solid ${b.surface}` }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{u.name}</Typography>
                        <Typography variant="caption" sx={{ color: b.textDim }} noWrap>{u.lastPage ? `on ${String(u.lastPage).replace(/-/g, ' ')}` : '—'} · {u.pageViews} screens · {u.searches} searches</Typography>
                      </Box>
                      <Chip size="small" label={u.online ? 'Online' : ago(u.lastSeen)} sx={{ background: alpha(u.online ? b.green : b.textFaint, 0.16), color: u.online ? b.green : b.textFaint, fontWeight: 700, height: 22 }} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Content health */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: 320 }}>
            <CardContent sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Content Health</Typography>
                <Button size="small" onClick={() => navigate('/app-config')} sx={{ color: b.red }}>Manage →</Button>
              </Stack>
              <Stack spacing={1.25}>
                {[
                  { label: 'Active promo banners', count: content.banners || 0, color: b.violet },
                  { label: 'Published videos', count: content.videos || 0, color: b.blue },
                  { label: 'Published lessons', count: content.lessons || 0, color: b.green },
                ].map((c) => (
                  <Stack key={c.label} direction="row" alignItems="center" spacing={1.5}
                    sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${c.count > 0 ? alpha(c.color, 0.35) : b.borderSoft}`, borderLeft: `3px solid ${c.count > 0 ? c.color : b.borderSoft}` }}>
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{c.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: c.count > 0 ? c.color : b.textFaint }}>{c.count}</Typography>
                  </Stack>
                ))}
                <Button variant="outlined" fullWidth onClick={() => navigate('/app-config')}
                  sx={{ mt: 1, borderColor: b.border, color: b.text, '&:hover': { borderColor: b.red, color: b.red } }}>
                  Open App Configuration
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top astrologers */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Top Astrologers · 30 Days</Typography>
            <Button size="small" onClick={() => navigate('/astrologers')} sx={{ color: b.red }}>View all →</Button>
          </Stack>
          {top.length === 0 ? <EmptyState title="No earnings yet" hint="Top earners will appear here" /> : (
            <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />}>
              {top.map((a, i) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ color: b.textFaint, width: 18, fontWeight: 700 }}>{i + 1}</Typography>
                  <Avatar sx={{ width: 30, height: 30, background: b.gradients.red, fontSize: 13 }}>{a.name[0]}</Avatar>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{a.name}</Typography>
                  <Typography variant="caption" sx={{ color: b.textDim }}>{a.sessions} sessions</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: b.red, width: 90, textAlign: 'right' }}>{rupees(a.earnings)}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </>
  );
}
