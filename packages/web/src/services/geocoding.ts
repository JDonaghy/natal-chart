export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  country: string;
  formatted: string;
  timezone: string; // IANA timezone e.g. "America/Chicago"
}

// Mock data for development
const MOCK_CITIES: Record<string, GeocodeResult> = {
  'london, uk': {
    name: 'London',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    formatted: 'London, United Kingdom',
    timezone: 'Europe/London',
  },
  'london, united kingdom': {
    name: 'London',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    formatted: 'London, United Kingdom',
    timezone: 'Europe/London',
  },
  'new york, usa': {
    name: 'New York',
    lat: 40.7128,
    lng: -74.0060,
    country: 'United States',
    formatted: 'New York, NY, United States',
    timezone: 'America/New_York',
  },
  'new york, united states': {
    name: 'New York',
    lat: 40.7128,
    lng: -74.0060,
    country: 'United States',
    formatted: 'New York, NY, United States',
    timezone: 'America/New_York',
  },
  'paris, france': {
    name: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    country: 'France',
    formatted: 'Paris, France',
    timezone: 'Europe/Paris',
  },
  'tokyo, japan': {
    name: 'Tokyo',
    lat: 35.6762,
    lng: 139.6503,
    country: 'Japan',
    formatted: 'Tokyo, Japan',
    timezone: 'Asia/Tokyo',
  },
  'sydney, australia': {
    name: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    country: 'Australia',
    formatted: 'Sydney NSW, Australia',
    timezone: 'Australia/Sydney',
  },
  'mumbai, india': {
    name: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    country: 'India',
    formatted: 'Mumbai, Maharashtra, India',
    timezone: 'Asia/Kolkata',
  },
  'cairo, egypt': {
    name: 'Cairo',
    lat: 30.0444,
    lng: 31.2357,
    country: 'Egypt',
    formatted: 'Cairo, Egypt',
    timezone: 'Africa/Cairo',
  },
  'rio de janeiro, brazil': {
    name: 'Rio de Janeiro',
    lat: -22.9068,
    lng: -43.1729,
    country: 'Brazil',
    formatted: 'Rio de Janeiro, Brazil',
    timezone: 'America/Sao_Paulo',
  },
};

/**
 * Geocode a city name to coordinates (mock implementation for development)
 * In production, this will call the Cloudflare Worker proxy
 */


/**
 * Get environment-specific geocoding API URL
 * Development: /api/geocode (proxied to worker)
 * Production: Cloudflare Worker URL (fallback to actual worker if not set)
 */
export function getGeocodingApiUrl(): string {
  // Use configured URL if available
  const configuredUrl = import.meta.env.VITE_GEOCODING_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // Default fallback for production: direct worker URL
  // This ensures the app works even if env variable is missing
  return 'https://natal-chart-geocoding.johnfdonaghy.workers.dev/geocode';
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
    throw new Error('Geocoding API URL not configured. Please set VITE_GEOCODING_API_URL.');
  }
  
  return await geocodeCityReal(query);
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
  
  // Extract city and country parts
  const parts = normalizedQuery.split(',').map(p => p.trim());
  const cityName = parts[0] || '';
  const countryQuery = parts[1] || '';
  
  // Normalize country names
  const countryAliases: Record<string, string[]> = {
    'uk': ['united kingdom', 'great britain', 'england', 'britain'],
    'usa': ['united states', 'united states of america', 'us', 'america'],
    'france': ['french republic'],
    'japan': ['japanese'],
    'australia': ['oz'],
    'india': ['bharat'],
    'egypt': ['arab republic of egypt'],
    'brazil': ['brasil'],
  };
  
  // Match on city name with optional country filtering
  const results: GeocodeResult[] = [];
  
  for (const [key, value] of Object.entries(MOCK_CITIES)) {
    const keyParts = key.split(',').map(p => p.trim());
    const mockCityName = keyParts[0] || '';
    const mockCountry = keyParts[1] || '';
    
    // Check if city name matches
    const cityMatches = mockCityName.includes(cityName) || cityName.includes(mockCityName);
    
    if (!cityMatches) {
      continue;
    }
    
    // If user specified a country, check if it matches
    if (countryQuery) {
      let countryMatches = false;
      
      // Direct match
      if (mockCountry.includes(countryQuery) || countryQuery.includes(mockCountry)) {
        countryMatches = true;
      }
      
      // Check aliases
      if (!countryMatches && countryAliases[mockCountry]) {
        for (const alias of countryAliases[mockCountry]) {
          if (alias.includes(countryQuery) || countryQuery.includes(alias)) {
            countryMatches = true;
            break;
          }
        }
      }
      
      if (!countryMatches) {
        continue;
      }
    }
    
    results.push(value);
  }
  
  // If no matches with country filtering, try city-only matches
  if (results.length === 0 && countryQuery) {
    for (const [key, value] of Object.entries(MOCK_CITIES)) {
      const keyParts = key.split(',').map(p => p.trim());
      const mockCityName = keyParts[0] || '';
      
      if (mockCityName.includes(cityName) || cityName.includes(mockCityName)) {
        results.push(value);
      }
    }
  }
  
  // Final fallback: partial match on full key
  if (results.length === 0) {
    for (const [key, value] of Object.entries(MOCK_CITIES)) {
      if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
        results.push(value);
      }
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
}