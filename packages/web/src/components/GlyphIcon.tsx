import React, { useContext } from 'react';
import { getPlanetPath, getPlanetGlyphRotation, getSignPathByIndex, DEFAULT_GLYPH_SET, SIGN_ORDER } from '../utils/astro-glyph-paths';
import { ChartContext } from '../contexts/ChartContext';
import { getPlanetGlyph, getSignGlyph, getPlanetGlyphScale } from '../utils/symbols';

// Unicode glyphs render visually smaller than SVG paths at the same nominal size.
const TEXT_FALLBACK_SCALE = 1.4;


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
  const scaleFactor = getPlanetGlyphScale(planet);
  if (pathData) {
    const rotation = getPlanetGlyphRotation(planet);
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
        <path
          d={pathData.d}
          fill={color}
          transform={rotation ? `rotate(${rotation} ${newX + newW / 2} ${newY + newH / 2})` : undefined}
        />
      </svg>
    );
  }
  // Text fallback. The per-planet scale factor has to be applied here too,
  // otherwise text-fallback glyphs (Vertex's "Vx") render a full 1.4x larger
  // than the path glyphs they sit beside in the positions list (issue #28).
  const textScale = TEXT_FALLBACK_SCALE * scaleFactor;
  const fallbackSize =
    typeof size === 'number'
      ? size * textScale
      : `calc(${size} * ${textScale})`;
  return (
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", fontSize: fallbackSize, lineHeight: 1, color, ...style }}>
      {getPlanetGlyph(planet)}
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
  const index = (SIGN_ORDER as readonly string[]).indexOf(sign);
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
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", color, ...style }}>
      {getSignGlyph(sign)}
    </span>
  );
};
