import { useEffect, useState, useCallback } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, MenuItem, Chip, TextField, Switch, FormControlLabel, Grid, Autocomplete, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn, dateColumn } from '../components/tableHelpers';
import { Field, rules } from '../components/formKit';

export default function Coupons() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [targets, setTargets] = useState([]); // selected category/product objects
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { type: 'percentage', scope: 'all', isActive: true } });
  const type = watch('type');
  const scope = watch('scope');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, cat, pr] = await Promise.all([AdminAPI.listCoupons(), PublicAPI.categories(), PublicAPI.products({ limit: 200 })]);
      setRows(c.data.data.map((x) => ({ id: x._id, ...x })));
      setCats(cat.data.data); setProducts(pr.data.data.items);
    } catch { toast.error('Failed to load coupons'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    reset({
      code: row?.code || '', description: row?.description || '', type: row?.type || 'percentage',
      value: row?.value ?? 0, maxDiscount: row?.maxDiscount ?? 0, minOrderValue: row?.minOrderValue ?? 0,
      scope: row?.scope || 'all', usageLimit: row?.usageLimit ?? 0, perUserLimit: row?.perUserLimit ?? 0,
      validFrom: row?.validFrom?.slice?.(0, 10) || '', validUntil: row?.validUntil?.slice?.(0, 10) || '', isActive: row?.isActive ?? true,
    });
    // Resolve saved target ids back to objects for the picker.
    const ids = (row?.targets || []).map(String);
    const pool = row?.scope === 'product' ? products : cats;
    setTargets(pool.filter((x) => ids.includes(String(x._id))));
    setDialog(row || {});
  };

  const onSubmit = async (form) => {
    const body = { ...form, value: Number(form.value), maxDiscount: Number(form.maxDiscount || 0), minOrderValue: Number(form.minOrderValue || 0), usageLimit: Number(form.usageLimit || 0), perUserLimit: Number(form.perUserLimit || 0) };
    body.targets = form.scope === 'all' ? [] : targets.map((t) => t._id);
    if (form.scope !== 'all' && body.targets.length === 0) return toast.error(`Pick at least one ${form.scope}`);
    if (!body.validFrom) delete body.validFrom;
    if (!body.validUntil) delete body.validUntil;
    try {
      if (dialog._id) await AdminAPI.updateCoupon(dialog._id, body);
      else await AdminAPI.createCoupon(body);
      toast.success('Coupon saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.code}?`)) return; try { await AdminAPI.deleteCoupon(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const columns = [
    { field: 'code', headerName: 'Code', width: 140, renderCell: (p) => <Chip size="small" label={p.value} sx={{ fontWeight: 700, fontFamily: 'monospace', background: `${b.red}18`, color: b.red }} /> },
    { field: 'type', headerName: 'Type', width: 110, valueFormatter: (v) => v === 'percentage' ? 'Percent' : 'Flat' },
    { field: 'value', headerName: 'Value', width: 100, renderCell: (p) => <strong>{p.row.type === 'percentage' ? `${p.value}%` : rupees(p.value)}</strong> },
    { field: 'minOrderValue', headerName: 'Min Order', width: 110, valueFormatter: (v) => v ? rupees(v) : '—' },
    { field: 'scope', headerName: 'Scope', width: 100, valueFormatter: (v) => v?.[0]?.toUpperCase() + v?.slice(1) },
    { field: 'usedCount', headerName: 'Used', width: 90, valueGetter: (v, r) => r.usageLimit ? `${v}/${r.usageLimit}` : `${v || 0}` },
    { field: 'isActive', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value ? 'active' : 'offline'} /> },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
    ] }),
  ];

  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes for the store"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add Coupon</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="All coupons" emptyTitle="No coupons yet" emptyHint="Create your first discount code" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} Coupon</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Grid container spacing={2}>
              <Grid item xs={6}><Field name="code" label="Code (e.g. SAVE20)" register={register} errors={errors} rules={rules.required('Code')} inputProps={{ style: { textTransform: 'uppercase' } }} /></Grid>
              <Grid item xs={6}>
                <TextField label="Type" select fullWidth defaultValue="percentage" {...register('type')} helperText=" ">
                  <MenuItem value="percentage">Percentage off</MenuItem>
                  <MenuItem value="flat">Flat amount off</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}><Field name="value" label={type === 'percentage' ? 'Percent (%)' : 'Amount (₹)'} type="number" register={register} errors={errors} rules={rules.positiveInt('Value')} /></Grid>
              {type === 'percentage' && <Grid item xs={6}><Field name="maxDiscount" label="Max discount ₹ (0=none)" type="number" register={register} errors={errors} /></Grid>}
              <Grid item xs={6}><Field name="minOrderValue" label="Min order ₹" type="number" register={register} errors={errors} /></Grid>
              <Grid item xs={6}>
                <TextField label="Applies to" select fullWidth defaultValue="all" {...register('scope')} helperText="Where this coupon is valid">
                  <MenuItem value="all">Entire store</MenuItem>
                  <MenuItem value="category">Specific categories</MenuItem>
                  <MenuItem value="product">Specific products</MenuItem>
                </TextField>
              </Grid>
              {scope === 'category' && (
                <Grid item xs={12}>
                  <Autocomplete multiple options={cats} value={targets} onChange={(e, v) => setTargets(v)}
                    getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, c) => a._id === c._id}
                    renderInput={(p) => <TextField {...p} label="Categories this coupon applies to" InputLabelProps={{ shrink: true }} />} />
                </Grid>
              )}
              {scope === 'product' && (
                <Grid item xs={12}>
                  <Autocomplete multiple options={products} value={targets} onChange={(e, v) => setTargets(v)}
                    getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, c) => a._id === c._id}
                    renderOption={(props, o) => (
                      <li {...props} key={o._id}>
                        <Avatar variant="rounded" src={o.images?.[0]} sx={{ width: 28, height: 28, mr: 1.5 }}>{o.name?.[0]}</Avatar>
                        {o.name} · {rupees(o.price)}
                      </li>
                    )}
                    renderInput={(p) => <TextField {...p} label="Products this coupon applies to" InputLabelProps={{ shrink: true }} />} />
                </Grid>
              )}
              <Grid item xs={6}><Field name="usageLimit" label="Max total redemptions" type="number" register={register} errors={errors} inputProps={{ placeholder: '0 = unlimited' }} /></Grid>
              <Grid item xs={6}><Field name="perUserLimit" label="Max uses per user" type="number" register={register} errors={errors} inputProps={{ placeholder: '0 = unlimited' }} /></Grid>
              <Grid item xs={6}><Field name="validFrom" label="Valid from" type="date" register={register} errors={errors} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><Field name="validUntil" label="Valid until" type="date" register={register} errors={errors} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><FormControlLabel control={<Switch checked={!!watch('isActive')} onChange={(e) => setValue('isActive', e.target.checked)} />} label="Active" /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button><Button type="submit" variant="contained" disabled={!isValid}>Save</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
