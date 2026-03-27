import { describe, it, expect } from 'vitest';
import { convertToUTC } from './timezone';

describe('convertToUTC', () => {
  it('should convert UTC timezone correctly', () => {
    const result = convertToUTC('1990-06-15', '12:00', 'UTC');
    expect(result.toISOString()).toBe('1990-06-15T12:00:00.000Z');
  });

  it('should convert America/New_York to UTC', () => {
    const result = convertToUTC('1990-06-15', '12:00', 'America/New_York');
    expect(result.getUTCHours()).toBe(16); // EDT is UTC-4
    expect(result.getUTCFullYear()).toBe(1990);
  });

  it('should produce valid modern dates (1900-2100)', () => {
    const result = convertToUTC('1990-06-15', '12:00', 'Europe/London');
    expect(result.getUTCFullYear()).toBeGreaterThan(1900);
    expect(result.getUTCFullYear()).toBeLessThan(2100);
    expect(result.getTime()).not.toBeNaN();
  });

  it('should fallback to UTC on invalid timezone', () => {
    const result = convertToUTC('1990-06-15', '12:00', 'Invalid/Timezone');
    expect(result.toISOString()).toBe('1990-06-15T12:00:00.000Z');
  });
});