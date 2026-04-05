export type HouseSystem = 'P' | 'W'; // Placidus | Whole Sign

export interface BirthData {
  dateTimeUtc: Date;
  latitude: number;
  longitude: number;
  houseSystem: HouseSystem;
}

export type Planet =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'northNode'
  | 'chiron'
  | 'lilith'
  | 'fortune'
  | 'spirit'
  | 'vertex';

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface PlanetPosition {
  planet: Planet;
  longitude: number;
  latitude: number;
  declination: number;
  distance: number;
  speed: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
}

export interface HouseCusp {
  house: number;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
}

export interface Angles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
}

export type AspectType =
  | 'conjunction'
  | 'opposition'
  | 'trine'
  | 'square'
  | 'sextile'
  | 'quincunx'
  | 'semiSextile'
  | 'parallel'
  | 'contraparallel';

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  angle: number;
  orb: number;
  applying: boolean;
  exact: boolean;
}

export interface ChartResult {
  planets: PlanetPosition[];
  houses: HouseCusp[];
  angles: Angles;
  aspects: Aspect[];
  skippedPlanets?: Planet[];
}

export interface TransitAspect {
  natalPlanet: Planet;
  transitPlanet: Planet;
  type: AspectType;
  angle: number;
  orb: number;
  applying: boolean;
  exact: boolean;
}

export interface TransitResult {
  planets: PlanetPosition[];
  aspects: TransitAspect[];
  dateTimeUtc: Date;
  houses?: HouseCusp[];
  angles?: Angles;
  skippedPlanets?: Planet[];
}

// --- Zodiacal Releasing Types ---

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';
export type ZodiacModality = 'cardinal' | 'fixed' | 'mutable';

export interface LotResult {
  fortune: number;        // longitude 0-360
  spirit: number;         // longitude 0-360
  fortuneSign: ZodiacSign;
  spiritSign: ZodiacSign;
  isDayBirth: boolean;
}

export interface ZRPeriod {
  sign: ZodiacSign;
  signIndex: number;      // 0-11
  ruler: Planet;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  level: number;          // 1-4
  isPeak: boolean;        // angular to the Lot (1st, 4th, 7th, 10th sign from Lot)
  isLoosingOfBond: boolean;
  loosingDate?: Date;     // date when LB occurs within this period
  loosingSign?: ZodiacSign; // sign jumped to after LB
  element: ZodiacElement;
  modality: ZodiacModality;
  modalityMatch: boolean; // L2+ only: modality matches the Lot sign
  subPeriods?: ZRPeriod[];
}

export interface ZRTimeline {
  lot: 'fortune' | 'spirit';
  lotLongitude: number;
  lotSign: ZodiacSign;
  lotSignIndex: number;
  birthDate: Date;
  periods: ZRPeriod[];
}