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

  it('should handle historical DST correctly for Europe/London', () => {
    // Summer 1970: UK was on British Summer Time (UTC+1)
    const result = convertToUTC('1970-06-15', '12:00', 'Europe/London');
    expect(result.getUTCHours()).toBe(11); // 12:00 BST = 11:00 UTC
    expect(result.toISOString()).toBe('1970-06-15T11:00:00.000Z');
  });

  it('should handle historical DST correctly for America/New_York', () => {
    // Summer 1970: US DST rules were different pre-1974
    // New York was on Eastern Daylight Time (UTC-4)
    const result = convertToUTC('1970-06-15', '12:00', 'America/New_York');
    expect(result.getUTCHours()).toBe(16); // 12:00 EDT = 16:00 UTC
    expect(result.toISOString()).toBe('1970-06-15T16:00:00.000Z');
  });

  it('should handle winter (non-DST) correctly for Europe/London', () => {
    // Winter 1970: UK was on British Standard Time year-round (1968-1971 experiment)
    // UTC+1 all year, not GMT
    const result = convertToUTC('1970-01-15', '12:00', 'Europe/London');
    expect(result.getUTCHours()).toBe(11); // 12:00 BST = 11:00 UTC
    expect(result.toISOString()).toBe('1970-01-15T11:00:00.000Z');
  });

  it('should handle post-1971 winter correctly for Europe/London', () => {
    // Winter 1975: UK back to normal GMT in winter (UTC+0)
    const result = convertToUTC('1975-01-15', '12:00', 'Europe/London');
    expect(result.getUTCHours()).toBe(12); // 12:00 GMT = 12:00 UTC
    expect(result.toISOString()).toBe('1975-01-15T12:00:00.000Z');
  });
});