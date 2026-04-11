/**
 * Theme system — preset themes with optional per-color overrides.
 * CSS custom properties are the single source of truth for UI chrome.
 * ChartWheel and PlanetLegend read from a resolved ThemeColors object.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ThemeColors {
  // UI chrome
  background: string;
  backgroundAlt: string;
  accent: string;
  accentLight: string;
  text: string;
  textHeading: string;
  // Chart wheel structural
  wheelLines: string;
  segmentFillA: string;
  segmentFillB: string;
  // Element colors (for zodiac sign glyphs)
  elementFire: string;
  elementEarth: string;
  elementAir: string;
  elementWater: string;
  // Bounds & decans fill intensity (0–1)
  boundsDecansOpacity: string;
  // Base font size
  fontSize: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

/** Stored in localStorage / cloud. Only overrides are persisted (not the full palette). */
export interface ThemePreference {
  presetId: string;
  overrides?: Partial<ThemeColors> | undefined;
}

// ─── Color group metadata (for preferences UI) ─────────────────────────────

export interface ColorGroupMeta {
  key: keyof ThemeColors;
  label: string;
  group: 'chrome' | 'wheel' | 'elements';
}

export const COLOR_GROUPS: ColorGroupMeta[] = [
  { key: 'background', label: 'Background', group: 'chrome' },
  { key: 'backgroundAlt', label: 'Cards & Inputs', group: 'chrome' },
  { key: 'accent', label: 'Accent', group: 'chrome' },
  { key: 'accentLight', label: 'Accent Hover', group: 'chrome' },
  { key: 'text', label: 'Text', group: 'chrome' },
  { key: 'textHeading', label: 'Headings', group: 'chrome' },
  { key: 'wheelLines', label: 'Wheel Lines', group: 'wheel' },
  { key: 'segmentFillA', label: 'Segment Fill A', group: 'wheel' },
  { key: 'segmentFillB', label: 'Segment Fill B', group: 'wheel' },
  { key: 'elementFire', label: 'Fire Signs', group: 'elements' },
  { key: 'elementEarth', label: 'Earth Signs', group: 'elements' },
  { key: 'elementAir', label: 'Air Signs', group: 'elements' },
  { key: 'elementWater', label: 'Water Signs', group: 'elements' },
  { key: 'boundsDecansOpacity', label: 'Bounds/Decans Fill', group: 'wheel' },
];

// ─── Preset Themes ──────────────────────────────────────────────────────────

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'parchment',
    name: 'Classic Parchment',
    description: 'Traditional warm parchment with gold accents',
    colors: {
      background: '#f5f0e8',
      backgroundAlt: '#faf7f0',
      accent: '#b8860b',
      accentLight: '#d4af37',
      text: '#1a1a2e',
      textHeading: '#2c2c54',
      wheelLines: '#b8860b',
      segmentFillA: '#faf7f0',
      segmentFillB: '#f3ece0',
      elementFire: '#CC3333',
      elementEarth: '#338833',
      elementAir: '#CCAA00',
      elementWater: '#3366CC',
      boundsDecansOpacity: '0.25',
      fontSize: '1.3rem',
    },
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    description: 'Soft pink tones with dusty rose accents',
    colors: {
      background: '#f5eef0',
      backgroundAlt: '#faf5f7',
      accent: '#b56576',
      accentLight: '#d4899a',
      text: '#2d2024',
      textHeading: '#4a2838',
      wheelLines: '#b56576',
      segmentFillA: '#faf5f7',
      segmentFillB: '#f0e5ea',
      elementFire: '#c94055',
      elementEarth: '#5a8a5a',
      elementAir: '#c4a030',
      elementWater: '#4a72b0',
      boundsDecansOpacity: '0.25',
      fontSize: '1.3rem',
    },
  },
  {
    id: 'sage',
    name: 'Sage & Stone',
    description: 'Earthy greens with natural stone warmth',
    colors: {
      background: '#e8ece4',
      backgroundAlt: '#f2f5ef',
      accent: '#5a7a5a',
      accentLight: '#7a9a7a',
      text: '#2d3a2d',
      textHeading: '#3a4a3a',
      wheelLines: '#5a7a5a',
      segmentFillA: '#f2f5ef',
      segmentFillB: '#e0e8dc',
      elementFire: '#c04030',
      elementEarth: '#4a7a3a',
      elementAir: '#b8a020',
      elementWater: '#3a6aaa',
      boundsDecansOpacity: '0.25',
      fontSize: '1.3rem',
    },
  },
  {
    id: 'sky',
    name: 'Sky & Silver',
    description: 'Cool blue-grey with silver accents',
    colors: {
      background: '#eaf0f5',
      backgroundAlt: '#f2f6fa',
      accent: '#5b7fa5',
      accentLight: '#7da0c0',
      text: '#1a2a3e',
      textHeading: '#2a3a54',
      wheelLines: '#5b7fa5',
      segmentFillA: '#f2f6fa',
      segmentFillB: '#e2eaf2',
      elementFire: '#c44030',
      elementEarth: '#4a8050',
      elementAir: '#b8a830',
      elementWater: '#3366AA',
      boundsDecansOpacity: '0.25',
      fontSize: '1.3rem',
    },
  },
];

