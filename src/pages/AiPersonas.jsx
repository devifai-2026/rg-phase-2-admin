import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Avatar, Autocomplete, TextField, FormControlLabel, Switch, Typography, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AiPersonaPreview } from '../components/previews';
import PhoneFrame from '../components/PhoneFrame';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import { PageHeader, StatusChip } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn } from '../components/tableHelpers';
import { Field, rules } from '../components/formKit';
import ImageUpload from '../components/ImageUpload';

const EXPERTISE = ['Vedic', 'Numerology', 'Tarot', 'Love & Relationships', 'Career', 'Vastu', 'Palmistry'];

export default function AiPersonas() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [avatar, setAvatar] = useState('');
  const [expertise, setExpertise] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const { register, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({ mode: 'onChange' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listPersonas(); setRows(data.data.map((p) => ({ id: p._id, ...p }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    reset({ name: row?.name || '', tagline: row?.tagline || '', description: row?.description || '', systemPrompt: row?.systemPrompt || '' });
    setAvatar(row?.avatar || ''); setExpertise(row?.expertise || []); setIsActive(row?.isActive ?? true); setDialog(row || {});
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const fd = new FormData(); fd.append('image', file); const { data } = await PublicAPI.uploadImage(fd); setAvatar(data.data.url); toast.success('Uploaded'); }
    catch { toast.error('Upload failed'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const onSubmit = async (form) => {
    const body = { ...form, avatar, expertise, isActive };
    try {
      if (dialog._id) await AdminAPI.updatePersona(dialog._id, body);
      else await AdminAPI.createPersona(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.name}?`)) return; try { await AdminAPI.deletePersona(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const columns = [
    {
      field: 'name', headerName: 'AI Astrologer', flex: 1, minWidth: 220,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: '100%', width: '100%' }}>
          <Avatar src={p.row.avatar} sx={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>{p.value?.[0]}</Avatar>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>{p.value}</Typography>
            <Typography variant="caption" sx={{ color: b.textFaint, lineHeight: 1.2 }} noWrap>{p.row.tagline || '—'}</Typography>
          </Box>
        </Stack>
      ),
    },
    { field: 'expertise', headerName: 'Expertise', flex: 1, minWidth: 180, valueGetter: (v) => (v || []).join(', ') || '—' },
    { field: 'isActive', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value ? 'active' : 'offline'} /> },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
    ] }),
  ];

  return (
    <>
      <PageHeader title="AI Astrologers" subtitle="AI chat personas shown to users in the app"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add AI Astrologer</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="AI personas" emptyTitle="No AI astrologers yet" emptyHint="Create a persona users can chat with" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} AI Astrologer</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  <ImageUpload value={avatar} onChange={setAvatar} label="photo" fallback={(watch('name') || 'A')[0]} />
                  <Field name="name" label="Name" register={register} errors={errors} rules={rules.required('Name')} />
                  <Field name="tagline" label="Tagline (short)" register={register} errors={errors} />
                  <Autocomplete multiple freeSolo options={EXPERTISE} value={expertise} onChange={(e, v) => setExpertise(v)} renderInput={(p) => <TextField {...p} label="Expertise" InputLabelProps={{ shrink: true }} />} />
                  <TextField label="Description" multiline rows={2} fullWidth InputLabelProps={{ shrink: true }} {...register('description')} />
                  <TextField label="System prompt (hidden — shapes AI behaviour)" multiline rows={4} fullWidth InputLabelProps={{ shrink: true }}
                    placeholder="e.g. You are Acharya Veda, a warm Vedic astrologer who focuses on remedies…" {...register('systemPrompt')} />
                  <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active (visible in app)" />
                </Stack>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="overline" sx={{ color: b.textDim }}>App preview</Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                  <PhoneFrame width={260}>
                    <AiPersonaPreview name={watch('name')} avatar={avatar} tagline={watch('tagline')} description={watch('description')} expertise={expertise} />
                  </PhoneFrame>
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
