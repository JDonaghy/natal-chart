import { BirthData, ChartResult, PlanetPosition, HouseCusp, Angles, Aspect, Planet, ZodiacSign, HouseSystem, AspectType, TransitResult, TransitAspect } from './types';

interface EmscriptenFS {
  mkdir: (path: string) => void;
  stat: (path: string) => unknown;
  writeFile: (path: string, data: Uint8Array) => void;
}

// Planet mapping to Swiss Ephemeris constants
// Planets calculated via Swiss Ephemeris calc_ut
// (fortune and vertex are derived from other data, not from calc_ut)
const PLANET_TO_SE: Partial<Record<Planet, number>> = {
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
  lilith: 12, // SE_MEAN_APOG (Mean Black Moon Lilith)
};

const HOUSE_SYSTEM_TO_CHAR: Record<HouseSystem, string> = {
  P: 'P', // Placidus
  W: 'W', // Whole sign
};

const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Aspect definitions: angle, orb (default), luminaryOrb (when Sun or Moon involved), type
const ASPECTS: { angle: number; orb: number; luminaryOrb: number; type: AspectType }[] = [
  { angle: 0, orb: 8, luminaryOrb: 10, type: 'conjunction' },
  { angle: 180, orb: 8, luminaryOrb: 10, type: 'opposition' },
  { angle: 120, orb: 6, luminaryOrb: 10, type: 'trine' },
  { angle: 90, orb: 6, luminaryOrb: 10, type: 'square' },
  { angle: 60, orb: 4, luminaryOrb: 6, type: 'sextile' },
  { angle: 150, orb: 3, luminaryOrb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, luminaryOrb: 2, type: 'semiSextile' },
];

const LUMINARIES: Set<Planet> = new Set(['sun', 'moon']);

// Obliquity of the ecliptic (J2000.0 epoch, ~23.44°)
const OBLIQUITY_DEG = 23.4393;
const OBLIQUITY_RAD = OBLIQUITY_DEG * Math.PI / 180;

/** Calculate declination from ecliptic longitude and latitude */
function calcDeclination(longitude: number, latitude: number): number {
  const lonRad = longitude * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const decRad = Math.asin(
    Math.sin(latRad) * Math.cos(OBLIQUITY_RAD) +
    Math.cos(latRad) * Math.sin(OBLIQUITY_RAD) * Math.sin(lonRad)
  );
  return decRad * 180 / Math.PI;
}

// Parallel/contraparallel orb (declination-based, 1° matches Astro-Seek default)
const PARALLEL_ORB = 1.0;

