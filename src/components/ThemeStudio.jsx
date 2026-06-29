import { useEffect, useState } from 'react';
import {
  Box, Button, Stack, Typography, Grid, ToggleButton, ToggleButtonGroup, FormControlLabel,
  Switch, CircularProgress, Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import ColorTokenField, { cssFromArgb } from './ColorTokenField';
import { TOKEN_DEFAULTS, TOKEN_META } from '../theme/appTokens';

/**
 * Theme Studio — edit the app's dark + light brand tokens with live preview, then
 * publish. Tokens map 1:1 to flutter/user/lib/theme/rg_colors.dart. Anything left
 * blank falls back to the app's compiled default for that token.
 */
export default function ThemeStudio() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [mode, setMode] = useState('dark'); // which set is being edited/previewed
  const [enabled, setEnabled] = useState(false);
  const [dark, setDark] = useState({});
  const [light, setLight] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AdminAPI.getAppConfig().then((r) => {
      const t = r.data.data.theme || {};
      setEnabled(!!t.enabled);
      setDark(clean(t.dark)); setLight(clean(t.light));
    }).catch(() => toast.error('Failed to load theme')).finally(() => setLoading(false));
  }, []);

  const set = mode === 'dark' ? dark : light;
  const setSet = mode === 'dark' ? setDark : setLight;
  const defaults = TOKEN_DEFAULTS[mode];
  const eff = (k) => set[k] || defaults[k]; // effective rendered color for preview

  const onToken = (k, v) => setSet((s) => ({ ...s, [k]: v }));
  const resetToken = (k) => setSet((s) => { const n = { ...s }; delete n[k]; return n; });

  const save = async () => {
    setSaving(true);
    try {
      await AdminAPI.updateAppConfig({ theme: { enabled, dark: clean(dark), light: clean(light) } });
      toast.success('Theme published — applies on next app launch');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label={<Typography sx={{ fontWeight: 700 }}>Use custom theme</Typography>} />
          <Typography variant="caption" sx={{ display: 'block', color: b.textDim }}>
            When off, the app uses its built-in colors. Blank tokens always fall back to the built-in value.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => v && setMode(v)}>
            <ToggleButton value="dark">Dark set</ToggleButton>
            <ToggleButton value="light">Light set</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={saving} onClick={save}>Publish</Button>
        </Stack>
      </Stack>

      {!enabled && <Alert severity="info" sx={{ mb: 2, background: alpha(b.blue, 0.1), color: b.text, border: `1px solid ${alpha(b.blue, 0.25)}`, '& .MuiAlert-icon': { color: b.blue } }}>
        Custom theme is off — edits are saved but the app keeps its built-in colors until you turn it on.
      </Alert>}

      <Grid container spacing={3}>
        {/* Token editors */}
        <Grid item xs={12} md={7}>
          <Stack spacing={1.25}>
            {TOKEN_META.map((m) => (
              <Box key={m.key} sx={{ position: 'relative' }}>
                <ColorTokenField label={m.label} hint={m.hint} value={set[m.key]} fallback={defaults[m.key]} onChange={(v) => onToken(m.key, v)} />
                {set[m.key] && (
                  <Button size="small" onClick={() => resetToken(m.key)} startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                    sx={{ position: 'absolute', top: 6, right: 6, color: b.textFaint, fontSize: 10, minWidth: 0, py: 0 }}>reset</Button>
                )}
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Live preview — a small app-like surface using the effective tokens */}
        <Grid item xs={12} md={5}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <Typography variant="overline" sx={{ color: b.textDim }}>Live preview · {mode}</Typography>
            <ThemePreview eff={eff} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

// Strip empties so we only persist real overrides.
function clean(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (k === '_id') continue;
    if (v) out[k] = v;
  }
  return out;
}

// Mini app surface rendered with the chosen tokens (CSS rgba from ARGB).
function ThemePreview({ eff }) {
  const c = (k, fb) => cssFromArgb(eff(k), fb);
  const ground = c('ground'), ground2 = c('ground2'), card = c('card');
  const red = c('red'), gold = c('gold'), ink = c('ink'), muted = c('muted'), line = c('line');
  const violet = c('violet'), indigo = c('indigo'), aiSurface = c('aiSurface'), mint = c('mint'), green = c('green'), blue = c('blue');

  return (
    <Box sx={{ mt: 1, borderRadius: 3, overflow: 'hidden', border: `1px solid ${line}`, background: ground, boxShadow: '0 8px 30px -12px rgba(0,0,0,0.4)' }}>
      {/* app bar */}
      <Box sx={{ px: 2, py: 1.5, background: ground2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: ink, fontWeight: 800, fontFamily: 'Fraunces, serif' }}>Rudraganga</Typography>
        <Box sx={{ px: 1.2, py: 0.4, borderRadius: 2, background: red, color: '#fff', fontSize: 11, fontWeight: 700 }}>₹1,250</Box>
      </Box>
      <Box sx={{ p: 2 }}>
        {/* promo strip */}
        <Box sx={{ height: 44, borderRadius: 2, background: `linear-gradient(90deg, ${red}, ${gold})`, display: 'flex', alignItems: 'center', px: 1.5, mb: 1.5 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>Festival offer · 30% off</Typography>
        </Box>
        {/* astrologer card */}
        <Box sx={{ p: 1.5, borderRadius: 2.5, background: card, border: `1px solid ${line}`, mb: 1.25 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box sx={{ width: 38, height: 38, borderRadius: '50%', background: red, position: 'relative' }}>
              <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: green, border: `2px solid ${ground}` }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: ink, fontWeight: 700, fontSize: 13 }}>Acharya Veda</Typography>
              <Typography sx={{ color: muted, fontSize: 11 }}>Vedic · Tarot · 12 yrs</Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, borderRadius: 1.5, border: `1px solid ${green}`, color: green, fontSize: 11, fontWeight: 700 }}>Chat</Box>
            <Box sx={{ px: 1, py: 0.5, borderRadius: 1.5, border: `1px solid ${blue}`, color: blue, fontSize: 11, fontWeight: 700 }}>Video</Box>
          </Stack>
        </Box>
        {/* AI card */}
        <Box sx={{ p: 1.5, borderRadius: 2.5, background: `linear-gradient(135deg, ${aiSurface}, ${cssFromArgb(eff('aiSurface2'), aiSurface)})`, border: `1px solid ${alphaLine(violet)}` }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box sx={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${violet}, ${indigo})`, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>AI</Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Tara AI</Typography>
              <Typography sx={{ color: mint, fontSize: 11, fontWeight: 600 }}>⚡ Always available · 24×7</Typography>
            </Box>
            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 1.5, background: `linear-gradient(135deg, ${violet}, ${indigo})`, color: '#fff', fontSize: 11, fontWeight: 700 }}>Chat</Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
const alphaLine = (rgba) => rgba.replace(/rgba?\(([^)]+)\)/, (m, p) => `rgba(${p.split(',').slice(0, 3).join(',')},0.35)`);
