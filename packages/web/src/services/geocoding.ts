export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  country: string;
  formatted: string;
}

// Mock data for development
const MOCK_CITIES: Record<string, GeocodeResult> = {
  'london, uk': {
    name: 'London',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    formatted: 'London, UK',
  },
  'new york, usa': {
    name: 'New York',
    lat: 40.7128,
    lng: -74.0060,
    country: 'United States',
    formatted: 'New York, NY, USA',
  },
  'paris, france': {
    name: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    country: 'France',
    formatted: 'Paris, France',
  },
  'tokyo, japan': {
    name: 'Tokyo',
    lat: 35.6762,
    lng: 139.6503,
    country: 'Japan',
    formatted: 'Tokyo, Japan',
  },
  'sydney, australia': {
    name: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    country: 'Australia',
    formatted: 'Sydney NSW, Australia',
  },
  'mumbai, india': {
    name: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    country: 'India',
    formatted: 'Mumbai, Maharashtra, India',
  },
  'cairo, egypt': {
    name: 'Cairo',
    lat: 30.0444,
    lng: 31.2357,
    country: 'Egypt',
    formatted: 'Cairo, Egypt',
  },
  'rio de janeiro, brazil': {
    name: 'Rio de Janeiro',
    lat: -22.9068,
    lng: -43.1729,
    country: 'Brazil',
    formatted: 'Rio de Janeiro, Brazil',
  },
};

/**
 * Geocode a city name to coordinates (mock implementation for development)
 * In production, this will call the Cloudflare Worker proxy
 */


/**
 * Get environment-specific geocoding API URL
 * In development: uses mock unless VITE_GEOCODING_API_URL is set
 * In production: uses Cloudflare Worker URL from env variable
 */
export function getGeocodingApiUrl(): string {
  return import.meta.env.VITE_GEOCODING_API_URL || '';
}

/**
 * Check if real geocoding is available (Worker URL configured)
 */
export function isRealGeocodingAvailable(): boolean {
  return !!getGeocodingApiUrl();
}

/**
 * Main geocoding function - uses real API if available, otherwise mock
 */
export async function geocodeCity(query: string): Promise<GeocodeResult[]> {
  const apiUrl = getGeocodingApiUrl();
  
  if (!apiUrl) {
    // Use mock data
    return geocodeCityMock(query);
  }
  
  // Use real Cloudflare Worker with fallback to mock
  try {
    return await geocodeCityReal(query);
  } catch (error) {
    console.error('geocodeCity: Falling back to mock due to error:', error);
    return geocodeCityMock(query);
  }
}

/**
 * Mock implementation for development
 */
export async function geocodeCityMock(query: string): Promise<GeocodeResult[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const normalizedQuery = query.trim().toLowerCase();
  
  // Exact match
  if (MOCK_CITIES[normalizedQuery]) {
    return [MOCK_CITIES[normalizedQuery]];
  }
  
  // Partial match
  const results: GeocodeResult[] = [];
  for (const [key, value] of Object.entries(MOCK_CITIES)) {
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      results.push(value);
    }
  }
  
  // Limit to 5 results
  return results.slice(0, 5);
}

/**
 * Real implementation that calls Cloudflare Worker
 */
export async function geocodeCityReal(query: string): Promise<GeocodeResult[]> {
  const apiUrl = getGeocodingApiUrl();
  if (!apiUrl) {
    throw new Error('Geocoding API URL not configured');
  }
  
  // For now, skip Turnstile token - worker will accept requests without it
  // if TURNSTILE_SECRET is not set (development mode)
  const requestBody: any = { query };
  
  // TODO: Add Turnstile token when implemented
  // const token = await getTurnstileToken();
  // if (token) requestBody.token = token;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Handle error response format
    if (data.error) {
      throw new Error(`Geocoding error: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to mock if real API fails
    console.warn('Falling back to mock geocoding due to error');
    return geocodeCityMock(query);
  }
}