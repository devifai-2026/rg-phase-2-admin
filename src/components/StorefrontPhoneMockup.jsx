import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Stack, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AdminAPI } from '../api/endpoints';

/**
 * Read-only preview of an astrologer's seeker-facing storefront, rendered inside
 * a mobile phone mockup. Mirrors the user app: the active AI layout spec drives
 * the cosmic gradient, accent colours, the inline SVG motif and the section
 * order; falls back to the picked preset theme when no AI layout is active.
 *
 * profileId = AstrologerProfile id (the /astrologers/:id route param).
 */

// Preset fallbacks (mirror flutter/user astrologer_store_screen _theme()).
const PRESETS = {
  shiva: { bg: ['#3A0A0A', '#120303'], accent: '#FF5436', accent2: '#E0B7A0' },
  cosmic: { bg: ['#1C1030', '#0A0617'], accent: '#B98CFF', accent2: '#F2C879' },
  royal: { bg: ['#2B0B12', '#140509'], accent: '#D4AF37', accent2: '#E0556B' },
  rudraksh: { bg: ['#2A1A0E', '#120B06'], accent: '#E8A33D', accent2: '#B5651D' },
};

const isHex = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
const hex = (v, fb) => (isHex(v) ? v : fb);

function resolveTheme(store) {
  const base = PRESETS[store?.theme] || PRESETS.rudraksh;
  const spec = store?.layoutSpec;
  if (!spec) return { ...base, motifSvg: null, name: null, fonts: null, sections: null, ai: false };
  const bg = Array.isArray(spec.bgGradient) ? spec.bgGradient : [];
  const svg = (spec.motifSvg || '').toString();
  return {
    bg: [hex(bg[0], base.bg[0]), hex(bg[1], base.bg[1])],
    accent: hex(spec.accent, base.accent),
    accent2: hex(spec.accent2, base.accent2),
    motifSvg: svg.trim().startsWith('<svg') ? svg : null,
    name: spec.name || null,
    fonts: spec.fonts || null,
    sections: Array.isArray(spec.sectionOrder) ? spec.sectionOrder : null,
    ai: true,
  };
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const itemImg = (it) => (Array.isArray(it.images) && it.images[0]) || it.imageLandscape || it.image || null;
const itemPrice = (it) => it.price ?? it.basePrice ?? 0;

export default function StorefrontPhoneMockup({ profileId }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    AdminAPI.astrologerStorefront(profileId)
      .then((r) => { if (alive) { setStore(r.data.data); setLoading(false); } })
      .catch(() => { if (alive) { setError(true); setLoading(false); } });
    return () => { alive = false; };
  }, [profileId]);

  const th = resolveTheme(store);
  const products = store?.products || [];
  const poojas = store?.poojas || [];

  // Phone frame.
  const frame = (children) => (
    <Box sx={{ position: 'sticky', top: 16 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Storefront preview</Typography>
        {th.ai && (
          <Chip size="small" icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />} label={th.name || 'AI design'}
            sx={{ height: 22, '& .MuiChip-icon': { color: th.accent }, color: th.accent, bgcolor: `${th.accent}22`, fontWeight: 700 }} />
        )}
      </Stack>
      <Box
        sx={{
          width: 300, mx: 'auto',
          borderRadius: '38px',
          p: '10px',
          background: 'linear-gradient(160deg, #2b2b30, #111114)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.04)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            borderRadius: '30px',
            overflow: 'hidden',
            height: 600,
            background: '#000',
          }}
        >
          {/* Notch */}
          <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 120, height: 24, bgcolor: '#000', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, zIndex: 5 }} />
          {children}
        </Box>
      </Box>
    </Box>
  );

  if (loading) return frame(<Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress size={26} /></Box>);
  if (error || !store) {
    return frame(
      <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>Couldn’t load this storefront.</Typography>
      </Box>
    );
  }

  const headingFont = th.fonts?.heading === 'Fraunces' || th.fonts?.heading === 'PlayfairDisplay' || th.fonts?.heading === 'Cinzel' || th.fonts?.heading === 'Marcellus'
    ? 'Georgia, serif' : 'inherit'; // approximate the AI serif heading in the web preview

  const SectionTitle = ({ children }) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, mt: 2, mb: 1 }}>
      <Box sx={{ width: 3, height: 14, bgcolor: th.accent, borderRadius: 1 }} />
      <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{children}</Typography>
    </Stack>
  );

  const ItemCard = (it, i) => {
    const img = itemImg(it);
    return (
      <Box key={i} sx={{ borderRadius: 2.5, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)', border: `1px solid ${th.accent}33` }}>
        <Box sx={{ height: 78, background: img ? `center/cover no-repeat url(${img})` : `linear-gradient(135deg, ${th.accent}88, ${th.accent2}44)` }} />
        <Box sx={{ p: 1 }}>
          <Typography noWrap sx={{ color: '#fff', fontSize: 11.5, fontWeight: 600 }}>{it.name || 'Item'}</Typography>
          <Typography sx={{ color: th.accent2, fontSize: 12, fontWeight: 800 }}>{inr(itemPrice(it))}</Typography>
        </Box>
      </Box>
    );
  };

  const Grid2 = (items) => (
    <Box sx={{ px: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
      {items.slice(0, 4).map(ItemCard)}
    </Box>
  );

  // Order the body sections per the AI spec (hero is the fixed top region).
  const order = (th.sections || ['hero', 'products', 'poojas']).filter((s) => s !== 'hero' && s !== 'about' && s !== 'reviews');

  return frame(
    <Box sx={{
      height: '100%', overflowY: 'auto',
      background: `linear-gradient(180deg, ${th.bg[0]}, ${th.bg[1]})`,
      '&::-webkit-scrollbar': { width: 0 },
    }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: 168, overflow: 'hidden' }}>
        {store.profile?.coverPhoto
          ? <Box sx={{ position: 'absolute', inset: 0, background: `center/cover no-repeat url(${store.profile.coverPhoto})` }} />
          : <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${th.accent}88, ${th.accent2}33)` }} />}
        {/* SVG motif (server-sanitised) tinted with the accent */}
        {th.motifSvg && (
          <Box
            aria-hidden
            sx={{ position: 'absolute', right: -6, top: 24, width: 110, height: 110, opacity: 0.3, color: th.accent, '& svg': { width: '100%', height: '100%' } }}
            dangerouslySetInnerHTML={{ __html: th.motifSvg }}
          />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent, ${th.bg[0]})` }} />
        <Box sx={{ position: 'absolute', left: 14, bottom: 12, right: 14 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 46, height: 46, borderRadius: '50%', p: '2px', background: `linear-gradient(135deg, ${th.accent}, ${th.accent2})` }}>
              <Box sx={{ width: '100%', height: '100%', borderRadius: '50%', background: store.profile?.avatar ? `center/cover url(${store.profile.avatar})` : th.bg[1] }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: headingFont }}>{store.profile?.name || 'Astrologer'}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <StarIcon sx={{ fontSize: 13, color: th.accent2 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>
                  {(store.profile?.rating || 0).toFixed(1)} · {store.profile?.followers || 0} followers
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Body sections in AI order */}
      {order.map((sec) => {
        if (sec === 'products' && products.length) return <Box key="products"><SectionTitle>Products</SectionTitle>{Grid2(products)}</Box>;
        if (sec === 'poojas' && poojas.length) return <Box key="poojas"><SectionTitle>Poojas</SectionTitle>{Grid2(poojas)}</Box>;
        return null;
      })}
      {products.length === 0 && poojas.length === 0 && (
        <Typography sx={{ color: th.accent2, textAlign: 'center', mt: 6, fontSize: 12.5 }}>This store has no items yet.</Typography>
      )}
      <Box sx={{ height: 20 }} />
    </Box>
  );
}
