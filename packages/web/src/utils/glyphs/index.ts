/**
 * Glyph registry — multiple glyph sources with per-entity override support.
 *
 * Backward-compatible: getPlanetPath(planet, glyphSet) still works.
 * New: getPlanetPath(planet, glyphSet, overrides) checks overrides first.
 */

// Register all sources (side-effect imports)
import './sources/classic';
import './sources/modern';
import './sources/dejavu-full';
// import './sources/astrochart'; // removed: viewBox extraction needs work
import './sources/astromoony-sans';
import './sources/astronomicon';

// Re-export public types and registry API
export type { GlyphPath, GlyphSource } from './types';
export type { GlyphVariant } from './registry';
export { getSource, getAllSources, getVariantsForPlanet, getVariantsForSign } from './registry';

import { getSource } from './registry';
import type { GlyphPath } from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_GLYPH_SET = 'classic';

export const GLYPH_SET_NAMES: Record<string, string> = {
  classic: 'Classic',
  modern: 'Modern',
  'dejavu-full': 'DejaVu Full',
  'astromoony-sans': 'Astromoony',
  'astronomicon': 'Astronomicon',
};

export const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export const SIGN_ABBREVIATIONS: string[] = [
  'Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir',
  'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis',
];

// ─── Lookup functions ───────────────────────────────────────────────────────

function resolveSource(glyphSet: string) {
  return getSource(glyphSet) ?? getSource('classic')!;
}

/**
 * Get SVG path data for a planet glyph.
 * Resolution: overrides[planet] → glyphSet → classic fallback.
 */
export function getPlanetPath(
  planet: string,
  glyphSet: string = DEFAULT_GLYPH_SET,
  overrides?: Record<string, string>,
): GlyphPath | undefined {
  if (overrides?.[planet]) {
    const src = getSource(overrides[planet]);
    if (src?.planets[planet]) return src.planets[planet];
  }
  return resolveSource(glyphSet).planets[planet];
}

/**
 * Get SVG path data for a zodiac sign glyph by index (0=Aries … 11=Pisces).
 * Resolution: overrides[signName] → glyphSet → classic fallback.
 */
export function getSignPathByIndex(
  index: number,
  glyphSet: string = DEFAULT_GLYPH_SET,
  overrides?: Record<string, string>,
): GlyphPath | undefined {
  const name = SIGN_ORDER[index];
  if (!name) return undefined;
  if (overrides?.[name]) {
    const src = getSource(overrides[name]);
    if (src?.signs[name]) return src.signs[name];
  }
  return resolveSource(glyphSet).signs[name];
}

/**
 * Compute an SVG transform that scales a glyph from its native font-coordinate
 * viewBox down to `sz` pixels and centers it at (x, y).
 */
export function glyphTransform(viewBox: string, x: number, y: number, sz: number): string {
  const parts = viewBox.split(' ').map(Number);
  const vbX = parts[0] ?? 0;
  const vbY = parts[1] ?? 0;
  const vbW = parts[2] ?? 100;
  const vbH = parts[3] ?? 100;
  const maxDim = Math.max(vbW, vbH);
  const scale = sz / maxDim;
  const padX = (sz - vbW * scale) / 2;
  const padY = (sz - vbH * scale) / 2;
  return `translate(${x - sz / 2 + padX}, ${y - sz / 2 + padY}) scale(${scale}) translate(${-vbX}, ${-vbY})`;
}

// ─── Legacy compatibility ───────────────────────────────────────────────────

/** @deprecated Use individual source imports. Kept for backward compatibility. */
export const GLYPH_SETS: Record<string, { planets: Record<string, GlyphPath>; signs: Record<string, GlyphPath> }> = {
  get classic() { return { planets: getSource('classic')!.planets, signs: getSource('classic')!.signs }; },
  get modern() { return { planets: getSource('modern')!.planets, signs: getSource('modern')!.signs }; },
};
