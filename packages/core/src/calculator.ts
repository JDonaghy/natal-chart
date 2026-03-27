import { BirthData, ChartResult, PlanetPosition, HouseCusp, Angles, Aspect, Planet, ZodiacSign, HouseSystem, AspectType } from './types';

// Planet mapping to Swiss Ephemeris constants
const PLANET_TO_SE: Record<Planet, number> = {
  sun: 0, // SE_SUN
  moon: 1, // SE_MOON
  mercury: 2, // SE_MERCURY
  venus: 3, // SE_VENUS
  mars: 4, // SE_MARS
  jupiter: 5, // SE_JUPITER
  saturn: 6, // SE_SATURN
  uranus: 7, // SE_URANUS
  neptune: 8, // SE_NEPTUNE
  pluto: 9, // SE_PLUTO
  northNode: 11, // SE_TRUE_NODE
  chiron: 15, // SE_CHIRON - may fail if asteroid ephemeris not available
};

const HOUSE_SYSTEM_TO_CHAR: Record<HouseSystem, string> = {
  P: 'P', // Placidus
  W: 'W', // Whole sign
  K: 'K', // Koch
};

const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Aspect definitions: angle, orb, type
const ASPECTS: { angle: number; orb: number; type: AspectType }[] = [
  { angle: 0, orb: 8, type: 'conjunction' },
  { angle: 180, orb: 8, type: 'opposition' },
  { angle: 120, orb: 6, type: 'trine' },
  { angle: 90, orb: 6, type: 'square' },
  { angle: 60, orb: 4, type: 'sextile' },
  { angle: 150, orb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, type: 'semiSextile' },
];

