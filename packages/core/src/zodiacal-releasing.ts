import type {
  Planet,
  ZodiacSign,
  ZodiacElement,
  ZodiacModality,
  LotResult,
  ZRPeriod,
  ZRTimeline,
} from './types';

// --- Constants ---

const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const SIGN_RULER: Record<ZodiacSign, Planet> = {
  aries: 'mars',
  taurus: 'venus',
  gemini: 'mercury',
  cancer: 'moon',
  leo: 'sun',
  virgo: 'mercury',
  libra: 'venus',
  scorpio: 'mars',
  sagittarius: 'jupiter',
  capricorn: 'saturn',
  aquarius: 'saturn',
  pisces: 'jupiter',
};

// Minor years of the planetary ruler — period length in years for L1
const SIGN_YEARS: Record<ZodiacSign, number> = {
  aries: 15,
  taurus: 8,
  gemini: 20,
  cancer: 25,
  leo: 19,
  virgo: 20,
  libra: 8,
  scorpio: 15,
  sagittarius: 12,
  capricorn: 27,
  aquarius: 30,
  pisces: 12,
};

const SIGN_ELEMENT: Record<ZodiacSign, ZodiacElement> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
};

const SIGN_MODALITY: Record<ZodiacSign, ZodiacModality> = {
  aries: 'cardinal', taurus: 'fixed', gemini: 'mutable',
  cancer: 'cardinal', leo: 'fixed', virgo: 'mutable',
  libra: 'cardinal', scorpio: 'fixed', sagittarius: 'mutable',
  capricorn: 'cardinal', aquarius: 'fixed', pisces: 'mutable',
};

// Total cycle through all 12 signs = 211 years
// (15+8+20+25+19+20+8+15+12+27+30+12)
const TOTAL_CYCLE_YEARS = 211;

// Signs with periods > 17 years that trigger Loosing of the Bond
const LB_THRESHOLD_YEARS = 17;

// --- Lot Calculation ---

/**
 * Calculate the Lots of Fortune and Spirit from chart data.
 * Day birth: Fortune = ASC + Moon - Sun, Spirit = ASC + Sun - Moon
 * Night birth: Fortune = ASC + Sun - Moon, Spirit = ASC + Moon - Sun
 */
export function calculateLots(
  ascendant: number,
  sunLongitude: number,
  moonLongitude: number,
  descendant: number,
): LotResult {
  // Day/night: Sun is above horizon if it's between ASC and DSC going clockwise
  // More precisely: Sun is above horizon when it's in houses 7-12 (upper hemisphere)
  // Simple check: is Sun longitude between DSC and ASC (going through MC)?
  const isDayBirth = isSunAboveHorizon(sunLongitude, ascendant, descendant);

  let fortune: number;
  let spirit: number;

  if (isDayBirth) {
    fortune = normalizeLongitude(ascendant + moonLongitude - sunLongitude);
    spirit = normalizeLongitude(ascendant + sunLongitude - moonLongitude);
  } else {
    fortune = normalizeLongitude(ascendant + sunLongitude - moonLongitude);
    spirit = normalizeLongitude(ascendant + moonLongitude - sunLongitude);
  }

  return {
    fortune,
    spirit,
    fortuneSign: longitudeToSign(fortune),
    spiritSign: longitudeToSign(spirit),
    isDayBirth,
  };
}

// --- Period Generation ---

/**
 * Generate a full zodiacal releasing timeline.
 *
 * @param lotLongitude - ecliptic longitude of the Lot (0-360)
 * @param birthDate - native's birth date
 * @param maxLevels - how many hierarchical levels to compute (1-4, default 2)
 * @param maxAge - generate periods up to this age in years (default 120)
 */
export function calculateZodiacalReleasing(
  lotLongitude: number,
  birthDate: Date,
  maxLevels: number = 2,
  maxAge: number = 120,
): ZRTimeline {
  const lotSignIndex = Math.floor(normalizeLongitude(lotLongitude) / 30);
  const lotSign = ZODIAC_SIGNS[lotSignIndex]!;
  const lotModality = SIGN_MODALITY[lotSign];

  const endLimit = addYears(birthDate, maxAge);

  const periods = generatePeriodsForLevel(
    1,
    lotSignIndex,
    lotSignIndex,
    lotModality,
    birthDate,
    endLimit,
    maxLevels,
  );

  return {
    lot: 'fortune', // caller sets this
    lotLongitude,
    lotSign,
    lotSignIndex,
    birthDate,
    periods,
  };
}

/**
 * Recursively generate periods for a given level.
 *
 * Loosing of the Bond (LB): when a parent period whose sign has > 17 minor
 * years is being subdivided, after one full 12-sign descent the sub-period
 * sequence "jumps" to the sign opposite the parent and continues zodiacally
 * from there. Only one jump per parent. The post-jump period is marked
 * with `isLoosingOfBond = true`. L1 has no parent, so it never carries an
 * LB marker (the second descent at L1 just restarts at the lot sign).
 */
