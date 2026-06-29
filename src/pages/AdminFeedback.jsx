import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Chip, Typography, Stack, MenuItem, TextField, Rating, Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import StarIcon from '@mui/icons-material/Star';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * Admin Feedback — the ASTROLOGER's own feedback after each service/live they
 * delivered (distinct from seeker reviews). Multi-dimension ratings (overall /
 * connection / seeker behaviour) + a note, filterable by service type, kind, and
 * minimum overall rating, with averages across the current filter.
 */
const SERVICE_TYPES = [
  { value: '', label: 'All services' },
  { value: 'chat', label: 'Chat' },
  { value: 'call', label: 'Call' },
  { value: 'video', label: 'Video' },
  { value: 'live', label: 'Live' },
];

export default function AdminFeedback() {
  const { palette } = useTheme();
  const C = palette.brand;

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ avgOverall: null, avgConnection: null, avgSeekerBehaviour: null, count: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serviceType, setServiceType] = useState('');
  const [minRating, setMinRating] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listServiceFeedback({
        page: pagination.page + 1,
        limit: pagination.pageSize,
        serviceType: serviceType || undefined,
        minRating: minRating || undefined,
      });
      const d = data.data || {};
      setRows((d.items || []).map((x) => ({ ...x, id: x._id })));
      setTotal(d.total || 0);
      setSummary(d.summary || { avgOverall: null, avgConnection: null, avgSeekerBehaviour: null, count: 0 });
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, serviceType, minRating]);
  useEffect(() => { load(); }, [load]);

  const typeChip = (t) => {
    const colors = { chat: C.blue, call: C.green, video: C.violet, live: C.red };
    const col = colors[t] || C.muted;
    return <Chip size="small" label={t} sx={{ textTransform: 'capitalize', bgcolor: alpha(col, 0.14), color: col, fontWeight: 700 }} />;
  };

  const ratingCell = (v) => (v ? (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Rating value={v} max={5} size="small" readOnly />
    </Stack>
  ) : <Typography variant="body2" color="text.secondary">—</Typography>);

  const columns = [
    {
      field: 'astrologer', headerName: 'Astrologer', flex: 1, minWidth: 150,
      valueGetter: (_, row) => row.astrologerProfile?.displayName || row.astrologer?.name || row.astrologer?.phone || '—',
    },
    { field: 'serviceType', headerName: 'Service', width: 100, renderCell: (p) => typeChip(p.value) },
    { field: 'overall', headerName: 'Overall', width: 140, renderCell: (p) => ratingCell(p.value) },
    { field: 'connectionQuality', headerName: 'Connection', width: 140, renderCell: (p) => ratingCell(p.value) },
    { field: 'seekerBehaviour', headerName: 'Seeker/Audience', width: 150, renderCell: (p) => ratingCell(p.value) },
    {
      field: 'comment', headerName: 'Note', flex: 1.4, minWidth: 200,
      renderCell: (p) => p.value
        ? <Tooltip title={p.value}><Typography variant="body2" noWrap>{p.value}</Typography></Tooltip>
        : <Typography variant="body2" color="text.secondary">—</Typography>,
    },
    {
      field: 'context', headerName: 'Session / Live', flex: 1, minWidth: 160,
      valueGetter: (_, row) => row.kind === 'live'
        ? (row.liveSession?.title || row.liveSession?.topic || 'Live broadcast')
        : (row.session?.seekerAlias ? `with ${row.session.seekerAlias}` : 'Consultation'),
    },
    {
      field: 'createdAt', headerName: 'When', width: 160,
      valueGetter: (v) => v ? new Date(v).toLocaleString() : '—',
    },
  ];

  const avgCard = (label, val, tint) => (
    <Card sx={{ p: 2, flex: 1, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
        <StarIcon sx={{ color: tint, fontSize: 22 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{val != null ? val.toFixed(1) : '—'}</Typography>
        <Typography variant="body2" color="text.secondary">/ 5</Typography>
      </Stack>
    </Card>
  );

  return (
    <Box>
      <PageHeader title="Admin Feedback" subtitle="Astrologer feedback after each delivered service & live session" />

      {/* Averages across the current filter */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}>
        {avgCard('Avg overall', summary.avgOverall, C.gold)}
        {avgCard('Avg connection / stream', summary.avgConnection, C.blue)}
        {avgCard('Avg seeker / audience', summary.avgSeekerBehaviour, C.violet)}
        <Card sx={{ p: 2, flex: 1, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary">Total feedback</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{summary.count}</Typography>
        </Card>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <TextField select size="small" label="Service" value={serviceType}
          onChange={(e) => { setServiceType(e.target.value); setPagination((p) => ({ ...p, page: 0 })); }}
          sx={{ minWidth: 160 }}>
          {SERVICE_TYPES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Min overall rating" value={minRating}
          onChange={(e) => { setMinRating(e.target.value); setPagination((p) => ({ ...p, page: 0 })); }}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">Any</MenuItem>
          {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={n}>{n}★ & up</MenuItem>)}
        </TextField>
      </Stack>

      <Card sx={{ height: 620 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          rowCount={total}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[20, 50, 100]}
          sx={{
            border: 0,
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus': { outline: 'none' },
          }}
        />
      </Card>
    </Box>
  );
}
