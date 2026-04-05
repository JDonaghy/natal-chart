import type { ChartResult, TransitResult } from '@natal-chart/core';

const MODERN_PLANETS = new Set(['uranus', 'neptune', 'pluto', 'chiron', 'lilith', 'vertex', 'spirit']);

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

export function getPlanetGlyph(planet: string): string {
  const glyphs: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '⯓',
    northNode: '☊',
    chiron: '⚷',
    lilith: '⚸',
    fortune: '⊕',
    vertex: 'Vx',
  };
  return glyphs[planet] || '○';
}

export function getSignGlyph(sign: string): string {
  const glyphs: Record<string, string> = {
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
  };
  return glyphs[sign] || '○';
}

export function formatPlanetName(planet: string): string {
  const names: Record<string, string> = {
    northNode: 'North Node',
    lilith: 'Lilith',
    fortune: 'Fortune',
    spirit: 'Spirit',
    vertex: 'Vertex',
  };
  if (names[planet]) return names[planet];
  return planet.charAt(0).toUpperCase() + planet.slice(1).replace(/([A-Z])/g, ' $1');
}

export function formatSignName(sign: string): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}

export function formatAspectName(aspect: string): string {
  return aspect.charAt(0).toUpperCase() + aspect.slice(1);
}

export function getAspectGlyph(aspectType: string): string {
  const glyphs: Record<string, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
    quincunx: '⚻',
    semiSextile: '⚺',
    parallel: '∥',
    contraparallel: '⊥',
  };
  return glyphs[aspectType] || '•';
}

export function getAspectColor(aspectType: string): string {
  const colors: Record<string, string> = {
    conjunction: '#333333',
    opposition: '#cc3333',
    trine: '#3366cc',
    square: '#cc6633',
    sextile: '#33cc66',
    quincunx: '#9966cc',
    semiSextile: '#66cccc',
    parallel: '#cc3399',
    contraparallel: '#cc3399',
  };
  return colors[aspectType] || '#333333';
}
