import { describe, it, expect } from 'vitest';
import { calculateSunPosition } from '../src/spike';

// Known test case: Sun position for a specific date
// We'll verify against an online chart service
describe('swisseph-wasm spike test', () => {
  it('should load ephemeris and calculate Sun position', async () => {
    // Test date: June 15, 1990 12:00 UTC
    const testDate = new Date('1990-06-15T12:00:00Z');
    const latitude = 51.5; // London
    const longitude = -0.1;
    
    const result = await calculateSunPosition(testDate, latitude, longitude);
    
    // Basic validation
    expect(result).toBeDefined();
    expect(result.longitude).toBeGreaterThanOrEqual(0);
    expect(result.longitude).toBeLessThan(360);
    expect(result.latitude).toBeDefined();
    expect(result.distance).toBeDefined();
    
    // Expected: Sun around 23° Gemini (83° longitude)
    // We'll use a wider tolerance initially, then refine after validation
    const expectedLongitude = 83.0; // Approximate
    const tolerance = 5.0; // Degrees
    
    expect(Math.abs(result.longitude - expectedLongitude)).toBeLessThan(tolerance);
    
    console.log('Sun position spike test result:', {
      longitude: result.longitude,
      latitude: result.latitude,
      distance: result.distance,
      speed: result.speed,
    });
  });
  
  it('should handle date conversion to Julian Day', async () => {
    // Test multiple dates to ensure date conversion works
    const testCases = [
      { date: new Date('2000-01-01T00:00:00Z'), desc: 'Millennium' },
      { date: new Date('2024-03-26T12:00:00Z'), desc: 'Current date' },
      { date: new Date('1950-07-20T18:30:00Z'), desc: 'Mid-20th century' },
    ];
    
    for (const testCase of testCases) {
      const result = await calculateSunPosition(
        testCase.date,
        0, // Equator
        0  // Prime meridian
      );
      
      expect(result.longitude).toBeGreaterThanOrEqual(0);
      expect(result.longitude).toBeLessThan(360);
      console.log(`${testCase.desc} Sun longitude: ${result.longitude.toFixed(2)}°`);
    }
  });
});