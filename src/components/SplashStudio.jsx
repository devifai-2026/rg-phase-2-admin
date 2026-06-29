import { useEffect, useState } from 'react';
import {
  Box, Button, Stack, Typography, Grid, TextField, ToggleButton, ToggleButtonGroup,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import ImageUpload from './ImageUpload';
import ColorTokenField, { cssFromArgb } from './ColorTokenField';

/**
 * Splash Studio — upload a full-screen splash image (optional separate light/dark
 * variants) that replaces the app's built-in animated splash. When no image is
 * set, the app keeps its coded animated splash (the fallback).
 */
export default function SplashStudio() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('image'); // image | imageDark | imageLight

  useEffect(() => {
    AdminAPI.getAppConfig().then((r) => setS(r.data.data.splash || {})).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const upd = (patch) => setS((v) => ({ ...v, ...patch }));
  const save = async () => {
    setSaving(true);
    try { await AdminAPI.updateAppConfig({ splash: s }); toast.success('Splash published — applies on next app launch'); }
    catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;

  const previewImg = s[preview] || s.image;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: b.textDim }}>
          Upload a full-screen splash. Leave blank to keep the built-in animated splash.
        </Typography>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={saving} onClick={save}>Publish</Button>
      </Stack>

      {!s.image && !s.imageDark && !s.imageLight && (
        <Alert severity="info" sx={{ mb: 2, background: alpha(b.blue, 0.1), color: b.text, border: `1px solid ${alpha(b.blue, 0.25)}`, '& .MuiAlert-icon': { color: b.blue } }}>
          No splash image set — the app shows its built-in animated splash (logo + tagline).
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Default splash image</Typography>
              <ImageUpload value={s.image} onChange={(url) => upd({ image: url })} label="splash" variant="rounded" size={96} fallback="S" />
              <Typography variant="caption" sx={{ color: b.textFaint }}>Portrait, full-screen. Used for both modes unless a variant below is set.</Typography>
            </Box>
            <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Optional per-mode variants</Typography></Divider>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: b.textDim }}>Dark mode</Typography>
                <ImageUpload value={s.imageDark} onChange={(url) => upd({ imageDark: url })} label="dark splash" variant="rounded" size={72} fallback="D" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: b.textDim }}>Light mode</Typography>
                <ImageUpload value={s.imageLight} onChange={(url) => upd({ imageLight: url })} label="light splash" variant="rounded" size={72} fallback="L" />
              </Grid>
            </Grid>
            <Divider sx={{ borderColor: b.borderSoft }} />
            <ColorTokenField label="Background color" hint="Shown behind the image while it loads" value={s.backgroundColor} fallback="#FF0B0B0C" onChange={(v) => upd({ backgroundColor: v })} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: b.textDim, display: 'block', mb: 0.5 }}>Image fit</Typography>
                <ToggleButtonGroup size="small" exclusive value={s.fit || 'cover'} onChange={(e, v) => v && upd({ fit: v })}>
                  <ToggleButton value="cover">Cover</ToggleButton>
                  <ToggleButton value="contain">Contain</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TextField label="Duration (ms)" type="number" value={s.durationMs ?? 1900} onChange={(e) => upd({ durationMs: Number(e.target.value) })}
                InputLabelProps={{ shrink: true }} inputProps={{ min: 600, max: 6000, step: 100 }} sx={{ width: 150 }} />
            </Stack>
          </Stack>
        </Grid>

        {/* Phone preview */}
        <Grid item xs={12} md={5}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="overline" sx={{ color: b.textDim, flex: 1 }}>Preview</Typography>
            <ToggleButtonGroup size="small" exclusive value={preview} onChange={(e, v) => v && setPreview(v)}>
              <ToggleButton value="image" sx={{ fontSize: 10 }}>Default</ToggleButton>
              <ToggleButton value="imageDark" sx={{ fontSize: 10 }}>Dark</ToggleButton>
              <ToggleButton value="imageLight" sx={{ fontSize: 10 }}>Light</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Box sx={{ width: 220, mx: 'auto', aspectRatio: '9 / 19.5', borderRadius: 5, border: `8px solid #111`, overflow: 'hidden',
            background: cssFromArgb(s.backgroundColor, '#0B0B0C'), display: 'grid', placeItems: 'center', position: 'relative' }}>
            {previewImg ? (
              <img src={previewImg} alt="splash" style={{ width: '100%', height: '100%', objectFit: s.fit || 'cover' }} />
            ) : (
              <Stack alignItems="center" spacing={1.5} sx={{ color: '#FBF6EF' }}>
                <Box sx={{ width: 64, height: 64, borderRadius: 3, border: '2px solid #C0392B', display: 'grid', placeItems: 'center', fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 800 }}>
                  <span>r</span><span style={{ color: '#E0584A' }}>g</span>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Rudraganga</Typography>
                <Typography sx={{ fontSize: 11, color: '#C98A5E' }}>built-in splash (fallback)</Typography>
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
