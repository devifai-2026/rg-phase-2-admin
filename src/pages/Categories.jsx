import { useEffect, useState, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Switch, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import { PageHeader, StatusChip } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn } from '../components/tableHelpers';
import { Field, rules } from '../components/formKit';
import ImageCropper from '../components/ImageCropper';

export default function Categories() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { isActive: true } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await PublicAPI.categories(); setRows(data.data.map((c) => ({ id: c._id, ...c }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => { reset({ name: row?.name || '', image: row?.image || '', isActive: row?.isActive ?? true }); setDialog(row || {}); };

  const onSubmit = async (form) => {
    try {
      if (dialog._id) await AdminAPI.updateCategory(dialog._id, form);
      else await AdminAPI.createCategory(form);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.name}?`)) return; try { await AdminAPI.deleteCategory(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'slug', headerName: 'Slug', width: 200 },
    { field: 'isActive', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value ? 'active' : 'offline'} /> },
    actionsColumn({
      count: 2,
      getActions: (row) => [
        { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
        { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
      ],
    }),
  ];

  return (
    <>
      <PageHeader title="Categories" subtitle="Dynamic product categories"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add Category</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="All categories" emptyTitle="No categories yet" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} Category</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Stack spacing={2}>
              <Field name="name" label="Name" register={register} errors={errors} rules={rules.required('Name')} />
              {/* Register `image` so it's part of validation (mandatory). */}
              <input type="hidden" {...register('image', { required: 'A category image is required' })} />
              {/* Upload + crop a square category thumbnail (shown as a circular
                  chip in the app). onChange stores the hosted URL on `image`. */}
              <div>
                <ImageCropper
                  value={watch('image') || ''}
                  onChange={(url) => setValue('image', url, { shouldValidate: true })}
                  aspect={1}
                  outWidth={400}
                  outHeight={400}
                  label="category"
                />
                {errors.image && (
                  <Box sx={{ color: 'error.main', fontSize: 12.5, mt: 0.75 }}>{errors.image.message}</Box>
                )}
              </div>
              <FormControlLabel control={<Switch checked={!!watch('isActive')} onChange={(e) => setValue('isActive', e.target.checked)} />} label="Active" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button><Button type="submit" variant="contained" disabled={!isValid}>Save</Button></DialogActions>
        </form>
      </Dialog>
    </>
  );
}
