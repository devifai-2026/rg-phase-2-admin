import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Stack, Typography, TextField, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary,
  AccordionDetails, Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockIcon from '@mui/icons-material/Lock';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * Danger Prompts — edit the LLM SYSTEM prompts that drive every AI feature.
 * The whole tab is OTP-gated (a code is sent to a fixed guardian number) because
 * a bad edit changes AI behaviour platform-wide. Editing is plain monospace text
 * (prompts are not HTML). Saving each prompt re-verifies the OTP.
 */
export default function DangerPrompts() {
  const { palette } = useTheme();
  const b = palette.brand;

  // ── OTP gate ──
  const [unlocked, setUnlocked] = useState(false);
  const [otp, setOtp] = useState({ sending: false, sent: false, code: '', phone: '', devCode: '', verifying: false });
  // The verified code is kept so each save can re-send it (backend requires OTP
  // on every PUT). If it expires, a save fails → we re-lock and prompt again.
  const [verifiedOtp, setVerifiedOtp] = useState('');

  // ── Prompts ──
  const [prompts, setPrompts] = useState(null); // [{key,label,description,defaultSystem,system,isOverridden,updatedAt}]
  const [drafts, setDrafts] = useState({}); // key → edited text
  const [savingKey, setSavingKey] = useState(null);

  const sendOtp = useCallback(async () => {
    setOtp((o) => ({ ...o, sending: true }));
    try {
      const { data } = await AdminAPI.requestPromptOtp();
      setOtp((o) => ({ ...o, sending: false, sent: true, phone: data.data?.phone || '', devCode: data.data?.devCode || '' }));
    } catch (e) {
      setOtp((o) => ({ ...o, sending: false }));
      toast.error(e.response?.data?.message || 'Could not send OTP');
    }
  }, []);

  // Auto-send the OTP the moment the tab opens.
  useEffect(() => { sendOtp(); }, [sendOtp]);

  const verify = async () => {
    const code = otp.code.trim();
    if (code.length < 4) { toast.error('Enter the OTP'); return; }
    setOtp((o) => ({ ...o, verifying: true }));
    // We "verify" by attempting to load the prompts isn't OTP-gated — the OTP is
    // checked on SAVE. So we just hold the code and unlock the editor; the first
    // save validates it. To give immediate feedback we trust the entered code
    // and let the save surface an invalid-OTP error if wrong.
    setVerifiedOtp(code);
    setUnlocked(true);
    setOtp((o) => ({ ...o, verifying: false }));
    load();
  };

  const load = useCallback(async () => {
    try {
      const { data } = await AdminAPI.listPrompts();
      setPrompts(data.data || []);
      const d = {};
      (data.data || []).forEach((p) => { d[p.key] = p.system; });
      setDrafts(d);
    } catch (e) { toast.error('Failed to load prompts'); }
  }, []);

  const save = async (p) => {
    const text = drafts[p.key] ?? p.system;
    setSavingKey(p.key);
    try {
      const { data } = await AdminAPI.updatePrompt({ key: p.key, system: text, otp: verifiedOtp });
      setPrompts(data.data || []);
      const d = {};
      (data.data || []).forEach((x) => { d[x.key] = x.system; });
      setDrafts(d);
      toast.success(`Saved "${p.label}"`);
    } catch (e) {
      const msg = e.response?.data?.message || 'Save failed';
      toast.error(msg);
      // OTP expired/invalid → re-lock and re-send so they can re-verify.
      if (/otp|expired|invalid/i.test(msg)) {
        setUnlocked(false);
        setVerifiedOtp('');
        sendOtp();
      }
    } finally { setSavingKey(null); }
  };

  const revert = (p) => setDrafts((d) => ({ ...d, [p.key]: p.defaultSystem }));

  // ── OTP gate UI ──
  if (!unlocked) {
    return (
      <Box>
        <PageHeader title="Danger Prompts" subtitle="Edit the AI SYSTEM prompts — OTP-protected" />
        <Card sx={{ p: 4, maxWidth: 460, mx: 'auto', mt: 4, textAlign: 'center', border: `1px solid ${alpha(b.amber || b.gold, 0.5)}` }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2, display: 'grid', placeItems: 'center', background: alpha(b.gold, 0.16) }}>
            <LockIcon sx={{ color: b.gold, fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Verify to continue</Typography>
          <Typography variant="body2" sx={{ color: b.textDim, mt: 1, mb: 1 }}>
            Editing AI prompts changes how the assistant behaves for everyone. Enter the OTP we sent to keep this safe.
          </Typography>
          {otp.phone && (
            <Chip size="small" label={`OTP sent to ${otp.phone}`} sx={{ mb: 2, background: alpha(b.gold, 0.14), color: b.gold, fontWeight: 700 }} />
          )}
          {otp.devCode && (
            <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>Dev code: <b>{otp.devCode}</b></Alert>
          )}
          <TextField
            fullWidth autoFocus label="Enter OTP" value={otp.code}
            onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
            inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: 6, fontSize: 20, textAlign: 'center' } }}
            InputLabelProps={{ shrink: true }}
            onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" onClick={verify} disabled={otp.verifying}>Unlock</Button>
            <Button onClick={sendOtp} disabled={otp.sending} sx={{ color: b.textDim, whiteSpace: 'nowrap' }}>
              {otp.sending ? 'Sending…' : 'Resend'}
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  // ── Editor UI ──
  return (
    <Box>
      <PageHeader title="Danger Prompts" subtitle="The AI SYSTEM prompts behind every assistant feature" />

      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
        These prompts control AI behaviour across the whole platform. Edit carefully — a small change can have a big effect.
        Saving each prompt re-verifies your OTP. Leave a prompt identical to its default (or use Revert) to fall back to the built-in version.
      </Alert>

      {prompts == null ? (
        <Box sx={{ display: 'grid', placeItems: 'center', height: 200 }}><CircularProgress /></Box>
      ) : prompts.length === 0 ? (
        <Typography sx={{ color: b.textDim }}>No prompts registered.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {prompts.map((p) => {
            const draft = drafts[p.key] ?? p.system;
            const dirty = draft !== p.system;
            return (
              <Accordion key={p.key} disableGutters sx={{ background: b.surface, border: `1px solid ${b.border}`, borderRadius: 2, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, pr: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{p.label}</Typography>
                    {p.isOverridden && <Chip size="small" label="Customised" sx={{ background: alpha(b.gold, 0.16), color: b.gold, fontWeight: 700, height: 20 }} />}
                    {dirty && <Chip size="small" label="Unsaved" sx={{ background: alpha(b.red, 0.16), color: b.red, fontWeight: 700, height: 20 }} />}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" sx={{ color: b.textDim, display: { xs: 'none', sm: 'block' } }}>{p.description}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth multiline minRows={6} maxRows={24}
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                    InputProps={{ sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.5 } }}
                  />
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} alignItems="center">
                    <Button variant="contained" onClick={() => save(p)} disabled={!dirty || savingKey === p.key}
                      startIcon={savingKey === p.key ? <CircularProgress size={15} color="inherit" /> : null}>
                      {savingKey === p.key ? 'Saving…' : 'Save'}
                    </Button>
                    <Button onClick={() => revert(p)} startIcon={<RestartAltIcon />} sx={{ color: b.textDim }}
                      disabled={draft === p.defaultSystem}>
                      Revert to default
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    {p.updatedAt && <Typography variant="caption" sx={{ color: b.textDim }}>Edited {new Date(p.updatedAt).toLocaleString('en-IN')}</Typography>}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
