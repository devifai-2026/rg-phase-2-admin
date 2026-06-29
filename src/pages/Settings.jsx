import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, TextField, Button, Stack, Typography, Divider, Switch, FormControlLabel, ToggleButton, ToggleButtonGroup } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { useTheme, alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import { useColorMode } from '../theme/ColorModeContext';
import { THEME_PRESETS, getTheme } from '../theme';

export default function Settings() {
  const { palette } = useTheme();
  const C = palette.brand;
  const { mode, preset, setMode, setPreset } = useColorMode();
  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AdminAPI.getSettings().then((r) => { reset(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (form) => {
    const num = (k) => Number(form[k] || 0);
    const body = {
      withdrawalThreshold: num('withdrawalThreshold'),
      giftTokenRupees: num('giftTokenRupees'),
      callMaxMinutes: num('callMaxMinutes'),
      ringTimeoutSec: num('ringTimeoutSec'),
      escalationMissThreshold: num('escalationMissThreshold'),
      escalationWindowMinutes: num('escalationWindowMinutes'),
      signupBonusEnabled: !!form.signupBonusEnabled,
      signupBonus: num('signupBonus'),
      signupFreeChatEnabled: !!form.signupFreeChatEnabled,
      signupFreeChatMinutes: num('signupFreeChatMinutes'),
    };
    try { await AdminAPI.updateSettings(body); toast.success('Settings saved'); }
    catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  // Common props that fix the label-overlap: keep the label shrunk so a
  // programmatically-set value never sits under the floating label.
  const numField = (key, label, help) => (
    <Grid item xs={12} sm={6} md={4} key={key}>
      <TextField label={label} type="number" fullWidth disabled={loading} helperText={help}
        InputLabelProps={{ shrink: true }} {...register(key)} />
    </Grid>
  );

  const Section = ({ title, children }) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="overline" sx={{ color: C.textDim }}>{title}</Typography>
      <Divider sx={{ mt: 0.5, mb: 2, borderColor: C.borderSoft }} />
      {children}
    </Box>
  );

  // Preview swatch for a preset = the accent it would use in the CURRENT mode.
  const presetAccent = (key) => getTheme(mode, key).palette.brand.red;

  return (
    <Box>
      <PageHeader title="Platform Settings" subtitle="Super-admin only · commission is set per-astrologer, not here" />

      {/* Theme — applies instantly + persists locally (per-admin preference). */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Section title="Appearance">
            <Grid container spacing={3} alignItems="flex-start">
              <Grid item xs={12} sm={5} md={4}>
                <Typography variant="body2" sx={{ color: C.text, fontWeight: 600, mb: 1 }}>Mode</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={mode}
                  onChange={(_, v) => v && setMode(v)}
                  size="small"
                >
                  <ToggleButton value="light" sx={{ px: 2 }}><LightModeIcon fontSize="small" sx={{ mr: 0.8 }} /> Light</ToggleButton>
                  <ToggleButton value="dark" sx={{ px: 2 }}><DarkModeIcon fontSize="small" sx={{ mr: 0.8 }} /> Dark</ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="caption" sx={{ color: C.textFaint, display: 'block', mt: 1 }}>
                  Saved on this device. Also toggleable from the top bar.
                </Typography>
              </Grid>

              <Grid item xs={12} sm={7} md={8}>
                <Typography variant="body2" sx={{ color: C.text, fontWeight: 600, mb: 1 }}>Accent preset</Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                  {THEME_PRESETS.map((p) => {
                    const accent = presetAccent(p.key);
                    const active = preset === p.key;
                    return (
                      <Box
                        key={p.key}
                        onClick={() => setPreset(p.key)}
                        sx={{
                          cursor: 'pointer',
                          px: 1.5, py: 1, borderRadius: 2,
                          border: `1.5px solid ${active ? accent : C.border}`,
                          background: active ? alpha(accent, 0.10) : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 1,
                          transition: 'all .15s',
                        }}
                      >
                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {active && <CheckIcon sx={{ fontSize: 13, color: '#fff' }} />}
                        </Box>
                        <Typography variant="body2" sx={{ color: active ? C.text : C.textDim, fontWeight: active ? 700 : 500 }}>{p.label}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
                <Typography variant="caption" sx={{ color: C.textFaint, display: 'block', mt: 1 }}>
                  Changes the accent colour across the dashboard. Applies instantly.
                </Typography>
              </Grid>
            </Grid>
          </Section>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Section title="New-user perks">
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel control={<Switch checked={!!watch('signupBonusEnabled')} onChange={(e) => setValue('signupBonusEnabled', e.target.checked)} />} label="Give signup wallet bonus" />
                  <TextField label="Signup bonus (₹)" type="number" fullWidth disabled={loading || !watch('signupBonusEnabled')} helperText="Credited to new users on first verification" InputLabelProps={{ shrink: true }} {...register('signupBonus')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel control={<Switch checked={!!watch('signupFreeChatEnabled')} onChange={(e) => setValue('signupFreeChatEnabled', e.target.checked)} />} label="Give free chat minutes" />
                  <TextField label="Free chat minutes" type="number" fullWidth disabled={loading || !watch('signupFreeChatEnabled')} helperText="Free minutes on a new user's first chat" InputLabelProps={{ shrink: true }} {...register('signupFreeChatMinutes')} />
                </Grid>
              </Grid>
            </Section>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Section title="Payments & wallet">
              <Grid container spacing={2.5}>
                {numField('withdrawalThreshold', 'Minimum withdrawal (₹)', 'Astrologers must reach this to request a payout')}
              </Grid>
            </Section>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Section title="Sessions & escalation">
              <Grid container spacing={2.5}>
                {numField('callMaxMinutes', 'Max call minutes', 'Hard cap per session')}
                {numField('ringTimeoutSec', 'Ring timeout (sec)', 'Incoming request window')}
                {numField('escalationMissThreshold', 'Escalation: miss threshold', 'Misses within the window before alerting')}
                {numField('escalationWindowMinutes', 'Escalation: window (min)', 'Rolling window for counting misses')}
              </Grid>
            </Section>
          </CardContent>
        </Card>

        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" size="large">Save Settings</Button>
        </Stack>
      </form>
    </Box>
  );
}
