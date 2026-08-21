import type { Planet, ZodiacSign } from './types';
import { ZR_SIGN_RULER } from './zodiacal-releasing';

const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export interface AnnualProfection {
  age: number;        // completed years lived as of the target date
  house: number;       // 1-12, the whole-sign house activated for this year
  sign: ZodiacSign;    // the sign occupying that house, counted from the Ascendant
  timeLord: Planet;    // traditional ruler of that sign — the year's Time Lord
}

function normalizeLongitude(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/**
 * Completed years from birthDate to targetDate, counted by calendar
 * anniversary (not raw millisecond division, so leap years don't skew it).
 */
function ageInCompletedYears(birthDateUtc: Date, targetDateUtc: Date): number {
  let age = targetDateUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
  const birthdayReached =
    targetDateUtc.getUTCMonth() > birthDateUtc.getUTCMonth() ||
    (targetDateUtc.getUTCMonth() === birthDateUtc.getUTCMonth() &&
      targetDateUtc.getUTCDate() >= birthDateUtc.getUTCDate());
  if (!birthdayReached) age -= 1;
  return Math.max(0, age);
}

/**
 * Annual profections: a Hellenistic timing technique. The native's age in
 * completed years, taken mod 12, counts whole-sign houses forward from the
 * 1st (the Ascendant's own sign) to find the house "activated" for the
 * year running from this birthday to the next. That house's sign ruler is
 * the year's Time Lord.
 */
export function calculateAnnualProfection(
  birthDateUtc: Date,
  targetDateUtc: Date,
  ascendantLongitude: number,
): AnnualProfection {
  const age = ageInCompletedYears(birthDateUtc, targetDateUtc);
  const house = (age % 12) + 1;
  const ascSignIndex = Math.floor(normalizeLongitude(ascendantLongitude) / 30);
  const signIndex = (ascSignIndex + house - 1) % 12;
  const sign = ZODIAC_SIGNS[signIndex]!;
  return { age, house, sign, timeLord: ZR_SIGN_RULER[sign] };
}
