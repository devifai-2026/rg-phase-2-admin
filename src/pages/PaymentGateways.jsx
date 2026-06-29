import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Stack, Typography, TextField, Switch, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BoltIcon from '@mui/icons-material/Bolt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

const GATEWAYS = [
  { id: 'payu', label: 'PayU Money', tag: 'Hosted checkout',
    fields: [{ k: 'key', label: 'Merchant Key' }, { k: 'salt', label: 'Salt', secret: true }] },
  { id: 'razorpay', label: 'Razorpay', tag: 'Checkout.js',
    fields: [{ k: 'keyId', label: 'Key ID' }, { k: 'keySecret', label: 'Key Secret', secret: true }] },
  { id: 'cashfree', label: 'Cashfree', tag: 'Cashfree SDK',
    fields: [{ k: 'appId', label: 'App ID' }, { k: 'secretKey', label: 'Secret Key', secret: true }] },
];

export default function PaymentGateways() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(''); // gateway id currently saving
  const [shown, setShown] = useState({}); // reveal toggles for secret fields, keyed `${gw}.${field}`

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.getPaymentGateway(); setCfg(data.data); }
    catch { toast.error('Failed to load payment config'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setField = (gw, k, v) => setCfg((c) => ({ ...c, [gw]: { ...c[gw], [k]: v } }));
  const hasKeys = (id) => GATEWAYS.find((g) => g.id === id).fields.every((f) => String((cfg?.[id] || {})[f.k] || '').trim());

  // ── OTP-gated change flow ──
  // Any change (save keys / set active) is staged, an OTP is sent to the admin's
  // phone, and the change only commits after the OTP is verified.
  const [otp, setOtp] = useState({ open: false, label: '', overrides: null, code: '', sending: false, submitting: false, devCode: '' });

  // Stage a change → request OTP → open the dialog.
  const startChange = async (gwId, overrides, label) => {
    setBusy(gwId);
    try {
      const { data } = await AdminAPI.requestPaymentGatewayOtp();
      setOtp({ open: true, label, overrides, code: '', sending: false, submitting: false, devCode: data?.data?.devCode || '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send OTP'); }
    finally { setBusy(''); }
  };

  const confirmOtp = async () => {
    if (otp.code.trim().length < 4) { toast.error('Enter the OTP'); return; }
    setOtp((o) => ({ ...o, submitting: true }));
    try {
      const body = { active: cfg.active, payu: cfg.payu, razorpay: cfg.razorpay, cashfree: cfg.cashfree, ...otp.overrides, otp: otp.code.trim() };
      const { data } = await AdminAPI.updatePaymentGateway(body);
      setCfg(data.data);
      setOtp({ open: false, label: '', overrides: null, code: '', sending: false, submitting: false, devCode: '' });
      toast.success('Payment gateway updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed');
      setOtp((o) => ({ ...o, submitting: false }));
    }
  };

  const resendOtp = async () => {
    setOtp((o) => ({ ...o, sending: true }));
    try { const { data } = await AdminAPI.requestPaymentGatewayOtp(); setOtp((o) => ({ ...o, devCode: data?.data?.devCode || '', sending: false })); toast.success('OTP resent'); }
    catch { setOtp((o) => ({ ...o, sending: false })); toast.error('Could not resend'); }
  };

  const saveKeys = (id) => startChange(id, {}, `Save ${GATEWAYS.find((g) => g.id === id).label} keys`);
  const setActive = (id) => {
    if (!hasKeys(id)) { toast.error('Add and save the keys first'); return; }
    startChange(id, { active: id }, `Make ${GATEWAYS.find((g) => g.id === id).label} the active gateway`);
  };

  if (loading || !cfg) {
    return (<Box><PageHeader title="Payment Gateways" subtitle="Set up gateways and choose the active one" /><Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box></Box>);
  }

  return (
    <Box>
      <PageHeader title="Payment Gateways" subtitle="Enter a gateway's keys, then set it as the active one. Only the active gateway processes payments." />

      {/* Active summary banner — slim */}
      <Card sx={{ px: 1.75, py: 1.25, mb: 1.75, display: 'flex', alignItems: 'center', gap: 1, background: alpha(b.green, 0.08), border: `1px solid ${alpha(b.green, 0.3)}` }}>
        <BoltIcon sx={{ color: b.green, fontSize: 18 }} />
        <Typography sx={{ color: b.text, fontSize: 13 }}>
          Active: <strong>{GATEWAYS.find((g) => g.id === cfg.active)?.label}</strong>
          {!hasKeys(cfg.active) && <Typography component="span" sx={{ color: b.red, fontWeight: 700 }}> — keys missing, payments will fail</Typography>}
        </Typography>
      </Card>

      <Stack spacing={1.25}>
        {GATEWAYS.map((g) => {
          const data = cfg[g.id] || {};
          const isActive = cfg.active === g.id;
          const configured = hasKeys(g.id);
          const test = data.testMode !== false;
          const status = isActive ? ['Active', b.green] : configured ? ['Configured', b.blue] : ['Not set up', b.textFaint];
          return (
            <Card key={g.id} sx={{ p: 0, overflow: 'hidden', display: 'flex', border: `1px solid ${isActive ? b.green : b.border}` }}>
              {/* Left accent rail (green when active) */}
              <Box sx={{ width: 3, background: isActive ? b.green : 'transparent', flexShrink: 0 }} />
              <Box sx={{ flex: 1, px: 2, py: 1.5 }}>
                {/* Header row — compact, single line */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                  {isActive
                    ? <CheckCircleIcon sx={{ color: b.green, fontSize: 18 }} />
                    : <RadioButtonUncheckedIcon sx={{ color: b.textFaint, fontSize: 18 }} />}
                  <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: b.text }}>{g.label}</Typography>
                  <Chip size="small" label={status[0]} sx={{ height: 18, fontWeight: 700, fontSize: 9.5, background: alpha(status[1], 0.16), color: status[1], '& .MuiChip-label': { px: 0.9 } }} />
                  <Typography variant="caption" sx={{ color: b.textFaint, fontSize: 11 }}>· {g.tag}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" sx={{ color: test ? b.amber : b.green, fontWeight: 700, fontSize: 10.5 }}>{test ? 'TEST' : 'LIVE'}</Typography>
                  <Switch size="small" checked={!test} onChange={(e) => setField(g.id, 'testMode', !e.target.checked)} sx={{ mr: -0.5 }} />
                </Stack>

                {/* Keys + actions on one tight row (wraps on narrow widths) */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                  {g.fields.map((f) => {
                    const sk = `${g.id}.${f.k}`;
                    const reveal = !!shown[sk];
                    return (
                      <TextField
                        key={f.k} fullWidth size="small" label={f.label}
                        type={f.secret && !reveal ? 'password' : 'text'}
                        value={data[f.k] || ''}
                        onChange={(e) => setField(g.id, f.k, e.target.value)}
                        InputLabelProps={{ shrink: true }} autoComplete="off"
                        InputProps={f.secret ? {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" edge="end" onClick={() => setShown((s) => ({ ...s, [sk]: !s[sk] }))}
                                aria-label={reveal ? 'Hide' : 'Show'}>
                                {reveal ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        } : undefined}
                      />
                    );
                  })}
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button size="small" variant="outlined" disabled={busy === g.id} onClick={() => saveKeys(g.id)}
                      sx={{ borderColor: b.border, color: b.text, whiteSpace: 'nowrap' }}>
                      {busy === g.id ? 'Saving…' : 'Save'}
                    </Button>
                    {isActive ? (
                      <Button size="small" variant="contained" disabled startIcon={<CheckCircleIcon fontSize="small" />}
                        sx={{ whiteSpace: 'nowrap', '&.Mui-disabled': { background: alpha(b.green, 0.18), color: b.green } }}>Active</Button>
                    ) : (
                      <Button size="small" variant="contained" disabled={!configured || busy === g.id} onClick={() => setActive(g.id)}
                        sx={{ whiteSpace: 'nowrap' }}>Set active</Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Card>
          );
        })}
      </Stack>

      {/* OTP confirmation — sensitive change requires a code sent to the admin's phone. */}
      <Dialog open={otp.open} onClose={() => !otp.submitting && setOtp((o) => ({ ...o, open: false }))} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm with OTP</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Typography variant="body2" sx={{ color: b.textDim, mb: 2 }}>
            {otp.label}. We sent a verification code to your registered number — enter it to confirm.
          </Typography>
          <TextField
            fullWidth autoFocus label="Enter OTP" value={otp.code}
            onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
            inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: 6, fontSize: 20, textAlign: 'center' } }}
            InputLabelProps={{ shrink: true }}
          />
          {otp.devCode && (
            <Typography variant="caption" sx={{ color: b.amber, display: 'block', mt: 1 }}>Dev code: {otp.devCode}</Typography>
          )}
          <Button size="small" onClick={resendOtp} disabled={otp.sending} sx={{ mt: 1, color: b.textDim }}>
            {otp.sending ? 'Resending…' : 'Resend code'}
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOtp((o) => ({ ...o, open: false }))} disabled={otp.submitting} sx={{ color: b.textDim }}>Cancel</Button>
          <Button variant="contained" onClick={confirmOtp} disabled={otp.submitting}
            startIcon={otp.submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {otp.submitting ? 'Verifying…' : 'Confirm change'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
