import React, { useContext } from 'react';
import { getPlanetPath, getPlanetGlyphRotation, getSignPathByIndex, DEFAULT_GLYPH_SET, SIGN_ORDER } from '../utils/astro-glyph-paths';
import { ChartContext } from '../contexts/ChartContext';
import { getPlanetGlyph, getSignGlyph, getPlanetGlyphScale } from '../utils/symbols';

// Unicode glyphs render visually smaller than SVG paths at the same nominal size.
const TEXT_FALLBACK_SCALE = 1.4;

// issue #57: glyphs here are plain filled paths with no stroke, so — unlike
// ChartWheel's planet glyphs (which issue #32 gave a same-color stroke to
// bolden, and #57 thins via GLYPH_STROKE_FACTOR) — there's no stroke-weight
// knob to dial down directly. A background-colored "erosion" stroke was
// considered and rejected: these icons render on inconsistent surfaces
// (page background, card background, and hardcoded-color badges/chips) and
// under 8 theme presets including several dark ones, so a stroke tuned to
// one surface/theme would look wrong on the others. Instead, shrink the
// rendered glyph slightly — less filled area reads as visually lighter
// without changing its center position, which is the "reduce scale
// slightly" option the issue explicitly flagged as acceptable if noted
// (this is that note: it changes size, not stroke weight).
const GLYPH_BOLDNESS_SCALE = 0.94;
// Text-fallback glyphs (lilith, fortune, spirit, vertex) render via the one
// DejaVuSans-regular face bundled in public/fonts — there's no lighter
// weight file to select, and browsers don't synthesize a thinner face the
// way some synthesize faux-bold, so this is a best-effort/no-op with the
// current font bundle rather than a real fix. Set it anyway (harmless, and
// takes effect for free if the bundle ever gains a lighter weight or a
// system DejaVu Sans covers the fallback); GLYPH_BOLDNESS_SCALE below is
// the mechanism that actually has a visible effect on these today.
const TEXT_FALLBACK_WEIGHT = 300;


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
  // GLYPH_BOLDNESS_SCALE folds into the per-planet scale factor uniformly —
  // it shrinks every planet's rendered size by the same ~6% regardless of
  // its individual weight-normalization value (issue #57).
  const scaleFactor = getPlanetGlyphScale(planet) * GLYPH_BOLDNESS_SCALE;
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
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", fontWeight: TEXT_FALLBACK_WEIGHT, fontSize: fallbackSize, lineHeight: 1, color, ...style }}>
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
    // Pad the viewBox to shrink the glyph slightly (issue #57) — same
    // technique PlanetGlyphIcon uses for its per-planet scale factor above,
    // just with a single shared shrink instead of a per-sign one.
    const vbParts = pathData.viewBox.split(' ').map(Number);
    const [vbX, vbY, vbW, vbH] = [vbParts[0] ?? 0, vbParts[1] ?? 0, vbParts[2] ?? 100, vbParts[3] ?? 100];
    const newW = vbW / GLYPH_BOLDNESS_SCALE;
    const newH = vbH / GLYPH_BOLDNESS_SCALE;
    const newX = vbX - (newW - vbW) / 2;
    const newY = vbY - (newH - vbH) / 2;
    const adjustedViewBox = `${newX} ${newY} ${newW} ${newH}`;
    return (
      <svg
        width={size} height={size} viewBox={adjustedViewBox}
        style={{ display: 'inline-block', verticalAlign: '-0.15em', ...style }}
        aria-label={sign}
      >
        <path d={pathData.d} fill={color} />
      </svg>
    );
  }
  return (
    <span style={{ fontFamily: "'DejaVuSans', sans-serif", fontWeight: TEXT_FALLBACK_WEIGHT, fontSize: `${GLYPH_BOLDNESS_SCALE}em`, color, ...style }}>
      {getSignGlyph(sign)}
    </span>
  );
};
