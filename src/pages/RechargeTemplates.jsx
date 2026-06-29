import { useEffect, useState, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, FormControlLabel, Switch, Typography, Chip, Grid, Divider } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { moneyColumn, actionsColumn } from '../components/tableHelpers';
import { Field, rules } from '../components/formKit';
import ImageUpload from '../components/ImageUpload';

export default function RechargeTemplates() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [image, setImage] = useState('');
  const [benefits, setBenefits] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { register, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { amount: 0, tokens: 0, name: '', badge: '', sortOrder: 0 } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listRechargeTemplates(); setRows(data.data.map((t) => ({ id: t._id, ...t }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    reset({ amount: row?.amount ?? 0, tokens: row?.tokens ?? 0, name: row?.name || '', badge: row?.badge || '', sortOrder: row?.sortOrder ?? 0 });
    setImage(row?.image || ''); setBenefits((row?.benefits || []).join('\n')); setIsActive(row?.isActive ?? true); setDialog(row || {});
  };

  const onSubmit = async (form) => {
    const body = {
      amount: Number(form.amount), tokens: Number(form.tokens),
      name: (form.name || '').trim(), badge: (form.badge || '').trim().toUpperCase(),
      benefits: benefits.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8),
      image, isActive, sortOrder: Number(form.sortOrder || 0),
    };
    try {
      if (dialog._id) await AdminAPI.updateRechargeTemplate(dialog._id, body);
      else await AdminAPI.createRechargeTemplate(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const onDelete = async (row) => { if (!window.confirm(`Delete the ₹${row.amount} pack?`)) return; try { await AdminAPI.deleteRechargeTemplate(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const amount = Number(watch('amount') || 0);
  const tokens = Number(watch('tokens') || 0);
  const bonus = Math.max(0, tokens - amount);

  const columns = [
    { field: 'sortOrder', headerName: '#', width: 60, type: 'number', align: 'center', headerAlign: 'center' },
    {
      field: 'name', headerName: 'Pack', flex: 1, minWidth: 200,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.value || `₹${p.row.amount} pack`}</Typography>
          {p.row.badge && <Chip size="small" label={p.row.badge} sx={{ background: alpha(b.amber, 0.16), color: b.amber, fontWeight: 700, height: 20 }} />}
        </Stack>
      ),
    },
    moneyColumn({ field: 'amount', headerName: 'Pays', accent: true }),
    { field: 'tokens', headerName: 'Gets (tokens)', width: 130, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: b.green }}>{p.value}</strong> },
    { field: 'bonus', headerName: 'Bonus', width: 110, type: 'number', align: 'right', headerAlign: 'right', valueGetter: (v, r) => Math.max(0, (r.tokens || 0) - (r.amount || 0)), renderCell: (p) => p.value > 0 ? <Chip size="small" label={`+${p.value}`} sx={{ background: alpha(b.green, 0.14), color: b.green, fontWeight: 700 }} /> : <span style={{ color: b.textFaint }}>—</span> },
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <StatusChip status={p.value ? 'active' : 'offline'} /> },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
    ] }),
  ];

  return (
    <>
      <PageHeader title="Recharge Templates" subtitle="Predefined “Add money” packs shown in the app wallet"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add Pack</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="Recharge packs"
        emptyTitle="No recharge packs yet" emptyHint="Create packs like “Pay ₹100, get 120 tokens”" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} Recharge Pack</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={7}>
                <Stack spacing={2}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}><Field name="amount" label="User pays (₹)" type="number" register={register} errors={errors} rules={rules.money('Amount')} inputProps={{ min: 1 }} /></Grid>
                    <Grid item xs={6}><Field name="tokens" label="User gets (tokens)" type="number" register={register} errors={errors} rules={rules.money('Tokens')} inputProps={{ min: 1 }} /></Grid>
                  </Grid>
                  {bonus > 0 && <Typography variant="caption" sx={{ color: b.green, fontWeight: 700 }}>Bonus: +{bonus} tokens ({Math.round((bonus / Math.max(1, amount)) * 100)}% extra)</Typography>}
                  <Field name="name" label="Pack name" placeholder="e.g. Best Value" register={register} errors={errors} />
                  <Field name="badge" label="Badge (optional)" placeholder="e.g. POPULAR / 20% EXTRA" register={register} errors={errors} inputProps={{ style: { textTransform: 'uppercase' } }} />
                  <TextField label="Benefits (one per line)" multiline rows={3} fullWidth value={benefits}
                    onChange={(e) => setBenefits(e.target.value)} InputLabelProps={{ shrink: true }}
                    placeholder={'Most popular\nInstant wallet credit'} helperText="Up to 8 lines" />
                  <Field name="sortOrder" label="Sort order (lower shows first)" type="number" register={register} errors={errors} inputProps={{ min: 0 }} />
                  <ImageUpload value={image} onChange={setImage} label="icon" variant="rounded" size={56} fallback="₹" />
                  <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active (visible in app)" />
                </Stack>
              </Grid>
              {/* Live app-card preview */}
              <Grid item xs={12} sm={5}>
                <Typography variant="overline" sx={{ color: b.textDim }}>App preview</Typography>
                <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: `1px solid ${b.border}`, background: b.surface2, position: 'relative' }}>
                  {(watch('badge') || '').trim() && (
                    <Chip size="small" label={(watch('badge') || '').toUpperCase()} sx={{ position: 'absolute', top: -10, right: 12, background: b.amber, color: '#fff', fontWeight: 700, height: 20 }} />
                  )}
                  <Typography variant="h5" sx={{ fontWeight: 800, color: b.text }}>{tokens || 0} <Typography component="span" variant="caption" sx={{ color: b.textDim }}>tokens</Typography></Typography>
                  <Typography variant="body2" sx={{ color: b.textDim }}>{(watch('name') || '').trim() || 'Recharge pack'}</Typography>
                  {bonus > 0 && <Typography variant="caption" sx={{ color: b.green, fontWeight: 700, display: 'block', mt: 0.5 }}>+{bonus} bonus</Typography>}
                  <Divider sx={{ my: 1.5, borderColor: b.borderSoft }} />
                  <Stack spacing={0.5}>
                    {benefits.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x, i) => (
                      <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                        <CheckIcon sx={{ fontSize: 14, color: b.green }} />
                        <Typography variant="caption" sx={{ color: b.text }}>{x}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 1.5, py: 0.75, borderRadius: 1.5, textAlign: 'center', background: b.red, color: '#fff', fontWeight: 700 }}>
                    Pay {rupees(amount || 0)}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button><Button type="submit" variant="contained" disabled={!isValid}>Save</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
