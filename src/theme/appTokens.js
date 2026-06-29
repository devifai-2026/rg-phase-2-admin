// The app's compiled RgColors defaults, mirrored here as '#AARRGGBB' strings so
// the Theme Studio can show the current rendered color for every token and use
// it as the fallback when the admin leaves a token blank.
// Keep in sync with flutter/user/lib/theme/rg_colors.dart.

export const TOKEN_DEFAULTS = {
  dark: {
    ground: '#FF0B0B0C', ground2: '#FF121012', card: '#0BFFFFFF',
    red: '#FFE0584A', redDeep: '#FFC0392B', redSoft: '#29E0584A',
    ink: '#FFFBF6EF', muted: '#9EF4EFE6', gold: '#FFC98A5E', line: '#1AFFFFFF',
    violet: '#FF6D4B9E', indigo: '#FF3B5BA9', aiSurface: '#FF1B1730', aiSurface2: '#FF151226',
    mint: '#FF8FD0C0', green: '#FF2E9E6B', blue: '#FF2D6FB0',
  },
  light: {
    ground: '#FFFBF6EF', ground2: '#FFF3ECE0', card: '#FFFFFFFF',
    red: '#FFC0392B', redDeep: '#FFA42E22', redSoft: '#1FC0392B',
    ink: '#FF16140F', muted: '#99231F18', gold: '#FFA86A3D', line: '#14000000',
    violet: '#FF7A57AE', indigo: '#FF4A6BC0', aiSurface: '#FFF1ECFB', aiSurface2: '#FFE7E0F6',
    mint: '#FF2E9E6B', green: '#FF1C9963', blue: '#FF2B6CB0',
  },
};

// Display metadata: label + hint for each token (order = display order).
export const TOKEN_META = [
  { key: 'ground', label: 'Ground', hint: 'Page background' },
  { key: 'ground2', label: 'Ground 2', hint: 'Lifted bands / sections' },
  { key: 'card', label: 'Card', hint: 'Glass panel over ground' },
  { key: 'red', label: 'Red (primary)', hint: 'Primary brand accent' },
  { key: 'redDeep', label: 'Red deep', hint: 'Hover / depth (logo red)' },
  { key: 'redSoft', label: 'Red soft', hint: 'Soft fills, chips' },
  { key: 'ink', label: 'Ink', hint: 'Headings & body text' },
  { key: 'muted', label: 'Muted', hint: 'Secondary text' },
  { key: 'gold', label: 'Gold', hint: 'Devotional accent (stars, sun)' },
  { key: 'line', label: 'Line', hint: 'Hairline borders' },
  { key: 'violet', label: 'Violet (AI)', hint: 'AI astrologer card accent' },
  { key: 'indigo', label: 'Indigo (AI)', hint: 'AI gradient partner' },
  { key: 'aiSurface', label: 'AI surface', hint: 'AI card surface' },
  { key: 'aiSurface2', label: 'AI surface 2', hint: 'AI card surface (deeper)' },
  { key: 'mint', label: 'Mint', hint: '“Always available” accent' },
  { key: 'green', label: 'Green', hint: 'Online / positive' },
  { key: 'blue', label: 'Blue', hint: 'Video / info' },
];
