import { createTheme, alpha } from '@mui/material/styles';

/**
 * Rudraganga admin theme — brand palette from the logo: vermilion RED + ink
 * BLACK + white. Red is the single loud accent; everything else is a neutral
 * ramp. getTheme(mode) returns a mode-specific MUI theme and exposes the raw
 * brand tokens on theme.palette.brand so components stay mode-correct.
 */

const RED = { main: '#C8392B', hover: '#A82E22', soft: '#E25C4D', bright: '#E84C3D' };

/**
 * THEME PRESETS — swap the loud accent (the "brand" colour used for buttons,
 * highlights, the active rail, DataGrid hover, the page glow) while keeping the
 * neutral surface/text ramp. Each preset gives a dark + light variant of its
 * accent so it reads correctly in both modes. 'rudra' is the default (the
 * existing vermilion red). Adding a preset here makes it available everywhere;
 * no page needs to change because pages read palette.brand.red/redStrong.
 */
const PRESETS = {
  rudra: { label: 'Rudra (default)', dark: { red: RED.soft, redStrong: RED.main }, light: { red: RED.main, redStrong: RED.hover } },
  saffron: { label: 'Saffron', dark: { red: '#F0883E', redStrong: '#D9732B' }, light: { red: '#E0701F', redStrong: '#C25E12' } },
  indigo: { label: 'Indigo', dark: { red: '#6E8BFF', redStrong: '#4F6FE6' }, light: { red: '#3F5BD4', redStrong: '#2F46B0' } },
  emerald: { label: 'Emerald', dark: { red: '#3CCB7F', redStrong: '#27A765' }, light: { red: '#159A5E', redStrong: '#0F7C4A' } },
  royal: { label: 'Royal Violet', dark: { red: '#A77BFF', redStrong: '#8C5FF0' }, light: { red: '#7A4DE0', redStrong: '#6238BE' } },
};
export const THEME_PRESETS = Object.entries(PRESETS).map(([key, p]) => ({ key, label: p.label }));
export const DEFAULT_PRESET = 'rudra';

const TOKENS = {
  dark: {
    ground: '#0C0D11',
    surface: '#15171D',
    surface2: '#1C1F27',
    surface3: '#232732',
    border: '#2A2E39',
    borderSoft: '#21242E',
    text: '#F1F1F3',
    textDim: '#9A9DA8',
    textFaint: '#6A6E7A',
    red: RED.soft,
    redStrong: RED.main,
    green: '#3CCB7F',
    amber: '#E0A93B',
    blue: '#4B8FE0',
    violet: '#8C6FF0',
    onAccent: '#FFFFFF',
  },
  light: {
    ground: '#F7F6F3',
    surface: '#FFFFFF',
    surface2: '#F4F2EE',
    surface3: '#ECEAE4',
    border: '#E4E2DB',
    borderSoft: '#EEEDE8',
    text: '#17181D',
    textDim: '#6B6E76',
    textFaint: '#9A9CA3',
    red: RED.main,
    redStrong: RED.hover,
    green: '#1C9963',
    amber: '#B5811A',
    blue: '#2B6CB0',
    violet: '#6A4DE0',
    onAccent: '#FFFFFF',
  },
};

export function getGradients(c, mode) {
  // Drive the accent gradients off the RESOLVED accent (c.red / c.redStrong) so
  // they follow the active preset, not just the default vermilion.
  const aSoft = c.red;
  const aMain = c.redStrong;
  return {
    red: `linear-gradient(135deg, ${aSoft} 0%, ${aMain} 100%)`,
    redDeep: `linear-gradient(135deg, ${aMain} 0%, ${aMain} 100%)`,
    sidebar: mode === 'dark'
      ? `linear-gradient(180deg, #121319 0%, #0C0D11 100%)`
      : `linear-gradient(180deg, #16171C 0%, #0E0F13 100%)`, // sidebar stays ink in both modes
    topbar: mode === 'dark'
      ? `linear-gradient(90deg, ${alpha('#15171D', 0.85)} 0%, ${alpha('#0C0D11', 0.85)} 100%)`
      : `linear-gradient(90deg, ${alpha('#FFFFFF', 0.85)} 0%, ${alpha('#F7F6F3', 0.85)} 100%)`,
    page: mode === 'dark'
      ? `radial-gradient(900px 460px at 12% -8%, ${alpha(aMain, 0.10)} 0%, transparent 55%), ${c.ground}`
      : `radial-gradient(900px 460px at 12% -8%, ${alpha(aMain, 0.06)} 0%, transparent 55%), ${c.ground}`,
    redGlow: `radial-gradient(120% 120% at 0% 0%, ${alpha(aMain, 0.18)} 0%, transparent 70%)`,
  };
}

