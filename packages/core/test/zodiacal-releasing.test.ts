import { describe, it, expect } from 'vitest';
import {
  calculateLots,
  calculateZodiacalReleasing,
  findActivePeriodsAtDate,
} from '../src/zodiacal-releasing';

describe('calculateLots', () => {
  it('should calculate Lot of Fortune and Spirit for a day birth', () => {
    // Day birth: Sun above horizon
    // ASC = 15° Leo (135°), Sun = 10° Aries (10°), Moon = 20° Cancer (110°)
    // DSC = 15° Aquarius (315°)
    // Sun at 10° is between DSC (315°) and ASC (135°) going forward → above horizon → day
    const result = calculateLots(135, 10, 110, 315);

    expect(result.isDayBirth).toBe(true);

    // Day Fortune = ASC + Moon - Sun = 135 + 110 - 10 = 235°
    expect(result.fortune).toBeCloseTo(235, 0);
    expect(result.fortuneSign).toBe('scorpio'); // 235° is in Scorpio (210-240)

    // Day Spirit = ASC + Sun - Moon = 135 + 10 - 110 = 35°
    expect(result.spirit).toBeCloseTo(35, 0);
    expect(result.spiritSign).toBe('taurus'); // 35° is in Taurus (30-60)
  });

  it('should calculate Lot of Fortune and Spirit for a night birth', () => {
    // Night birth: Sun below horizon
    // ASC = 15° Leo (135°), Sun = 200° (Libra, below horizon), Moon = 80° (Gemini)
    // DSC = 315°
    // Sun at 200° is NOT between DSC (315°) and ASC (135°) going forward → below horizon → night
    const result = calculateLots(135, 200, 80, 315);

    expect(result.isDayBirth).toBe(false);

    // Night Fortune = ASC + Sun - Moon = 135 + 200 - 80 = 255°
    expect(result.fortune).toBeCloseTo(255, 0);
    expect(result.fortuneSign).toBe('sagittarius'); // 255° is in Sagittarius (240-270)

    // Night Spirit = ASC + Moon - Sun = 135 + 80 - 200 = 15°
    expect(result.spirit).toBeCloseTo(15, 0);
    expect(result.spiritSign).toBe('aries'); // 15° is in Aries (0-30)
  });

  it('should normalize negative lot values', () => {
    // Ensure negative results are properly normalized
    // ASC = 10°, Sun = 300°, Moon = 20°, DSC = 190°
    const result = calculateLots(10, 300, 20, 190);
    expect(result.fortune).toBeGreaterThanOrEqual(0);
    expect(result.fortune).toBeLessThan(360);
    expect(result.spirit).toBeGreaterThanOrEqual(0);
    expect(result.spirit).toBeLessThan(360);
  });
});

