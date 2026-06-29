import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Stack, Typography, TextField, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton, Chip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * VedicAstroAPI (vedicastroapi.com) credentials — just the API KEY. The backend
 * reads it at runtime (DB first, env fallback) for charts / kundli / matching.
 * The base URL and cache TTL are fixed in code, not editable here.
 *
 *   • API Key — vedicastroapi.com Dashboard → API Keys. Encrypted at rest;
 *               never shown in full until an OTP is verified (the eye).
 *
 * Saving the key and revealing it are both OTP-gated (code to the admin's phone).
 */
export default function VedicAstroSettings() {
  const { palette } = useTheme();
  const b = palette.brand;

  // { apiKeyMasked, hasApiKey, updatedAt }
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ apiKey: '' });

  // When revealed, we hold the plaintext key here.
  const [revealedKey, setRevealedKey] = useState(null); // string | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.getVedicAstro();
      setCfg(data.data);
    } catch { toast.error('Failed to load VedicAstro settings'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = () => { setForm({ apiKey: '' }); setEdit(true); };
  const cancelEdit = () => { setEdit(false); setForm({ apiKey: '' }); };

  // ── OTP flow (shared by Save and Reveal). action: 'save' | 'reveal' ──
  const [otp, setOtp] = useState({ open: false, action: null, code: '', sending: false, submitting: false, devCode: '' });

  const requestOtp = async (action, label) => {
    try {
      const { data } = await AdminAPI.requestVedicAstroOtp();
      setOtp({ open: true, action, label, code: '', sending: false, submitting: false, devCode: data?.data?.devCode || '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send OTP'); }
  };

  const startSave = () => {
    if (!form.apiKey.trim()) { toast.error('Enter the API key to save'); return; }
    requestOtp('save', 'Saving VedicAstro API key');
  };
  const startReveal = () => {
    if (!cfg?.hasApiKey) { toast.error('No key saved yet'); return; }
    requestOtp('reveal', 'Revealing the VedicAstro API key');
  };

  const confirmOtp = async () => {
    if (otp.code.trim().length < 4) { toast.error('Enter the OTP'); return; }
    setOtp((o) => ({ ...o, submitting: true }));
    try {
      if (otp.action === 'save') {
        const body = { otp: otp.code.trim() };
        if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
        const { data } = await AdminAPI.updateVedicAstro(body);
        setCfg(data.data);
        setEdit(false);
        setRevealedKey(null);
        setForm({ apiKey: '' });
        toast.success('VedicAstro API key saved');
      } else {
        const { data } = await AdminAPI.revealVedicAstroSecret(otp.code.trim());
        setRevealedKey(data.data.apiKey ?? '');
        toast.success('API key revealed');
      }
      setOtp({ open: false, action: null, code: '', sending: false, submitting: false, devCode: '' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed');
      setOtp((o) => ({ ...o, submitting: false }));
    }
  };

  const resendOtp = async () => {
    setOtp((o) => ({ ...o, sending: true }));
    try { const { data } = await AdminAPI.requestVedicAstroOtp(); setOtp((o) => ({ ...o, devCode: data?.data?.devCode || '', sending: false })); toast.success('OTP resent'); }
    catch { setOtp((o) => ({ ...o, sending: false })); toast.error('Could not resend'); }
  };

  const copy = (val, label) => {
    if (!val) return;
    navigator.clipboard?.writeText(val).then(() => toast.success(`${label} copied`)).catch(() => {});
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="VedicAstro (Astrology API)" subtitle="Credentials for charts, kundli & matching" />
        <Box sx={{ display: 'grid', placeItems: 'center', height: 240 }}><CircularProgress /></Box>
      </Box>
    );
  }

  const keyDisplay = revealedKey != null ? revealedKey : (cfg?.apiKeyMasked || (cfg?.hasApiKey ? '••••••••' : ''));
  const ready = !!cfg?.hasApiKey;

  return (
    <Box>
      <PageHeader title="VedicAstro (Astrology API)" subtitle="API key for charts, kundli & match-making. Key is encrypted at rest. When unset, the app uses an approximate local fallback." />

      <Card sx={{ p: 3, maxWidth: 680 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: alpha(b.gold || b.violet, 0.16), display: 'grid', placeItems: 'center' }}>
            <AutoAwesomeIcon sx={{ color: b.gold || b.violet }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>VedicAstroAPI credentials</Typography>
            <Typography variant="caption" sx={{ color: b.textDim }}>
              {cfg?.updatedAt ? `Last updated ${new Date(cfg.updatedAt).toLocaleString('en-IN')}` : 'Not configured yet'}
            </Typography>
          </Box>
          <Chip size="small" label={ready ? 'Live API' : 'Local fallback'}
            sx={{ fontWeight: 700, background: alpha(ready ? b.green : b.amber, 0.16), color: ready ? b.green : b.amber }} />
        </Stack>

        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* API Key — plain input when editing; masked + eye reveal (OTP) when viewing */}
          {edit ? (
            <TextField
              label="API Key (leave blank to keep current)" fullWidth size="small" InputLabelProps={{ shrink: true }} autoComplete="off"
              type="text"
              helperText="vedicastroapi.com → Dashboard → API Keys. Stored encrypted."
              placeholder={cfg?.hasApiKey ? '•••••••• (unchanged)' : 'Paste the VedicAstro API key'}
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value.trim() }))}
            />
          ) : (
            <TextField
              label="API Key" fullWidth size="small" InputLabelProps={{ shrink: true }}
              helperText={cfg?.hasApiKey ? 'Configured (encrypted). Tap the eye to reveal (OTP).' : 'Missing — the app falls back to approximate local computation.'}
              value={keyDisplay}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: revealedKey != null ? 'monospace' : 'inherit' },
                endAdornment: (
                  <InputAdornment position="end">
                    {revealedKey != null && revealedKey !== '' && (
                      <IconButton size="small" onClick={() => copy(revealedKey, 'API key')} aria-label="Copy API key"><ContentCopyIcon fontSize="small" /></IconButton>
                    )}
                    <IconButton
                      size="small" edge="end" disabled={!cfg?.hasApiKey}
                      onClick={() => (revealedKey != null ? setRevealedKey(null) : startReveal())}
                      aria-label={revealedKey != null ? 'Hide API key' : 'Reveal API key'}
                    >
                      {revealedKey != null ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
          {edit ? (
            <>
              <Button variant="contained" onClick={startSave} sx={{ whiteSpace: 'nowrap' }}>Save changes</Button>
              <Button onClick={cancelEdit} sx={{ color: b.textDim }}>Cancel</Button>
            </>
          ) : (
            <Button variant="contained" onClick={startEdit}>Edit credentials</Button>
          )}
        </Stack>
      </Card>

      {/* OTP confirmation — both saving and revealing are sensitive. */}
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
            {otp.submitting ? 'Verifying…' : (otp.action === 'reveal' ? 'Reveal' : 'Confirm & save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