function getComponents(c, mode, g) {
  // Flat, professional surfaces — minimal shadow, hairline borders, tight radii.
  const cardShadow = mode === 'dark'
    ? '0 1px 0 rgba(0,0,0,0.3)'
    : '0 1px 2px rgba(23,24,29,0.06)';
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: g.page, backgroundAttachment: 'fixed' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-thumb': { background: alpha(c.textFaint, 0.35), borderRadius: 0, border: `3px solid transparent`, backgroundClip: 'padding-box' },
        '*::-webkit-scrollbar-thumb:hover': { background: alpha(c.textFaint, 0.55) },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6, paddingInline: 14, fontWeight: 600, fontSize: 13, letterSpacing: 0 },
        sizeLarge: { paddingBlock: 9, fontSize: 13.5 },
        containedPrimary: { background: c.red, color: '#fff', '&:hover': { background: c.redStrong } },
        outlined: { borderColor: c.border, color: c.text, '&:hover': { borderColor: c.textDim, background: alpha(c.text, 0.04) } },
        text: { '&:hover': { background: alpha(c.text, 0.04) } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, boxShadow: cardShadow, backgroundImage: 'none' },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 18, '&:last-child': { paddingBottom: 18 } } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: 12, height: 22, borderRadius: 4 },
        sizeSmall: { height: 20, fontSize: 11.5 },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6, background: mode === 'dark' ? alpha(c.surface2, 0.5) : c.surface,
          '& fieldset': { borderColor: c.border },
          '&:hover fieldset': { borderColor: c.textFaint },
          '&.Mui-focused fieldset': { borderColor: c.red, borderWidth: 1 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { background: c.surface3, color: c.text, border: `1px solid ${c.border}`, fontSize: 12, fontWeight: 500, borderRadius: 5, padding: '5px 9px' },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: 13.5, minHeight: 44 } } },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: c.red, height: 2, borderRadius: 0 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: c.borderSoft } } },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${c.border}`,
          background: c.surface,
          borderRadius: 8,
          color: c.text,
          fontSize: 13.5,
          '--DataGrid-rowBorderColor': c.borderSoft,
          '--DataGrid-containerBackground': c.surface2,
        },
        columnHeaders: { borderBottom: `1px solid ${c.border}` },
        columnHeaderTitle: { fontWeight: 700, fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase', color: c.textDim },
        cell: { borderColor: c.borderSoft, '&:focus, &:focus-within': { outline: 'none' } },
        row: { '&:hover': { background: alpha(c.red, mode === 'dark' ? 0.05 : 0.03) } },
        footerContainer: { borderColor: c.border },
        columnSeparator: { display: 'none' },
        overlay: { background: 'transparent' },
      },
    },
  };
}

export function getTheme(mode = 'dark', preset = DEFAULT_PRESET) {
  const p = PRESETS[preset] || PRESETS[DEFAULT_PRESET];
  // Overlay the preset's accent (red/redStrong) onto the mode's neutral ramp.
  const c = { ...TOKENS[mode], ...(p[mode] || {}) };
  const g = getGradients(c, mode);
  return createTheme({
    palette: {
      mode,
      primary: { main: c.red, dark: c.redStrong, contrastText: c.onAccent },
      secondary: { main: c.violet },
      success: { main: c.green },
      error: { main: c.red },
      warning: { main: c.amber },
      info: { main: c.blue },
      background: { default: c.ground, paper: c.surface },
      text: { primary: c.text, secondary: c.textDim },
      divider: c.border,
      // brand tokens + legacy aliases (gold→red) so pages mid-migration work.
      brand: { ...c, gold: c.red, goldSoft: c.redStrong, gradients: g, GRADIENTS: { gold: g.red, violet: `linear-gradient(135deg, #9F7CFF 0%, ${c.violet} 100%)`, red: g.red, sidebar: g.sidebar }, RED },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
      h1: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
      h2: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
      h3: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
      h4: { fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.7rem', letterSpacing: '-0.015em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, fontSize: '1rem' },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
    shape: { borderRadius: 6 },
    components: getComponents(c, mode, g),
  });
}

// Back-compat shim: existing pages import { C } and read C.x. Defaults to the
// dark token set so everything keeps compiling while pages migrate to
// useTheme().palette.brand. Also re-exposes gradients/glass used by old code.
const darkTokens = TOKENS.dark;
const darkGradients = getGradients(darkTokens, 'dark');
export const C = {
  ...darkTokens,
  gold: darkTokens.red, // legacy alias: old 'gold' accent → brand red
  goldSoft: RED.soft,
};
export const GRADIENTS = {
  gold: darkGradients.red,
  violet: `linear-gradient(135deg, #9F7CFF 0%, ${darkTokens.violet} 100%)`,
  sidebar: darkGradients.sidebar,
  header: darkGradients.topbar,
  page: darkGradients.page,
  red: darkGradients.red,
};
export const glass = {
  background: alpha(darkTokens.surface, 0.85),
  backdropFilter: 'blur(14px)',
  border: `1px solid ${darkTokens.border}`,
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export default getTheme('dark');
