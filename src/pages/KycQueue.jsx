import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Avatar, Chip, Button, Dialog, DialogTitle, DialogContent, Typography, Grid, Tooltip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { useActivity } from '../activity/ActivityContext';
import { PageHeader, StatusChip } from '../components/common';
import AdminTable from '../components/AdminTable';

const DOCS = [
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN' },
  { key: 'bankPassbook', label: 'Passbook' },
];

export default function KycQueue() {
  const { palette } = useTheme();
  const C = palette.brand;
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState(null); // astrologer whose docs are open
  const { clear } = useActivity();
  useEffect(() => { clear('kyc'); }, [clear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listAstrologers({ limit: 200 });
      setRows(data.data.items.map((a) => ({ id: a._id, ...a, name: a.displayName || a.user?.name })));
    } catch { toast.error('Failed to load KYC records'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (a, kycStatus) => {
    try {
      // KYC is independent of onboarding — only touch kycStatus, not applicationStatus.
      await AdminAPI.updateAstrologer(a._id, { kycStatus });
      toast.success(`KYC marked ${kycStatus}`);
      setView(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  const docCount = (a) => DOCS.filter((d) => a.kycDocuments?.[d.key]).length;
  const filtered = search ? rows.filter((r) => (r.name || '').toLowerCase().includes(search.toLowerCase())) : rows;

  const columns = [
    {
      field: 'name', headerName: 'Astrologer', flex: 1, minWidth: 220,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%' }}>
          <Avatar src={p.row.avatar} sx={{ width: 34, height: 34, flexShrink: 0 }}>{(p.value || 'A')[0]}</Avatar>
          <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>{p.value}</Typography>
            <Typography variant="caption" sx={{ color: C.textDim, lineHeight: 1.3 }} noWrap>+{p.row.user?.phone}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'docs', headerName: 'Documents', width: 240, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ height: '100%' }}>
          {DOCS.map((d) => {
            const has = !!p.row.kycDocuments?.[d.key];
            return <Chip key={d.key} size="small" label={d.label}
              sx={{ background: has ? alpha(C.green, 0.14) : alpha(C.textDim, 0.1), color: has ? C.green : C.textDim,
                fontWeight: 600, border: `1px solid ${has ? alpha(C.green, 0.3) : C.borderSoft}` }} />;
          })}
        </Stack>
      ),
    },
    {
      field: 'kyc', headerName: 'ID numbers', width: 150, sortable: false,
      renderCell: (p) => {
        const hasA = !!p.row.kyc?.aadhaarNumber, hasP = !!p.row.kyc?.panNumber;
        if (!hasA && !hasP) return <Typography variant="caption" sx={{ color: C.textDim }}>—</Typography>;
        return <Typography variant="caption" sx={{ color: C.textDim }}>{[hasA && 'Aadhaar', hasP && 'PAN'].filter(Boolean).join(' · ')}</Typography>;
      },
    },
    { field: 'kycStatus', headerName: 'KYC status', width: 130, renderCell: (p) => <StatusChip status={p.value || 'pending'} /> },
    {
      field: '__actions', headerName: 'Actions', width: 200, sortable: false, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', width: '100%' }}>
          <Tooltip title="View documents"><span><Button size="small" variant="outlined" disabled={docCount(p.row) === 0} onClick={() => setView(p.row)} sx={{ minWidth: 0, px: 1 }}><VisibilityIcon fontSize="small" /></Button></span></Tooltip>
          <Tooltip title="Edit KYC"><Button size="small" variant="outlined" onClick={() => navigate(`/astrologers/${p.row._id}/edit`)} sx={{ minWidth: 0, px: 1 }}><EditIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      ),
    },
  ];

  const verified = rows.filter((r) => r.kycStatus === 'approved').length;
  const missing = rows.filter((r) => docCount(r) === 0).length;

  return (
    <Box>
      <PageHeader title="KYC Records"
        subtitle={`Optional compliance records · ${verified} verified · ${missing} with no documents`} />
      <AdminTable rows={filtered} columns={columns} loading={loading} title="All astrologers"
        search={{ value: search, onChange: setSearch, placeholder: 'Search astrologers…' }}
        emptyTitle="No astrologers yet" emptyHint="KYC is optional and can be filled from the astrologer editor" />

      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: C.surface, border: `1px solid ${C.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          KYC documents — {view?.name}
          <Typography variant="caption" sx={{ display: 'block', color: C.textDim, fontWeight: 400 }}>
            {view?.kyc?.aadhaarNumber ? `Aadhaar: ${view.kyc.aadhaarNumber}` : 'No Aadhaar number'}
            {view?.kyc?.panNumber ? ` · PAN: ${view.kyc.panNumber}` : ''}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: C.borderSoft }}>
          <Grid container spacing={2}>
            {DOCS.map((d) => {
              const url = view?.kycDocuments?.[d.key];
              return (
                <Grid item xs={12} sm={4} key={d.key}>
                  <Typography variant="overline" sx={{ color: C.textDim }}>{d.label}</Typography>
                  <Box sx={{ mt: 0.5, height: 200, borderRadius: 1.5, border: `1px dashed ${C.border}`,
                    background: url ? `url(${url}) center/contain no-repeat ${C.surface2}` : C.surface2,
                    display: 'grid', placeItems: 'center', cursor: url ? 'zoom-in' : 'default' }}
                    onClick={() => url && window.open(url, '_blank')}>
                    {!url && <Typography variant="caption" sx={{ color: C.textDim }}>Not uploaded</Typography>}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => decide(view, 'rejected')}>Mark rejected</Button>
            <Button variant="contained" startIcon={<CheckIcon />} onClick={() => decide(view, 'approved')}>Mark verified</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
