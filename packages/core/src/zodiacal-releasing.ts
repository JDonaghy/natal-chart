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
  capricorn: 30,
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

// Total cycle through all 12 signs = 214 years
// (15+8+20+25+19+20+8+15+12+30+30+12)
const TOTAL_CYCLE_YEARS = 214;

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
 */
function generatePeriodsForLevel(
  level: number,
  startSignIndex: number,
  lotSignIndex: number,
  lotModality: ZodiacModality,
  windowStart: Date,
  windowEnd: Date,
  maxLevels: number,
): ZRPeriod[] {
  const periods: ZRPeriod[] = [];
  let currentDate = new Date(windowStart.getTime());
  let signIndex = startSignIndex;

  // Each level cycles through all 12 signs starting from startSignIndex
  // Duration at each level: L1 = years, L2 = L1/12, L3 = L2/12, L4 = L3/12
  // More precisely, each level uses the same sign-year table but scaled:
  // L1: years * 365.25 days
  // L2: years * 365.25/12 days (months)
  // L3: years * 365.25/144 days (weeks-ish)
  // L4: years * 365.25/1728 days (days-ish)
  const divisor = Math.pow(12, level - 1);

  for (let i = 0; i < 12; i++) {
    if (currentDate >= windowEnd) break;

    const sign = ZODIAC_SIGNS[signIndex]!;
    const baseYears = SIGN_YEARS[sign];
    const durationDays = (baseYears * 365.25) / divisor;
    const endDate = new Date(currentDate.getTime() + durationDays * 86400000);
    const clampedEnd = endDate > windowEnd ? windowEnd : endDate;

    // Peak periods: sign is angular relative to the Lot sign
    // Angular = 1st (0), 4th (3), 7th (6), 10th (9) sign from the Lot
    const signDistance = ((signIndex - lotSignIndex) % 12 + 12) % 12;
    const isPeak = [0, 3, 6, 9].includes(signDistance);

    // Loosing of the Bond
    let isLoosingOfBond = false;
    let loosingDate: Date | undefined;
    let loosingSign: ZodiacSign | undefined;

    if (baseYears > LB_THRESHOLD_YEARS) {
      // LB occurs at the point where the remaining time would equal the time
      // spent in the opposite sign. The jump is to the sign opposite (+ 6 signs).
      // LB happens when we've traversed enough sub-periods to reach the opposite sign.
      // Simplified: LB at the midpoint when the period exceeds 17 years (scaled).
      // More accurately: LB occurs after traversing signs up to the 8th sign from
      // the period's sign in the sub-period sequence. At that point the sequence
      // jumps to the opposite sign for the remainder.
      // For simplicity and correctness with standard implementations:
      // LB triggers at the sub-period that lands on the sign opposite to the
      // releasing sign. We mark the period and compute the date.
      const oppositeIndex = (signIndex + 6) % 12;
      loosingSign = ZODIAC_SIGNS[oppositeIndex]!;
      isLoosingOfBond = true;

      // Calculate when LB occurs: sum sub-period durations until we reach
      // the sign opposite to the period's sign in the sub-period cycle
      const subDivisor = divisor * 12;
      let elapsed = 0;
      let subIdx = signIndex;
      for (let s = 0; s < 12; s++) {
        const subSign = ZODIAC_SIGNS[subIdx]!;
        const subDays = (SIGN_YEARS[subSign] * 365.25) / subDivisor;
        if (subIdx === oppositeIndex) {
          // LB triggers at the start of this sub-period
          loosingDate = new Date(currentDate.getTime() + elapsed * 86400000);
          break;
        }
        elapsed += subDays;
        subIdx = (subIdx + 1) % 12;
      }
    }

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
    if (loosingDate) {
      period.loosingDate = loosingDate;
    }
    if (loosingSign) {
      period.loosingSign = loosingSign;
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
