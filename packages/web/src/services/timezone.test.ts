import { describe, it, expect } from 'vitest';
import { convertToUTC, convertFromUTC, getTimezoneOffset, isValidTimezone } from './timezone';

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

  it('should handle positive offset timezone (Asia/Kolkata UTC+5:30)', () => {
    const result = convertToUTC('2000-03-20', '14:30', 'Asia/Kolkata');
    // 14:30 IST = 09:00 UTC
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('should handle midnight crossing (day boundary)', () => {
    // 01:00 in Tokyo (UTC+9) = 16:00 UTC previous day
    const result = convertToUTC('2000-01-02', '01:00', 'Asia/Tokyo');
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(16);
  });

  it('should handle time with seconds', () => {
    const result = convertToUTC('1990-06-15', '12:30:45', 'UTC');
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(30);
    expect(result.getUTCSeconds()).toBe(45);
  });

  it('should handle southern hemisphere timezone (Australia/Sydney)', () => {
    // January in Sydney is summer (AEDT = UTC+11)
    const result = convertToUTC('2020-01-15', '12:00', 'Australia/Sydney');
    expect(result.getUTCHours()).toBe(1); // 12:00 AEDT = 01:00 UTC
  });

  it('should handle negative half-hour offset (America/St_Johns UTC-3:30)', () => {
    // Summer: NDT = UTC-2:30
    const result = convertToUTC('2020-07-15', '12:00', 'America/St_Johns');
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });
});

describe('convertFromUTC', () => {
  it('should convert UTC date to local time in UTC timezone', () => {
    const utcDate = new Date('2000-06-15T12:00:00Z');
    const result = convertFromUTC(utcDate, 'UTC');
    expect(result.dateString).toBe('2000-06-15');
    expect(result.timeString).toMatch(/^12:00/);
  });

  it('should convert UTC to America/New_York (EDT)', () => {
    const utcDate = new Date('2000-06-15T16:00:00Z');
    const result = convertFromUTC(utcDate, 'America/New_York');
    expect(result.dateString).toBe('2000-06-15');
    expect(result.timeString).toMatch(/^12:00/);
  });

  it('should convert UTC to America/New_York (EST winter)', () => {
    const utcDate = new Date('2000-01-15T17:00:00Z');
    const result = convertFromUTC(utcDate, 'America/New_York');
    expect(result.dateString).toBe('2000-01-15');
    expect(result.timeString).toMatch(/^12:00/);
  });

  it('should handle date boundary crossing', () => {
    // 02:00 UTC on Jan 2 = 21:00 EST on Jan 1
    const utcDate = new Date('2000-01-02T02:00:00Z');
    const result = convertFromUTC(utcDate, 'America/New_York');
    expect(result.dateString).toBe('2000-01-01');
    expect(result.timeString).toMatch(/^21:00/);
  });

  it('should handle positive offset (Asia/Tokyo UTC+9)', () => {
    const utcDate = new Date('2000-06-15T03:00:00Z');
    const result = convertFromUTC(utcDate, 'Asia/Tokyo');
    expect(result.dateString).toBe('2000-06-15');
    expect(result.timeString).toMatch(/^12:00/);
  });

  it('should roundtrip correctly with convertToUTC', () => {
    const original = { date: '1985-11-22', time: '08:45', tz: 'Europe/Paris' };
    const utc = convertToUTC(original.date, original.time, original.tz);
    const back = convertFromUTC(utc, original.tz);
    expect(back.dateString).toBe(original.date);
    expect(back.timeString).toMatch(/^08:45/);
  });
});

describe('getTimezoneOffset', () => {
  it('should return 0 for UTC', () => {
    const offset = getTimezoneOffset('UTC', new Date('2000-06-15T12:00:00Z'));
    expect(offset).toBe(0);
  });

  it('should return negative offset for America/New_York in summer (EDT)', () => {
    const offset = getTimezoneOffset('America/New_York', new Date('2000-06-15T12:00:00Z'));
    expect(offset).toBe(-240); // UTC-4 = -240 minutes
  });

  it('should return negative offset for America/New_York in winter (EST)', () => {
    const offset = getTimezoneOffset('America/New_York', new Date('2000-01-15T12:00:00Z'));
    expect(offset).toBe(-300); // UTC-5 = -300 minutes
  });

  it('should return positive offset for Asia/Tokyo', () => {
    const offset = getTimezoneOffset('Asia/Tokyo', new Date('2000-06-15T12:00:00Z'));
    expect(offset).toBe(540); // UTC+9 = 540 minutes
  });

  it('should handle half-hour offset (Asia/Kolkata)', () => {
    const offset = getTimezoneOffset('Asia/Kolkata', new Date('2000-06-15T12:00:00Z'));
    expect(offset).toBe(330); // UTC+5:30 = 330 minutes
  });
});

describe('isValidTimezone', () => {
  it('should return true for valid IANA timezones', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    expect(isValidTimezone('Australia/Sydney')).toBe(true);
  });

  it('should return false for invalid timezone strings', () => {
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(isValidTimezone('Not_A_Zone')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });
});
