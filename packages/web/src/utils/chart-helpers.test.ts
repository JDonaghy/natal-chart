import { describe, it, expect } from 'vitest';
import type { ChartResult, TransitResult, Planet, PlanetPosition, Aspect, TransitAspect } from '@natal-chart/core';
import { filterTraditionalPlanets, filterTraditionalTransits } from './chart-helpers';

// --- issue #36: Lot of Spirit was missing from the traditional planet list,
// aspect grid, and chart wheel. `spirit` is fully computed by the core
// calculator (alongside `fortune`, which already survives the traditional
// filter), but `MODERN_PLANETS` in chart-helpers.ts wrongly included
// 'spirit', so `filterTraditionalPlanets`/`filterTraditionalTransits` (which
// feed the list, the aspect grid, and ChartWheel alike) stripped it out
// whenever the traditional toggle was on. Fortune must stay visible too. ----

function makePlanet(planet: Planet, overrides: Partial<PlanetPosition> = {}): PlanetPosition {
  return {
    planet,
    longitude: 0,
    latitude: 0,
    declination: 0,
    distance: 0,
    speed: 0,
    sign: 'aries',
    degree: 0,
    minute: 0,
    house: 1,
    retrograde: false,
    ...overrides,
  };
}

const TRADITIONAL_PLANETS: Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const DERIVED_POINTS: Planet[] = ['fortune', 'spirit'];
const MODERN_ONLY: Planet[] = ['uranus', 'neptune', 'pluto', 'chiron', 'lilith', 'vertex'];
const ALL_PLANETS: Planet[] = [...TRADITIONAL_PLANETS, ...DERIVED_POINTS, ...MODERN_ONLY];

describe('filterTraditionalPlanets (issue #36)', () => {
  const chartData: ChartResult = {
    planets: ALL_PLANETS.map(p => makePlanet(p)),
    houses: [],
    angles: { ascendant: 0, midheaven: 0, descendant: 180, imumCoeli: 180 },
    aspects: [
      { planet1: 'sun', planet2: 'spirit', type: 'conjunction', angle: 0, orb: 0, applying: false, exact: true },
      { planet1: 'sun', planet2: 'fortune', type: 'conjunction', angle: 0, orb: 0, applying: false, exact: true },
      { planet1: 'sun', planet2: 'lilith', type: 'conjunction', angle: 0, orb: 0, applying: false, exact: true },
    ] as Aspect[],
  };

  it('keeps Lot of Spirit and Lot of Fortune, strips modern planets', () => {
    const result = filterTraditionalPlanets(chartData);
    const names = result.planets.map(p => p.planet);
    expect(names).toContain('spirit');
    expect(names).toContain('fortune');
    for (const modern of MODERN_ONLY) {
      expect(names).not.toContain(modern);
    }
    for (const trad of TRADITIONAL_PLANETS) {
      expect(names).toContain(trad);
    }
  });

  it('keeps aspects involving Spirit and Fortune, drops aspects involving modern planets', () => {
    const result = filterTraditionalPlanets(chartData);
    const pairs = result.aspects.map(a => [a.planet1, a.planet2]);
    expect(pairs).toContainEqual(['sun', 'spirit']);
    expect(pairs).toContainEqual(['sun', 'fortune']);
    expect(pairs).not.toContainEqual(['sun', 'lilith']);
  });
});

describe('filterTraditionalTransits (issue #36)', () => {
  const transitData: TransitResult = {
    planets: ALL_PLANETS.map(p => makePlanet(p)),
    aspects: [
      { natalPlanet: 'sun', transitPlanet: 'spirit', type: 'conjunction', angle: 0, orb: 0, applying: false, exact: true },
      { natalPlanet: 'sun', transitPlanet: 'lilith', type: 'conjunction', angle: 0, orb: 0, applying: false, exact: true },
    ] as TransitAspect[],
    dateTimeUtc: new Date('2024-01-01T00:00:00Z'),
  };

  it('keeps Lot of Spirit and Lot of Fortune among transit planets, strips modern planets', () => {
    const result = filterTraditionalTransits(transitData);
    const names = result.planets.map(p => p.planet);
    expect(names).toContain('spirit');
    expect(names).toContain('fortune');
    for (const modern of MODERN_ONLY) {
      expect(names).not.toContain(modern);
    }
  });

  it('keeps transit aspects involving Spirit, drops ones involving modern planets', () => {
    const result = filterTraditionalTransits(transitData);
    const pairs = result.aspects.map(a => [a.natalPlanet, a.transitPlanet]);
    expect(pairs).toContainEqual(['sun', 'spirit']);
    expect(pairs).not.toContainEqual(['sun', 'lilith']);
  });
});
