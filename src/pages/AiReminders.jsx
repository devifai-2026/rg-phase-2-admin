import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Tabs, Tab, Chip, Typography, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, CircularProgress, Stack,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import EventIcon from '@mui/icons-material/EventOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * AI Notifications — everything the AI scheduled to notify the seeker:
 *   • mantra reminders (recurring daily, 5 min before, 14-day course)
 *   • event reminders (one-off on a date)
 *   • follow-up check-ins (future-prediction "how did it go?")
 * Plus a Recaps tab. Each row carries its REASON + a chat-preview modal.
 */
export default function AiReminders() {
  const { palette } = useTheme();
  const C = palette.brand;

  const [tab, setTab] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [n, rc] = await Promise.all([
        AdminAPI.listAiNotifications(),
        AdminAPI.listRecaps({ limit: 200 }),
      ]);
      setNotifs((n.data.data?.items || []).map((x) => ({ ...x, id: x._id })));
      setRecaps((rc.data.data?.items || []).map((x) => ({ ...x, id: x._id })));
    } catch { toast.error('Failed to load AI notifications'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openChat = async (sessionId) => {
    if (!sessionId) { toast.error('No chat linked to this row'); return; }
    setChat({ sessionId, loading: true, items: [] });
    try {
      const { data } = await AdminAPI.sessionMessages(sessionId);
      setChat({ sessionId, loading: false, items: data.data || [] });
    } catch { setChat({ sessionId, loading: false, items: [], error: true }); }
  };

  const gridSx = {
    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus': { outline: 'none' },
  };

  const chatBtn = (sessionId) => (
    <Tooltip title={sessionId ? 'Preview chat history' : 'No chat linked'}>
      <span><IconButton size="small" disabled={!sessionId} onClick={() => openChat(sessionId)} sx={{ color: C.gold }}><ChatIcon fontSize="small" /></IconButton></span>
    </Tooltip>
  );
  const fmt = (v) => (v ? new Date(v).toLocaleString('en-IN') : '—');

  const kindChip = (k) => {
    const map = {
      mantra: { icon: <SelfImprovementIcon />, label: 'Mantra', color: C.violet },
      event: { icon: <EventIcon />, label: 'Event', color: C.blue },
      followup: { icon: <ScheduleIcon />, label: 'Follow-up', color: C.green },
    };
    const m = map[k] || { label: k, color: C.textDim };
    return <Chip size="small" icon={m.icon} label={m.label} sx={{ bgcolor: alpha(m.color, 0.16), color: m.color, fontWeight: 700 }} />;
  };

  const notifCols = [
    { field: 'kind', headerName: 'Type', width: 120, renderCell: (p) => kindChip(p.value) },
    { field: 'title', headerName: 'What', flex: 1, minWidth: 160 },
    { field: 'reason', headerName: 'Reason (why)', flex: 1.2, minWidth: 200, renderCell: (p) => (
      <Typography variant="body2" sx={{ color: C.textDim, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.value || '—'}</Typography>
    ) },
    { field: 'notifyText', headerName: 'Notification text', flex: 1.3, minWidth: 200, renderCell: (p) => (
      <Typography variant="body2" sx={{ color: C.text, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.value || '—'}</Typography>
    ) },
    { field: 'schedule', headerName: 'Schedule', width: 150 },
    { field: 'user', headerName: 'Seeker', width: 120, valueGetter: (v) => v?.name || v?.phone || '—' },
    { field: 'astrologer', headerName: 'Astrologer', width: 130, valueGetter: (v) => v?.name || '—' },
    { field: 'status', headerName: 'Status', width: 105, renderCell: (p) => (
      <Chip size="small" label={p.value} sx={{
        bgcolor: alpha(['active', 'scheduled'].includes(p.value) ? C.green : p.value === 'completed' || p.value === 'sent' ? C.textDim : C.red, 0.16),
        color: ['active', 'scheduled'].includes(p.value) ? C.green : p.value === 'completed' || p.value === 'sent' ? C.textDim : C.red, fontWeight: 700, textTransform: 'capitalize' }} />
    ) },
    { field: 'nextRunAt', headerName: 'Next fire', width: 165, valueFormatter: (v) => fmt(v) },
    { field: 'chat', headerName: 'Chat', width: 64, sortable: false, align: 'center', headerAlign: 'center', renderCell: (p) => chatBtn(p.row.sessionId) },
  ];

  const recapCols = [
    { field: 'summary', headerName: 'Summary', flex: 1.6, minWidth: 260, renderCell: (p) => (
      <Typography variant="body2" sx={{ color: C.text, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.value || '—'}</Typography>
    ) },
    { field: 'language', headerName: 'Lang', width: 80, renderCell: (p) => p.value ? <Chip size="small" label={p.value} sx={{ bgcolor: alpha(C.gold, 0.14), color: C.gold }} /> : '—' },
    { field: 'suggestions', headerName: 'Products', width: 85, align: 'center', headerAlign: 'center', valueGetter: (v) => (v || []).length },
    { field: 'reminders', headerName: 'Reminders', width: 95, align: 'center', headerAlign: 'center', valueGetter: (v) => (v || []).length },
    { field: 'user', headerName: 'Seeker', width: 120, valueGetter: (v) => v?.name || v?.phone || '—' },
    { field: 'astrologer', headerName: 'Astrologer', width: 130, valueGetter: (v) => v?.name || '—' },
    { field: 'status', headerName: 'Status', width: 105, renderCell: (p) => (
      <Chip size="small" label={p.value} sx={{ bgcolor: alpha(p.value === 'sent' ? C.green : p.value === 'pending' ? C.gold : C.red, 0.16), color: p.value === 'sent' ? C.green : p.value === 'pending' ? C.gold : C.red, fontWeight: 700, textTransform: 'capitalize' }} />
    ) },
    { field: 'createdAt', headerName: 'When', width: 165, valueFormatter: (v) => fmt(v) },
    { field: 'chat', headerName: 'Chat', width: 64, sortable: false, align: 'center', headerAlign: 'center', renderCell: (p) => chatBtn(p.row.sessionId) },
  ];

  return (
    <Box>
      <PageHeader title="AI Notifications" subtitle="Scheduled mantra/event reminders + follow-up check-ins + recaps — with reasons and chat preview" />

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label={`Scheduled (${notifs.length})`} />
          <Tab label={`Recaps (${recaps.length})`} />
        </Tabs>
      </Card>

      <Box sx={{ height: 600 }}>
        {tab === 0 && (
          <DataGrid rows={notifs} columns={notifCols} loading={loading} disableRowSelectionOnClick
            rowHeight={64} columnHeaderHeight={48} sx={gridSx}
            pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
        )}
        {tab === 1 && (
          <DataGrid rows={recaps} columns={recapCols} loading={loading} disableRowSelectionOnClick
            rowHeight={72} columnHeaderHeight={48} sx={gridSx}
            pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
        )}
      </Box>

      <Dialog open={!!chat} onClose={() => setChat(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: C.surface, border: `1px solid ${C.border}` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Chat history
          <IconButton onClick={() => setChat(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: C.borderSoft, minHeight: 200 }}>
          {chat?.loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', height: 180 }}><CircularProgress /></Box>
          ) : chat?.error ? (
            <Typography sx={{ color: C.textDim }}>Could not load this chat (chats are kept 7 days).</Typography>
          ) : (chat?.items || []).length === 0 ? (
            <Typography sx={{ color: C.textDim }}>No messages found (history may have expired — chats are kept 7 days).</Typography>
          ) : (
            <Stack spacing={1}>
              {chat.items.map((m) => {
                const isSystem = m.kind === 'system';
                const who = isSystem ? 'System' : (m.sender?.name || (m.kind === 'gift' ? 'Gift' : 'User'));
                return (
                  <Box key={m._id} sx={{ alignSelf: isSystem ? 'center' : 'flex-start', maxWidth: '90%', bgcolor: isSystem ? alpha(C.gold, 0.1) : C.surface2, border: `1px solid ${C.borderSoft}`, borderRadius: 2, px: 1.5, py: 1 }}>
                    {!isSystem && <Typography variant="caption" sx={{ color: C.gold, fontWeight: 700 }}>{who}</Typography>}
                    <Typography variant="body2" sx={{ color: C.text, whiteSpace: 'pre-wrap' }}>{m.message || (m.mediaUrl ? '[image]' : '')}</Typography>
                    <Typography variant="caption" sx={{ color: C.textDim }}>{m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN') : ''}</Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
