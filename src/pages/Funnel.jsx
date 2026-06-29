import { useEffect, useState, useCallback } from 'react';
import {
  Grid, Card, CardContent, Typography, Stack, Chip, Box, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';
import { SuperAdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn } from '../components/tableHelpers';
import VisitorMap from '../components/VisitorMap';

const RANGES = [
  { label: '24h', minutes: 1440 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function Stat({ label, value, suffix, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 0.5 }}>
          <CountUp end={value || 0} duration={1.2} separator="," />{suffix || ''}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Funnel() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [range, setRange] = useState(2); // 30d
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const axisSx = {
    '& .MuiChartsAxis-line': { stroke: alpha(palette.text.primary, 0.15) },
    '& .MuiChartsAxis-tickLabel': { fill: palette.text.secondary, fontSize: 11 },
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = RANGES[range];
      const { data: res } = await SuperAdminAPI.funnel(r.minutes ? { minutes: r.minutes } : { days: r.days });
      setData(res.data);
    } catch {
      toast.error('Failed to load funnel');
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const s = data?.stages || {};
  const daily = data?.daily || [];
  const recent = (data?.recentVisits || []).map((v) => ({ id: v._id, ...v }));
  const device = (data?.byDevice || []).map((d, i) => ({ id: i, label: d.name, value: d.value }));

  const recentCols = [
    { field: '_id', headerName: 'Visitor', width: 150, valueGetter: (v) => (v || '').slice(0, 12) + '…' },
    dateColumn({ field: 'lastSeen', headerName: 'Last seen', width: 160 }),
    { field: 'count', headerName: 'Visits', width: 90 },
    { field: 'location', headerName: 'Location', width: 150, valueGetter: (_, r) => [r.city, r.country].filter(Boolean).join(', ') || '—' },
    { field: 'device', headerName: 'Device', width: 100 },
    { field: 'os', headerName: 'OS', width: 100 },
    { field: 'utmCampaign', headerName: 'Campaign', flex: 1, minWidth: 130, valueGetter: (v) => v || '(direct)' },
    {
      field: 'conversionType', headerName: 'Converted', width: 150,
      renderCell: (p) => p.value
        ? <Chip size="small" label={p.value.replace('_', ' ')} sx={{ background: `${b.green}22`, color: b.green, fontWeight: 600 }} />
        : <span style={{ color: palette.text.disabled }}>—</span>,
    },
  ];

  const campaignCols = [
    { field: 'campaign', headerName: 'Campaign', flex: 1, minWidth: 160 },
    { field: 'source', headerName: 'Source', width: 130, valueGetter: (v) => v || '—' },
    { field: 'visits', headerName: 'Visits', width: 100 },
    { field: 'conversions', headerName: 'Conversions', width: 130 },
  ];
  const campaigns = (data?.byCampaign || []).map((c, i) => ({ id: i, ...c }));
  const geo = data?.byGeo || [];
  const geoRows = geo.map((g, i) => ({ id: i, location: [g.city, g.country].filter(Boolean).join(', ') || 'Unknown', ...g }));
  const geoCols = [
    { field: 'location', headerName: 'Location', flex: 1, minWidth: 180 },
    { field: 'visits', headerName: 'Visits', width: 100 },
    { field: 'conversions', headerName: 'Conversions', width: 130 },
  ];

  return (
    <>
      <PageHeader
        title="Acquisition Funnel"
        subtitle="Visits → enquiries → conversions, with attribution"
        action={
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v != null && setRange(v)}>
            {RANGES.map((r, i) => <ToggleButton key={r.label} value={i}>{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={6} md={2.4}><Stat label="Visits" value={s.visits} color={palette.text.primary} /></Grid>
        <Grid item xs={6} md={2.4}><Stat label="Unique visitors" value={s.uniqueVisitors} color={b.violet} /></Grid>
        <Grid item xs={6} md={2.4}><Stat label="Enquiries" value={s.enquiries} color={b.red} /></Grid>
        <Grid item xs={6} md={2.4}><Stat label="Signups" value={s.signups} color={b.green} /></Grid>
        <Grid item xs={6} md={2.4}><Stat label="Astrologer applies" value={s.applies} color={b.red} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Daily visits &amp; conversions</Typography>
              {daily.length ? (
                <LineChart
                  height={260} margin={{ left: 48, right: 16, top: 12, bottom: 24 }}
                  xAxis={[{ scaleType: 'point', data: daily.map((d) => d._id.slice(5)) }]}
                  series={[
                    { data: daily.map((d) => d.visits), label: 'Visits', color: alpha(b.violet, 0.7), area: true },
                    { data: daily.map((d) => d.conversions), label: 'Conversions', color: b.red, area: true },
                  ]}
                  sx={axisSx}
                  slotProps={{ legend: { labelStyle: { fill: palette.text.secondary, fontSize: 12 }, itemMarkWidth: 10, itemMarkHeight: 10 } }}
                />
              ) : <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>No data in this range</Box>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>By device</Typography>
              {device.length ? (
                <PieChart
                  height={260}
                  series={[{ data: device, innerRadius: 50, paddingAngle: 2, cornerRadius: 5 }]}
                  slotProps={{ legend: { labelStyle: { fill: palette.text.secondary, fontSize: 11.5 }, itemMarkWidth: 9, itemMarkHeight: 9 } }}
                />
              ) : <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>No data</Box>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.25 }} alignItems="stretch">
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Where visitors are</Typography>
              <Box sx={{ flex: 1, minHeight: 360 }}>
                <VisitorMap points={geo} height="100%" accent={b.red} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>By location</Typography>
              {geoRows.length ? (
                <Stack spacing={1} sx={{ overflowY: 'auto', flex: 1 }}>
                  {geoRows.map((g) => (
                    <Stack key={g.id} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ py: 0.75, borderBottom: `1px solid ${alpha(palette.text.primary, 0.06)}` }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.location}</Typography>
                        {g.conversions > 0 && (
                          <Typography variant="caption" sx={{ color: b.green }}>{g.conversions} converted</Typography>
                        )}
                      </Box>
                      <Chip size="small" label={`${g.visits} visit${g.visits === 1 ? '' : 's'}`}
                        sx={{ background: alpha(b.red, 0.14), color: b.red, fontWeight: 700 }} />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', color: 'text.disabled', minHeight: 200 }}>
                  No located visitors yet
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <AdminTable rows={campaigns} columns={campaignCols} loading={loading} title="By campaign"
          emptyTitle="No campaign data" pageSizeOptions={[10, 25]} density="compact" />
      </Box>

      <Box sx={{ mt: 2 }}>
        <AdminTable rows={recent} columns={recentCols} loading={loading} title="Recent visitors"
          emptyTitle="No visitors yet" pageSizeOptions={[25, 50]} density="compact" />
      </Box>
    </>
  );
}
