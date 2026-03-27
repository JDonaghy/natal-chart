export type HouseSystem = 'P' | 'W' | 'K'; // Placidus | Whole Sign | Koch

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
  | 'chiron';

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
  | 'semiSextile';

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