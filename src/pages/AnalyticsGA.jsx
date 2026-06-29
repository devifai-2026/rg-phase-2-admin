import { useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Stack, Typography, Button, Chip, Grid, Divider, TextField, CircularProgress, Alert } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LineChart as ReLineChart, Line, BarChart as ReBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BoltIcon from '@mui/icons-material/Bolt';
import PeopleIcon from '@mui/icons-material/People';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

const FIREBASE_PROJECT = 'astro-phase-2';
const GA_BASE = `https://console.firebase.google.com/project/${FIREBASE_PROJECT}/analytics`;

// GA date presets (GA4 Data API relative date strings).
const RANGES = [
  { key: '7daysAgo', label: '7 days' },
  { key: '28daysAgo', label: '28 days' },
  { key: '90daysAgo', label: '90 days' },
];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function AnalyticsGA() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('28daysAgo');
  const open = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await AdminAPI.gaAnalytics({ startDate: start, endDate: 'today' });
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load analytics');
      setData(null);
    } finally { setLoading(false); }
  }, [start]);
  useEffect(() => { load(); }, [load]);

  const axisSx = {
    '& .recharts-cartesian-axis-tick text': { fill: b.textDim, fontSize: 11 },
  };
  const tooltipStyle = { contentStyle: { background: b.surface, border: `1px solid ${b.border}`, borderRadius: 8, color: b.text }, labelStyle: { color: b.textDim } };

  const configured = data?.configured;

  return (
    <Box>
      <PageHeader
        title="Analytics (Firebase GA)"
        subtitle="Live usage & engagement for both apps — pulled from Google Analytics (GA4)"
        action={
          <Stack direction="row" spacing={1}>
            {RANGES.map((r) => (
              <Chip key={r.key} label={r.label} onClick={() => setStart(r.key)}
                variant={start === r.key ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(start === r.key ? { background: b.red, color: '#fff' } : {}) }} />
            ))}
            <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => open(`${GA_BASE}/app/dashboard`)}>Open GA</Button>
          </Stack>
        }
      />

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', height: 280 }}><CircularProgress /></Box>
      ) : !configured ? (
        <NotConfigured b={b} open={open} />
      ) : (
        <>
          {/* KPI row */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><Kpi b={b} label="Active users" value={fmt(data.kpis.activeUsers)} sub={`${fmt(data.kpis.newUsers)} new`} icon={<PeopleIcon />} /></Grid>
            <Grid item xs={6} md={3}><Kpi b={b} label="Live now" value={fmt(data.realtime?.activeUsers)} sub="last 30 min" icon={<BoltIcon />} accent /></Grid>
            <Grid item xs={6} md={3}><Kpi b={b} label="Sessions" value={fmt(data.kpis.sessions)} sub={`${data.kpis.avgEngagementSec || 0}s avg`} /></Grid>
            <Grid item xs={6} md={3}><Kpi b={b} label="Events" value={fmt(data.kpis.eventCount)} sub={`${fmt(data.kpis.screenPageViews)} screen views`} /></Grid>
          </Grid>

          <Grid container spacing={2}>
            {/* Active users + events over time */}
            <Grid item xs={12} md={7}>
              <ChartCard b={b} title="Active users & events over time" hasData={(data.trend || []).length > 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={data.trend.map((t) => ({ ...t, day: t.date.slice(5) }))} margin={{ top: 14, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={b.borderSoft} strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="day" {...axisSx} stroke={b.borderSoft} />
                    <YAxis yAxisId="l" width={44} {...axisSx} stroke={b.borderSoft} />
                    <YAxis yAxisId="r" orientation="right" width={44} {...axisSx} stroke={b.borderSoft} />
                    <ReTooltip {...tooltipStyle} />
                    <Line yAxisId="l" type="monotone" dataKey="activeUsers" name="Active users" stroke={b.red} strokeWidth={2} dot={{ r: 3, fill: b.surface, stroke: b.red, strokeWidth: 2 }} />
                    <Line yAxisId="r" type="monotone" dataKey="eventCount" name="Events" stroke={b.blue} strokeWidth={2} dot={{ r: 3, fill: b.surface, stroke: b.blue, strokeWidth: 2 }} />
                  </ReLineChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Top events */}
            <Grid item xs={12} md={5}>
              <ChartCard b={b} title="Top events" hasData={(data.events || []).length > 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={(data.events || []).slice(0, 8)} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke={b.borderSoft} strokeDasharray="5 5" horizontal={false} />
                    <XAxis type="number" {...axisSx} stroke={b.borderSoft} />
                    <YAxis type="category" dataKey="eventName" width={110} {...axisSx} stroke={b.borderSoft} />
                    <ReTooltip {...tooltipStyle} />
                    <Bar dataKey="eventCount" name="Count" fill={b.red} radius={[0, 4, 4, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Top screens */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>Top screens</Typography>
                  {(data.screens || []).length === 0
                    ? <Typography variant="body2" sx={{ color: b.textDim }}>No screen views in this range</Typography>
                    : (
                      <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />}>
                        {data.screens.map((s, i) => (
                          <Stack key={i} direction="row" alignItems="center" spacing={2} sx={{ py: 0.75 }}>
                            <Typography variant="body2" sx={{ color: b.textDim, width: 22 }}>{i + 1}</Typography>
                            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{s.screen}</Typography>
                            <Chip size="small" label={`${fmt(s.views)} views`} sx={{ background: alpha(b.red, 0.14), color: b.red, fontWeight: 700 }} />
                          </Stack>
                        ))}
                      </Stack>
                    )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

function Kpi({ b, label, value, sub, icon, accent }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.75 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon && <Box sx={{ color: accent ? b.green : b.textDim, display: 'grid', placeItems: 'center' }}>{icon}</Box>}
          <Typography variant="caption" sx={{ color: b.textDim, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{label}</Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: accent ? b.green : b.text }}>{value}</Typography>
        {sub && <Typography variant="caption" sx={{ color: b.textDim }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ b, title, hasData, children, height = 320 }) {
  return (
    <Card sx={{ height }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {hasData ? children : <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><Typography variant="body2" sx={{ color: b.textDim }}>No data for this range</Typography></Box>}
        </Box>
      </CardContent>
    </Card>
  );
}

// Shown until GA4_PROPERTY_ID is set + the service account is granted access.
function NotConfigured({ b, open }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ alignItems: 'center' }}>
        Native GA charts aren’t connected yet. Once configured, live metrics show here without leaving the panel.
      </Alert>
      <Card>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>To connect GA4 to this admin</Typography>
          <Stack component="ol" spacing={1} sx={{ pl: 2.5, m: 0, color: b.textDim, fontSize: 14 }}>
            <li>In GA4 → Admin → <b>Property Settings</b>, copy the numeric <b>Property ID</b>.</li>
            <li>In GA4 → Admin → <b>Property access management</b>, add the backend service account email (from <code>firebase-service-account.json</code>) with the <b>Viewer</b> role.</li>
            <li>On the server set <code>GA4_PROPERTY_ID=&lt;that id&gt;</code> and restart the backend.</li>
          </Stack>
          <Button variant="outlined" sx={{ mt: 2 }} startIcon={<OpenInNewIcon />} onClick={() => open(`${GA_BASE}/app/dashboard`)}>
            Open Firebase Analytics ({FIREBASE_PROJECT})
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
