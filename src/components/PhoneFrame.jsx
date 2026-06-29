import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Realistic phone bezel that hosts an app-styled preview. The inner screen
 * scrolls; the app screen always renders on a dark app background (the user
 * app is dark) regardless of the admin's light/dark mode.
 */
export default function PhoneFrame({ children, width = 300 }) {
  const height = Math.round(width * 2.0);
  const bezel = 8;
  const outerR = 36; // device corner
  const innerR = outerR - bezel;
  return (
    <Box sx={{ width, flexShrink: 0, mx: 'auto' }}>
      <Box
        sx={{
          position: 'relative', width, height, borderRadius: `${outerR}px`,
          background: '#0b0c10', border: `${bezel}px solid #1c1d22`,
          boxShadow: '0 24px 48px -24px rgba(0,0,0,0.5)',
        }}
      >
        {/* screen — clips its own content to the inner radius so the app header
            corners stay rounded */}
        <Box sx={{ position: 'absolute', inset: 0, borderRadius: `${innerR}px`, overflow: 'hidden', background: '#0E0F13' }}>
          {/* notch */}
          <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: width * 0.34, height: 20, background: '#0b0c10', borderBottomLeftRadius: 11, borderBottomRightRadius: 11, zIndex: 5 }} />
          <Box sx={{ position: 'absolute', inset: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: 0 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mock status bar + app header strip, shown at the top of every preview. */
export function AppBarMock({ title }) {
  const { palette } = useTheme();
  const RED = palette.brand.RED;
  return (
    <Box sx={{ pt: '26px', px: 2, pb: 1.25, background: `linear-gradient(180deg, ${RED.main} 0%, ${RED.hover} 100%)`, color: '#fff' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.85, mb: 0.5 }}>
        <span>9:41</span><span>5G ▦</span>
      </Box>
      <Box sx={{ fontWeight: 700, fontSize: 15, fontFamily: 'Fraunces, serif' }}>{title}</Box>
    </Box>
  );
}
