import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Button, Stack, Chip, Tabs, Tab, Card, Grid, Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { BarChart } from '@mui/x-charts/BarChart';
import PlayIcon from '@mui/icons-material/PlayCircle';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';

const fmtDur = (sec) => {
  const s = Number(sec) || 0;
  const m = Math.floor(s / 60), r = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return r ? `${m}m ${r}s` : `${m}m`;
};

export default function CallMonitor() {
  const { palette } = useTheme();
  const C = palette.brand;
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null); // { url, type, title }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([AdminAPI.activeCalls(), AdminAPI.callLogs({ limit: 100 })]);
      setActive(a.data.data.map((c) => ({ id: c._id, ...c, userName: c.user?.name, astroName: c.astrologer?.name })));
      setLogs(l.data.data.items.map((c) => ({ id: c._id, ...c, userName: c.user?.name, astroName: c.astrologer?.name })));
    } catch { toast.error('Failed to load calls'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  // Recordings are only meaningful once the session COMPLETED and Agora has
  // returned the recordingUrl. Split by media type into Audio vs Video tabs.
  const recorded = useMemo(() => logs.filter((c) => c.status === 'completed' && c.recordingUrl), [logs]);
  const audioRecs = useMemo(() => recorded.filter((c) => c.type === 'call'), [recorded]);
  const videoRecs = useMemo(() => recorded.filter((c) => c.type === 'video'), [recorded]);

  // Summary across all completed call/video sessions: totals for duration +
  // earnings (astrologer + admin).
  const totals = useMemo(() => {
    const done = logs.filter((c) => c.status === 'completed');
    return done.reduce((t, c) => ({
      sessions: t.sessions + 1,
      durationSec: t.durationSec + (c.durationSec || 0),
      astroEarning: t.astroEarning + (c.astrologerEarning || 0),
      adminEarning: t.adminEarning + (c.adminEarning || 0),
    }), { sessions: 0, durationSec: 0, astroEarning: 0, adminEarning: 0 });
  }, [logs]);

  // Shared DataGrid styling: vertically center header + cell content so the
  // header labels sit directly above their values (fixes the misalignment where
  // numeric columns and the Play button drifted from their headers).
  const gridSx = {
    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus': { outline: 'none' },
  };

  const playBtn = (row) => row.recordingUrl ? (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: '100%', height: '100%' }}>
      <Button size="small" startIcon={<PlayIcon />} onClick={() => setPlayer({ url: row.recordingUrl, type: row.type, title: `${row.type} · ${row.astroName || ''}` })} sx={{ color: C.gold, minWidth: 0, px: 1 }}>Play</Button>
      <IconButton size="small" href={row.recordingUrl} download target="_blank" sx={{ color: C.textDim }} aria-label="Download recording"><DownloadIcon fontSize="small" /></IconButton>
    </Stack>
  ) : <Chip size="small" label="Processing…" sx={{ bgcolor: alpha(C.gold, 0.12), color: C.gold }} />;

  const recCols = [
    { field: 'astroName', headerName: 'Astrologer', flex: 1, minWidth: 130 },
    { field: 'userName', headerName: 'Seeker', flex: 1, minWidth: 120, valueGetter: (v, r) => v || r.user?.phone || '—' },
    { field: 'startedAt', headerName: 'When', width: 170, valueFormatter: (v) => v ? new Date(v).toLocaleString() : '—' },
    { field: 'durationSec', headerName: 'Duration', width: 110, align: 'right', headerAlign: 'right', valueGetter: (v) => fmtDur(v) },
    { field: 'callQuality', headerName: 'Call quality', width: 120, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value ? <span style={{ color: C.gold, fontWeight: 700 }}>{'★'.repeat(p.value)}<span style={{ color: C.textDim }}>{'★'.repeat(5 - p.value)}</span></span> : <span style={{ color: C.textDim }}>—</span> },
    { field: 'astrologerEarning', headerName: 'Astro ₹', width: 100, align: 'right', headerAlign: 'right', valueFormatter: (v) => rupees(v) },
    { field: 'adminEarning', headerName: 'Admin ₹', width: 100, align: 'right', headerAlign: 'right', valueFormatter: (v) => rupees(v) },
    { field: 'recordingUrl', headerName: 'Recording', width: 160, sortable: false, align: 'center', headerAlign: 'center', renderCell: (p) => playBtn(p.row) },
  ];

  const liveCols = [
    { field: 'type', headerName: 'Type', width: 90, renderCell: (p) => <Chip size="small" label={p.value} sx={{ textTransform: 'capitalize' }} /> },
    { field: 'userName', headerName: 'User', flex: 1, minWidth: 130, valueGetter: (v, r) => v || r.user?.phone },
    { field: 'astroName', headerName: 'Astrologer', flex: 1, minWidth: 130 },
    { field: 'startedAt', headerName: 'Started', width: 110, valueFormatter: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { field: 'liveDuration', headerName: 'Duration', width: 110, valueGetter: (v, r) => r.startedAt ? `${Math.floor((Date.now() - new Date(r.startedAt)) / 60000)}m` : '—' },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  const statCard = (icon, label, value, color) => (
    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.14), color }}>{icon}</Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: C.textDim }}>{label}</Typography>
      </Box>
    </Card>
  );

  return (
    <Box>
      <PageHeader title="Calls & Recordings" subtitle="Active calls, session recordings, durations & earnings" />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>{statCard(<AccessTimeIcon />, 'Total talk time', fmtDur(totals.durationSec), C.gold)}</Grid>
        <Grid item xs={6} md={3}>{statCard(<PlayIcon />, 'Completed sessions', totals.sessions, C.green || '#2E9E6B')}</Grid>
        <Grid item xs={6} md={3}>{statCard(<PaymentsIcon />, 'Astrologer earnings', rupees(totals.astroEarning), '#6D4B9E')}</Grid>
        <Grid item xs={6} md={3}>{statCard(<PaymentsIcon />, 'Admin earnings', rupees(totals.adminEarning), C.red || '#C0392B')}</Grid>
      </Grid>

      {/* Audio vs Video recording counts — quick graphical representation */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: C.textDim }}>Recordings by type</Typography>
        <BarChart
          height={200}
          margin={{ left: 40, right: 16, top: 10, bottom: 28 }}
          xAxis={[{ scaleType: 'band', data: ['Audio', 'Video'] }]}
          series={[{ data: [audioRecs.length, videoRecs.length], color: C.gold, label: 'Recordings' }]}
          slotProps={{ legend: { hidden: true } }}
        />
      </Card>

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
          <Tab label={`Active (${active.length})`} />
          <Tab icon={<MicIcon fontSize="small" />} iconPosition="start" label={`Audio (${audioRecs.length})`} />
          <Tab icon={<VideocamIcon fontSize="small" />} iconPosition="start" label={`Video (${videoRecs.length})`} />
        </Tabs>
      </Card>

      <Box sx={{ height: 560 }}>
        {tab === 0 && <DataGrid rows={active} columns={liveCols} loading={loading} disableRowSelectionOnClick rowHeight={56} columnHeaderHeight={48} sx={gridSx} pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
        {tab === 1 && <DataGrid rows={audioRecs} columns={recCols} loading={loading} disableRowSelectionOnClick rowHeight={56} columnHeaderHeight={48} sx={gridSx} pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
        {tab === 2 && <DataGrid rows={videoRecs} columns={recCols} loading={loading} disableRowSelectionOnClick rowHeight={56} columnHeaderHeight={48} sx={gridSx} pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
      </Box>

      {/* In-panel player: renders <video> for video, <audio> for call recordings. */}
      <Dialog open={!!player} onClose={() => setPlayer(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textTransform: 'capitalize' }}>
          {player?.title || 'Recording'}
          <IconButton onClick={() => setPlayer(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {player?.type === 'video'
            ? <video src={player.url} controls autoPlay style={{ width: '100%', borderRadius: 8, background: '#000' }} />
            : <audio src={player?.url} controls autoPlay style={{ width: '100%' }} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
