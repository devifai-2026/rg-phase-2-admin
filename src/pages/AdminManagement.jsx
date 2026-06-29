import { useEffect, useState, useCallback } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, MenuItem, Chip, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn } from '../components/tableHelpers';
import { Field, rules, PhoneField } from '../components/formKit';

export default function AdminManagement() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [step, setStep] = useState('details'); // 'details' → 'otp'
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, control, getValues, trigger, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { role: 'admin' } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listAdmins(); setRows(data.data.map((a) => ({ id: a._id, ...a }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const closeDialog = () => { setDialog(false); setStep('details'); setCode(''); reset({ role: 'admin' }); };

  // Step 1: validate fields, then send the OTP to the new admin's phone.
  const sendOtp = async () => {
    if (!(await trigger())) return;
    setBusy(true);
    try { await AdminAPI.requestAdminOtp(getValues('phone')); toast.success('OTP sent (use 123456 in dev)'); setStep('otp'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  // Step 2: create the admin with the verified phone + code.
  const onSubmit = async (form) => {
    if (code.length !== 6) return toast.error('Enter the 6-digit OTP');
    setBusy(true);
    try { await AdminAPI.createAdmin({ ...form, code }); toast.success('Admin created — they sign in with this phone + OTP'); closeDialog(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const onDelete = async (row) => {
    if (!window.confirm(`Remove ${row.name || row.phone} as admin?`)) return;
    try { await AdminAPI.deleteAdmin(row._id); toast.success('Admin removed'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150, valueGetter: (v) => v || '—' },
    { field: 'phone', headerName: 'Phone', width: 140 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 160, valueGetter: (v) => v || '—' },
    { field: 'role', headerName: 'Role', width: 150, renderCell: (p) => <Chip size="small" label={p.value === 'super_admin' ? 'Super Admin' : 'Admin'} sx={{ background: p.value === 'super_admin' ? `${b.red}22` : `${b.violet}22`, color: p.value === 'super_admin' ? b.red : b.violet, fontWeight: 700 }} /> },
    actionsColumn({
      count: 1,
      getActions: (row) => String(row._id) !== String(user?._id)
        ? [{ icon: <DeleteIcon fontSize="small" />, tip: 'Remove', danger: true, onClick: () => onDelete(row) }]
        : [],
    }),
  ];

  return (
    <>
      <PageHeader title="Admin Management" subtitle="Create and remove platform administrators"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(true)}>Add Admin</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="Administrators" emptyTitle="No admins yet" />

      <Dialog open={dialog} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Administrator</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Stack spacing={2}>
              {/* Details are locked once the OTP has been sent so the verified phone matches. */}
              <Field name="name" label="Name" register={register} errors={errors} rules={rules.required('Name')} disabled={step === 'otp'} />
              <PhoneField control={control} disabled={step === 'otp'} />
              <Field name="email" label="Email (optional)" register={register} errors={errors} rules={rules.email} disabled={step === 'otp'} />
              <TextField label="Role" select fullWidth defaultValue="admin" disabled={step === 'otp'} {...register('role')}>
                <MenuItem value="admin">Admin (operational)</MenuItem>
                <MenuItem value="super_admin">Super Admin (all access)</MenuItem>
              </TextField>
              {step === 'otp' && (
                <TextField label="6-digit OTP" value={code} autoFocus fullWidth
                  helperText="Sent to the admin's phone (use 123456 in dev)"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeDialog} sx={{ color: b.textDim }}>Cancel</Button>
            {step === 'details'
              ? <Button variant="contained" onClick={sendOtp} disabled={busy || !isValid}>{busy ? 'Sending…' : 'Send OTP'}</Button>
              : <Button type="submit" variant="contained" disabled={busy || code.length !== 6}>{busy ? 'Creating…' : 'Verify & create'}</Button>}
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
