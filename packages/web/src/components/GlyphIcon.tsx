import React from 'react';
import { getPlanetPath, getSignPathByIndex } from '../utils/astro-glyph-paths';

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

/**
 * Render a planet glyph as an inline SVG (font-independent) with text fallback
 * for planets without SVG path data (lilith, fortune, vertex).
 */
export const PlanetGlyphIcon: React.FC<{
  planet: string;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
}> = ({ planet, size = '1em', color = 'currentColor', style }) => {
  const pathData = getPlanetPath(planet);
  if (pathData) {
    return (
      <svg
        width={size} height={size} viewBox={pathData.viewBox}
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
}> = ({ sign, size = '1em', color = 'currentColor', style }) => {
  const index = SIGN_NAMES.indexOf(sign);
  const pathData = index >= 0 ? getSignPathByIndex(index) : undefined;
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
