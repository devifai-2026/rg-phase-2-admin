import { useEffect, useState, useCallback } from 'react';
import {
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Typography, Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { EnquiryAPI } from '../api/endpoints';
import { useActivity } from '../activity/ActivityContext';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn, actionsColumn, RowActions } from '../components/tableHelpers';

const STATUS = {
  new: { label: 'New', color: 'red' },
  in_progress: { label: 'In progress', color: 'violet' },
  resolved: { label: 'Resolved', color: 'green' },
  spam: { label: 'Spam', color: 'muted' },
};

export default function Enquiries() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [active, setActive] = useState(null); // open enquiry in dialog
  const { clear } = useActivity();
  useEffect(() => { clear('enquiry'); }, [clear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await EnquiryAPI.list({ limit: 100, status: statusFilter || undefined });
      setRows(data.data.items.map((e) => ({ id: e._id, ...e })));
    } catch {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const save = async (id, body) => {
    try {
      await EnquiryAPI.update(id, body);
      toast.success('Updated');
      setActive(null);
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const chip = (s) => {
    const cfg = STATUS[s] || STATUS.new;
    const col = cfg.color === 'muted' ? palette.text.secondary : b[cfg.color];
    return <Chip size="small" label={cfg.label} sx={{ background: `${col}22`, color: col, fontWeight: 600 }} />;
  };

  const columns = [
    dateColumn({ field: 'createdAt', headerName: 'Received', width: 160 }),
    { field: 'name', headerName: 'Name', width: 150 },
    {
      field: 'contact', headerName: 'Contact', width: 200,
      valueGetter: (_, r) => [r.email, r.phone].filter(Boolean).join(' · '),
    },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 180 },
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => chip(p.value) },
    actionsColumn({
      getActions: (p) => (
        <RowActions actions={[{ label: 'Open', onClick: () => setActive(p.row) }]} />
      ),
    }),
  ];

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Contact-us messages from the landing page" />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {['', 'new', 'in_progress', 'resolved', 'spam'].map((s) => (
          <Chip
            key={s || 'all'}
            label={s ? STATUS[s].label : 'All'}
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      <AdminTable
        rows={rows} columns={columns} loading={loading} title="Messages"
        emptyTitle="No enquiries yet" pageSizeOptions={[25, 50, 100]}
      />

      <Dialog open={!!active} onClose={() => setActive(null)} maxWidth="sm" fullWidth>
        {active && (
          <>
            <DialogTitle>{active.subject || 'Enquiry'}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">From</Typography>
                  <Typography>{active.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[active.email, active.phone].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Message</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{active.message}</Typography>
                </Box>
                <TextField
                  select label="Status" size="small" defaultValue={active.status}
                  onChange={(e) => setActive({ ...active, status: e.target.value })}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Internal note" size="small" multiline minRows={2}
                  defaultValue={active.adminNote || ''}
                  onChange={(e) => setActive({ ...active, adminNote: e.target.value })}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setActive(null)}>Close</Button>
              <Button variant="contained" onClick={() => save(active._id, { status: active.status, adminNote: active.adminNote })}>
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
