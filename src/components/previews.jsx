import { Box, Stack, Typography, Chip, Avatar, Rating, Button } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CallIcon from '@mui/icons-material/Call';
import ChatIcon from '@mui/icons-material/ChatBubble';
import VideoIcon from '@mui/icons-material/Videocam';
import { AppBarMock } from './PhoneFrame';

const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Emoji per gift — matches the user app's gift catalog (gift_sheet.dart).
const GIFT_EMOJI = { Rose: '🌹', Star: '🌟', Surya: '☀️', Moon: '🌙', Lotus: '🌸', Gemstone: '💎', Crown: '👑' };
// App screens are dark regardless of admin theme.
const APP = { bg: '#0E0F13', surface: '#191B22', surface2: '#21242E', text: '#F1F1F3', dim: '#9A9DA8', faint: '#6A6E7A' };

/** ── Astrologer profile, as seen in the app (cover, avatar, bio, stats, gifts, reviews) ── */
export function AstrologerPreview({
  name, avatar, coverPhoto, bio, expertise = [], languages = [], rates = {}, online = true,
  followers = 0, giftCount = 0, giftItems = [], reviews = [], rating = 0,
}) {
  const { palette } = useTheme();
  const RED = palette.brand.RED;
  const VIOLET = '#8C6FF0';
  const svc = (k) => rates[k] || {};
  const services = [
    { key: 'call', label: 'Call', icon: <CallIcon sx={{ fontSize: 16 }} /> },
    { key: 'chat', label: 'Chat', icon: <ChatIcon sx={{ fontSize: 16 }} /> },
    { key: 'video', label: 'Video', icon: <VideoIcon sx={{ fontSize: 16 }} /> },
  ];
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0));
  const ratingNum = rating || (reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 4.5);

  return (
    <Box sx={{ color: APP.text, minHeight: '100%' }}>
      <AppBarMock title="Astrologer" />
      {/* Cover photo with avatar overlapping (FB/LinkedIn vibe) */}
      <Box sx={{ position: 'relative', mb: 5 }}>
        <Box sx={{ height: 110, background: coverPhoto ? `url(${coverPhoto}) center/cover` : `linear-gradient(135deg, ${RED.main}, ${VIOLET})` }} />
        <Box sx={{ position: 'absolute', left: 16, bottom: -36 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={avatar} sx={{ width: 76, height: 76, fontSize: 28, border: `3px solid ${APP.bg}` }}>{(name || 'A')[0]}</Avatar>
            <Box sx={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: online ? '#3CCB7F' : APP.faint, border: `2px solid ${APP.bg}` }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{name || 'Astrologer name'}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
          <Rating value={ratingNum} precision={0.5} size="small" readOnly />
          <Typography sx={{ fontSize: 11, color: APP.dim }}>{ratingNum.toFixed(1)} · {reviews.length} reviews</Typography>
        </Stack>

        {/* Stats row: followers + gifts */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ flex: 1, p: 1, borderRadius: 2, background: APP.surface, border: `1px solid ${APP.surface2}`, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{fmt(followers)}</Typography>
            <Typography sx={{ fontSize: 10, color: APP.dim }}>Followers</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1, borderRadius: 2, background: APP.surface, border: `1px solid ${APP.surface2}`, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{fmt(giftCount)} 🌹</Typography>
            <Typography sx={{ fontSize: 10, color: APP.dim }}>Gifts</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {(expertise.length ? expertise : ['Vedic']).map((e) => (
            <Chip key={e} size="small" label={e} sx={{ height: 20, fontSize: 10, background: alpha(RED.main, 0.16), color: RED.soft }} />
          ))}
        </Stack>
        {languages.length > 0 && <Typography sx={{ fontSize: 11, color: APP.faint, mb: 1 }}>{languages.join(' · ')}</Typography>}
        {bio && <Typography sx={{ fontSize: 12, color: APP.dim, lineHeight: 1.6, mb: 1.5 }}>{bio}</Typography>}

        <Stack spacing={1}>
          {services.map((s) => {
            const r = svc(s.key);
            const rate = (r.rateRupeesPerMin ?? r.ratePerMin) || 0;
            return (
              <Stack key={s.key} direction="row" alignItems="center" spacing={1.5}
                sx={{ p: 1.25, borderRadius: 2.5, background: APP.surface, border: `1px solid ${APP.surface2}` }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', background: alpha(RED.main, 0.16), color: RED.soft }}>{s.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: APP.dim }}>{rate ? `${rupees(rate)}/min` : 'Not offered'}</Typography>
                </Box>
                <Box sx={{ px: 1.75, py: 0.6, borderRadius: 2, fontSize: 12, fontWeight: 700, color: '#fff', background: rate ? `linear-gradient(135deg, ${RED.soft}, ${RED.main})` : APP.surface2, opacity: rate ? 1 : 0.5 }}>
                  {s.label}
                </Box>
              </Stack>
            );
          })}
        </Stack>

        {/* Gift breakdown strip */}
        {giftItems.filter((g) => g.name).length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: APP.dim, mb: 0.5 }}>GIFTS RECEIVED</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {giftItems.filter((g) => g.name).map((g, i) => (
                <Chip key={i} size="small" label={`${GIFT_EMOJI[g.name] ? GIFT_EMOJI[g.name] + ' ' : ''}${g.name} ·${g.count || 0}`} sx={{ height: 22, fontSize: 10, background: APP.surface2, color: APP.text }} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Reviews — always shown (the app always has this section) */}
        <Box sx={{ mt: 1.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: APP.dim, mb: 0.5 }}>REVIEWS ({reviews.length})</Typography>
          {reviews.length === 0 ? (
            <Box sx={{ p: 1.5, borderRadius: 2, background: APP.surface, border: `1px dashed ${APP.surface2}`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 11, color: APP.faint }}>No reviews yet — add one below to see it here.</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {reviews.slice(0, 5).map((r, i) => (
                <Box key={r._id || i} sx={{ p: 1.25, borderRadius: 2, background: APP.surface, border: `1px solid ${APP.surface2}` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{r.authorName || r.user?.name || 'User'}</Typography>
                    <Rating value={r.rating || 5} size="small" readOnly sx={{ fontSize: 12 }} />
                  </Stack>
                  {r.comment && <Typography sx={{ fontSize: 11, color: APP.dim, mt: 0.25 }}>{r.comment}</Typography>}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/** ── AI astrologer persona, as seen in the app (violet/indigo, chat-only, 24×7) ── */
export function AiPersonaPreview({ name, avatar, tagline, description, expertise = [], languages = [] }) {
  const VIOLET = '#8C6FF0';
  const INDIGO = '#5B6FD0';
  const MINT = '#8FD0C0';
  const AI = { surface: '#1B1730', surface2: '#151226' };
  return (
    <Box sx={{ color: APP.text, minHeight: '100%' }}>
      <AppBarMock title="AI Astrologer" />
      <Box sx={{ p: 2 }}>
        {/* AI hero card */}
        <Box sx={{ p: 2, borderRadius: 3, background: `linear-gradient(135deg, ${AI.surface}, ${AI.surface2})`, border: `1px solid ${alpha(VIOLET, 0.35)}` }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${VIOLET}, ${INDIGO})`, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Typography sx={{ color: '#fff', fontWeight: 800 }}>AI</Typography>}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{name || 'AI Astrologer'}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ fontSize: 12, color: MINT }}>⚡</Box>
                <Typography sx={{ fontSize: 11, color: MINT, fontWeight: 600 }}>Always available · 24×7</Typography>
              </Stack>
            </Box>
          </Stack>
          {tagline && <Typography sx={{ fontSize: 12, color: alpha('#fff', 0.85), mt: 1 }}>{tagline}</Typography>}
        </Box>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {(expertise.length ? expertise : ['Vedic']).map((e) => (
            <Chip key={e} size="small" label={e} sx={{ height: 20, fontSize: 10, background: alpha(VIOLET, 0.18), color: '#C9BCF5' }} />
          ))}
        </Stack>
        {languages.length > 0 && <Typography sx={{ fontSize: 11, color: APP.faint, mt: 1 }}>{languages.join(' · ')}</Typography>}
        {description && <Typography sx={{ fontSize: 12, color: APP.dim, lineHeight: 1.6, mt: 1 }}>{description}</Typography>}

        <Box sx={{ mt: 2, p: 1.4, borderRadius: 2.5, textAlign: 'center', fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${VIOLET}, ${INDIGO})` }}>
          Chat now · Free
        </Box>
      </Box>
    </Box>
  );
}

/** ── Product detail, as seen in the app ── */
export function ProductPreview({ name, images = [], price = 0, mrp = 0, stock = 0, description, categoryName }) {
  const { palette } = useTheme();
  const RED = palette.brand.RED;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <Box sx={{ color: APP.text, minHeight: '100%' }}>
      <AppBarMock title="Product" />
      <Box sx={{ height: 200, background: images[0] ? `url(${images[0]}) center/cover` : APP.surface, display: 'grid', placeItems: 'center' }}>
        {!images[0] && <Typography sx={{ color: APP.faint, fontSize: 12 }}>No image</Typography>}
      </Box>
      <Box sx={{ p: 2 }}>
        {categoryName && <Typography sx={{ fontSize: 11, color: RED.soft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{categoryName}</Typography>}
        <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 1 }}>{name || 'Product name'}</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: APP.text }}>{rupees(price)}</Typography>
          {off > 0 && <Typography sx={{ fontSize: 13, color: APP.faint, textDecoration: 'line-through' }}>{rupees(mrp)}</Typography>}
          {off > 0 && <Typography sx={{ fontSize: 13, color: '#3CCB7F', fontWeight: 700 }}>{off}% off</Typography>}
        </Stack>
        <Chip size="small" label={stock > 0 ? `In stock · ${stock}` : 'Out of stock'} sx={{ mb: 1.5, background: alpha(stock > 0 ? '#3CCB7F' : '#E25C4D', 0.16), color: stock > 0 ? '#3CCB7F' : '#E25C4D', fontWeight: 700 }} />
        {description && <Typography sx={{ fontSize: 12.5, color: APP.dim, lineHeight: 1.6, mb: 2 }}>{description}</Typography>}
        <Box sx={{ p: 1.4, borderRadius: 2.5, textAlign: 'center', fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${RED.soft}, ${RED.main})` }}>Add to cart</Box>
      </Box>
    </Box>
  );
}

/** ── "Frequently bought together" bundle widget ── */
export function BundlePreview({ name, products = [], pricingMode = 'percent', discountPercent = 0, bundlePrice = 0 }) {
  const { palette } = useTheme();
  const RED = palette.brand.RED;
  const items = products.filter(Boolean);
  const original = items.reduce((s, p) => s + (p.price || 0), 0);
  const final = pricingMode === 'fixed' ? bundlePrice : Math.round(original * (1 - (discountPercent || 0) / 100));
  const save = Math.max(0, original - final);
  return (
    <Box sx={{ color: APP.text, minHeight: '100%' }}>
      <AppBarMock title="Bundle offer" />
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.25 }}>{name || 'Bundle'}</Typography>
        <Typography sx={{ fontSize: 12, color: APP.dim, mb: 1.5 }}>Frequently bought together</Typography>
        {items.length < 2 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: APP.faint, fontSize: 12, border: `1px dashed ${APP.surface2}`, borderRadius: 2.5 }}>Pick at least 2 products</Box>
        ) : (
          <>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', justifyContent: 'center' }} useFlexGap>
              {items.map((p, i) => (
                <Stack key={p._id || i} direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 56 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: 2, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : APP.surface2 }} />
                    <Typography sx={{ fontSize: 9.5, color: APP.dim, mt: 0.5, lineHeight: 1.2 }} noWrap>{p.name}</Typography>
                  </Box>
                  {i < items.length - 1 && <Typography sx={{ color: RED.soft, fontWeight: 700 }}>+</Typography>}
                </Stack>
              ))}
            </Stack>
            <Stack spacing={0.5} sx={{ p: 1.5, borderRadius: 2.5, background: APP.surface, border: `1px solid ${APP.surface2}` }}>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: 12, color: APP.dim }}>Total price</Typography><Typography sx={{ fontSize: 12, color: APP.faint, textDecoration: 'line-through' }}>{rupees(original)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline"><Typography sx={{ fontSize: 13, fontWeight: 700 }}>Bundle price</Typography><Typography sx={{ fontSize: 18, fontWeight: 800, color: RED.soft }}>{rupees(final)}</Typography></Stack>
              {save > 0 && <Chip size="small" label={`You save ${rupees(save)}`} sx={{ alignSelf: 'flex-start', background: alpha('#3CCB7F', 0.16), color: '#3CCB7F', fontWeight: 700 }} />}
            </Stack>
            <Box sx={{ mt: 1.5, p: 1.3, borderRadius: 2.5, textAlign: 'center', fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${RED.soft}, ${RED.main})` }}>Add bundle to cart</Box>
          </>
        )}
      </Box>
    </Box>
  );
}
