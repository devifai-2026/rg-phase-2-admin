import { Box, Stack, Typography, TextField, Slider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * One brand-token editor: swatch + native color picker + 8-digit ARGB hex field
 * + alpha slider. Values are '#AARRGGBB' (Flutter Color(0x...) order) so they map
 * 1:1 to the app. A blank value means "use the app's compiled default".
 */

// '#AARRGGBB' → { rgb: '#RRGGBB', alpha: 0-255 }
function parse(v) {
  if (!v) return { rgb: '#000000', alpha: 255, empty: true };
  const h = v.replace('#', '');
  if (h.length === 8) return { rgb: `#${h.slice(2)}`, alpha: parseInt(h.slice(0, 2), 16) };
  if (h.length === 6) return { rgb: `#${h}`, alpha: 255 };
  return { rgb: '#000000', alpha: 255, empty: true };
}
const toArgb = (rgb, alpha) => `#${alpha.toString(16).padStart(2, '0').toUpperCase()}${rgb.replace('#', '').toUpperCase()}`;

// CSS rgba() for the swatch preview (so alpha is visible).
export function cssFromArgb(v, fallback = 'transparent') {
  if (!v) return fallback;
  const h = v.replace('#', '');
  if (h.length === 8) {
    const a = parseInt(h.slice(0, 2), 16) / 255;
    return `rgba(${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${parseInt(h.slice(6, 8), 16)},${a.toFixed(3)})`;
  }
  if (h.length === 6) return `#${h}`;
  return fallback;
}

export default function ColorTokenField({ label, hint, value, fallback, onChange }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const cur = parse(value);
  // What the app actually renders for this token (override or fallback).
  const effective = value || fallback;

  const setRgb = (rgb) => onChange(toArgb(rgb, cur.empty ? 255 : cur.alpha));
  const setAlpha = (a) => onChange(toArgb(cur.rgb, a));

  return (
    <Box sx={{ p: 1.25, borderRadius: 1.5, border: `1px solid ${b.borderSoft}`, background: 'transparent' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {/* Checkerboard behind swatch so alpha is visible */}
        <Box sx={{ width: 40, height: 40, borderRadius: 1, flexShrink: 0, border: `1px solid ${b.border}`,
          backgroundImage: 'linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%)',
          backgroundSize: '10px 10px', backgroundPosition: '0 0,0 5px,5px -5px,-5px 0', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, background: cssFromArgb(effective, b.surface2) }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{label}</Typography>
          {hint && <Typography variant="caption" sx={{ color: b.textDim }} noWrap>{hint}</Typography>}
        </Box>
        <input type="color" value={cur.rgb} onChange={(e) => setRgb(e.target.value)}
          style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
        <TextField size="small" value={value || ''} placeholder={fallback || '#AARRGGBB'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          sx={{ width: 150 }} inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 }, maxLength: 9 }} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: b.textDim, width: 38 }}>α {cur.empty ? 255 : cur.alpha}</Typography>
          <Slider size="small" value={cur.empty ? 255 : cur.alpha} min={0} max={255} step={1}
            onChange={(e, v) => setAlpha(v)} sx={{ flex: 1 }} disabled={!value} />
        </Stack>
      </Stack>
    </Box>
  );
}
