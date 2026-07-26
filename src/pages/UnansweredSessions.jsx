import { useEffect, useState, useCallback } from 'react';
import { Card, Tabs, Tab, Chip, ToggleButtonGroup, ToggleButton, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn } from '../components/tableHelpers';

// Tabs double as the status filter: "" = everything unanswered.
const TABS = [
  { label: 'All', status: '' },
  { label: 'Missed', status: 'missed' },
  { label: 'Cancelled', status: 'cancelled' },
  { label: 'Rejected', status: 'rejected' },
];

// Why each row ended, in the operator's language rather than the enum's.
const REASON_LABEL = {
  timeout: 'No answer (60s ring)',
  user_cancelled: 'Seeker cancelled',
  hangup: 'Astrologer declined',
  astrologer_offline: 'Astrologer offline',
  error: 'System error',
};

/**
 * Consultations that never happened — missed, cancelled or rejected — across
 * chat, call and video.
 *
 * Deliberately NOT part of "Calls & Recordings": that page is scoped to
 * call|video and to sessions that actually ran. Every row here has no start
 * time, no duration and no earnings (billing never began), so those columns are
 * omitted rather than rendered as a wall of dashes. `lockedAmount` is shown
 * instead — it is what was reserved from the seeker's wallet and released.
 */
export default function UnansweredSessions() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [tab, setTab] = useState(0);
  const [type, setType] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.unansweredSessions({
        status: TABS[tab].status || undefined,
        type: type || undefined,
        limit: 200,
      });
      setRows(data.data.items.map((s) => ({
        id: s._id,
        ...s,
        userName: s.user?.name || s.user?.phone,
        astroName: s.astrologer?.name,
      })));
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, type]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    dateColumn({ field: 'requestedAt', headerName: 'Requested', width: 150 }),
    { field: 'userName', headerName: 'Seeker', flex: 1, minWidth: 140 },
    { field: 'astroName', headerName: 'Astrologer', flex: 1, minWidth: 140, valueGetter: (v) => v || '—' },
    {
      field: 'type', headerName: 'Service', width: 110,
      renderCell: (p) => (
        <Chip size="small" label={p.value} sx={{ background: alpha(b.textFaint, 0.14), color: b.textDim, textTransform: 'capitalize' }} />
      ),
    },
    { field: 'status', headerName: 'Outcome', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'endReason', headerName: 'Reason', flex: 1, minWidth: 170,
      valueGetter: (v) => REASON_LABEL[v] || v || '—',
    },
    {
      field: 'lockedAmount', headerName: 'Reserved', width: 120, type: 'number', align: 'right', headerAlign: 'right',
      // Reserved then released — no money changed hands on these rows.
      valueFormatter: (v) => (v ? rupees(v) : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="Missed & Cancelled"
        subtitle="Consultations that never connected — no answer, seeker cancelled, or astrologer declined"
      />
      <Card sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', px: 1 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            {TABS.map((t) => <Tab key={t.label} label={t.label} />)}
          </Tabs>
          <ToggleButtonGroup size="small" exclusive value={type} onChange={(e, v) => setType(v || '')}>
            <ToggleButton value="">All services</ToggleButton>
            <ToggleButton value="chat">Chat</ToggleButton>
            <ToggleButton value="call">Call</ToggleButton>
            <ToggleButton value="video">Video</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Card>
      <AdminTable
        rows={rows}
        columns={columns}
        loading={loading}
        title="Unanswered consultations"
        emptyTitle="Nothing unanswered"
        emptyHint="Missed, cancelled and declined requests will appear here"
      />
    </>
  );
}
