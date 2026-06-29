import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Tabs, Tab, Stack, Avatar, Chip, Grid, Button, Divider, Rating, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PlayIcon from '@mui/icons-material/PlayCircle';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { alpha, useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import EmptyState from '../components/EmptyState';
import StorefrontPhoneMockup from '../components/StorefrontPhoneMockup';

const dt = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function AstrologerDetail() {
  const { palette } = useTheme();
  const C = palette.brand;
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rv, setRv] = useState({ authorName: '', rating: 5, serviceType: '', comment: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => AdminAPI.astrologerFull(id).then((r) => setD(r.data.data)).catch(() => toast.error('Failed to load')), [id]);
  useEffect(() => { load(); }, [load]);

  const submitReview = async () => {
    if (!rv.authorName.trim()) return toast.error('Enter a reviewer name');
    setSaving(true);
    try {
      await AdminAPI.addAstrologerReview(id, {
        authorName: rv.authorName.trim(), rating: rv.rating,
        serviceType: rv.serviceType || undefined, comment: rv.comment.trim(),
      });
      toast.success('Review added');
      setReviewOpen(false); setRv({ authorName: '', rating: 5, serviceType: '', comment: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to add review'); }
    finally { setSaving(false); }
  };

  const deleteReview = async (row) => {
    if (!window.confirm('Delete this review? The rating will be recalculated.')) return;
    try { await AdminAPI.deleteReview(row._id); toast.success('Review deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  const toggleBlock = async () => {
    const blocked = d.profile.user?.isBlocked;
    if (!window.confirm(`${blocked ? 'Unblock' : 'Block'} login for ${d.profile.displayName || d.profile.user?.name}?`)) return;
    try { await AdminAPI.blockUser(d.profile.user?._id, !blocked); toast.success(blocked ? 'Unblocked' : 'Blocked'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  if (!d) return <PageHeader title="Astrologer" subtitle="Loading…" />;
  const a = d.profile;

  const stat = (label, value) => (
    <Grid item xs={6} md={3}>
      <Box sx={{ p: 1.5, borderRadius: 1.5, background: alpha(C.surface2, 0.6), border: `1px solid ${C.borderSoft}` }}>
        <Typography variant="caption" sx={{ color: C.textDim }}>{label}</Typography>
        <Typography variant="h6">{value}</Typography>
      </Box>
    </Grid>
  );
  const gridBox = (rows, cols, empty) => (
    <Box sx={{ height: 440 }}>
      <DataGrid rows={rows.map((r, i) => ({ id: r._id || i, ...r }))} columns={cols} disableRowSelectionOnClick rowHeight={52}
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: () => <EmptyState title={empty} /> }} sx={{ border: 'none' }} />
    </Box>
  );

  const sessionCols = [
    { field: 'type', headerName: 'Service', width: 90, renderCell: (p) => <Chip size="small" label={p.value} sx={{ textTransform: 'capitalize' }} /> },
    { field: 'user', headerName: 'User', width: 140, valueGetter: (v) => v?.name || '—' },
    { field: 'startedAt', headerName: 'Started', width: 150, valueFormatter: dt },
    { field: 'durationSec', headerName: 'Duration', width: 100, valueFormatter: (v) => v ? `${Math.floor(v / 60)}m ${v % 60}s` : '—' },
    { field: 'callQuality', headerName: 'Call quality', width: 120, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value ? <Rating value={p.value} size="small" readOnly /> : <span style={{ color: C.textDim }}>—</span> },
    { field: 'astrologerEarning', headerName: 'Earned', width: 100, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: C.green }}>{rupees(p.value)}</strong> },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'recordingUrl', headerName: 'Rec', width: 80, sortable: false, renderCell: (p) => p.value ? <Button size="small" href={p.value} target="_blank" sx={{ color: C.red, minWidth: 0 }}><PlayIcon fontSize="small" /></Button> : '—' },
  ];
  const wdCols = [
    { field: 'createdAt', headerName: 'When', width: 150, valueFormatter: dt },
    { field: 'amount', headerName: 'Amount', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: C.red }}>{rupees(p.value)}</strong> },
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'payoutRef', headerName: 'Ref', flex: 1, minWidth: 140, valueGetter: (v) => v || '—' },
  ];
  const reviewCols = [
    { field: 'createdAt', headerName: 'When', width: 140, valueFormatter: dt },
    { field: 'from', headerName: 'From', width: 150, valueGetter: (v, r) => r.authorName || r.user?.name || 'User' },
    { field: 'source', headerName: 'Type', width: 100, renderCell: (p) => p.row.source === 'admin'
        ? <Chip size="small" label="Admin" sx={{ background: alpha(C.amber, 0.16), color: C.amber, fontWeight: 700 }} />
        : <Chip size="small" label="User" sx={{ background: alpha(C.green, 0.14), color: C.green, fontWeight: 700 }} /> },
    { field: 'rating', headerName: 'Rating', width: 130, renderCell: (p) => <Rating value={p.value} size="small" readOnly /> },
    { field: 'comment', headerName: 'Comment', flex: 1, minWidth: 200, valueGetter: (v) => v || '—' },
    { field: '__del', headerName: '', width: 56, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Tooltip title="Delete review"><IconButton size="small" onClick={() => deleteReview(p.row)} sx={{ color: C.red }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
      ) },
  ];
  const giftCols = [
    { field: 'createdAt', headerName: 'When', width: 150, valueFormatter: dt },
    { field: 'gift', headerName: 'Gift', width: 160, valueGetter: (v) => v?.name || 'Gift' },
    { field: 'sender', headerName: 'From', width: 150, valueGetter: (v) => v?.name || 'User' },
    { field: 'amountRupees', headerName: 'Value', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: C.green }}>{rupees(p.value)}</strong> },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/astrologers')} sx={{ color: C.textDim, mb: 1 }}>Back</Button>

      {/* Two columns: details (left) + live storefront preview in a phone mockup (right). */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>

      <Card sx={{ mb: 2 }}>
        <Box sx={{ height: 56, background: `linear-gradient(135deg, ${C.RED.main}, ${C.RED.hover})` }} />
        <CardContent sx={{ mt: -4.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-end">
            <Avatar src={a.avatar} sx={{ width: 80, height: 80, border: `3px solid ${C.surface}`, background: C.surface2, fontSize: 30 }}>{(a.displayName || a.user?.name || 'A')[0]}</Avatar>
            <Box sx={{ flex: 1, pb: 0.5 }}>
              <Typography variant="h5">{a.displayName || a.user?.name}</Typography>
              <Typography variant="body2" sx={{ color: C.textDim }}>+{a.user?.phone} · {(a.expertise || []).join(', ') || 'No expertise'}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pb: 0.5 }}>
              {a.isFeatured && <Chip size="small" label="Featured" sx={{ background: alpha(C.amber, 0.16), color: C.amber, fontWeight: 700 }} />}
              {a.user?.isBlocked && <Chip size="small" label="Blocked" sx={{ background: alpha(C.red, 0.16), color: C.red, fontWeight: 700 }} />}
              <StatusChip status={d.online ? 'online' : 'offline'} />
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/astrologers/${id}/edit`)}>Edit</Button>
              <Button size="small" variant="outlined" startIcon={a.user?.isBlocked ? <LockOpenIcon /> : <BlockIcon />} onClick={toggleBlock}
                sx={{ borderColor: alpha(C.red, 0.5), color: C.red }}>{a.user?.isBlocked ? 'Unblock' : 'Block'}</Button>
            </Stack>
          </Stack>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {stat('Wallet balance', rupees(d.wallet.balance))}
            {stat('Total earnings', rupees(a.totalEarnings))}
            {stat('Consultations', d.stats.totalConsultations)}
            {stat('Rating', `${a.rating || 0} (${a.reviewCount || 0})`)}
          </Grid>

          {/* Device permissions granted in the astrologer app (no location). */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" sx={{ color: C.textDim }}>Device permissions</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {['notifications', 'microphone', 'camera', 'photos'].map((k) => {
                const granted = !!(a.user?.permissions || {})[k];
                const label = k.charAt(0).toUpperCase() + k.slice(1);
                return (
                  <Chip key={k} size="small" label={label}
                    sx={{ height: 24, background: alpha(granted ? C.green : C.textFaint, 0.16), color: granted ? C.green : C.textFaint, fontWeight: 600 }} />
                );
              })}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${C.border}` }}>
          <Tab label="Rates" />
          <Tab label={`Sessions (${d.sessions.length})`} />
          <Tab label={`Withdrawals (${d.withdrawals.length})`} />
          <Tab label={`Reviews (${d.reviews.length})`} />
          <Tab label={`Gifts (${d.gifts.length})`} />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <Grid container spacing={2}>
              {['call', 'chat', 'video'].map((svc) => {
                const r = a.rates?.[svc] || {};
                const st = d.byType[svc] || {};
                return (
                  <Grid item xs={12} md={4} key={svc}>
                    <Box sx={{ p: 2, borderRadius: 1.5, background: alpha(C.surface2, 0.6), border: `1px solid ${C.border}` }}>
                      <Typography variant="overline" sx={{ color: C.red }}>{svc}</Typography>
                      <Divider sx={{ my: 1, borderColor: C.borderSoft }} />
                      <Row k="Rate / min" v={rupees(r.ratePerMin)} C={C} />
                      <Row k="Admin cut / min" v={rupees(r.adminCutPerMin)} C={C} />
                      <Row k="Astrologer / min" v={rupees((r.ratePerMin || 0) - (r.adminCutPerMin || 0))} highlight C={C} />
                      <Divider sx={{ my: 1, borderColor: C.borderSoft }} />
                      <Row k="Completed" v={st.count || 0} C={C} />
                      <Row k="Earned" v={rupees(st.earnings || 0)} C={C} />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
          {tab === 1 && gridBox(d.sessions, sessionCols, 'No sessions')}
          {tab === 2 && gridBox(d.withdrawals, wdCols, 'No withdrawals')}
          {tab === 3 && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: C.textDim }}>{d.reviews.length} review(s) · drives the public rating</Typography>
                <Button size="small" variant="contained" startIcon={<RateReviewIcon />} onClick={() => setReviewOpen(true)}>Write review</Button>
              </Stack>
              {gridBox(d.reviews, reviewCols, 'No reviews yet')}
            </>
          )}
          {tab === 4 && gridBox(d.gifts, giftCols, 'No gifts received')}
        </CardContent>
      </Card>

        </Box>{/* /left column */}

        {/* Right column: the seeker-facing storefront in a phone mockup. */}
        <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
          <StorefrontPhoneMockup profileId={id} />
        </Box>
      </Box>

      {/* Admin writes a review under a fake reviewer name (testimonial seeding) */}
      <Dialog open={reviewOpen} onClose={() => !saving && setReviewOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: C.surface, border: `1px solid ${C.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Write a review for {a.displayName || a.user?.name}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: C.borderSoft }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: C.textDim }}>
              Posted under the name you choose — it counts toward the astrologer's public rating.
            </Typography>
            <TextField label="Reviewer name" value={rv.authorName} fullWidth autoFocus
              onChange={(e) => setRv((s) => ({ ...s, authorName: e.target.value.slice(0, 80) }))}
              placeholder="e.g. Priya S." />
            <Box>
              <Typography variant="caption" sx={{ color: C.textDim }}>Rating</Typography>
              <Rating value={rv.rating} onChange={(e, v) => setRv((s) => ({ ...s, rating: v || 1 }))} sx={{ display: 'block', mt: 0.5 }} />
            </Box>
            <TextField label="Service (optional)" select value={rv.serviceType} fullWidth
              onChange={(e) => setRv((s) => ({ ...s, serviceType: e.target.value }))}>
              <MenuItem value="">No specific service</MenuItem>
              <MenuItem value="call">Call</MenuItem>
              <MenuItem value="chat">Chat</MenuItem>
              <MenuItem value="video">Video</MenuItem>
            </TextField>
            <TextField label="Comment (optional)" value={rv.comment} fullWidth multiline minRows={3}
              onChange={(e) => setRv((s) => ({ ...s, comment: e.target.value.slice(0, 1000) }))}
              placeholder="What was great about the consultation?" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReviewOpen(false)} disabled={saving} sx={{ color: C.textDim }}>Cancel</Button>
          <Button variant="contained" onClick={submitReview} disabled={saving || !rv.authorName.trim()}>{saving ? 'Adding…' : 'Add review'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Row({ k, v, highlight, C }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
      <Typography variant="body2" sx={{ color: C.textDim }}>{k}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: highlight ? C.green : C.text }}>{v}</Typography>
    </Stack>
  );
}
