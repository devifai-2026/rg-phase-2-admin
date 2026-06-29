import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Rating, Typography, Avatar, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { statusColumn, actionsColumn } from '../components/tableHelpers';
import { exportCsv } from '../components/csv';

export default function Astrologers() {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listAstrologers({ limit: 100 });
      setRows(data.data.items.map((a) => ({ id: a._id, ...a, userName: a.user?.name, userPhone: a.user?.phone, isBlocked: a.user?.isBlocked })));
    } catch { toast.error('Failed to load astrologers'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onDelete = async (row) => {
    if (!window.confirm(`Remove astrologer ${row.displayName || row.userName}?`)) return;
    try { await AdminAPI.deleteAstrologer(row._id); toast.success('Astrologer removed'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const toggleBlock = async (row) => {
    const blocked = row.isBlocked;
    if (!window.confirm(`${blocked ? 'Unblock' : 'Block'} login for ${row.displayName || row.userName}?`)) return;
    try { await AdminAPI.blockUser(row.user?._id || row.user, !blocked); toast.success(blocked ? 'Login unblocked' : 'Login blocked'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  const toggleFeatured = async (row) => {
    try { await AdminAPI.updateAstrologer(row._id, { isFeatured: !row.isFeatured }); toast.success(row.isFeatured ? 'Removed from featured' : 'Marked as featured'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  const onExport = () => exportCsv('astrologers', [
    { header: 'Name', value: (r) => r.displayName || r.userName },
    { header: 'Phone', value: (r) => r.userPhone },
    { header: 'Expertise', value: (r) => (r.expertise || []).join('; ') },
    { header: 'City', value: (r) => r.location?.city || '' },
    { header: 'Pincode', value: (r) => r.location?.pincode || '' },
    { header: 'Rating', value: (r) => r.rating || 0 },
    { header: 'KYC', value: (r) => r.kycStatus },
    { header: 'Online', value: (r) => (r.isOnline ? 'Yes' : 'No') },
    { header: 'Blocked', value: (r) => (r.isBlocked ? 'Yes' : 'No') },
    { header: 'Earnings', value: (r) => r.totalEarnings || 0 },
  ], rows);

  const columns = [
    {
      field: 'displayName', headerName: 'Astrologer', flex: 1, minWidth: 220,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: '100%', width: '100%' }}>
          <Avatar src={p.row.avatar} sx={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>{(p.value || p.row.userName || 'A')[0]}</Avatar>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>{p.value || p.row.userName || '—'}</Typography>
              {p.row.isFeatured && <StarIcon sx={{ fontSize: 13, color: b.amber }} />}
            </Stack>
            <Typography variant="caption" sx={{ color: b.textFaint, lineHeight: 1.2 }} noWrap>{p.row.userPhone}</Typography>
          </Box>
        </Stack>
      ),
    },
    { field: 'expertise', headerName: 'Expertise', width: 170, valueGetter: (v) => (v || []).join(', ') || '—' },
    { field: 'rating', headerName: 'Rating', width: 140, renderCell: (p) => <Stack direction="row" alignItems="center" spacing={0.5} sx={{ height: '100%' }}><Rating value={p.value || 0} precision={0.5} size="small" readOnly /><span style={{ color: b.textFaint, fontSize: 12 }}>({p.row.reviewCount || 0})</span></Stack> },
    statusColumn({ field: 'kycStatus', headerName: 'KYC', width: 110 }),
    {
      field: 'isOnline', headerName: 'Status', width: 120,
      renderCell: (p) => p.row.isBlocked
        ? <Chip size="small" label="Blocked" sx={{ background: alpha(b.red, 0.16), color: b.red, fontWeight: 700, border: `1px solid ${alpha(b.red, 0.3)}` }} />
        : <StatusChip status={p.value ? 'online' : 'offline'} />,
    },
    { field: 'totalEarnings', headerName: 'Earnings', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <span style={{ fontWeight: 700, color: b.red }}>{rupees(p.value)}</span> },
    actionsColumn({
      count: 5,
      getActions: (row) => [
        { icon: row.isFeatured ? <StarIcon fontSize="small" sx={{ color: b.amber }} /> : <StarBorderIcon fontSize="small" />, tip: row.isFeatured ? 'Unfeature' : 'Mark featured', onClick: () => toggleFeatured(row) },
        { icon: <VisibilityIcon fontSize="small" />, tip: 'View / Call logs', onClick: () => navigate(`/astrologers/${row._id}`) },
        { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => navigate(`/astrologers/${row._id}/edit`) },
        row.isBlocked
          ? { icon: <LockOpenIcon fontSize="small" />, tip: 'Unblock login', onClick: () => toggleBlock(row) }
          : { icon: <BlockIcon fontSize="small" />, tip: 'Block login', danger: true, onClick: () => toggleBlock(row) },
        { icon: <DeleteIcon fontSize="small" />, tip: 'Remove', danger: true, onClick: () => onDelete(row) },
      ],
    }),
  ];

  return (
    <>
      <PageHeader title="Astrologers" subtitle="Manage profiles, rates and commission"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/astrologers/new')}>Add Astrologer</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="All astrologers" onExport={onExport}
        emptyTitle="No astrologers yet" emptyHint="Add your first astrologer to get started" />
    </>
  );
}
