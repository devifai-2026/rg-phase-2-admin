import { useEffect, useState, useCallback } from 'react';
import { Box, Card, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Avatar, TextField, MenuItem, FormControlLabel, Switch, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn, dateColumn } from '../components/tableHelpers';
import { Field, rules } from '../components/formKit';
import ImageCropper from '../components/ImageCropper';

export default function Pooja() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <PageHeader title="Pooja" subtitle="Manage the pooja catalog and bookings from the app" />
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="Poojas" />
          <Tab label="Categories" />
          <Tab label="Bookings" />
        </Tabs>
      </Card>
      {tab === 0 && <Catalog b={b} />}
      {tab === 1 && <Categories b={b} />}
      {tab === 2 && <Bookings b={b} />}
    </Box>
  );
}

function Catalog({ b }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  // Two artwork shapes — portrait (list) + landscape (detail). ≥1 required.
  const [imgPortrait, setImgPortrait] = useState('');
  const [imgLandscape, setImgLandscape] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm({ mode: 'onChange' });

  const [categories, setCategories] = useState([]);
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for date min

  // `category` + `durationUnit` are controlled via setValue (not registered
  // inputs), so register them here. Category is required (gates Save).
  useEffect(() => {
    register('category', { required: 'Category is required' });
    register('durationUnit');
  }, [register]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, cats] = await Promise.all([AdminAPI.listPoojaTypes(), AdminAPI.listPoojaCategories()]);
      setRows(data.data.map((p) => ({ id: p._id, ...p })));
      setCategories((cats.data.data || []).filter((c) => c.isActive));
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    reset({
      name: row?.name || '', description: row?.description || '', basePriceRupees: row?.basePrice ?? 0,
      duration: row?.duration ?? 0, durationUnit: row?.durationUnit || 'min',
      category: row?.category?._id || row?.category || '',
      maxPersons: row?.maxPersons ?? 0,
      availableFrom: row?.availableFrom?.slice?.(0, 10) || '', availableTo: row?.availableTo?.slice?.(0, 10) || '',
    });
    setImgPortrait(row?.imagePortrait || ''); setImgLandscape(row?.imageLandscape || '');
    setIsActive(row?.isActive ?? true); setDialog(row || {});
  };

  const onSubmit = async (form) => {
    if (!imgPortrait && !imgLandscape) return toast.error('Add at least one image (portrait or landscape)');
    const body = {
      name: form.name, description: form.description, basePrice: Number(form.basePriceRupees || 0), isActive,
      imagePortrait: imgPortrait || '', imageLandscape: imgLandscape || '',
      image: imgPortrait || imgLandscape || '', // keep legacy field populated too
    };
    body.duration = Number(form.duration || 0);
    body.durationUnit = form.durationUnit || 'min';
    body.category = form.category || null;
    body.maxPersons = Number(form.maxPersons || 0);
    body.availableFrom = form.availableFrom || null;
    body.availableTo = form.availableTo || null;
    try {
      if (dialog._id) await AdminAPI.updatePoojaType(dialog._id, body);
      else await AdminAPI.createPoojaType(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.name}?`)) return; try { await AdminAPI.deletePoojaType(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const columns = [
    {
      field: 'name', headerName: 'Pooja', flex: 1, minWidth: 240,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: '100%', width: '100%' }}>
          <Avatar variant="rounded" src={p.row.image} sx={{ width: 34, height: 34, flexShrink: 0 }}>{p.value?.[0]}</Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{p.value}</Typography>
        </Stack>
      ),
    },
    { field: 'category', headerName: 'Category', width: 140, valueGetter: (v) => v?.name || '—' },
    { field: 'maxPersons', headerName: 'Max persons', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueGetter: (v) => v || '—' },
    { field: 'basePrice', headerName: 'Base price', width: 120, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <span style={{ fontWeight: 700, color: b.red }}>{rupees(p.value)}</span> },
    {
      field: 'duration', headerName: 'Duration', flex: 1, minWidth: 130,
      valueGetter: (v, row) => {
        if (row.duration) return `${row.duration} ${row.durationUnit === 'hr' ? 'hr' : 'min'}`;
        return row.durationNote || '—'; // legacy records
      },
    },
    {
      field: 'isActive', headerName: 'Status', width: 130,
      renderCell: (p) => {
        // Honest about WHY a pooja may be hidden in the app even when toggled on:
        //   inactive  → the active flag is off
        //   expired   → window ended (availableTo in the past)
        //   scheduled → window not started yet (availableFrom in the future)
        //   active    → live + bookable right now
        const now = new Date();
        const { availableFrom, availableTo } = p.row;
        let status;
        if (!p.value) status = 'inactive';
        else if (availableTo && new Date(availableTo) < now) status = 'expired';
        else if (availableFrom && new Date(availableFrom) > now) status = 'scheduled';
        else status = 'active';
        return <StatusChip status={status} />;
      },
    },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
    ] }),
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add Pooja</Button>
      </Box>
      <AdminTable rows={rows} columns={columns} loading={loading} title="All poojas" emptyTitle="No poojas yet" emptyHint="Add poojas users can book" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} Pooja</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Stack spacing={2}>
              {/* Two artwork shapes. At least one required; app uses portrait in
                  the list and landscape on the detail page. */}
              <Typography variant="caption" sx={{ color: b.textFaint }}>
                Add at least one image. Portrait shows in the catalog list; landscape shows on the pooja detail page.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: b.textDim, fontWeight: 700, display: 'block', mb: 0.5 }}>Portrait · shown in list (3:4)</Typography>
                  <ImageCropper value={imgPortrait} onChange={setImgPortrait} aspect={3 / 4} outWidth={600} outHeight={800} label="pooja-portrait" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: b.textDim, fontWeight: 700, display: 'block', mb: 0.5 }}>Landscape · shown on detail (16:9)</Typography>
                  <ImageCropper value={imgLandscape} onChange={setImgLandscape} aspect={16 / 9} outWidth={1280} outHeight={720} label="pooja-landscape" />
                </Box>
              </Stack>
              <Field name="name" label="Pooja name" register={register} errors={errors} rules={rules.required('Name')} />
              <TextField label="Description" multiline rows={2} fullWidth InputLabelProps={{ shrink: true }} {...register('description')} />
              <Stack direction="row" spacing={2}>
                {/* Controlled via watch+setValue so the dropdowns reflect reset() on edit.
                    Category is REQUIRED — registered with a rule so it gates submit. */}
                <TextField
                  select fullWidth label="Category *" InputLabelProps={{ shrink: true }}
                  value={watch('category') ?? ''}
                  onChange={(e) => setValue('category', e.target.value, { shouldValidate: true })}
                  error={!!errors.category}
                  helperText={errors.category ? 'Category is required' : (categories.length ? '' : 'Add categories in the Categories tab')}
                >
                  {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField
                  select fullWidth label="Max persons" InputLabelProps={{ shrink: true }}
                  value={watch('maxPersons') ?? 0} onChange={(e) => setValue('maxPersons', e.target.value)}
                >
                  {[0, 1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n === 0 ? 'Not specified' : n}</MenuItem>)}
                </TextField>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Field name="basePriceRupees" label="Base price ₹" type="number" register={register} errors={errors} rules={rules.money('Price')} />
                <TextField label="Duration" type="number" fullWidth InputLabelProps={{ shrink: true }} inputProps={{ min: 0 }} {...register('duration')} />
                <TextField
                  select label="Unit" sx={{ minWidth: 110 }} InputLabelProps={{ shrink: true }}
                  value={watch('durationUnit') ?? 'min'} onChange={(e) => setValue('durationUnit', e.target.value)}
                >
                  <MenuItem value="min">Minutes</MenuItem>
                  <MenuItem value="hr">Hours</MenuItem>
                </TextField>
              </Stack>
              <Typography variant="caption" sx={{ color: b.textFaint }}>Optional availability window — leave blank if bookable any day. Past dates can’t be selected.</Typography>
              <Stack direction="row" spacing={2}>
                {/* Restrict to today onward; "to" can't precede "from". */}
                <Field name="availableFrom" label="Available from" type="date" register={register} errors={errors} InputLabelProps={{ shrink: true }} inputProps={{ min: todayStr }} />
                <Field name="availableTo" label="Available to" type="date" register={register} errors={errors} InputLabelProps={{ shrink: true }} inputProps={{ min: watch('availableFrom') || todayStr }} />
              </Stack>
              <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button><Button type="submit" variant="contained" disabled={!isValid}>Save</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}

/* ───────────────────────── Pooja categories ───────────────────────── */
function Categories({ b }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // {} = new, row = edit
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listPoojaCategories(); setRows(data.data.map((c) => ({ id: c._id, ...c }))); }
    catch { toast.error('Failed to load categories'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => { setName(row?.name || ''); setIsActive(row?.isActive ?? true); setDialog(row || {}); };

  const save = async () => {
    if (!name.trim()) return toast.error('Category name is required');
    const body = { name: name.trim(), isActive };
    try {
      if (dialog._id) await AdminAPI.updatePoojaCategory(dialog._id, body);
      else await AdminAPI.createPoojaCategory(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"? Poojas in it become uncategorized.`)) return;
    try { await AdminAPI.deletePoojaCategory(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };
  const toggle = async (row) => {
    try { await AdminAPI.updatePoojaCategory(row._id, { isActive: !row.isActive }); load(); } catch { toast.error('Failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Category', flex: 1, minWidth: 220, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.value}</Typography> },
    {
      field: 'isActive', headerName: 'Active', width: 110,
      renderCell: (p) => <Switch checked={p.value} size="small" onChange={() => toggle(p.row)} />,
    },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => remove(row) },
    ] }),
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add category</Button>
      </Box>
      <AdminTable rows={rows} columns={columns} loading={loading} title="Pooja categories"
        emptyTitle="No categories yet" emptyHint="Add categories (Family, Vastu, …) then bind poojas to them" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} category</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField label="Category name" fullWidth autoFocus value={name} onChange={(e) => setName(e.target.value)} InputLabelProps={{ shrink: true }} placeholder="e.g. Family, Vastu, Health" />
            <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button>
          <Button onClick={save} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Bookings({ b }) {
  const [rows, setRows] = useState([]);
  const [astros, setAstros] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bk, as] = await Promise.all([AdminAPI.listPoojaBookings({ limit: 200 }), AdminAPI.listAstrologers({ status: 'active', limit: 200 })]);
      setRows(bk.data.data.items.map((x) => ({ id: x._id, ...x, userName: x.user?.name || x.user?.phone, astroName: x.astrologer?.name })));
      setAstros(as.data.data.items.map((a) => ({ id: a.user?._id || a.user, name: a.displayName || a.user?.name })));
    } catch { toast.error('Failed to load bookings'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (row, status) => { try { await AdminAPI.updatePoojaBooking(row._id, { status }); toast.success(`Marked ${status}`); load(); } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } };
  const assign = async (row, astrologerId) => { try { await AdminAPI.updatePoojaBooking(row._id, { astrologerId }); toast.success('Astrologer assigned'); load(); } catch { toast.error('Failed'); } };

  const STATUS = ['requested', 'confirmed', 'contacted', 'done', 'completed', 'cancelled'];
  const columns = [
    { field: 'poojaType', headerName: 'Pooja', flex: 1, minWidth: 160 },
    { field: 'userName', headerName: 'Booked by', width: 150 },
    {
      field: 'familyMembers', headerName: 'For (family)', width: 200, sortable: false,
      renderCell: (p) => {
        const fm = p.value || [];
        if (!fm.length) return <span style={{ color: b.textFaint }}>—</span>;
        return (
          <Tooltip title={fm.join(', ')}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong>{fm.length}</strong> · {fm.join(', ')}
            </span>
          </Tooltip>
        );
      },
    },
    { field: 'preferredDate', headerName: 'Preferred', width: 130, valueFormatter: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { field: 'price', headerName: 'Price', width: 100, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: b.red }}>{rupees(p.value)}</strong> },
    { field: 'paymentStatus', headerName: 'Payment', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'astroName', headerName: 'Astrologer', width: 170,
      renderCell: (p) => (
        <TextField select size="small" value={p.row.astrologer?._id || p.row.astrologer || ''} onChange={(e) => assign(p.row, e.target.value)}
          sx={{ width: '100%' }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value=""><em>Unassigned</em></MenuItem>
          {astros.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </TextField>
      ),
    },
    {
      field: 'status', headerName: 'Status', width: 150,
      renderCell: (p) => (
        <TextField select size="small" value={p.value} onChange={(e) => setStatus(p.row, e.target.value)} sx={{ width: '100%' }}>
          {STATUS.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
        </TextField>
      ),
    },
  ];

  return <AdminTable rows={rows} columns={columns} loading={loading} title="Pooja bookings" rowHeight={64}
    emptyTitle="No bookings yet" emptyHint="Bookings made in the app appear here" />;
}
