import { describe, it, expect } from 'vitest';
import { calculateChart, calculateTransitPositions } from '../src/calculator';
import type { BirthData, HouseSystem } from '../src/types';

describe('calculateChart', () => {
  it('should calculate a complete natal chart', async () => {
    const birthData: BirthData = {
      dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
      latitude: 51.5, // London
      longitude: -0.1,
      houseSystem: 'P' as HouseSystem, // Placidus
    };

    const chart = await calculateChart(birthData);

    // Validate structure
    expect(chart).toBeDefined();
    expect(chart.planets.length).toBeGreaterThanOrEqual(11); // sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, northNode (chiron may be missing)
    expect(chart.houses).toHaveLength(12);
    expect(chart.angles).toBeDefined();
    expect(chart.aspects).toBeInstanceOf(Array);

    // Validate planets
    for (const planet of chart.planets) {
      console.log(`${planet.planet}: lat=${planet.latitude}, lon=${planet.longitude}, dist=${planet.distance}`);
      expect(planet.longitude).toBeGreaterThanOrEqual(0);
      expect(planet.longitude).toBeLessThan(360);
      // Allow latitude range for planets (Pluto can have up to ~17° inclination)
      expect(planet.latitude).toBeGreaterThanOrEqual(-20);
      expect(planet.latitude).toBeLessThan(20);
      // Calculated points (Fortune, Spirit, Vertex) have distance 0
      if (planet.planet !== 'fortune' && planet.planet !== 'spirit' && planet.planet !== 'vertex') {
        expect(planet.distance).toBeGreaterThan(0);
      }
      expect(planet.sign).toBeDefined();
      expect(planet.degree).toBeGreaterThanOrEqual(0);
      expect(planet.degree).toBeLessThan(30);
      expect(planet.minute).toBeGreaterThanOrEqual(0);
      expect(planet.minute).toBeLessThan(60);
      expect(planet.house).toBeGreaterThanOrEqual(1);
      expect(planet.house).toBeLessThanOrEqual(12);
      expect(typeof planet.retrograde).toBe('boolean');
    }

    // Validate houses
    for (const house of chart.houses) {
      expect(house.house).toBeGreaterThanOrEqual(1);
      expect(house.house).toBeLessThanOrEqual(12);
      expect(house.longitude).toBeGreaterThanOrEqual(0);
      expect(house.longitude).toBeLessThan(360);
      expect(house.sign).toBeDefined();
      expect(house.degree).toBeGreaterThanOrEqual(0);
      expect(house.degree).toBeLessThan(30);
      expect(house.minute).toBeGreaterThanOrEqual(0);
      expect(house.minute).toBeLessThan(60);
    }

    // Validate angles
    expect(chart.angles.ascendant).toBeGreaterThanOrEqual(0);
    expect(chart.angles.ascendant).toBeLessThan(360);
    expect(chart.angles.midheaven).toBeGreaterThanOrEqual(0);
    expect(chart.angles.midheaven).toBeLessThan(360);
    expect(chart.angles.descendant).toBeGreaterThanOrEqual(0);
    expect(chart.angles.descendant).toBeLessThan(360);
    expect(chart.angles.imumCoeli).toBeGreaterThanOrEqual(0);
    expect(chart.angles.imumCoeli).toBeLessThan(360);

    // Ascendant/descendant should be 180° apart (within small tolerance)
    const ascDescDiff = Math.abs(Math.abs(chart.angles.ascendant - chart.angles.descendant) - 180);
    expect(ascDescDiff).toBeLessThan(0.1);

    // MC/IC should be 180° apart
    const mcIcDiff = Math.abs(Math.abs(chart.angles.midheaven - chart.angles.imumCoeli) - 180);
    expect(mcIcDiff).toBeLessThan(0.1);

    // Validate aspects (optional, may be zero)
    for (const aspect of chart.aspects) {
      expect(aspect.planet1).toBeDefined();
      expect(aspect.planet2).toBeDefined();
      expect(aspect.type).toBeDefined();
      expect(aspect.angle).toBeGreaterThanOrEqual(0);
      expect(aspect.angle).toBeLessThanOrEqual(180);
      expect(aspect.orb).toBeGreaterThanOrEqual(0);
      expect(aspect.orb).toBeLessThan(10);
      expect(typeof aspect.applying).toBe('boolean');
      expect(typeof aspect.exact).toBe('boolean');
    }

    // Log some results for debugging
    console.log('Calculated chart:', {
      ascendant: chart.angles.ascendant,
      midheaven: chart.angles.midheaven,
      sun: chart.planets.find(p => p.planet === 'sun'),
      moon: chart.planets.find(p => p.planet === 'moon'),
      houses: chart.houses.map(h => ({ house: h.house, sign: h.sign, degree: h.degree })),
      aspectCount: chart.aspects.length,
    });
  });

  it('should handle different house systems', async () => {
    const birthData: BirthData = {
      dateTimeUtc: new Date('2000-01-01T12:00:00Z'),
      latitude: 40.7, // New York
      longitude: -74.0,
      houseSystem: 'W' as HouseSystem, // Whole sign
    };

    const chart = await calculateChart(birthData);
    expect(chart).toBeDefined();
    expect(chart.houses).toHaveLength(12);
    // In whole sign system, each house should span exactly 30°
    // We'll just verify the structure
  });
});