export const DEFAULT_THEME_ID = 'parchment';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  presetId: DEFAULT_THEME_ID,
};

// ─── Resolver ───────────────────────────────────────────────────────────────

/** Look up a preset by ID, falling back to the default parchment preset. */
export function getPreset(presetId: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === presetId) || THEME_PRESETS[0]!;
}

/** Merge a preset's colors with any user overrides. */
export function resolveTheme(pref: ThemePreference): ThemeColors {
  const preset = getPreset(pref.presetId);
  if (!pref.overrides || Object.keys(pref.overrides).length === 0) {
    return preset.colors;
  }
  return { ...preset.colors, ...pref.overrides };
}

// ─── CSS Variable Applicator ────────────────────────────────────────────────

/** Map from ThemeColors keys to CSS custom property names. */
const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  background: '--parchment',
  backgroundAlt: '--cream',
  accent: '--gold',
  accentLight: '--gold-light',
  text: '--dark-blue',
  textHeading: '--navy',
  wheelLines: '--wheel-lines',
  segmentFillA: '--segment-fill-a',
  segmentFillB: '--segment-fill-b',
  elementFire: '--element-fire',
  elementEarth: '--element-earth',
  elementAir: '--element-air',
  elementWater: '--element-water',
  boundsDecansOpacity: '--bounds-decans-opacity',
  fontSize: '--font-size',
};

/** Apply resolved theme colors as CSS custom properties on :root. */
export function applyCssVars(colors: ThemeColors): void {
  const root = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.setProperty(cssVar, colors[key as keyof ThemeColors]);
  }
  // Derive --parchment-dark from background (slightly darker)
  root.setProperty('--parchment-dark', darken(colors.background, 0.06));
  // Apply font-size to root so rem units scale with it
  root.setProperty('font-size', colors.fontSize);
}

/** Darken a hex color by a fraction (0–1). */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`;
}

// ─── Element color helpers ──────────────────────────────────────────────────

/** Build the 12-sign element color array from theme element colors. */
export function signElementColors(theme: ThemeColors): string[] {
  return [
    theme.elementFire,   // Aries
    theme.elementEarth,  // Taurus
    theme.elementAir,    // Gemini
    theme.elementWater,  // Cancer
    theme.elementFire,   // Leo
    theme.elementEarth,  // Virgo
    theme.elementAir,    // Libra
    theme.elementWater,  // Scorpio
    theme.elementFire,   // Sagittarius
    theme.elementEarth,  // Capricorn
    theme.elementAir,    // Aquarius
    theme.elementWater,  // Pisces
  ];
}

/** Map sign name to element color from theme. */
export function signColorMap(theme: ThemeColors): Record<string, string> {
  return {
    aries: theme.elementFire, leo: theme.elementFire, sagittarius: theme.elementFire,
    taurus: theme.elementEarth, virgo: theme.elementEarth, capricorn: theme.elementEarth,
    gemini: theme.elementAir, libra: theme.elementAir, aquarius: theme.elementAir,
    cancer: theme.elementWater, scorpio: theme.elementWater, pisces: theme.elementWater,
  };
}
