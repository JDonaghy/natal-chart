/**
 * The single shared symbol table for every surface that draws astrological
 * symbols: the chart wheel, the on-screen aspect grids, the positions list and
 * the PDF export.
 *
 * Why this module exists (issue #28): the PDF export used to keep its *own*
 * copy of these maps, and the two drifted — the Lot of Fortune rendered as a
 * circled plus in the PDF but a circled x on screen, the Lot of Spirit was
 * missing from the PDF's map entirely (falling back to a plain circle), and
 * Pluto was mapped to U+2BD3, which the PDF's embedded DejaVuSans does not
 * contain, so it rendered as nothing at all.
 *
 * Rule for anyone adding a symbol here: the PDF embeds
 * `packages/web/public/fonts/DejaVuSans.ttf` and renders these strings with
 * it, so every code point below MUST exist in that font. `symbols.test.ts`
 * enforces that against the real font file — if a glyph is missing there, pick
 * a code point DejaVu covers rather than adding a PDF-only special case.
 */

/** The five Ptolemaic aspects — the only aspects this app calculates or draws. */
export const PTOLEMAIC_ASPECTS = [
  'conjunction',
  'opposition',
  'trine',
  'square',
  'sextile',
] as const;

export type PtolemaicAspect = (typeof PTOLEMAIC_ASPECTS)[number];

/** Membership test for the five-aspect set. */
export const PTOLEMAIC_ASPECT_SET: ReadonlySet<string> = new Set<string>(PTOLEMAIC_ASPECTS);

/**
 * Unicode symbol per planet / calculated point.
 *
 * - `pluto` is U+2647 (♇), not U+2BD3 (⯓): DejaVuSans has no U+2BD3.
 * - `fortune` is U+2297 (⊗, circled x) on both screen and PDF.
 * - `spirit` is U+03A6 (Φ) — a circle with a vertical stroke through it.
 * - `southNode` is U+260B (☋), the mirror of the North Node's U+260A.
 */
export const PLANET_SYMBOLS: Readonly<Record<string, string>> = Object.freeze({
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  northNode: '☊',
  southNode: '☋',
  chiron: '⚷',
  lilith: '⚸',
  fortune: '⊗',
  spirit: 'Φ',
  vertex: 'Vx',
});

/** Fallback drawn when a planet key has no entry in {@link PLANET_SYMBOLS}. */
export const UNKNOWN_SYMBOL = '○';

export const SIGN_SYMBOLS: Readonly<Record<string, string>> = Object.freeze({
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
});

/**
 * Aspect symbols, one per Ptolemaic aspect.
 *
 * Sextile is U+2217 (∗, asterisk operator) rather than the "correct"
 * U+26B9 (⚹): DejaVuSans has no U+26B9, so the PDF drew a blank box for every
 * sextile. Same class of bug as Pluto above.
 */
export const ASPECT_SYMBOLS: Readonly<Record<PtolemaicAspect, string>> = Object.freeze({
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '∗',
});

export const ASPECT_COLORS: Readonly<Record<PtolemaicAspect, string>> = Object.freeze({
  conjunction: '#333333',
  opposition: '#cc3333',
  trine: '#3366cc',
  square: '#cc6633',
  sextile: '#33cc66',
});

/**
 * Per-planet visual scale factors that normalize apparent glyph size.
 *
 * The source glyphs come from different fonts with different design weights,
 * so a nominal size of N pixels does not produce the same *apparent* size for
 * every planet. These factors pull them back onto a common visual weight.
 */
export const PLANET_GLYPH_SCALE: Readonly<Record<string, number>> = Object.freeze({
  chiron: 1.25,
  lilith: 1.2,
  // North Node's glyph fills its em-box far more than its neighbours, so at
  // scale 1.0 it reads as oversized on the wheel and in the positions list.
  northNode: 0.9,
  southNode: 0.9,
  fortune: 1.0,
  spirit: 1.0,
  vertex: 0.65,
});

/** Display names for planets whose key doesn't title-case cleanly. */
const PLANET_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  northNode: 'North Node',
  southNode: 'South Node',
  lilith: 'Lilith',
  fortune: 'Fortune',
  spirit: 'Spirit',
  vertex: 'Vertex',
});

export function getPlanetGlyph(planet: string): string {
  return PLANET_SYMBOLS[planet] ?? UNKNOWN_SYMBOL;
}

export function getSignGlyph(sign: string): string {
  return SIGN_SYMBOLS[sign] ?? UNKNOWN_SYMBOL;
}

export function getAspectGlyph(aspectType: string): string {
  return ASPECT_SYMBOLS[aspectType as PtolemaicAspect] ?? '•';
}

export function getAspectColor(aspectType: string): string {
  return ASPECT_COLORS[aspectType as PtolemaicAspect] ?? '#333333';
}

/** Visual scale factor for a planet glyph (1 when no adjustment is needed). */
export function getPlanetGlyphScale(planet: string): number {
  return PLANET_GLYPH_SCALE[planet] ?? 1;
}

export function formatPlanetName(planet: string): string {
  const name = PLANET_DISPLAY_NAMES[planet];
  if (name) return name;
  return planet.charAt(0).toUpperCase() + planet.slice(1).replace(/([A-Z])/g, ' $1');
}

export function formatSignName(sign: string): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}

export function formatAspectName(aspect: string): string {
  return aspect.charAt(0).toUpperCase() + aspect.slice(1);
}
