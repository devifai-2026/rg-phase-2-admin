import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Chip, Typography, IconButton, Tooltip, Stack, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * LLM Logs — every AI call with the REAL resolved system prompt (no
 * placeholders), the full input that carried the actual data, the model output,
 * token counts, latency, ok/error, and which astrologer it was for. Click the
 * eye to inspect the full prompt/input/output in a modal.
 */
const FEATURES = ['', 'profileOptimizer', 'chatRecap', 'liveModeration', 'livePoll', 'liveSummary', 'reengagement'];

export default function LlmLogs() {
  const { palette } = useTheme();
  const C = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feature, setFeature] = useState(0);
  const [view, setView] = useState(null); // a log row to inspect

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = FEATURES[feature] || undefined;
      const { data } = await AdminAPI.listAiLogs({ feature: f, limit: 200 });
      setRows((data.data?.items || []).map((x) => ({ ...x, id: x._id })));
    } catch { toast.error('Failed to load LLM logs'); }
    finally { setLoading(false); }
  }, [feature]);
  useEffect(() => { load(); }, [load]);

  const gridSx = {
    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus': { outline: 'none' },
  };

  const cols = [
    { field: 'createdAt', headerName: 'When', width: 165, valueFormatter: (v) => v ? new Date(v).toLocaleString('en-IN') : '—' },
    { field: 'feature', headerName: 'Feature', width: 150, renderCell: (p) => (
      <Chip size="small" label={p.value || '—'} sx={{ bgcolor: alpha(C.violet, 0.16), color: C.violet, fontWeight: 700 }} />
    ) },
    { field: 'astrologer', headerName: 'Astrologer', width: 150, valueGetter: (v) => v?.name || '—' },
    { field: 'model', headerName: 'Model', width: 140 },
    { field: 'promptTokens', headerName: 'In tok', width: 80, align: 'right', headerAlign: 'right' },
    { field: 'outputTokens', headerName: 'Out tok', width: 80, align: 'right', headerAlign: 'right' },
    { field: 'totalTokens', headerName: 'Total', width: 80, align: 'right', headerAlign: 'right' },
    { field: 'latencyMs', headerName: 'Latency', width: 90, align: 'right', headerAlign: 'right', valueFormatter: (v) => v != null ? `${v}ms` : '—' },
    { field: 'ok', headerName: 'Status', width: 90, renderCell: (p) => (
      <Chip size="small" label={p.value ? 'ok' : 'error'} sx={{ bgcolor: alpha(p.value ? C.green : C.red, 0.16), color: p.value ? C.green : C.red, fontWeight: 700 }} />
    ) },
    { field: 'view', headerName: '', width: 60, sortable: false, align: 'center', renderCell: (p) => (
      <Tooltip title="Inspect prompt / input / output"><IconButton size="small" onClick={() => setView(p.row)} sx={{ color: C.gold }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
    ) },
  ];

  const block = (label, text) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ color: C.textDim, fontWeight: 700 }}>{label}</Typography>
      <Box sx={{
        mt: 0.5, p: 1.5, borderRadius: 1.5, border: `1px solid ${C.borderSoft}`, background: C.surface2,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflow: 'auto', color: C.text,
      }}>{text || '(empty)'}</Box>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="LLM Logs" subtitle="Every AI call — real resolved prompt, input data, output, tokens" />

      <Card sx={{ mb: 2 }}>
        <Tabs value={feature} onChange={(e, v) => setFeature(v)} variant="scrollable" sx={{ px: 1 }}>
          {FEATURES.map((f, i) => <Tab key={i} label={f || 'All'} />)}
        </Tabs>
      </Card>

      <Box sx={{ height: 600 }}>
        <DataGrid rows={rows} columns={cols} loading={loading} disableRowSelectionOnClick
          rowHeight={52} columnHeaderHeight={48} sx={gridSx}
          onRowClick={(p) => setView(p.row)}
          pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
      </Box>

      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: C.surface, border: `1px solid ${C.border}` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{view?.feature} — {view?.astrologer?.name || 'n/a'}</span>
          <IconButton onClick={() => setView(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: C.borderSoft }}>
          {view && (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip size="small" label={`model: ${view.model || '—'}`} />
                <Chip size="small" label={`in: ${view.promptTokens} tok`} />
                <Chip size="small" label={`out: ${view.outputTokens} tok`} />
                <Chip size="small" label={`total: ${view.totalTokens} tok`} sx={{ fontWeight: 700 }} />
                <Chip size="small" label={`${view.latencyMs ?? '—'}ms`} />
                <Chip size="small" label={view.ok ? 'ok' : 'error'} sx={{ bgcolor: alpha(view.ok ? C.green : C.red, 0.16), color: view.ok ? C.green : C.red, fontWeight: 700 }} />
              </Stack>
              {view.error && block('ERROR', view.error)}
              {block('SYSTEM PROMPT (resolved, no placeholders)', view.system)}
              <Divider sx={{ my: 1, borderColor: C.borderSoft }} />
              {block('INPUT (the real data sent to the model)', view.input)}
              <Divider sx={{ my: 1, borderColor: C.borderSoft }} />
              {block('OUTPUT (model response)', view.output)}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
