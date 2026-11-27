import { createTheme, alpha, type Theme } from '@mui/material/styles';
import type { Preferences } from './api/types';

export function buildTheme(preferences: Preferences, prefersDark: boolean): Theme {
  const mode: 'light' | 'dark' =
    preferences.theme === 'system' ? (prefersDark ? 'dark' : 'light') : preferences.theme;
  const background = mode === 'dark' ? '#0b1220' : '#eef2f8';
  const paper = mode === 'dark' ? '#141d2e' : '#ffffff';
  const text = mode === 'dark' ? '#e8eefc' : '#0f1b2d';
  const secondary = mode === 'dark' ? '#a9b8d6' : '#42536b';
  const primary = mode === 'dark' ? '#8cb8ff' : '#1b56c4';

  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: mode === 'dark' ? '#b9a6ff' : '#5a3fc0' },
      background: { default: background, paper },
      text: { primary: text, secondary },
      divider: alpha(text, 0.14),
      error: { main: mode === 'dark' ? '#ff8f8f' : '#b3261e' },
      success: { main: mode === 'dark' ? '#7ee2b8' : '#12674a' },
      warning: { main: mode === 'dark' ? '#ffd27a' : '#8a4b00' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif',
      h1: { fontSize: 'clamp(1.5rem, 1.1rem + 1.6vw, 2.2rem)', fontWeight: 650, letterSpacing: '-0.01em' },
      h2: { fontSize: '1.15rem', fontWeight: 650 },
      button: { textTransform: 'none', fontWeight: 600 },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.5 },
    },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: false } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });
}
