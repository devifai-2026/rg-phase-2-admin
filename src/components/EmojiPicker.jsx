import { useState } from 'react';
import { IconButton, Popover, Box, Tabs, Tab, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmojiIcon from '@mui/icons-material/EmojiEmotionsOutlined';

/**
 * Lightweight, dependency-free emoji picker. A small icon button that opens a
 * categorized grid in a popover; clicking an emoji calls onSelect(emoji).
 * Curated set (covers the common cases for notification copy) so we ship no
 * extra package and stay CSP-safe.
 */
const SETS = {
  Smileys: ['😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😇', '🙏', '👍', '👏', '🙌', '💪', '🤝', '👋', '🤙', '✌️', '🫶'],
  Symbols: ['🎉', '🎊', '✨', '⭐', '🌟', '💫', '🔥', '💥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🎁', '🏆', '🥇', '✅', '❗', '❓'],
  Money: ['💰', '💸', '🪙', '💳', '🤑', '🛍️', '🛒', '🏷️', '💎', '📈', '📉', '🎯', '⚡', '⏰', '⌛', '🔔', '📢', '📣', '🚀', '🎈'],
  Astro: ['🔮', '🌙', '☀️', '⭐', '🌠', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🕉️', '🪔', '🧿'],
};
const CATS = Object.keys(SETS);

export default function EmojiPicker({ onSelect, size = 'small' }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const [anchor, setAnchor] = useState(null);
  const [cat, setCat] = useState(0);

  return (
    <>
      <Tooltip title="Insert emoji">
        <IconButton size={size} onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: b.textDim }}>
          <EmojiIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 280, p: 0.5 } }}
      >
        <Tabs value={cat} onChange={(e, v) => setCat(v)} variant="fullWidth" sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 11, py: 0 } }}>
          {CATS.map((c) => <Tab key={c} label={c} />)}
        </Tabs>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.25, p: 1, maxHeight: 200, overflowY: 'auto' }}>
          {SETS[CATS[cat]].map((emo) => (
            <Box
              key={emo} component="button" type="button"
              onClick={() => { onSelect(emo); setAnchor(null); }}
              sx={{
                fontSize: 20, lineHeight: 1, border: 'none', background: 'transparent', cursor: 'pointer',
                borderRadius: 1, p: 0.5, '&:hover': { background: b.surface2 },
              }}
            >
              {emo}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