function generatePeriodsForLevel(
  level: number,
  startSignIndex: number,
  lotSignIndex: number,
  lotModality: ZodiacModality,
  windowStart: Date,
  windowEnd: Date,
  maxLevels: number,
  parentSignIndex?: number,
  parentBaseYears?: number,
): ZRPeriod[] {
  const periods: ZRPeriod[] = [];
  let currentDate = new Date(windowStart.getTime());
  let signIndex = startSignIndex;

  // Each level cycles through signs starting from startSignIndex.
  // The cycle continues past 12 signs when needed: at L1 the descent
  // restarts at the lot sign after one full 211-year cycle; at L2+ the
  // sub-periods must keep cycling to fill the parent period (e.g., a
  // 20-year Virgo L1 needs ~15 L2 sub-periods to fill 7200 days, since
  // one full L2 cycle is only 6330 days).
  // Duration at each level: L1 = years, L2 = L1/12, L3 = L2/12, L4 = L3/12
  // More precisely, each level uses the same sign-year table but scaled:
  // L1: years * 360 days (zodiacal year = 360 days)
  // L2: years * 360/12 days (= years * 30 days)
  // L3: years * 360/144 days (= years * 2.5 days)
  // L4: years * 360/1728 days
  const divisor = Math.pow(12, level - 1);

  // Safety cap: prevents runaway generation in pathological inputs.
  // Far exceeds any plausible real use (deepest case is L4 sub-periods
  // inside an Aquarius L1 ≈ ~155 entries).
  const MAX_ITERATIONS = 2000;

  const lbEligible =
    parentSignIndex !== undefined &&
    parentBaseYears !== undefined &&
    parentBaseYears > LB_THRESHOLD_YEARS;
  let lbTriggered = false;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (currentDate >= windowEnd) break;

    // After one full 12-sign descent, if the parent qualifies, jump to the
    // sign opposite the parent. This is the Loosing of the Bond.
    if (i === 12 && lbEligible && !lbTriggered) {
      signIndex = (parentSignIndex! + 6) % 12;
      lbTriggered = true;
    }

    const sign = ZODIAC_SIGNS[signIndex]!;
    const baseYears = SIGN_YEARS[sign];
    const durationDays = (baseYears * 360) / divisor;
    const endDate = new Date(currentDate.getTime() + durationDays * 86400000);
    const clampedEnd = endDate > windowEnd ? windowEnd : endDate;

    // Peak periods: sign is angular relative to the Lot sign
    // Angular = 1st (0), 4th (3), 7th (6), 10th (9) sign from the Lot
    const signDistance = ((signIndex - lotSignIndex) % 12 + 12) % 12;
    const isPeak = [0, 3, 6, 9].includes(signDistance);

    // Mark this period as the post-jump LB period.
    const isLoosingOfBond = lbTriggered && i === 12;

    // Modality match (for L2+)
    const modalityMatch = level > 1 && SIGN_MODALITY[sign] === lotModality;

    const period: ZRPeriod = {
      sign,
      signIndex,
      ruler: SIGN_RULER[sign],
      startDate: new Date(currentDate.getTime()),
      endDate: clampedEnd,
      durationDays,
      level,
      isPeak,
      isLoosingOfBond,
      element: SIGN_ELEMENT[sign],
      modality: SIGN_MODALITY[sign],
      modalityMatch,
    };
    if (isLoosingOfBond) {
      // startDate IS the LB moment; loosingSign is the post-jump destination.
      period.loosingDate = new Date(currentDate.getTime());
      period.loosingSign = sign;
    }

    // Generate sub-periods if needed
    if (level < maxLevels) {
      period.subPeriods = generatePeriodsForLevel(
        level + 1,
        signIndex,
        lotSignIndex,
        lotModality,
        currentDate,
        clampedEnd,
        maxLevels,
        signIndex,
        baseYears,
      );
    }

    periods.push(period);
    currentDate = endDate;
    signIndex = (signIndex + 1) % 12;
  }

  return periods;
}

// --- Helper Functions ---

function normalizeLongitude(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function longitudeToSign(longitude: number): ZodiacSign {
  const index = Math.floor(normalizeLongitude(longitude) / 30);
  return ZODIAC_SIGNS[index]!;
}

function isSunAboveHorizon(
  sunLon: number,
  ascLon: number,
  dscLon: number,
): boolean {
  // Sun is above horizon when it's in the upper hemisphere
  // Upper hemisphere = from DSC clockwise to ASC (going through MC)
  // In ecliptic terms: Sun is between DSC and ASC going forward
  const sun = normalizeLongitude(sunLon);
  const asc = normalizeLongitude(ascLon);
  const dsc = normalizeLongitude(dscLon);

  // The upper hemisphere spans from DSC to ASC going counter-ecliptic (forward in houses)
  // Check if sun is in the arc from DSC -> ... -> ASC (the shorter 180° arc through MC)
  if (dsc < asc) {
    return sun >= dsc && sun < asc;
  } else {
    return sun >= dsc || sun < asc;
  }
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Find the currently active period at a given date across all levels.
 * Returns an array of periods from L1 to the deepest available level.
 */
export function findActivePeriodsAtDate(
  timeline: ZRTimeline,
  targetDate: Date,
): ZRPeriod[] {
  const result: ZRPeriod[] = [];
  const target = targetDate.getTime();

  let periods = timeline.periods;
  while (periods.length > 0) {
    const active = periods.find(
      p => target >= p.startDate.getTime() && target < p.endDate.getTime(),
    );
    if (!active) break;
    result.push(active);
    periods = active.subPeriods || [];
  }

  return result;
}

// Re-export constants for use in UI
export const ZR_SIGN_YEARS = SIGN_YEARS;
export const ZR_SIGN_RULER = SIGN_RULER;
export const ZR_SIGN_ELEMENT = SIGN_ELEMENT;
export const ZR_SIGN_MODALITY = SIGN_MODALITY;
export const ZR_TOTAL_CYCLE_YEARS = TOTAL_CYCLE_YEARS;
