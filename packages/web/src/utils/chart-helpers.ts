import type { ChartResult, TransitResult } from '@natal-chart/core';

/**
 * Symbol/name helpers are re-exported from `./symbols`, which is the single
 * shared symbol table used by both the screen and the PDF export. Do not
 * redefine any of these maps here or anywhere else — see the module docstring
 * in `./symbols.ts` for why (issue #28).
 */
export {
  getPlanetGlyph,
  getSignGlyph,
  getAspectGlyph,
  getAspectColor,
  getPlanetGlyphScale,
  formatPlanetName,
  formatSignName,
  formatAspectName,
  PTOLEMAIC_ASPECTS,
  PTOLEMAIC_ASPECT_SET,
} from './symbols';

const MODERN_PLANETS = new Set(['uranus', 'neptune', 'pluto', 'chiron', 'lilith', 'vertex']);

export function filterTraditionalPlanets(chartData: ChartResult): ChartResult {
  const planets = chartData.planets.filter(p => !MODERN_PLANETS.has(p.planet));
  const planetNames = new Set(planets.map(p => p.planet));
  const aspects = chartData.aspects.filter(
    a => planetNames.has(a.planet1) && planetNames.has(a.planet2),
  );
  return { ...chartData, planets, aspects };
}

export function filterTraditionalTransits(transitData: TransitResult): TransitResult {
  const planets = transitData.planets.filter(p => !MODERN_PLANETS.has(p.planet));
  const aspects = transitData.aspects.filter(
    a => !MODERN_PLANETS.has(a.natalPlanet) && !MODERN_PLANETS.has(a.transitPlanet),
  );
  return { ...transitData, planets, aspects };
}
