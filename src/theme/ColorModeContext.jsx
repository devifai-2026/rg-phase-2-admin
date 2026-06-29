import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, DEFAULT_PRESET } from '../theme';

const ColorModeContext = createContext({
  mode: 'dark',
  preset: DEFAULT_PRESET,
  toggle: () => {},
  setMode: () => {},
  setPreset: () => {},
});
export const useColorMode = () => useContext(ColorModeContext);

const MODE_KEY = 'rg-admin-mode';
const PRESET_KEY = 'rg-admin-preset';

export function ColorModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) || 'dark'; } catch { return 'dark'; }
  });
  const [preset, setPresetState] = useState(() => {
    try { return localStorage.getItem(PRESET_KEY) || DEFAULT_PRESET; } catch { return DEFAULT_PRESET; }
  });

  const setMode = useCallback((m) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setModeState((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(MODE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setPreset = useCallback((p) => {
    setPresetState(p);
    try { localStorage.setItem(PRESET_KEY, p); } catch { /* ignore */ }
  }, []);

  const theme = useMemo(() => getTheme(mode, preset), [mode, preset]);
  const value = useMemo(() => ({ mode, preset, toggle, setMode, setPreset }), [mode, preset, toggle, setMode, setPreset]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
