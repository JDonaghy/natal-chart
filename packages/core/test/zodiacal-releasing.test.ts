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
    // Lot at 0° Aries (sign index 0), maxAge 220 — covers one full 211-year
    // cycle plus a partial 13th period (descent restarts at the lot sign).
    const timeline = calculateZodiacalReleasing(0, birthDate, 1, 220);

    expect(timeline.lotSign).toBe('aries');
    expect(timeline.lotSignIndex).toBe(0);
    expect(timeline.periods).toHaveLength(13);
    expect(timeline.periods[12]!.sign).toBe('aries'); // second descent
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

  it('should never mark L1 periods as Loosing of the Bond', () => {
    // LB is a property of how a parent's sub-periods unfold — L1 has no
    // parent, so no LB marker at L1, even for long-years signs.
    const timeline = calculateZodiacalReleasing(0, birthDate, 1, 220);

    for (const period of timeline.periods) {
      expect(period.isLoosingOfBond).toBe(false);
    }
  });

  it('should mark exactly one LB jump per long-years parent at the sub-period level', () => {
    // Lot at 0° Aries. First L1 is Aries (15y, no LB). 4th L1 is Cancer
    // (25y > 17 → LB at L2). L2 descent inside Cancer starts at Cancer,
    // cycles all 12 signs, then jumps to Capricorn (opposite Cancer).
    const timeline = calculateZodiacalReleasing(0, birthDate, 2, 220);

    // Aries L1 (15y, no LB) — none of its L2 should be marked LB
    const ariesL1 = timeline.periods[0]!;
    expect(ariesL1.sign).toBe('aries');
    for (const sub of ariesL1.subPeriods!) {
      expect(sub.isLoosingOfBond).toBe(false);
    }

    // Cancer L1 (25y, LB) — exactly one LB at L2 (the post-jump Capricorn)
    const cancerL1 = timeline.periods[3]!;
    expect(cancerL1.sign).toBe('cancer');
    const cancerL2 = cancerL1.subPeriods!;
    const lbMarkers = cancerL2.filter(p => p.isLoosingOfBond);
    expect(lbMarkers).toHaveLength(1);
    expect(lbMarkers[0]!.sign).toBe('capricorn'); // opposite of Cancer
    // First 12 sub-periods cycle Cancer → Gemini; the LB jump period is #13
    expect(cancerL2[12]!.sign).toBe('capricorn');
    expect(cancerL2[12]!.isLoosingOfBond).toBe(true);
    // After the jump, descent continues zodiacally from Capricorn
    expect(cancerL2[13]!.sign).toBe('aquarius');
    expect(cancerL2[13]!.isLoosingOfBond).toBe(false);
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

  it('should generate more than 12 L2 sub-periods for long L1 periods with an LB jump', () => {
    // Lot at 150° → Virgo (20-year L1 = 7200 days). One full L2 cycle is
    // 211*30 = 6330 days, so Virgo L1 must continue past 12 sub-periods.
    // Virgo > 17 minor years, so after entry 12 the descent jumps to Pisces
    // (opposite Virgo) for the Loosing of the Bond, then continues
    // zodiacally. Total: 15 entries (Pisces, Aries, Taurus truncated).
    const timeline = calculateZodiacalReleasing(150, birthDate, 2);
    const virgoL1 = timeline.periods[0]!;
    expect(virgoL1.sign).toBe('virgo');

    const l2 = virgoL1.subPeriods!;
    expect(l2).toHaveLength(15);
    expect(l2[12]!.sign).toBe('pisces'); // LB jump to opposite-of-parent
    expect(l2[12]!.isLoosingOfBond).toBe(true);
    expect(l2[13]!.sign).toBe('aries');
    expect(l2[14]!.sign).toBe('taurus');

    // Sub-periods together must cover the entire parent period
    expect(l2[0]!.startDate.getTime()).toBe(virgoL1.startDate.getTime());
    expect(l2[l2.length - 1]!.endDate.getTime()).toBe(virgoL1.endDate.getTime());
  });

  it('should produce 21 L4 entries with one LB inside an Aquarius L3', () => {
    // Aquarius L3 is 30 * 360 / 144 = 75 days, long enough to need a second
    // L4 cycle. Aquarius minor years (30) > 17, so the L4 descent jumps to
    // Leo (opposite Aquarius) after entry 12, yielding exactly one LB and
    // 21 total L4 entries (the 21st truncated).
    const timeline = calculateZodiacalReleasing(300, birthDate, 4, 120);

    // Walk down to an L3 whose sign is Aquarius. Lot at 300° → Aquarius L1,
    // Aquarius L2 (first sub-period), Aquarius L3 (first sub-sub-period).
    const aqL1 = timeline.periods[0]!;
    expect(aqL1.sign).toBe('aquarius');
    const aqL2 = aqL1.subPeriods![0]!;
    expect(aqL2.sign).toBe('aquarius');
    const aqL3 = aqL2.subPeriods![0]!;
    expect(aqL3.sign).toBe('aquarius');

    const l4 = aqL3.subPeriods!;
    expect(l4).toHaveLength(21);

    // First 12 entries cycle Aquarius → Capricorn
    expect(l4[0]!.sign).toBe('aquarius');
    expect(l4[11]!.sign).toBe('capricorn');

    // Entry 13: LB jump from Capricorn to Leo (opposite of Aquarius parent)
    expect(l4[12]!.sign).toBe('leo');
    expect(l4[12]!.isLoosingOfBond).toBe(true);
    expect(l4[12]!.loosingSign).toBe('leo');

    // Exactly one LB total
    expect(l4.filter(p => p.isLoosingOfBond)).toHaveLength(1);

    // After the jump, descent continues zodiacally from Leo
    expect(l4[13]!.sign).toBe('virgo');
    expect(l4[14]!.sign).toBe('libra');

    // Sub-periods cover the parent exactly
    expect(l4[0]!.startDate.getTime()).toBe(aqL3.startDate.getTime());
    expect(l4[l4.length - 1]!.endDate.getTime()).toBe(aqL3.endDate.getTime());
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
