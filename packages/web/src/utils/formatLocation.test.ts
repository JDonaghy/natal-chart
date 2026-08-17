import { describe, it, expect } from 'vitest';
import { formatLocationDisplay } from './formatLocation';

// issue #32: show "USA" instead of "United States of America" wherever a
// stored location string is displayed, without rewriting the stored data.
describe('formatLocationDisplay', () => {
  it('abbreviates "United States of America" to "USA"', () => {
    expect(formatLocationDisplay('New York, NY, United States of America')).toBe(
      'New York, NY, USA',
    );
  });

  it('abbreviates the mock geocoder\'s "United States"', () => {
    expect(formatLocationDisplay('New York, NY, United States')).toBe('New York, NY, USA');
  });

  it('abbreviates a bare country name with no city segment', () => {
    expect(formatLocationDisplay('United States')).toBe('USA');
  });

  it('leaves other countries unchanged', () => {
    expect(formatLocationDisplay('London, United Kingdom')).toBe('London, United Kingdom');
  });

  it('passes through null/undefined/empty as an empty string', () => {
    expect(formatLocationDisplay(undefined)).toBe('');
    expect(formatLocationDisplay(null)).toBe('');
    expect(formatLocationDisplay('')).toBe('');
  });
});
