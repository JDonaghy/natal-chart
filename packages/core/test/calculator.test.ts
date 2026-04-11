import { describe, it, expect } from 'vitest';
import { calculateChart } from '../src/calculator';
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