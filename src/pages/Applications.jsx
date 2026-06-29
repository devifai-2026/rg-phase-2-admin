import { useEffect, useState, useCallback } from 'react';
import {
  Chip, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Divider, Box, IconButton, Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn, actionsColumn } from '../components/tableHelpers';
import { useActivity } from '../activity/ActivityContext';

// Lead pipeline statuses (pre-active astrologers).
const LEAD_STATUS = {
  applied: { label: 'Applied', color: 'red' },
  contacted: { label: 'Contacted', color: 'violet' },
  details_filled: { label: 'Details filled', color: 'green' },
};

// Pretty +91 XXXXX XXXXX from a stored 91+10 number.
const prettyPhone = (raw) => {
  const d = (raw || '').replace(/\D/g, '').slice(-10);
  return d ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : '—';
};

export default function Applications() {
  const { palette } = useTheme();
  const b = palette.brand;
  const nav = useNavigate();
  const { clear } = useActivity();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('applied');
  const [view, setView] = useState(null); // the row being previewed in the dialog
  const [activating, setActivating] = useState(null); // id being activated

  // Opening this page clears the live "new registration" badge.
  useEffect(() => { clear('astrologer_registration'); }, [clear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listAstrologers({ status, limit: 100 });
      const items = data.data.items || data.data || [];
      setRows(items.map((a) => ({
        id: a._id,
        name: a.displayName || a.user?.name || '—',
        phone: a.user?.phone || '',
        email: a.user?.email || '',
        expertise: (a.expertise || []).join(', '),
        languages: (a.languages || []).join(', '),
        experienceYears: a.experienceYears || 0,
        applicationStatus: a.applicationStatus,
        adminNote: a.adminNote || '',
        createdAt: a.createdAt,
      })));
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const chip = (s) => {
    const cfg = LEAD_STATUS[s];
    if (!cfg) return <Chip size="small" label={s} />;
    const col = b[cfg.color];
    return <Chip size="small" label={cfg.label} sx={{ background: `${col}22`, color: col, fontWeight: 600 }} />;
  };

  const copyPhone = (phone) => {
    const d = (phone || '').replace(/\D/g, '').slice(-10);
    if (!d) return;
    navigator.clipboard?.writeText(d).then(() => toast.success(`Copied ${d}`)).catch(() => {});
  };

  // One-click: mark this applicant active (promotes the user → astrologer and
  // sends them the "you're live" notification on the backend).
  const activate = async (row) => {
    if (!window.confirm(`Make ${row.name} an active astrologer now? Rates default to ₹0 until you edit them.`)) return;
    setActivating(row.id);
    try {
      await AdminAPI.updateAstrologer(row.id, { applicationStatus: 'active' });
      toast.success(`${row.name} is now active`);
      setView(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Activation failed');
    } finally {
      setActivating(null);
    }
  };

  // Permanently delete a (non-active) application + its placeholder user.
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}'s application permanently? This frees the phone number for reuse.`)) return;
    try {
      await AdminAPI.deleteApplication(row.id);
      toast.success('Application deleted');
      setView(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    dateColumn({ field: 'createdAt', headerName: 'Applied', width: 160 }),
    { field: 'name', headerName: 'Name', width: 160 },
    { field: 'phone', headerName: 'Phone', width: 150, valueGetter: (v) => prettyPhone(v) },
    { field: 'expertise', headerName: 'Expertise', flex: 1, minWidth: 160 },
    { field: 'experienceYears', headerName: 'Exp (yrs)', width: 90 },
    { field: 'applicationStatus', headerName: 'Status', width: 140, renderCell: (p) => chip(p.value) },
    actionsColumn({
      count: 5,
      getActions: (row) => [
        { icon: <VisibilityIcon fontSize="small" />, tip: 'View details', onClick: () => setView(row) },
        { icon: <ContentCopyIcon fontSize="small" />, tip: `Copy phone (${prettyPhone(row.phone)})`, onClick: () => copyPhone(row.phone) },
        { icon: <OpenInNewIcon fontSize="small" />, tip: 'Review & edit', onClick: () => nav(`/astrologers/${row.id}/edit`) },
        row.applicationStatus !== 'active'
          ? { icon: <CheckCircleIcon fontSize="small" />, tip: 'Activate astrologer', primary: true, disabled: activating === row.id, onClick: () => activate(row) }
          : null,
        { icon: <DeleteIcon fontSize="small" />, tip: 'Delete application', danger: true, onClick: () => remove(row) },
      ],
    }),
  ];

  const Row = ({ label, value }) => (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography sx={{ width: 120, color: b.textDim, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ flex: 1, color: b.text, fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</Typography>
    </Stack>
  );

  return (
    <>
      <PageHeader
        title="Astrologer Applications"
        subtitle="Registrations from the astrologer app + landing-page form"
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {Object.entries(LEAD_STATUS).map(([k, v]) => (
          <Chip
            key={k}
            label={v.label}
            onClick={() => setStatus(k)}
            variant={status === k ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      <AdminTable
        rows={rows} columns={columns} loading={loading} title="Applications"
        emptyTitle="No applications in this stage" pageSizeOptions={[25, 50, 100]}
      />

      {/* Read-only view of everything the astrologer filled in. */}
      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{view?.name}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Box>
            <Row label="Status" value={chip(view?.applicationStatus)} />
            <Divider sx={{ borderColor: b.borderSoft, my: 0.5 }} />
            <Stack direction="row" spacing={2} sx={{ py: 0.75, alignItems: 'center' }}>
              <Typography sx={{ width: 120, color: b.textDim, fontSize: 13 }}>Phone</Typography>
              <Typography sx={{ flex: 1, color: b.text, fontSize: 13, fontWeight: 500 }}>{prettyPhone(view?.phone)}</Typography>
              <Tooltip title="Copy"><IconButton size="small" onClick={() => copyPhone(view?.phone)} sx={{ color: b.textDim }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <Row label="Email" value={view?.email} />
            <Row label="Expertise" value={view?.expertise} />
            <Row label="Languages" value={view?.languages} />
            <Row label="Experience" value={view?.experienceYears ? `${view.experienceYears} yrs` : '—'} />
            <Row label="Note" value={view?.adminNote} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => remove(view)} startIcon={<DeleteIcon />} sx={{ color: b.red, mr: 'auto' }}>Delete</Button>
          <Button onClick={() => setView(null)} sx={{ color: b.textDim }}>Close</Button>
          <Button onClick={() => nav(`/astrologers/${view.id}/edit`)} sx={{ color: b.textDim }}>Open editor</Button>
          {view?.applicationStatus !== 'active' && (
            <Button variant="contained" startIcon={<CheckCircleIcon />} disabled={activating === view?.id} onClick={() => activate(view)}>
              {activating === view?.id ? 'Activating…' : 'Activate'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