// --- issue #36: the transit planet-positions list and transit ring on the
// chart wheel were missing Fortune, Spirit, and Vertex. calculateTransitPositions
// only populated `planets` from the real ephemeris bodies and never added the
// derived points the way calculateChart does for the natal chart. Both
// PlanetLegend (transit list) and ChartWheel (transit ring) key off
// TransitResult.planets directly with no allowlist, so once the derived
// points are present here they should surface with no downstream changes. --
describe('calculateTransitPositions (issue #36)', () => {
  it('includes Fortune, Spirit, and Vertex when a location is provided', async () => {
    const birthData: BirthData = {
      dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
      latitude: 51.5, // London
      longitude: -0.1,
      houseSystem: 'P' as HouseSystem,
    };
    const natalChart = await calculateChart(birthData);

    const transitDate = new Date('2024-03-20T12:00:00Z');
    const transit = await calculateTransitPositions(transitDate, natalChart.planets, {
      latitude: 51.5,
      longitude: -0.1,
      houseSystem: 'P' as HouseSystem,
    });

    const names = transit.planets.map(p => p.planet);
    expect(names).toContain('fortune');
    expect(names).toContain('spirit');
    expect(names).toContain('vertex');

    for (const derived of ['fortune', 'spirit', 'vertex'] as const) {
      const point = transit.planets.find(p => p.planet === derived)!;
      expect(point).toBeDefined();
      expect(point.longitude).toBeGreaterThanOrEqual(0);
      expect(point.longitude).toBeLessThan(360);
      expect(point.house).toBeGreaterThanOrEqual(1);
      expect(point.house).toBeLessThanOrEqual(12);
      // Calculated points have no real ephemeris distance.
      expect(point.distance).toBe(0);
    }

    // Fortune and Spirit are reflections of each other across the ASC/DESC
    // axis (Day = ASC + Moon - Sun vs Day = ASC + Sun - Moon), so they must
    // differ from one another whenever Sun and Moon aren't conjunct/opposed
    // to the point of collapsing the two formulas onto the same longitude.
    const fortune = transit.planets.find(p => p.planet === 'fortune')!;
    const spirit = transit.planets.find(p => p.planet === 'spirit')!;
    expect(fortune.longitude).not.toBeCloseTo(spirit.longitude, 5);
  });

  it('omits the derived points when no location is provided', async () => {
    const birthData: BirthData = {
      dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
      latitude: 51.5,
      longitude: -0.1,
      houseSystem: 'P' as HouseSystem,
    };
    const natalChart = await calculateChart(birthData);

    const transit = await calculateTransitPositions(new Date('2024-03-20T12:00:00Z'), natalChart.planets);

    const names = transit.planets.map(p => p.planet);
    expect(names).not.toContain('fortune');
    expect(names).not.toContain('spirit');
    expect(names).not.toContain('vertex');
  });
});