export async function calculateChart(data: BirthData): Promise<ChartResult> {
  console.log('calculateChart: starting calculation with data:', data);
  
  // Configure module options for browser environment
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isBrowser) {
    // Set up Emscripten module configuration before importing
    // @ts-expect-error: window.Module assignment for Emscripten
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
  type SwissEphInstance = InstanceType<typeof SwissEph> & {
    set_ephe_path: (path: string) => void;
    houses_ex: (jd: number, flags: number, lat: number, lng: number, hsys: string) => {
      cusps: Float64Array;
      ascmc: Float64Array;
    };
    SweModule?: { FS?: EmscriptenFS };
    FS?: EmscriptenFS;
  };
  const sweph: SwissEphInstance = new SwissEph() as SwissEphInstance;
  console.log('sweph instance:', sweph);
  
  // Initialize the library
  console.log('calculateChart: initializing SwissEph...');
   try {
     await sweph.initSwissEph();
    } catch (error: unknown) {
     console.error('Failed to initialize SwissEph:', error);
     throw new Error(`SwissEph initialization failed: ${error instanceof Error ? error.message : String(error)}`);
   }
  
  // Helper function to load ephemeris files in browser environment
  async function loadEphemerisFiles(sweph: SwissEphInstance): Promise<boolean> {
    try {
      // Check if Emscripten FS is available
      const windowModule = typeof window !== 'undefined' ? (window as unknown as { Module?: { FS?: EmscriptenFS } }).Module : undefined;
      const FS = sweph.SweModule?.FS || sweph.FS || windowModule?.FS;
      if (!FS) {
        console.log('Emscripten FS not available, skipping ephemeris file loading');
        return false;
      }
      
      console.log('Attempting to load ephemeris files...');
      
      // Use absolute path in Emscripten virtual FS to avoid CWD ambiguity
      const targetPath = '/ephemeris/';

      // Create directory at absolute path if it doesn't exist
      try {
        FS.mkdir('/ephemeris');
        console.log('Created directory: /ephemeris');
      } catch (_mkdirError) {
        // Directory might already exist, that's OK
        console.log('Directory /ephemeris may already exist');
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
        } catch (_statError) {
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
        // Use absolute path so Swiss Ephemeris finds files regardless of CWD
        const newPath = '/ephemeris';
        try {
            sweph.set_ephe_path(newPath);
          console.log('Updated ephemeris path to:', newPath);
          return true;
        } catch (pathError: unknown) {
          console.warn('Failed to update ephemeris path:', pathError);
        }
      }
      
      return loadedAny;
     } catch (error: unknown) {
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
    sweph.set_ephe_path(ephePath);
    console.log('Ephemeris path set to:', ephePath);
    } catch (error: unknown) {
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
  const housesResult = sweph.houses_ex(jd, flags, data.latitude, data.longitude, houseChar);
  console.log('calculateChart: houses calculation successful, cusps length', housesResult.cusps.length);
  const cusps = housesResult.cusps; // Float64Array length 13, index 1-12 are house cusps
  const ascmc = housesResult.ascmc; // Float64Array length 10, index 0 = Ascendant, 1 = MC
  
  // Debug: log cusps
  console.log('House cusps (index 1-12):');
  for (let i = 1; i <= 12; i++) {
    console.log(`  House ${i}: ${cusps[i]}°`);
  }
  console.log('Ascendant:', ascmc[0], 'MC:', ascmc[1]);
  
  // Build houses array
  const houses: HouseCusp[] = [];
  for (let i = 1; i <= 12; i++) {
    const longitude = cusps[i] ?? 0;
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
  const ascendant = ascmc[0] ?? 0;
  const midheaven = ascmc[1] ?? 0;
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
        } catch (swissError: unknown) {
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
     } catch (error: unknown) {
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
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    if (data.houseSystem === 'W') {
      // Whole Sign: house = sign offset from ascending sign + 1
      const ascSign = Math.floor(ascendant / 30);
      const planetSign = Math.floor(normalizedLongitude / 30);
      house = ((planetSign - ascSign + 12) % 12) + 1;
    } else {
      for (let i = 1; i <= 12; i++) {
        const cuspStart = ((cusps[i]! % 360) + 360) % 360;
        const nextCusp = i < 12 ? cusps[i + 1] : cusps[1];
        const cuspEnd = ((nextCusp! % 360) + 360) % 360;
        // Handle wrap across 360°
        if (cuspStart <= cuspEnd) {
          if (normalizedLongitude >= cuspStart && normalizedLongitude < cuspEnd) {
            house = i;
            break;
          }
        } else {
          if (normalizedLongitude >= cuspStart || normalizedLongitude < cuspEnd) {
            house = i;
            break;
          }
        }
      }
    }
    
    if (planetName === 'sun') {
      console.log(`Sun house calculation details:`);
      console.log(`  Normalized longitude: ${normalizedLongitude}°`);
      for (let i = 1; i <= 12; i++) {
        const cuspStart = ((cusps[i]! % 360) + 360) % 360;
        const nextCusp = i < 12 ? cusps[i + 1] : cusps[1];
        const cuspEnd = ((nextCusp! % 360) + 360) % 360;
        console.log(`  House ${i}: cusp ${cuspStart.toFixed(2)}° to ${cuspEnd.toFixed(2)}°`);
      }
    }
    
    console.log(`Planet ${planetName}: longitude ${longitude}°, house ${house}, cusp range check complete`);

    const declination = calcDeclination(longitude, latitude);
    planets.push({
      planet: planetName as Planet,
      longitude,
      latitude,
      declination,
      distance,
      speed: speedLongitude,
      sign,
      degree,
      minute,
      house,
      retrograde,
    });
  }

  // Add derived points: Part of Fortune and Vertex
  const sunPos = planets.find(p => p.planet === 'sun');
  const moonPos = planets.find(p => p.planet === 'moon');
  if (sunPos && moonPos) {
    // Part of Fortune: Day = ASC + Moon - Sun, Night = ASC + Sun - Moon
    const isSunAboveHorizon = (() => {
      const sunLon = ((sunPos.longitude % 360) + 360) % 360;
      const ascLon = ((ascendant % 360) + 360) % 360;
      const descLon = ((descendant % 360) + 360) % 360;
      if (ascLon < descLon) {
        return sunLon >= descLon || sunLon < ascLon;
      }
      return sunLon >= descLon && sunLon < ascLon;
    })();
    const fortuneLon = isSunAboveHorizon
      ? ((ascendant + moonPos.longitude - sunPos.longitude) % 360 + 360) % 360
      : ((ascendant + sunPos.longitude - moonPos.longitude) % 360 + 360) % 360;
    const fortuneSignDMS = longitudeToSignAndDMS(fortuneLon);
    planets.push({
      planet: 'fortune',
      longitude: fortuneLon,
      latitude: 0,
      declination: calcDeclination(fortuneLon, 0),
      distance: 0,
      speed: 0,
      sign: fortuneSignDMS.sign,
      degree: fortuneSignDMS.degree,
      minute: fortuneSignDMS.minute,
      house: findHouse(fortuneLon, cusps, data.houseSystem, ascendant),
      retrograde: false,
    });
  }

  // Part of Spirit: inverse of Fortune (Day = ASC + Sun - Moon, Night = ASC + Moon - Sun)
  if (sunPos && moonPos) {
    const isSunAboveHorizon = (() => {
      const sunLon = ((sunPos.longitude % 360) + 360) % 360;
      const ascLon = ((ascendant % 360) + 360) % 360;
      const descLon = ((descendant % 360) + 360) % 360;
      if (ascLon < descLon) {
        return sunLon >= descLon || sunLon < ascLon;
      }
      return sunLon >= descLon && sunLon < ascLon;
    })();
    const spiritLon = isSunAboveHorizon
      ? ((ascendant + sunPos.longitude - moonPos.longitude) % 360 + 360) % 360
      : ((ascendant + moonPos.longitude - sunPos.longitude) % 360 + 360) % 360;
    const spiritSignDMS = longitudeToSignAndDMS(spiritLon);
    planets.push({
      planet: 'spirit',
      longitude: spiritLon,
      latitude: 0,
      declination: calcDeclination(spiritLon, 0),
      distance: 0,
      speed: 0,
      sign: spiritSignDMS.sign,
      degree: spiritSignDMS.degree,
      minute: spiritSignDMS.minute,
      house: findHouse(spiritLon, cusps, data.houseSystem, ascendant),
      retrograde: false,
    });
  }

  // Vertex from ascmc[3]
  const vertexLon = ascmc[3] ?? 0;
  if (vertexLon !== 0) {
    const vertexSignDMS = longitudeToSignAndDMS(vertexLon);
    planets.push({
      planet: 'vertex',
      longitude: vertexLon,
      latitude: 0,
      declination: calcDeclination(vertexLon, 0),
      distance: 0,
      speed: 0,
      sign: vertexSignDMS.sign,
      degree: vertexSignDMS.degree,
      minute: vertexSignDMS.minute,
      house: findHouse(vertexLon, cusps, data.houseSystem, ascendant),
      retrograde: false,
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
      
      const isLuminary = LUMINARIES.has(p1.planet) || LUMINARIES.has(p2.planet);
      for (const aspectDef of ASPECTS) {
        const maxOrb = isLuminary ? aspectDef.luminaryOrb : aspectDef.orb;
        if (Math.abs(diff - aspectDef.angle) <= maxOrb) {
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

  // Calculate parallel/contraparallel aspects (declination-based)
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]!;
      const p2 = planets[j]!;
      // Skip calculated points without meaningful declination
      if (p1.planet === 'fortune' || p2.planet === 'fortune' || p1.planet === 'spirit' || p2.planet === 'spirit') continue;
      if (p1.planet === 'vertex' || p2.planet === 'vertex') continue;

      const decDiff = Math.abs(p1.declination - p2.declination);
      const decSum = Math.abs(p1.declination + p2.declination);

      if (decDiff <= PARALLEL_ORB) {
        aspects.push({
          planet1: p1.planet,
          planet2: p2.planet,
          type: 'parallel',
          angle: 0,
          orb: decDiff,
          applying: false,
          exact: decDiff < 0.1,
        });
      } else if (decSum <= PARALLEL_ORB) {
        aspects.push({
          planet1: p1.planet,
          planet2: p2.planet,
          type: 'contraparallel',
          angle: 180,
          orb: decSum,
          applying: false,
          exact: decSum < 0.1,
        });
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

// Transit aspect orbs (tighter than natal)
const TRANSIT_ASPECTS: { angle: number; orb: number; type: AspectType }[] = [
  { angle: 0, orb: 6, type: 'conjunction' },
  { angle: 180, orb: 6, type: 'opposition' },
  { angle: 120, orb: 4, type: 'trine' },
  { angle: 90, orb: 4, type: 'square' },
  { angle: 60, orb: 3, type: 'sextile' },
  { angle: 150, orb: 2, type: 'quincunx' },
  { angle: 30, orb: 1.5, type: 'semiSextile' },
];

interface SwissEphInstance {
  initSwissEph: () => Promise<void>;
  set_ephe_path: (path: string) => void;
  utc_to_jd: (year: number, month: number, day: number, hour: number, min: number, sec: number, cal: number) => { julianDayUT: number };
  calc_ut: (jd: number, planet: number, flags: number) => Float64Array;
  houses_ex: (jd: number, flags: number, lat: number, lng: number, hsys: string) => {
    cusps: Float64Array;
    ascmc: Float64Array;
  };
  SEFLG_MOSEPH: number;
  SEFLG_SWIEPH: number;
  SEFLG_SPEED: number;
  SweModule?: { FS?: EmscriptenFS };
  FS?: EmscriptenFS;
}

async function initSwissEphInstance(): Promise<SwissEphInstance> {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isBrowser) {
    // @ts-expect-error: window.Module assignment for Emscripten
    window.Module = {
      locateFile: (path: string, prefix: string) => {
        if (path === 'swisseph.wasm' || path === 'swisseph.data') {
          return `/natal-chart/wasm/${path}`;
        }
        return prefix + path;
      },
    };
  }

  const swissephModule = await import('swisseph-wasm');
  const SwissEph = swissephModule.default;
  const sweph = new SwissEph() as unknown as SwissEphInstance;

  await sweph.initSwissEph();

  // Set ephemeris path
  let ephePath = 'sweph';
  if (typeof process !== 'undefined' && process.cwd) {
    const path = await import('path');
    ephePath = path.join(process.cwd(), '..', '..', 'ephemeris') + '/';
  }
  try {
    sweph.set_ephe_path(ephePath);
  } catch {
    // Continue anyway
  }

  // Try to load ephemeris files in browser
  if (isBrowser) {
    await loadEphemerisFilesForInstance(sweph);
  }

  return sweph;
}

async function loadEphemerisFilesForInstance(sweph: SwissEphInstance): Promise<boolean> {
  try {
    const windowModule = typeof window !== 'undefined' ? (window as unknown as { Module?: { FS?: EmscriptenFS } }).Module : undefined;
    const FS = sweph.SweModule?.FS || sweph.FS || windowModule?.FS;
    if (!FS) return false;

    const targetPath = '/ephemeris/';

    try { FS.mkdir('/ephemeris'); } catch { /* may exist */ }

    const ephemerisFiles = ['seas_18.se1', 'sepl_18.se1'];
    let loadedAny = false;

    for (const filename of ephemerisFiles) {
      const filePath = `${targetPath}${filename}`;
      try { FS.stat(filePath); loadedAny = true; continue; } catch { /* need to load */ }

      const response = await fetch(`/natal-chart/ephemeris/${filename}`);
      if (!response.ok) continue;

      const arrayBuffer = await response.arrayBuffer();
      FS.writeFile(filePath, new Uint8Array(arrayBuffer));
      loadedAny = true;
    }

    if (loadedAny) {
      try { sweph.set_ephe_path('/ephemeris'); } catch { /* continue */ }
    }

    return loadedAny;
  } catch {
    return false;
  }
}

function calculatePlanetsForJD(
  sweph: SwissEphInstance,
  jd: number,
): { planets: PlanetPosition[]; skippedPlanets: Planet[] } {
  const planets: PlanetPosition[] = [];
  const skippedPlanets: Planet[] = [];

  for (const [planetName, planetIndex] of Object.entries(PLANET_TO_SE)) {
    let resultArray: Float64Array;
    try {
      try {
        resultArray = sweph.calc_ut(jd, planetIndex, sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED);
      } catch {
        if (planetName !== 'chiron') {
          resultArray = sweph.calc_ut(jd, planetIndex, sweph.SEFLG_MOSEPH | sweph.SEFLG_SPEED);
        } else {
          throw new Error('Chiron requires asteroid ephemeris');
        }
      }
    } catch {
      skippedPlanets.push(planetName as Planet);
      continue;
    }

    const longitude = resultArray[0]!;
    const latitude = resultArray[1]!;
    const distance = resultArray[2]!;
    const speedLongitude = resultArray[3]!;
    const retrograde = speedLongitude < 0;
    const { sign, degree, minute } = longitudeToSignAndDMS(longitude);

    planets.push({
      planet: planetName as Planet,
      longitude,
      latitude,
      declination: calcDeclination(longitude, latitude),
      distance,
      speed: speedLongitude,
      sign,
      degree,
      minute,
      house: 0, // No house assignment for standalone planet calc
      retrograde,
    });
  }

  return { planets, skippedPlanets };
}

function calculateAspectsBetween(
  planetsA: PlanetPosition[],
  planetsB: PlanetPosition[],
  aspectDefs: { angle: number; orb: number; type: AspectType }[],
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  for (const pA of planetsA) {
    for (const pB of planetsB) {
      let diff = Math.abs(pA.longitude - pB.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspectDef of aspectDefs) {
        if (Math.abs(diff - aspectDef.angle) <= aspectDef.orb) {
          const orb = Math.abs(diff - aspectDef.angle);
          const applying = (pA.speed - pB.speed) * (pA.longitude - pB.longitude) > 0;
          const exact = orb < 0.1;

          aspects.push({
            natalPlanet: pA.planet,
            transitPlanet: pB.planet,
            type: aspectDef.type,
            angle: diff,
            orb,
            applying,
            exact,
          });
          break;
        }
      }
    }
  }

  return aspects;
}

export interface TransitLocationInput {
  latitude: number;
  longitude: number;
  houseSystem: HouseSystem;
}

export async function calculateTransitPositions(
  dateTimeUtc: Date,
  natalPlanets: PlanetPosition[],
  location?: TransitLocationInput,
): Promise<TransitResult> {
  const sweph = await initSwissEphInstance();

  const year = dateTimeUtc.getUTCFullYear();
  if (year < 1800 || year > 2100) {
    throw new Error(`Date year ${year} outside supported range (1800-2100).`);
  }

  const jdResult = sweph.utc_to_jd(
    dateTimeUtc.getUTCFullYear(),
    dateTimeUtc.getUTCMonth() + 1,
    dateTimeUtc.getUTCDate(),
    dateTimeUtc.getUTCHours(),
    dateTimeUtc.getUTCMinutes(),
    dateTimeUtc.getUTCSeconds(),
    1,
  );

  const jd = jdResult.julianDayUT;
  const { planets, skippedPlanets } = calculatePlanetsForJD(sweph, jd);

  // Calculate houses at transit location if provided
  let houses: HouseCusp[] | undefined;
  let angles: Angles | undefined;
  if (location) {
    const flags = sweph.SEFLG_MOSEPH | sweph.SEFLG_SPEED;
    const houseChar = HOUSE_SYSTEM_TO_CHAR[location.houseSystem];
    const housesResult = sweph.houses_ex(jd, flags, location.latitude, location.longitude, houseChar);
    const cusps = housesResult.cusps;
    const ascmc = housesResult.ascmc;

    houses = [];
    for (let i = 1; i <= 12; i++) {
      const lon = cusps[i] ?? 0;
      const { sign, degree, minute } = longitudeToSignAndDMS(lon);
      houses.push({ house: i, longitude: lon, sign, degree, minute });
    }

    const ascendant = ascmc[0] ?? 0;
    const midheaven = ascmc[1] ?? 0;
    angles = {
      ascendant,
      midheaven,
      descendant: (ascendant + 180) % 360,
      imumCoeli: (midheaven + 180) % 360,
    };

    // Assign houses to transit planets
    for (const planet of planets) {
      if (location.houseSystem === 'W') {
        const normalizedLon = ((planet.longitude % 360) + 360) % 360;
        const ascSign = Math.floor(ascendant / 30);
        const planetSign = Math.floor(normalizedLon / 30);
        planet.house = ((planetSign - ascSign + 12) % 12) + 1;
      } else {
        const normalizedLon = ((planet.longitude % 360) + 360) % 360;
        for (let i = 1; i <= 12; i++) {
          const cuspStart = ((cusps[i]! % 360) + 360) % 360;
          const nextCusp = i < 12 ? cusps[i + 1] : cusps[1];
          const cuspEnd = ((nextCusp! % 360) + 360) % 360;
          if (cuspStart <= cuspEnd) {
            if (normalizedLon >= cuspStart && normalizedLon < cuspEnd) { planet.house = i; break; }
          } else {
            if (normalizedLon >= cuspStart || normalizedLon < cuspEnd) { planet.house = i; break; }
          }
        }
      }
    }
  }

  const aspects = calculateAspectsBetween(natalPlanets, planets, TRANSIT_ASPECTS);

  const result: TransitResult = {
    planets,
    aspects,
    dateTimeUtc,
  };
  if (houses) { result.houses = houses; }
  if (angles) { result.angles = angles; }
  if (skippedPlanets.length > 0) {
    result.skippedPlanets = skippedPlanets;
  }
  return result;
}

// Helper: find house number for a given longitude
function findHouse(longitude: number, cusps: Float64Array, houseSystem?: HouseSystem, ascendant?: number): number {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  if (houseSystem === 'W' && ascendant !== undefined) {
    const ascSign = Math.floor(((ascendant % 360) + 360) % 360 / 30);
    const planetSign = Math.floor(normalizedLon / 30);
    return ((planetSign - ascSign + 12) % 12) + 1;
  }
  for (let i = 1; i <= 12; i++) {
    const cuspStart = ((cusps[i]! % 360) + 360) % 360;
    const nextCusp = i < 12 ? cusps[i + 1] : cusps[1];
    const cuspEnd = ((nextCusp! % 360) + 360) % 360;
    if (cuspStart <= cuspEnd) {
      if (normalizedLon >= cuspStart && normalizedLon < cuspEnd) return i;
    } else {
      if (normalizedLon >= cuspStart || normalizedLon < cuspEnd) return i;
    }
  }
  return 1;
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