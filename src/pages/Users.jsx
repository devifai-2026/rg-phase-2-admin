import { useEffect, useState, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Chip, Typography, Alert } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { moneyColumn, actionsColumn } from '../components/tableHelpers';
import { Field } from '../components/formKit';
import { exportCsv } from '../components/csv';

export default function Users() {
  const { palette } = useTheme();
  const b = palette.brand;
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rechargeUser, setRechargeUser] = useState(null);
  const [packs, setPacks] = useState([]); // active recharge templates
  const [packId, setPackId] = useState(''); // selected pack for the recharge dialog
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onChange' });

  // Add-user (OTP-verified) dialog state.
  const [addOpen, setAddOpen] = useState(false);
  const [step, setStep] = useState('details'); // 'details' → 'otp'
  const [au, setAu] = useState({ phone: '', name: '', email: '', code: '' });
  const [busy, setBusy] = useState(false);

  const closeAdd = () => { setAddOpen(false); setStep('details'); setAu({ phone: '', name: '', email: '', code: '' }); };
  const phone10 = (au.phone || '').replace(/\D/g, '').slice(-10);

  const sendOtp = async () => {
    if (phone10.length !== 10) return toast.error('Enter a valid 10-digit phone');
    setBusy(true);
    try { await AdminAPI.requestUserOtp(phone10); toast.success('OTP sent (use 123456 in dev)'); setStep('otp'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  const createUser = async () => {
    if ((au.code || '').length !== 6) return toast.error('Enter the 6-digit OTP');
    setBusy(true);
    try {
      await AdminAPI.createUser({ phone: phone10, code: au.code, name: au.name.trim(), email: au.email.trim() });
      toast.success('User added');
      closeAdd(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not create user'); }
    finally { setBusy(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.listUsers({ limit: 100, search: search || undefined });
      setRows(data.data.items.map((u) => ({ id: u._id, ...u })));
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  // Load active recharge packs once (admin recharge is pack-only).
  useEffect(() => {
    AdminAPI.listRechargeTemplates()
      .then(({ data }) => setPacks((data.data || []).filter((p) => p.isActive !== false)))
      .catch(() => {});
  }, []);

  const toggleBlock = async (u) => {
    try { await AdminAPI.blockUser(u._id, !u.isBlocked); toast.success(u.isBlocked ? 'Unblocked' : 'Blocked'); load(); }
    catch { toast.error('Action failed'); }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name || u.phone || 'this user'}? This removes their account and wallet and cannot be undone.`)) return;
    try { await AdminAPI.deleteUser(u._id); toast.success('User deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  const closeRecharge = () => { setRechargeUser(null); setPackId(''); reset(); };

  const submitRecharge = async (form) => {
    if (!packId) return toast.error('Select a recharge pack');
    const pack = packs.find((p) => p._id === packId);
    try {
      await AdminAPI.recharge({ userId: rechargeUser._id, templateId: packId, reason: form.reason });
      toast.success(`Credited ₹${pack?.tokens ?? ''} (${pack?.name || 'pack'}) to ${rechargeUser.name || rechargeUser.phone}`);
      closeRecharge(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Recharge failed'); }
  };

  const onExport = () => exportCsv('users', [
    { header: 'Name', value: (r) => r.name || '' },
    { header: 'Phone', value: (r) => r.phone },
    { header: 'Email', value: (r) => r.email || '' },
    { header: 'Wallet', value: (r) => r.walletBalance || 0 },
    { header: 'Locked', value: (r) => r.walletLocked || 0 },
    { header: 'Verified', value: (r) => (r.isPhoneVerified ? 'Yes' : 'No') },
    { header: 'Blocked', value: (r) => (r.isBlocked ? 'Yes' : 'No') },
    { header: 'Joined', value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '' },
  ], rows);

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150, valueGetter: (v) => v || '—' },
    { field: 'phone', headerName: 'Phone', width: 130 },
    moneyColumn({ field: 'walletBalance', headerName: 'Wallet', accent: true }),
    moneyColumn({ field: 'walletLocked', headerName: 'Locked' }),
    { field: 'isPhoneVerified', headerName: 'Verified', width: 90, align: 'center', headerAlign: 'center', renderCell: (p) => p.value ? <CheckCircleIcon sx={{ color: b.green, fontSize: 18 }} /> : <span style={{ color: b.textFaint }}>—</span> },
    { field: 'isBlocked', headerName: 'Status', width: 110, renderCell: (p) => <Chip size="small" label={p.value ? 'Blocked' : 'Active'} sx={{ background: p.value ? `${b.red}22` : `${b.green}22`, color: p.value ? b.red : b.green, fontWeight: 600 }} /> },
    actionsColumn({
      count: 4,
      getActions: (row) => [
        { icon: <VisibilityIcon fontSize="small" />, tip: 'View details', onClick: () => navigate(`/users/${row._id}`) },
        { icon: <WalletIcon fontSize="small" />, tip: 'Recharge wallet', primary: true, onClick: () => setRechargeUser(row) },
        { icon: <BlockIcon fontSize="small" />, tip: row.isBlocked ? 'Unblock login' : 'Block login', danger: !row.isBlocked, onClick: () => toggleBlock(row) },
        { icon: <DeleteIcon fontSize="small" />, tip: 'Delete user', danger: true, onClick: () => removeUser(row) },
      ],
    }),
  ];

  return (
    <>
      <PageHeader title="Users & Wallets" subtitle="Manage users and credit wallets manually"
        action={<Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)}>Add User</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="All users" onExport={onExport}
        search={{ value: search, onChange: setSearch, placeholder: 'Search name or phone…' }}
        onRowClick={(params, e) => { if (e.target.closest('.MuiDataGrid-actionsCell, button')) return; navigate(`/users/${params.row._id}`); }}
        emptyTitle="No users found" emptyHint={search ? 'Try a different search' : undefined} />

      {/* Add a user with OTP verification (two-step) */}
      <Dialog open={addOpen} onClose={() => !busy && closeAdd()} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add User
          <Typography variant="caption" sx={{ display: 'block', color: b.textDim, fontWeight: 400 }}>
            {step === 'details' ? 'Step 1 of 2 · Enter details' : 'Step 2 of 2 · Verify OTP'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          {step === 'details' ? (
            <Stack spacing={2}>
              <TextField label="Phone (10 digits)" value={au.phone} autoFocus fullWidth
                onChange={(e) => setAu((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                InputProps={{ startAdornment: <Box component="span" sx={{ color: b.textDim, mr: 1 }}>+91</Box> }}
                inputProps={{ inputMode: 'numeric' }} />
              <TextField label="Name (optional)" value={au.name} fullWidth
                onChange={(e) => setAu((s) => ({ ...s, name: e.target.value.slice(0, 100) }))} />
              <TextField label="Email (optional)" value={au.email} fullWidth type="email"
                onChange={(e) => setAu((s) => ({ ...s, email: e.target.value }))} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: b.textDim }}>OTP sent to <b>+91 {phone10}</b>.</Typography>
              <Alert icon={<InfoIcon fontSize="inherit" />} severity="info" sx={{ background: alpha(b.blue, 0.08), color: b.text, border: `1px solid ${alpha(b.blue, 0.25)}`, '& .MuiAlert-icon': { color: b.blue } }}>
                Dev mode: the OTP is always <b>123456</b>.
              </Alert>
              <TextField label="6-digit OTP" value={au.code} autoFocus fullWidth
                onChange={(e) => setAu((s) => ({ ...s, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }} />
              <Button size="small" onClick={() => setStep('details')} sx={{ alignSelf: 'flex-start', color: b.textDim }}>← Edit details</Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeAdd} disabled={busy} sx={{ color: b.textDim }}>Cancel</Button>
          {step === 'details'
            ? <Button variant="contained" onClick={sendOtp} disabled={busy || phone10.length !== 10}>{busy ? 'Sending…' : 'Send OTP'}</Button>
            : <Button variant="contained" onClick={createUser} disabled={busy || au.code.length !== 6}>{busy ? 'Creating…' : 'Verify & create'}</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={!!rechargeUser} onClose={closeRecharge} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Recharge Wallet</DialogTitle>
        <form onSubmit={handleSubmit(submitRecharge)} noValidate>
          <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
            <Stack spacing={2}>
              <TextField label="User" value={rechargeUser?.name || rechargeUser?.phone || ''} disabled fullWidth />
              {/* Pack-only: the user is credited the selected pack's value. No manual amount. */}
              <TextField
                select label="Recharge pack" fullWidth value={packId}
                onChange={(e) => setPackId(e.target.value)}
                helperText={packs.length ? 'User is credited the pack value (incl. bonus)' : 'No active packs — create one in Recharge Packs'}
              >
                {packs.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {(p.name ? `${p.name} — ` : '')}pay ₹{p.amount}, get ₹{p.tokens}
                    {p.tokens > p.amount ? ` (+₹${p.tokens - p.amount})` : ''}
                  </MenuItem>
                ))}
              </TextField>
              {packId && (() => { const p = packs.find((x) => x._id === packId); return (
                <Alert severity="info" sx={{ py: 0.5 }}>Wallet will be credited <strong>₹{p?.tokens}</strong>.</Alert>
              ); })()}
              <Field name="reason" label="Reason (optional)" placeholder="Complimentary / Manual adjustment" register={register} errors={errors} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeRecharge} sx={{ color: b.textDim }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!packId}>Credit Wallet</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
