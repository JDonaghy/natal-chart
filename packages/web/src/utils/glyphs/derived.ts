import type { GlyphPath } from './types';

/**
 * Glyphs that no glyph *font* source provides, drawn here as SVG paths so they
 * render identically on screen and in the PDF (issue #28).
 *
 * These used to fall back to Unicode <text>, which is why they looked wrong:
 * DejaVu's ⊗ draws its "x" well inside the circle instead of out to the edges,
 * and text fallbacks are rendered from a different font at a different stroke
 * weight than the surrounding path glyphs.
 *
 * All paths share a `0 0 100 100` viewBox and a 6.5-unit stroke weight so they
 * sit at the same visual weight as each other and as the font-derived glyphs.
 */

/** Ring: outer circle (r=46) wound opposite to inner circle (r=39.5). */
const RING =
  'M 50 4 A 46 46 0 1 1 50 96 A 46 46 0 1 1 50 4 Z ' +
  'M 50 10.5 A 39.5 39.5 0 1 0 50 89.5 A 39.5 39.5 0 1 0 50 10.5 Z';

/**
 * Lot of Fortune — a circle with an x whose arms run all the way out to the
 * circle's edges (the customer-reported defect was an x that stopped short).
 * Arm endpoints sit at r=42.75, the mid-line of the 39.5–46 ring.
 */
const FORTUNE_X =
  'M 17.47 22.07 L 77.93 82.53 L 82.53 77.93 L 22.07 17.47 Z ' +
  'M 22.07 82.53 L 82.53 22.07 L 77.93 17.47 L 17.47 77.93 Z';

/** Lot of Spirit — a circle with a vertical stroke running through it (Φ). */
const SPIRIT_BAR = 'M 46.75 0 L 53.25 0 L 53.25 100 L 46.75 100 Z';

export const DERIVED_PLANET_PATHS: Readonly<Record<string, GlyphPath>> = Object.freeze({
  fortune: { d: `${RING} ${FORTUNE_X}`, viewBox: '0 0 100 100' },
  spirit: { d: `${RING} ${SPIRIT_BAR}`, viewBox: '0 0 100 100' },
});

/**
 * Planets drawn by re-using another planet's glyph under a rotation.
 * The South Node is, by construction, the North Node turned through 180° —
 * deriving it means it automatically tracks whichever glyph set (or per-entity
 * override) the user picked for the North Node.
 */
export const DERIVED_ROTATIONS: Readonly<Record<string, { from: string; degrees: number }>> =
  Object.freeze({
    southNode: { from: 'northNode', degrees: 180 },
  });

/** Extra rotation (degrees) to apply when drawing `planet`'s glyph, or 0. */
export function getPlanetGlyphRotation(planet: string): number {
  return DERIVED_ROTATIONS[planet]?.degrees ?? 0;
}
