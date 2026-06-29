import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, TextField, Button, Stack, InputAdornment, Divider, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import toast from 'react-hot-toast';
import { AuthAPI } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const DEV_ACCOUNTS = [
  { role: 'Super Admin', phone: '9999900000' },
  { role: 'Admin', phone: '9999911111' },
];
const DEV_OTP = '123456';

// Brand wordmark "rg" mark rendered in CSS (red g, ink r) until the real logo lands.
function LogoMark({ size = 44, b }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: 2.2, background: b.surface, border: `1px solid ${b.border}`, display: 'grid', placeItems: 'center', boxShadow: `0 6px 18px -8px ${alpha(b.RED.main, 0.6)}` }}>
      <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: size * 0.5, lineHeight: 1, letterSpacing: '-0.04em' }}>
        <Box component="span" sx={{ color: b.text }}>r</Box>
        <Box component="span" sx={{ color: b.RED.main }}>g</Box>
      </Typography>
    </Box>
  );
}

export default function Login() {
  const { login } = useAuth();
  const { palette } = useTheme();
  const b = palette.brand;
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState(null);

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) return toast.error('Enter a valid 10-digit phone');
    setLoading(true);
    try {
      const { data } = await AuthAPI.requestOtp(phone);
      setDevCode(data.data?.devCode || null);
      setStep('otp');
      toast.success('OTP sent');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await login(phone, code);
      toast.success('Welcome back');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.code === 'NOT_ADMIN' ? e.message : e.response?.data?.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  const devSignIn = async (acct) => {
    setPhone(acct.phone);
    setLoading(true);
    try {
      const { data } = await AuthAPI.requestOtp(acct.phone);
      setCode(data.data?.devCode || DEV_OTP);
      setDevCode(data.data?.devCode || DEV_OTP);
      setStep('otp');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start dev login');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' } }}>
      {/* ── Left: branded panel ── */}
      <Box
        sx={{
          position: 'relative', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between',
          p: 6, color: '#F1F1F3', overflow: 'hidden',
          background: `radial-gradient(700px 500px at 80% 20%, ${alpha(b.RED.main, 0.35)} 0%, transparent 60%), linear-gradient(160deg, #16171C 0%, #0C0D11 100%)`,
        }}
      >
        {/* concentric zodiac-wheel motif */}
        <Box aria-hidden sx={{ position: 'absolute', right: -160, bottom: -160, width: 520, height: 520, borderRadius: '50%', border: `1px solid ${alpha(b.RED.soft, 0.25)}`, '&::before, &::after': { content: '""', position: 'absolute', inset: 60, borderRadius: '50%', border: `1px solid ${alpha(b.RED.soft, 0.18)}` }, '&::after': { inset: 140, borderColor: alpha(b.RED.soft, 0.12) } }} />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <LogoMark b={b} />
          <Box>
            <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>Rudraganga</Typography>
            <Typography variant="caption" sx={{ color: b.RED.soft, letterSpacing: 2, fontWeight: 600 }}>ADMIN CONSOLE</Typography>
          </Box>
        </Stack>
        <Box sx={{ position: 'relative' }}>
          <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 34, lineHeight: 1.15, mb: 1.5 }}>
            Run the platform.<br />Watch the heavens.
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#FFF', 0.6), maxWidth: 360 }}>
            Oversee astrologers, consultations, payments and payouts from one premium control center.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ position: 'relative', color: alpha('#FFF', 0.4) }}>© 2026 Rudraganga · Made under a watchful sky</Typography>
      </Box>

      {/* ── Right: form ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 }, background: b.ground }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}><LogoMark b={b} /></Box>
          <Typography variant="h5" sx={{ color: b.text, mb: 0.5 }}>{step === 'phone' ? 'Sign in' : 'Verify'}</Typography>
          <Typography variant="body2" sx={{ color: b.textDim, mb: 4 }}>
            {step === 'phone' ? 'Enter your registered admin number' : `Code sent to +91 ${phone}`}
          </Typography>

          {step === 'phone' ? (
            <Stack spacing={2}>
              <TextField
                label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                fullWidth onKeyDown={(e) => e.key === 'Enter' && sendOtp()} autoFocus
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: b.textFaint, fontSize: 18, mr: 0.5 }} />+91</InputAdornment> }}
              />
              <Button variant="contained" size="large" onClick={sendOtp} disabled={loading} endIcon={<ArrowForwardIcon />}>Send OTP</Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField label="6-digit OTP" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fullWidth autoFocus onKeyDown={(e) => e.key === 'Enter' && verify()}
                inputProps={{ style: { letterSpacing: '0.4em', fontWeight: 700, fontSize: 18 } }} />
              {devCode && <Typography variant="caption" sx={{ color: b.red }}>Dev code: {devCode}</Typography>}
              <Button variant="contained" size="large" onClick={verify} disabled={loading || code.length !== 6}>Verify &amp; sign in</Button>
              <Button onClick={() => setStep('phone')} sx={{ color: b.textDim }}>Change number</Button>
            </Stack>
          )}

          {import.meta.env.DEV && step === 'phone' && (
            <Box sx={{ mt: 5 }}>
              <Divider sx={{ '&::before, &::after': { borderColor: b.borderSoft } }}>
                <Typography variant="caption" sx={{ color: b.textFaint, letterSpacing: 1.5 }}>DEV LOGINS</Typography>
              </Divider>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {DEV_ACCOUNTS.map((acct) => (
                  <Box key={acct.phone} onClick={() => !loading && devSignIn(acct)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 2, cursor: 'pointer', border: `1px solid ${b.borderSoft}`, transition: 'all .15s', '&:hover': { borderColor: alpha(b.red, 0.5), background: alpha(b.red, 0.05) } }}>
                    <Chip size="small" label={acct.role} sx={{ background: alpha(b.red, 0.14), color: b.red, fontWeight: 700 }} />
                    <Typography variant="body2" sx={{ color: b.textDim, fontVariantNumeric: 'tabular-nums', flex: 1 }}>{acct.phone}</Typography>
                    <Typography variant="caption" sx={{ color: b.red, fontWeight: 600 }}>One-click →</Typography>
                  </Box>
                ))}
                <Typography variant="caption" sx={{ color: b.textFaint, textAlign: 'center', mt: 0.5 }}>OTP <b style={{ color: b.red }}>{DEV_OTP}</b> · dev builds only</Typography>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
