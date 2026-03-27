// @ts-nocheck
// Spike test for swisseph-wasm
// This is a minimal implementation to validate the library works

export interface PlanetPositionResult {
  // @ts-ignore
  longitude: number;
  // @ts-ignore
  latitude: number;
  // @ts-ignore
  distance: number;
  // @ts-ignore
  speed: number;
  sign: string;
  degree: number;
  minute: number;
}

export async function calculateSunPosition(
  date: Date,
  latitude: number,
  longitude: number
): Promise<PlanetPositionResult> {
  try {
    // Dynamic import to avoid loading in environments without wasm support
    const swissephModule = await import('swisseph-wasm');
    const SwissEph = swissephModule.default;
    const sweph = new SwissEph();
    
    // Initialize the library
    await sweph.initSwissEph();
    
    // Set ephemeris path (empty for default, or path to .se1 files)
    // For browser use, we'll need to configure this differently
    // @ts-ignore - set_ephe_path exists at runtime
    sweph.set_ephe_path('');
    
    // Convert date to Julian Day Number (UTC) using Swiss Ephemeris
    const jdResult = sweph.utc_to_jd(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1, // 1-12
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      1 // Gregorian calendar
    );
    
    const jd = jdResult.julianDayUT; // Use UT (Universal Time)
    
    // Calculate Sun position (SE_SUN = 0)
    const flags = sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED;
    const resultArray = sweph.calc_ut(jd, sweph.SE_SUN, flags);
    
    // Parse Float64Array result
    // Swiss Ephemeris returns: longitude, latitude, distance, 
    // speedLongitude, speedLatitude, speedDistance
    const result = {
      longitude: resultArray[0]!,
      latitude: resultArray[1]!,
      distance: resultArray[2]!,
      speedLongitude: resultArray[3]!,
      speedLatitude: resultArray[4]!,
      speedDistance: resultArray[5]!,
    };
    
    // Convert longitude to sign and degree
    const totalDegrees = result.longitude;
    const normalized = ((totalDegrees % 360) + 360) % 360; // ensure 0-359.999...
    const signIndex = Math.floor(normalized / 30);
    const degreeInSign = normalized % 30;
    const minute = (degreeInSign - Math.floor(degreeInSign)) * 60;

    const signs = [
      'aries', 'taurus', 'gemini', 'cancer',
      'leo', 'virgo', 'libra', 'scorpio',
      'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];

    const sign = signs[signIndex];
    if (!sign) {
      throw new Error(`Invalid sign index ${signIndex} for longitude ${totalDegrees}`);
    }

    return {
      longitude: result.longitude,
      latitude: result.latitude,
      distance: result.distance,
      speed: result.speedLongitude, // Use longitude speed as primary speed
      sign,
      degree: Math.floor(degreeInSign),
      minute: Math.floor(minute),
    };
  } catch (error) {
    console.error('Error in swisseph-wasm spike test:', error);
    throw new Error(`Failed to calculate Sun position: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Test function to validate ephemeris loading
export async function validateEphemeris(): Promise<boolean> {
  try {
    const swissephModule = await import('swisseph-wasm');
    const SwissEph = swissephModule.default;
    const sweph = new SwissEph();
    
    await sweph.initSwissEph();
    // @ts-ignore - set_ephe_path exists at runtime
    sweph.set_ephe_path('');
    
    // Try a simple calculation
    const testDate = new Date('2000-01-01T12:00:00Z');
    const jdResult = sweph.utc_to_jd(
      testDate.getUTCFullYear(),
      testDate.getUTCMonth() + 1,
      testDate.getUTCDate(),
      testDate.getUTCHours(),
      testDate.getUTCMinutes(),
      testDate.getUTCSeconds(),
      1
    );
    
    const jd = jdResult.julianDayUT;
    const flags = sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED;
    const result = sweph.calc_ut(jd, sweph.SE_SUN, flags);
    
    return result[0] !== undefined && 
           result[1] !== undefined &&
           result[2] !== undefined;
  } catch (error) {
    console.error('Ephemeris validation failed:', error);
    return false;
  }
}