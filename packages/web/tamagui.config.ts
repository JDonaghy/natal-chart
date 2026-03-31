import { createTamagui, createTokens, createMedia, createFont } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';

// Tokens mapping existing CSS vars
const tokens = createTokens({
  color: {
    parchment: '#f5f0e8',
    parchmentDark: '#ede4d0',
    gold: '#b8860b',
    goldLight: '#d4af37',
    darkBlue: '#1a1a2e',
    navy: '#2c2c54',
    cream: '#faf7f0',
    white: '#ffffff',
    black: '#000000',
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    true: 16,
  },
  radius: {
    0: 0,
    1: 3,
    2: 4,
    3: 8,
    4: 12,
    true: 4,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

// Responsive breakpoints
const media = createMedia({
  sm: { maxWidth: 640 },
  md: { maxWidth: 1024 },
  lg: { minWidth: 1025 },
});

// Placeholder font config (actual fonts loaded via CSS/Google Fonts)
const bodyFont = createFont({
  family: 'Cormorant, serif',
  size: { 1: 12, 2: 14, 3: 16, true: 16 },
  lineHeight: { 1: 18, 2: 20, 3: 24, true: 24 },
  weight: { 1: '400', 2: '600', true: '400' },
  letterSpacing: { 1: 0, 2: 0, true: 0 },
});

const config = createTamagui({
  tokens,
  media,
  shorthands,
  fonts: {
    body: bodyFont,
    heading: bodyFont,
  },
  themes: {
    light: {
      background: tokens.color.parchment,
      color: tokens.color.darkBlue,
    },
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
