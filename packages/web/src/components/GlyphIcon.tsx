import React, { useContext } from 'react';
import { getPlanetPath, getSignPathByIndex, DEFAULT_GLYPH_SET } from '../utils/astro-glyph-paths';
import { ChartContext } from '../contexts/ChartContext';

const PLANET_UNICODE: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓',
  northNode: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊕', spirit: '☩', vertex: 'Vx',
};

const SIGN_NAMES = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const SIGN_UNICODE: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

/** Per-planet visual scale factors to normalize apparent glyph sizes in inline contexts. */
const PLANET_GLYPH_SCALE: Record<string, number> = {
  chiron: 1.25,
  lilith: 1.2,
  northNode: 1.15,
  fortune: 1.1,
  vertex: 0.65,
};

function useGlyphPrefs(): { glyphSet: string; overrides: Record<string, string> } {
  const ctx = useContext(ChartContext);
  return {
    glyphSet: ctx?.glyphSet ?? DEFAULT_GLYPH_SET,
    overrides: ctx?.glyphOverrides ?? {},
  };
}

/**
 * Render a planet glyph as an inline SVG (font-independent) with text fallback
 * for planets without SVG path data (lilith, fortune, vertex).
 */
export const PlanetGlyphIcon: React.FC<{
  planet: string;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
  glyphSet?: string;
}> = ({ planet, size = '1em', color = 'currentColor', style, glyphSet }) => {
  const prefs = useGlyphPrefs();
  const activeSet = glyphSet ?? prefs.glyphSet;
  const pathData = getPlanetPath(planet, activeSet, prefs.overrides);
  if (pathData) {
    const scaleFactor = PLANET_GLYPH_SCALE[planet] ?? 1;
    // Pad the viewBox to shrink the glyph (scale < 1) or grow it (scale > 1)
    const vbParts = pathData.viewBox.split(' ').map(Number);
    const [vbX, vbY, vbW, vbH] = [vbParts[0] ?? 0, vbParts[1] ?? 0, vbParts[2] ?? 100, vbParts[3] ?? 100];
    const newW = vbW / scaleFactor;
    const newH = vbH / scaleFactor;
    const newX = vbX - (newW - vbW) / 2;
    const newY = vbY - (newH - vbH) / 2;
    const adjustedViewBox = `${newX} ${newY} ${newW} ${newH}`;
    return (
      <svg
        width={size} height={size} viewBox={adjustedViewBox}
        style={{ display: 'inline-block', verticalAlign: '-0.15em', ...style }}
        aria-label={planet}
      >
        <path d={pathData.d} fill={color} />
      </svg>
    );
  }
  return (
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", ...style }}>
      {PLANET_UNICODE[planet] || '○'}
    </span>
  );
};

/**
 * Render a zodiac sign glyph as an inline SVG (font-independent) with text fallback.
 */
export const SignGlyphIcon: React.FC<{
  sign: string;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
  glyphSet?: string;
}> = ({ sign, size = '1em', color = 'currentColor', style, glyphSet }) => {
  const prefs = useGlyphPrefs();
  const activeSet = glyphSet ?? prefs.glyphSet;
  const index = SIGN_NAMES.indexOf(sign);
  const pathData = index >= 0 ? getSignPathByIndex(index, activeSet, prefs.overrides) : undefined;
  if (pathData) {
    return (
      <svg
        width={size} height={size} viewBox={pathData.viewBox}
        style={{ display: 'inline-block', verticalAlign: '-0.15em', ...style }}
        aria-label={sign}
      >
        <path d={pathData.d} fill={color} />
      </svg>
    );
  }
  return (
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", ...style }}>
      {SIGN_UNICODE[sign] || '○'}
    </span>
  );
};