export async function calculateChart(data: BirthData): Promise<ChartResult> {
  console.log('calculateChart: starting calculation with data:', data);
  
  // Configure module options for browser environment
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isBrowser) {
    // Set up Emscripten module configuration before importing
    // @ts-ignore
    window.Module = {
      locateFile: (path: string, prefix: string) => {
        console.log('Module.locateFile called with:', path, prefix);
        if (path === 'swisseph.wasm' || path === 'swisseph.data') {
          // Use the public path
          const url = `/natal-chart/wasm/${path}`;
          console.log('Returning URL:', url);
          return url;
        }
        return prefix + path;
      },
    };
  }
  
  // Dynamic import to avoid loading in environments without wasm support
  const swissephModule = await import('swisseph-wasm');
  console.log('swissephModule:', swissephModule);
  const SwissEph = swissephModule.default;
  console.log('SwissEph:', SwissEph, typeof SwissEph);
  const sweph = new SwissEph();
  console.log('sweph instance:', sweph);
  
  // Initialize the library
  console.log('calculateChart: initializing SwissEph...');
  try {
    await sweph.initSwissEph();
   } catch (error) {
    console.error('Failed to initialize SwissEph:', error);
    throw new Error(`SwissEph initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Helper function to load ephemeris files in browser environment
  async function loadEphemerisFiles(sweph: any): Promise<boolean> {
    try {
      // Check if Emscripten FS is available
      const FS = (sweph as any).SweModule?.FS || (sweph as any).FS || (window as any).Module?.FS;
      if (!FS) {
        console.log('Emscripten FS not available, skipping ephemeris file loading');
        return false;
      }
      
      console.log('Attempting to load ephemeris files...');
      
      // We'll write files to '/ephemeris' directory in virtual filesystem
      const targetDir = 'ephemeris';
      const targetPath = `/${targetDir}/`;
      
      // Create directory if it doesn't exist
      try {
        FS.mkdir(targetDir);
        console.log('Created directory:', targetDir);
      } catch (mkdirError) {
        // Directory might already exist, that's OK
        console.log('Directory may already exist:', targetDir);
      }
      
      // List of ephemeris files we need
      const ephemerisFiles = ['seas_18.se1', 'sepl_18.se1'];
      let loadedAny = false;
      
      for (const filename of ephemerisFiles) {
        const filePath = `${targetPath}${filename}`;
        
        // Check if file already exists
        try {
          FS.stat(filePath);
          console.log(`File already exists: ${filePath}`);
          loadedAny = true;
          continue;
        } catch (statError) {
          // File doesn't exist, need to load it
        }
        
        // Fetch the file from server
        const response = await fetch(`/natal-chart/ephemeris/${filename}`);
        if (!response.ok) {
          console.warn(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Write to virtual filesystem
        FS.writeFile(filePath, uint8Array);
        console.log(`Loaded ${filename} (${uint8Array.length} bytes) to ${filePath}`);
        loadedAny = true;
      }
      
      if (loadedAny) {
        console.log('Ephemeris file loading complete, updating search path');
        // Update ephemeris path to include both default 'sweph' and our 'ephemeris' directory
        const newPath = 'sweph;ephemeris';
        try {
          sweph.set_ephe_path(newPath);
          console.log('Updated ephemeris path to:', newPath);
          return true;
        } catch (pathError) {
          console.warn('Failed to update ephemeris path:', pathError);
        }
      }
      
      return loadedAny;
    } catch (error) {
      console.warn('Failed to load ephemeris files:', error);
      return false;
    }
  }
  
  // Set ephemeris path to where ephemeris files are served
  // In browser: use default 'sweph' directory (from embedded .data file)
  // In Node: use absolute path to ephemeris directory in project root
  console.log('calculateChart: setting ephemeris path...');
  let ephePath = 'sweph'; // Default for browser (matches swisseph-wasm default)
  if (typeof process !== 'undefined' && process.cwd) {
    // Node environment - use absolute path
    const path = await import('path');
    ephePath = path.join(process.cwd(), '..', '..', 'ephemeris') + '/';
    console.log('Node environment detected, using absolute path:', ephePath);
  }
  try {
    // @ts-ignore - set_ephe_path exists at runtime
    sweph.set_ephe_path(ephePath);
    console.log('Ephemeris path set to:', ephePath);
   } catch (error) {
    console.warn('set_ephe_path failed (may be OK in browser):', error);
    // Continue anyway
  }
  
  // Try to load ephemeris files in browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    await loadEphemerisFiles(sweph);
  }
  
  // Convert date to Julian Day Number (UTC)
  const date = data.dateTimeUtc;
  console.log('JD calculation inputs:', {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    iso: date.toISOString(),
    time: date.getTime(),
    isValid: !isNaN(date.getTime()),
  });
  // Validate date is within Swiss Ephemeris supported range
  const year = date.getUTCFullYear();
  if (year < 1800 || year > 2100) {
    throw new Error(`Date year ${year} outside supported range (1800-2100). Check timezone conversion.`);
  }
  const jdResult = sweph.utc_to_jd(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // 1-12
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    1 // Gregorian calendar
  );
  
  const jd = jdResult.julianDayUT;
  
  // Calculate house cusps and angles
  // Use Moshier ephemeris for now (no external files required)
  // In production with ephemeris files, use SEFLG_SWIEPH
  const flags = sweph.SEFLG_MOSEPH | sweph.SEFLG_SPEED;
  
  const houseChar = HOUSE_SYSTEM_TO_CHAR[data.houseSystem];
  console.log('calculateChart: calculating houses with system', houseChar, 'lat', data.latitude, 'lon', data.longitude);
  // @ts-ignore - houses_ex exists at runtime
  const housesResult = sweph.houses_ex(jd, flags, data.latitude, data.longitude, houseChar);
  console.log('calculateChart: houses calculation successful, cusps length', housesResult.cusps.length);
  const cusps = housesResult.cusps; // Float64Array length 13, index 1-12 are house cusps
  const ascmc = housesResult.ascmc; // Float64Array length 10, index 0 = Ascendant, 1 = MC
  
  // Build houses array
  const houses: HouseCusp[] = [];
  for (let i = 1; i <= 12; i++) {
    const longitude = cusps[i];
    const { sign, degree, minute } = longitudeToSignAndDMS(longitude);
    houses.push({
      house: i,
      longitude,
      sign,
      degree,
      minute,
    });
  }
  
  // Build angles
  const ascendant = ascmc[0];
  const midheaven = ascmc[1];
  const descendant = (ascendant + 180) % 360;
  const imumCoeli = (midheaven + 180) % 360;
  const angles: Angles = {
    ascendant,
    midheaven,
    descendant,
    imumCoeli,
  };
  
  // Calculate planet positions
  const planets: PlanetPosition[] = [];
  const skippedPlanets: Planet[] = [];
  
  for (const [planetName, planetIndex] of Object.entries(PLANET_TO_SE)) {
    let resultArray: Float64Array;
    try {
      try {
        // Try Swiss Ephemeris first for better accuracy (requires ephemeris files)
        resultArray = sweph.calc_ut(jd, planetIndex, sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED);
        console.log(`Planet ${planetName} calculated with Swiss Ephemeris`);
       } catch (swissError) {
        // If Swiss Ephemeris fails, check if it's a file not found error
         const errorMsg = (swissError as Error).message;
        console.error(`Swiss Ephemeris error for ${planetName}: ${errorMsg} (path: ${ephePath})`);
        const isFileNotFound = errorMsg.includes('not found') || errorMsg.includes('seas_');
        
        if (isFileNotFound && planetName !== 'chiron') {
          // For non-Chiron planets, fall back to Moshier ephemeris (built-in, no files needed)
          resultArray = sweph.calc_ut(jd, planetIndex, sweph.SEFLG_MOSEPH | sweph.SEFLG_SPEED);
          console.log(`Planet ${planetName} calculated with Moshier ephemeris`);
        } else {
          // For Chiron or other errors, skip the planet
          throw swissError;
        }
      }
    } catch (error) {
      // Skip planets that fail (e.g., Chiron without asteroid ephemeris)
      skippedPlanets.push(planetName as Planet);
      if (planetName === 'chiron') {
        console.warn('Chiron calculation skipped: asteroid ephemeris files not available');
      } else {
        console.warn(`Failed to calculate ${planetName}:`, error);
      }
      continue;
    }
    
    // Swiss Ephemeris returns: longitude, latitude, distance,
    // speedLongitude, speedLatitude, speedDistance
    const longitude = resultArray[0]!;
    const latitude = resultArray[1]!;
    const distance = resultArray[2]!;
    const speedLongitude = resultArray[3]!;
    const _speedLatitude = resultArray[4]!;
    const _speedDistance = resultArray[5]!;
    void _speedLatitude;
    void _speedDistance;
    
    const retrograde = speedLongitude < 0;
    const { sign, degree, minute } = longitudeToSignAndDMS(longitude);
    
    // Determine house placement (1-12)
    let house = 1;
    for (let i = 1; i <= 12; i++) {
      const cuspStart = cusps[i]!;
      const cuspEnd = (cusps[i + 1] || cusps[1])!; // wrap around
      // Handle wrap across 360°
      if (cuspStart <= cuspEnd) {
        if (longitude >= cuspStart && longitude < cuspEnd) {
          house = i;
          break;
        }
      } else {
        if (longitude >= cuspStart || longitude < cuspEnd) {
          house = i;
          break;
        }
      }
    }
    
    planets.push({
      planet: planetName as Planet,
      longitude,
      latitude,
      distance,
      speed: speedLongitude,
      sign,
      degree,
      minute,
      house,
      retrograde,
    });
  }
  
  // Calculate aspects
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]!;
      const p2 = planets[j]!;
      
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;
      
      for (const aspectDef of ASPECTS) {
        if (Math.abs(diff - aspectDef.angle) <= aspectDef.orb) {
          const orb = Math.abs(diff - aspectDef.angle);
          const applying = (p1.speed - p2.speed) * (p1.longitude - p2.longitude) > 0;
          const exact = orb < 0.1;
          
          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            type: aspectDef.type,
            angle: diff,
            orb,
            applying,
            exact,
          });
          break; // Only one aspect per pair (closest?)
        }
      }
    }
  }
  
  console.log('calculateChart: calculation complete, planets:', planets.length, 'aspects:', aspects.length, 'skipped:', skippedPlanets.length);
  return {
    planets,
    houses,
    angles,
    aspects,
    skippedPlanets,
  };
}

// Helper functions
export function degreesToDMS(degrees: number): { degrees: number; minutes: number; seconds: number } {
  const d = Math.floor(degrees);
  const m = Math.floor((degrees - d) * 60);
  const s = (degrees - d - m / 60) * 3600;
  return { degrees: d, minutes: m, seconds: s };
}

export function longitudeToSignAndDMS(longitude: number): { sign: ZodiacSign; degree: number; minute: number } {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;
  const minute = (degreeInSign - Math.floor(degreeInSign)) * 60;
  
  const sign = ZODIAC_SIGNS[signIndex];
  if (!sign) {
    throw new Error(`Invalid sign index ${signIndex} for longitude ${longitude}`);
  }
  return {
    sign,
    degree: Math.floor(degreeInSign),
    minute: Math.floor(minute),
  };
}

export function longitudeToSign(longitude: number): { sign: ZodiacSign; degree: number } {
  const { sign, degree } = longitudeToSignAndDMS(longitude);
  return { sign, degree };
}