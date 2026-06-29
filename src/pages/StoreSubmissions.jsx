import { useEffect, useState, useCallback } from 'react';
import { Box, Button, Stack, Avatar, Chip, Typography, ToggleButton, ToggleButtonGroup, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, rupees } from '../components/common';
import ImageUpload from '../components/ImageUpload';

/**
 * Astrologer storefront submissions queue. Lists astrologer-created products +
 * poojas by status; admin approves (sets commission %) or rejects (with a note).
 * Approval makes the item live on the astrologer's storefront + the user shop.
 */
export default function StoreSubmissions() {
  const { palette } = useTheme();
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState({ products: [], poojas: [] });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { mode:'approve'|'reject'|'edit', kind, item }
  const [commission, setCommission] = useState('15');
  const [note, setNote] = useState('');
  const [form, setForm] = useState({}); // edit form fields

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await AdminAPI.storeSubmissions(status);
      setData(r.data.data);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const openApprove = (kind, item) => { setDialog({ mode: 'approve', kind, item }); setCommission(String(item.commissionPercent || 15)); };
  const openReject = (kind, item) => { setDialog({ mode: 'reject', kind, item }); setNote(''); };
  const openEdit = (kind, item) => {
    setDialog({ mode: 'edit', kind, item });
    setForm(kind === 'pooja'
      ? { name: item.name || '', description: item.description || '', basePrice: item.basePrice ?? 0, durationNote: item.durationNote || '', commissionPercent: item.commissionPercent ?? 0,
          imagePortrait: item.imagePortrait || item.image || '', imageLandscape: item.imageLandscape || '',
          manualRating: item.manualRating ?? 0, manualReviewCount: item.manualReviewCount ?? 0, manualBookedCount: item.manualBookedCount ?? 0 }
      : { name: item.name || '', description: item.description || '', price: item.price ?? 0, mrp: item.mrp ?? 0, stock: item.stock ?? 0, categoryName: item.categoryName || '', commissionPercent: item.commissionPercent ?? 0,
          images: Array.isArray(item.images) ? item.images : [],
          manualRating: item.manualRating ?? 0, manualReviewCount: item.manualReviewCount ?? 0, manualSoldCount: item.manualSoldCount ?? 0 });
  };

  const submitEdit = async () => {
    const { kind, item } = dialog;
    try {
      await AdminAPI.editStoreItem(kind, item._id, form);
      toast.success('Saved');
      setDialog(null); load();
    } catch { toast.error('Save failed'); }
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submitApprove = async () => {
    const { kind, item } = dialog;
    try {
      await AdminAPI.approveStoreItem(kind, item._id, Number(commission) || 0);
      toast.success('Approved & live');
      setDialog(null); load();
    } catch { toast.error('Approve failed'); }
  };
  const submitReject = async () => {
    const { kind, item } = dialog;
    try {
      await AdminAPI.rejectStoreItem(kind, item._id, note.trim());
      toast.success('Rejected');
      setDialog(null); load();
    } catch { toast.error('Reject failed'); }
  };

  const card = (kind, item) => (
    <Box key={item._id} sx={{ p: 2, border: `1px solid ${palette.divider}`, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Avatar variant="rounded" src={kind === 'pooja' ? (item.imagePortrait || item.image) : item.images?.[0]} sx={{ width: 56, height: 56 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontWeight={700} noWrap>{item.name}</Typography>
          <Chip size="small" label={kind === 'pooja' ? 'Pooja' : 'Product'} />
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {rupees(kind === 'pooja' ? item.basePrice : item.price)}
          {item.astrologer?.name ? ` · by ${item.astrologer.name}` : ''}
        </Typography>
        {item.description ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }} noWrap>{item.description}</Typography> : null}
        {status === 'rejected' && item.adminNote ? <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>Note: {item.adminNote}</Typography> : null}
        {status === 'approved' ? <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>Commission {item.commissionPercent}%</Typography> : null}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(kind, item)}>Edit</Button>
        {status !== 'approved' && (
          <>
            <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => openApprove(kind, item)}>Approve</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => openReject(kind, item)}>Reject</Button>
          </>
        )}
      </Stack>
    </Box>
  );

  const all = [
    ...data.products.map((p) => ['product', p]),
    ...data.poojas.map((p) => ['pooja', p]),
  ];

  return (
    <Box>
      <PageHeader title="Store Submissions" subtitle="Review astrologer-listed products & poojas" />

      <ToggleButtonGroup size="small" value={status} exclusive onChange={(_, v) => v && setStatus(v)} sx={{ mb: 2 }}>
        <ToggleButton value="pending">Pending</ToggleButton>
        <ToggleButton value="approved">Approved</ToggleButton>
        <ToggleButton value="rejected">Rejected</ToggleButton>
      </ToggleButtonGroup>

      {loading ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : all.length === 0 ? (
        <Typography color="text.secondary">No {status} submissions.</Typography>
      ) : (
        <Stack spacing={1.5}>{all.map(([kind, item]) => card(kind, item))}</Stack>
      )}

      {/* Edit / Approve / Reject dialog */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        {dialog?.mode === 'edit' ? (
          <>
            <DialogTitle>Edit “{dialog.item.name}”</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Photos / banners — admin can replace what the astrologer uploaded. */}
                {dialog.kind === 'pooja' ? (
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Stack alignItems="center" spacing={0.5}>
                      <ImageUpload value={form.imagePortrait || ''} onChange={(url) => setField('imagePortrait', url)} label="card photo" size={72} variant="rounded" />
                      <Typography variant="caption" color="text.secondary">Card (3:4)</Typography>
                    </Stack>
                    <Stack alignItems="center" spacing={0.5}>
                      <ImageUpload value={form.imageLandscape || ''} onChange={(url) => setField('imageLandscape', url)} label="banner" size={72} variant="rounded" />
                      <Typography variant="caption" color="text.secondary">Banner (16:9)</Typography>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack alignItems="flex-start" spacing={0.5}>
                    <ImageUpload
                      value={(form.images && form.images[0]) || ''}
                      onChange={(url) => setField('images', url ? [url, ...(form.images || []).slice(1)] : (form.images || []).slice(1))}
                      label="product photo" size={80} variant="rounded"
                    />
                    <Typography variant="caption" color="text.secondary">Product photo</Typography>
                  </Stack>
                )}
                <TextField label="Name" fullWidth value={form.name || ''} onChange={(e) => setField('name', e.target.value)} />
                <TextField label="Description" fullWidth multiline minRows={2} value={form.description || ''} onChange={(e) => setField('description', e.target.value)} />
                {dialog.kind === 'pooja' ? (
                  <>
                    <TextField label="Price (₹)" type="number" fullWidth value={form.basePrice ?? 0} onChange={(e) => setField('basePrice', Number(e.target.value))} />
                    <TextField label="Duration note" fullWidth value={form.durationNote || ''} onChange={(e) => setField('durationNote', e.target.value)} />
                  </>
                ) : (
                  <>
                    <Stack direction="row" spacing={2}>
                      <TextField label="Price (₹)" type="number" fullWidth value={form.price ?? 0} onChange={(e) => setField('price', Number(e.target.value))} />
                      <TextField label="MRP (₹)" type="number" fullWidth value={form.mrp ?? 0} onChange={(e) => setField('mrp', Number(e.target.value))} />
                      <TextField label="Stock" type="number" fullWidth value={form.stock ?? 0} onChange={(e) => setField('stock', Number(e.target.value))} />
                    </Stack>
                    <TextField label="Category name" fullWidth value={form.categoryName || ''} onChange={(e) => setField('categoryName', e.target.value)} />
                  </>
                )}
                <TextField label="Commission %" type="number" fullWidth value={form.commissionPercent ?? 0} onChange={(e) => setField('commissionPercent', Number(e.target.value))} inputProps={{ min: 0, max: 100 }} />
                <Typography variant="caption" color="text.secondary">Social proof (display only — fake ratings/sales until real activity catches up)</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField label="Rating (0-5)" type="number" fullWidth value={form.manualRating ?? 0} onChange={(e) => setField('manualRating', Number(e.target.value))} inputProps={{ min: 0, max: 5, step: 0.1 }} />
                  <TextField label="Reviews #" type="number" fullWidth value={form.manualReviewCount ?? 0} onChange={(e) => setField('manualReviewCount', Number(e.target.value))} inputProps={{ min: 0 }} />
                  {dialog.kind !== 'pooja' && (
                    <TextField label="Sold #" type="number" fullWidth value={form.manualSoldCount ?? 0} onChange={(e) => setField('manualSoldCount', Number(e.target.value))} inputProps={{ min: 0 }} />
                  )}
                  {dialog.kind === 'pooja' && (
                    <TextField label="Booked #" type="number" fullWidth value={form.manualBookedCount ?? 0} onChange={(e) => setField('manualBookedCount', Number(e.target.value))} inputProps={{ min: 0 }} />
                  )}
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="contained" onClick={submitEdit}>Save changes</Button>
            </DialogActions>
          </>
        ) : dialog?.mode === 'approve' ? (
          <>
            <DialogTitle>Approve “{dialog.item.name}”</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set the platform commission. The astrologer keeps the rest of each sale.
              </Typography>
              <TextField
                label="Commission %" type="number" fullWidth value={commission}
                onChange={(e) => setCommission(e.target.value)}
                inputProps={{ min: 0, max: 100 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="contained" color="success" onClick={submitApprove}>Approve & go live</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>Reject “{dialog?.item.name}”</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Tell the astrologer what to fix — they’ll see this note and can resubmit.
              </Typography>
              <TextField
                label="Reason" fullWidth multiline minRows={3} value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="contained" color="error" onClick={submitReject}>Reject</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