describe('calculateZodiacalReleasing', () => {
  const birthDate = new Date('1990-06-15T12:00:00Z');

  it('should generate L1 periods starting from the Lot sign', () => {
    // Lot at 0° Aries (sign index 0), maxAge 220 to cover full 12-sign cycle
    const timeline = calculateZodiacalReleasing(0, birthDate, 1, 220);

    expect(timeline.lotSign).toBe('aries');
    expect(timeline.lotSignIndex).toBe(0);
    expect(timeline.periods).toHaveLength(12);
  });

  it('should start from the Lot sign', () => {
    // Lot at 45° → Taurus (sign index 1), maxAge 220
    const timeline = calculateZodiacalReleasing(45, birthDate, 1, 220);

    expect(timeline.lotSign).toBe('taurus');
    expect(timeline.periods[0]!.sign).toBe('taurus');
    expect(timeline.periods[1]!.sign).toBe('gemini');
    expect(timeline.periods[11]!.sign).toBe('aries'); // wraps around
  });

  it('should assign correct durations based on sign rulers', () => {
    // Lot at 0° Aries → first period is Aries (Mars = 15 years)
    const timeline = calculateZodiacalReleasing(0, birthDate, 1);

    const ariesPeriod = timeline.periods[0]!;
    expect(ariesPeriod.sign).toBe('aries');
    expect(ariesPeriod.ruler).toBe('mars');
    expect(ariesPeriod.durationDays).toBeCloseTo(15 * 360, 0);

    // Second period: Taurus (Venus = 8 years)
    const taurusPeriod = timeline.periods[1]!;
    expect(taurusPeriod.sign).toBe('taurus');
    expect(taurusPeriod.ruler).toBe('venus');
    expect(taurusPeriod.durationDays).toBeCloseTo(8 * 360, 0);
  });

  it('should mark angular signs as peak periods', () => {
    // Lot at 0° Aries (index 0), maxAge 220
    // Angular: 0 (Aries), 3 (Cancer), 6 (Libra), 9 (Capricorn)
    const timeline = calculateZodiacalReleasing(0, birthDate, 1, 220);

    expect(timeline.periods[0]!.isPeak).toBe(true);  // Aries (0)
    expect(timeline.periods[1]!.isPeak).toBe(false); // Taurus (1)
    expect(timeline.periods[3]!.isPeak).toBe(true);  // Cancer (3)
    expect(timeline.periods[6]!.isPeak).toBe(true);  // Libra (6)
    expect(timeline.periods[9]!.isPeak).toBe(true);  // Capricorn (9)
  });

  it('should mark Loosing of the Bond for long periods', () => {
    // Lot at 0° Aries, maxAge 220
    // Aries = 15y (no LB), Cancer = 25y (LB), Leo = 19y (LB), etc.
    const timeline = calculateZodiacalReleasing(0, birthDate, 1, 220);

    // Aries (15y) — no LB
    expect(timeline.periods[0]!.isLoosingOfBond).toBe(false);

    // Cancer (25y) — LB
    expect(timeline.periods[3]!.isLoosingOfBond).toBe(true);
    expect(timeline.periods[3]!.loosingSign).toBe('capricorn'); // opposite of Cancer

    // Leo (19y) — LB
    expect(timeline.periods[4]!.isLoosingOfBond).toBe(true);
    expect(timeline.periods[4]!.loosingSign).toBe('aquarius'); // opposite of Leo
  });

  it('should generate sub-periods when maxLevels > 1', () => {
    const timeline = calculateZodiacalReleasing(0, birthDate, 2);

    // First L1 period should have L2 sub-periods
    const firstPeriod = timeline.periods[0]!;
    expect(firstPeriod.subPeriods).toBeDefined();
    expect(firstPeriod.subPeriods!.length).toBeGreaterThan(0);

    // L2 sub-periods should start from the same sign as the L1 period
    expect(firstPeriod.subPeriods![0]!.sign).toBe(firstPeriod.sign);
    expect(firstPeriod.subPeriods![0]!.level).toBe(2);
  });

  it('should have sequential dates without gaps', () => {
    const timeline = calculateZodiacalReleasing(0, birthDate, 1);

    for (let i = 0; i < timeline.periods.length - 1; i++) {
      const current = timeline.periods[i]!;
      const next = timeline.periods[i + 1]!;
      // End of current should equal start of next
      expect(current.endDate.getTime()).toBeCloseTo(next.startDate.getTime(), -2);
    }
  });

  it('should start the first period at the birth date', () => {
    const timeline = calculateZodiacalReleasing(0, birthDate, 1);
    expect(timeline.periods[0]!.startDate.getTime()).toBe(birthDate.getTime());
  });
});

describe('findActivePeriodsAtDate', () => {
  const birthDate = new Date('1990-06-15T12:00:00Z');

  it('should find the active L1 and L2 period at a given date', () => {
    const timeline = calculateZodiacalReleasing(0, birthDate, 2);

    // Check a date that's within the first L1 period
    const testDate = new Date('1995-01-01T00:00:00Z');
    const active = findActivePeriodsAtDate(timeline, testDate);

    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active[0]!.level).toBe(1);
    expect(active[0]!.sign).toBe('aries'); // First 15 years

    if (active.length >= 2) {
      expect(active[1]!.level).toBe(2);
    }
  });

  it('should return empty array for dates before birth', () => {
    const timeline = calculateZodiacalReleasing(0, birthDate, 1);
    const active = findActivePeriodsAtDate(timeline, new Date('1980-01-01'));
    expect(active).toHaveLength(0);
  });
});
