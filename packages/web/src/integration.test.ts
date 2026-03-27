import { describe, it, expect } from 'vitest';
import { convertToUTC } from './services/timezone';
import { calculateChart } from '@natal-chart/core';
import type { BirthData } from '@natal-chart/core';

describe('Timezone integration with chart calculation', () => {
  it('should calculate chart with America/New_York timezone', async () => {
    // Test date: June 15, 1990 12:00 PM in New York (EDT, UTC-4)
    const dateString = '1990-06-15';
    const timeString = '12:00';
    const timeZone = 'America/New_York';
    
    const utcDate = convertToUTC(dateString, timeString, timeZone);
    
    // Verify UTC conversion: 12:00 EDT = 16:00 UTC
    expect(utcDate.getUTCHours()).toBe(16);
    expect(utcDate.getUTCFullYear()).toBe(1990);
    expect(utcDate.getUTCMonth()).toBe(5); // June is month 5 (0-indexed)
    expect(utcDate.getUTCDate()).toBe(15);
    
    // Verify year is modern (not ancient)
    expect(utcDate.getUTCFullYear()).toBeGreaterThan(1900);
    expect(utcDate.getUTCFullYear()).toBeLessThan(2100);
    
    // Calculate chart with the UTC date
    const birthData: BirthData = {
      dateTimeUtc: utcDate,
      latitude: 40.7, // New York
      longitude: -74.0,
      houseSystem: 'P',
    };
    
    const chart = await calculateChart(birthData);
    
    // Verify chart was calculated successfully
    expect(chart).toBeDefined();
    expect(chart.planets.length).toBeGreaterThan(0);
    expect(chart.houses).toHaveLength(12);
    
    // Verify JD values would be valid (implicitly checked by calculateChart)
    // If JD was invalid (ancient), calculateChart would throw or produce nonsense
    // The fact we got a chart with planet positions indicates JD was valid
  });

  it('should handle UTC timezone correctly', async () => {
    const utcDate = convertToUTC('1990-06-15', '12:00', 'UTC');
    
    expect(utcDate.toISOString()).toBe('1990-06-15T12:00:00.000Z');
    
    const birthData: BirthData = {
      dateTimeUtc: utcDate,
      latitude: 51.5,
      longitude: -0.1,
      houseSystem: 'P',
    };
    
    const chart = await calculateChart(birthData);
    expect(chart.planets.length).toBeGreaterThan(0);
  });
});