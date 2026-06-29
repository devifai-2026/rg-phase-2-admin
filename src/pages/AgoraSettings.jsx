import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Stack, Typography, TextField, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton, Chip, Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * Agora credentials. FOUR distinct fields — keeping them separate matters:
 *
 *   • App ID            — RTC app id (Console → Project; a.k.a. "App ID").
 *                          Baked into every call token + used by the apps.
 *   • App Certificate    — signs RTC tokens (Console → Project → Security →
 *                          Primary Certificate). REQUIRED for token-secured
 *                          calls; without it media will NOT connect (err 110).
 *   • Customer ID (Key)  — RESTful API key (Console → RESTful API → Customer ID).
 *                          Used for Cloud Recording, NOT for joining calls.
 *   • Customer Secret    — RESTful API secret.
 *
 * App Certificate + Customer Secret are stored ENCRYPTED on the server and never
 * sent in full until the admin verifies an OTP (the "reveal" eye). Saving any
 * field is also OTP-gated.
 *
 * NOTE: App ID and Customer ID are DIFFERENT values — do not paste one into the
 * other. Mixing them up makes call tokens invalid (the cause of past "Media
 * connection failed" / invalid-token errors).
 */
export default function AgoraSettings() {
  const { palette } = useTheme();
  const b = palette.brand;

  // { appId, restKey, secretMasked, hasSecret, certMasked, hasCertificate, updatedAt }
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ appId: '', appCertificate: '', restKey: '', restSecret: '' });

  // Reveal state: when revealed, we hold the plaintext values here.
  const [revealedSecret, setRevealedSecret] = useState(null); // string | null
  const [revealedCert, setRevealedCert] = useState(null);     // string | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AdminAPI.getAgora();
      setCfg(data.data);
    } catch { toast.error('Failed to load Agora settings'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    setForm({ appId: cfg?.appId || '', appCertificate: '', restKey: cfg?.restKey || '', restSecret: '' });
    setEdit(true);
  };
  const cancelEdit = () => { setEdit(false); setForm({ appId: '', appCertificate: '', restKey: '', restSecret: '' }); };

  // ── OTP flow (shared by Save and Reveal) ──
  // action: 'save' | 'reveal'
  const [otp, setOtp] = useState({ open: false, action: null, code: '', sending: false, submitting: false, devCode: '' });

  const requestOtp = async (action, label) => {
    try {
      const { data } = await AdminAPI.requestAgoraOtp();
      setOtp({ open: true, action, label, code: '', sending: false, submitting: false, devCode: data?.data?.devCode || '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send OTP'); }
  };

  const startSave = () => {
    if (!form.appId.trim() && !form.appCertificate.trim() && !form.restKey.trim() && !form.restSecret.trim()) {
      toast.error('Nothing to save'); return;
    }
    requestOtp('save', 'Saving Agora credentials');
  };
  const startReveal = () => {
    if (!cfg?.hasSecret && !cfg?.hasCertificate) { toast.error('Nothing secret saved yet'); return; }
    requestOtp('reveal', 'Revealing the Agora secrets');
  };

  const confirmOtp = async () => {
    if (otp.code.trim().length < 4) { toast.error('Enter the OTP'); return; }
    setOtp((o) => ({ ...o, submitting: true }));
    try {
      if (otp.action === 'save') {
        const body = { appId: form.appId, restKey: form.restKey, otp: otp.code.trim() };
        if (form.restSecret.trim()) body.restSecret = form.restSecret.trim();
        if (form.appCertificate.trim()) body.appCertificate = form.appCertificate.trim();
        const { data } = await AdminAPI.updateAgora(body);
        setCfg(data.data);
        setEdit(false);
        setRevealedSecret(null);
        setRevealedCert(null);
        setForm({ appId: '', appCertificate: '', restKey: '', restSecret: '' });
        toast.success('Agora credentials saved');
      } else {
        const { data } = await AdminAPI.revealAgoraSecret(otp.code.trim());
        setRevealedSecret(data.data.restSecret ?? '');
        setRevealedCert(data.data.appCertificate ?? '');
        toast.success('Secrets revealed');
      }
      setOtp({ open: false, action: null, code: '', sending: false, submitting: false, devCode: '' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed');
      setOtp((o) => ({ ...o, submitting: false }));
    }
  };

  const resendOtp = async () => {
    setOtp((o) => ({ ...o, sending: true }));
    try { const { data } = await AdminAPI.requestAgoraOtp(); setOtp((o) => ({ ...o, devCode: data?.data?.devCode || '', sending: false })); toast.success('OTP resent'); }
    catch { setOtp((o) => ({ ...o, sending: false })); toast.error('Could not resend'); }
  };

  const copy = (val, label) => {
    if (!val) return;
    navigator.clipboard?.writeText(val).then(() => toast.success(`${label} copied`)).catch(() => {});
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="Agora (Video & Voice)" subtitle="Credentials for live video / voice calls" />
        <Box sx={{ display: 'grid', placeItems: 'center', height: 240 }}><CircularProgress /></Box>
      </Box>
    );
  }

  const secretDisplay = revealedSecret != null ? revealedSecret : (cfg?.secretMasked || (cfg?.hasSecret ? '••••••••' : ''));
  const certDisplay = revealedCert != null ? revealedCert : (cfg?.certMasked || (cfg?.hasCertificate ? '••••••••' : ''));
  // Token-secured calls need BOTH App ID and App Certificate.
  const callReady = !!cfg?.appId && !!cfg?.hasCertificate;

  return (
    <Box>
      <PageHeader title="Agora (Video & Voice)" subtitle="App ID + App Certificate for calls; Customer ID/Secret for recording. Secrets are encrypted at rest." />

      <Card sx={{ p: 3, maxWidth: 680 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: alpha(b.violet, 0.16), display: 'grid', placeItems: 'center' }}>
            <VideocamIcon sx={{ color: b.violet }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Agora credentials</Typography>
            <Typography variant="caption" sx={{ color: b.textDim }}>
              {cfg?.updatedAt ? `Last updated ${new Date(cfg.updatedAt).toLocaleString('en-IN')}` : 'Not configured yet'}
            </Typography>
          </Box>
          <Chip size="small" label={callReady ? 'Calls ready' : 'Calls not ready'}
            sx={{ fontWeight: 700, background: alpha(callReady ? b.green : b.amber, 0.16), color: callReady ? b.green : b.amber }} />
        </Stack>

        {/* ── Calls section: App ID + App Certificate (token signing) ── */}
        <Typography variant="overline" sx={{ color: b.textDim, fontWeight: 700 }}>For calls / video (token signing)</Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* App ID */}
          <TextField
            label="App ID" fullWidth size="small" InputLabelProps={{ shrink: true }} autoComplete="off"
            helperText="Agora Console → Project → App ID. NOT the Customer ID."
            value={edit ? form.appId : (cfg?.appId || '')}
            onChange={(e) => setForm((f) => ({ ...f, appId: e.target.value.trim() }))}
            InputProps={{ readOnly: !edit, endAdornment: !edit && cfg?.appId ? (
              <InputAdornment position="end"><IconButton size="small" onClick={() => copy(cfg.appId, 'App ID')}><ContentCopyIcon fontSize="small" /></IconButton></InputAdornment>
            ) : undefined }}
          />

          {/* App Certificate — masked with eye reveal (OTP) when viewing; plain input when editing */}
          {edit ? (
            <TextField
              label="App Certificate (leave blank to keep current)" fullWidth size="small" InputLabelProps={{ shrink: true }} autoComplete="off"
              type="text"
              helperText="Console → Project → Security → Primary Certificate. Required for calls."
              placeholder={cfg?.hasCertificate ? '•••••••• (unchanged)' : 'Paste the App Certificate'}
              value={form.appCertificate}
              onChange={(e) => setForm((f) => ({ ...f, appCertificate: e.target.value.trim() }))}
            />
          ) : (
            <TextField
              label="App Certificate" fullWidth size="small" InputLabelProps={{ shrink: true }}
              helperText={cfg?.hasCertificate ? 'Configured (encrypted). Tap the eye to reveal (OTP).' : 'Missing — calls cannot connect without it.'}
              value={certDisplay}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: revealedCert != null ? 'monospace' : 'inherit' },
                endAdornment: (
                  <InputAdornment position="end">
                    {revealedCert != null && revealedCert !== '' && (
                      <IconButton size="small" onClick={() => copy(revealedCert, 'App Certificate')} aria-label="Copy certificate"><ContentCopyIcon fontSize="small" /></IconButton>
                    )}
                    <IconButton
                      size="small" edge="end" disabled={!cfg?.hasCertificate}
                      onClick={() => (revealedCert != null ? setRevealedCert(null) : startReveal())}
                      aria-label={revealedCert != null ? 'Hide certificate' : 'Reveal certificate'}
                    >
                      {revealedCert != null ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Stack>

        <Divider sx={{ my: 2.5, borderColor: b.borderSoft }} />

        {/* ── Recording section: Customer ID + Secret (RESTful API) ── */}
        <Typography variant="overline" sx={{ color: b.textDim, fontWeight: 700 }}>For cloud recording (RESTful API)</Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Customer ID (REST Key) */}
          <TextField
            label="Customer ID (RESTful Key)" fullWidth size="small" InputLabelProps={{ shrink: true }} autoComplete="off"
            helperText="Console → RESTful API → Customer ID. Used for recording, not for joining calls."
            value={edit ? form.restKey : (cfg?.restKey || '')}
            onChange={(e) => setForm((f) => ({ ...f, restKey: e.target.value.trim() }))}
            InputProps={{ readOnly: !edit, endAdornment: !edit && cfg?.restKey ? (
              <InputAdornment position="end"><IconButton size="small" onClick={() => copy(cfg.restKey, 'Customer ID')}><ContentCopyIcon fontSize="small" /></IconButton></InputAdornment>
            ) : undefined }}
          />

          {/* Customer Secret — masked with eye reveal (OTP) when viewing; plain input when editing */}
          {edit ? (
            <TextField
              label="Customer Secret (leave blank to keep current)" fullWidth size="small" InputLabelProps={{ shrink: true }} autoComplete="off"
              type="text"
              helperText="Console → RESTful API → Customer Secret (shown once on download)."
              placeholder={cfg?.hasSecret ? '•••••••• (unchanged)' : 'Paste the Customer Secret'}
              value={form.restSecret}
              onChange={(e) => setForm((f) => ({ ...f, restSecret: e.target.value.trim() }))}
            />
          ) : (
            <TextField
              label="Customer Secret" fullWidth size="small" InputLabelProps={{ shrink: true }}
              helperText={cfg?.hasSecret ? 'Configured (encrypted). Tap the eye to reveal (OTP).' : 'Optional — needed only for cloud recording.'}
              value={secretDisplay}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: revealedSecret != null ? 'monospace' : 'inherit' },
                endAdornment: (
                  <InputAdornment position="end">
                    {revealedSecret != null && revealedSecret !== '' && (
                      <IconButton size="small" onClick={() => copy(revealedSecret, 'Customer Secret')} aria-label="Copy secret"><ContentCopyIcon fontSize="small" /></IconButton>
                    )}
                    <IconButton
                      size="small" edge="end" disabled={!cfg?.hasSecret}
                      onClick={() => (revealedSecret != null ? setRevealedSecret(null) : startReveal())}
                      aria-label={revealedSecret != null ? 'Hide secret' : 'Reveal secret'}
                    >
                      {revealedSecret != null ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
