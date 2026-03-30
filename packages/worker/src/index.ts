export interface Env {
  OPENCAGE_API_KEY: string;
  TURNSTILE_SECRET?: string; // Optional for development
  GEOCODING_CACHE: KVNamespace;
  ALLOWED_ORIGIN?: string; // CORS origin, defaults to GitHub Pages
}

interface GeocodeRequest {
  query: string;
  token?: string; // Cloudflare Turnstile token (optional for development)
}

interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  country: string;
  formatted: string;
  timezone: string; // IANA timezone e.g. "America/Chicago"
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Cache version to invalidate old entries when schema changes
const CACHE_VERSION = 'v2';

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCors(env.ALLOWED_ORIGIN, request);
      }
    
      // Only allow POST to /geocode
      if (url.pathname !== '/geocode' || request.method !== 'POST') {
        return jsonResponse({ error: 'Not Found' }, 404, env.ALLOWED_ORIGIN, request);
      }
    
    try {
      // Get client IP for rate limiting
      const clientIp = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
                      'unknown';
      
      // Apply rate limiting
      const rateLimitOk = await checkRateLimit(clientIp, env.GEOCODING_CACHE);
      if (!rateLimitOk) {
        return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429, env.ALLOWED_ORIGIN);
      }
      
      // Parse request body
      const body = await request.json<GeocodeRequest>();
      
      // Validate query
      const query = body.query.trim();
      console.log('Geocoding request:', query);
      if (!query || typeof query !== 'string') {
        return jsonResponse({ error: 'Invalid query.' }, 400, env.ALLOWED_ORIGIN, request);
      }
      
      // Check if query is coordinates
      const isCoordinates = isCoordinateQuery(query);
      console.log('Is coordinate query:', isCoordinates, 'query:', query);
      
      // For non-coordinate queries, require at least 2 characters
      if (!isCoordinates && query.length < 2) {
        return jsonResponse({ error: 'Invalid query. Must be at least 2 characters.' }, 400, env.ALLOWED_ORIGIN, request);
      }
      
      // Validate Turnstile token if secret is configured
      if (env.TURNSTILE_SECRET) {
        if (!body.token) {
          return jsonResponse({ error: 'Turnstile token required' }, 401, env.ALLOWED_ORIGIN, request);
        }
        
        const isValidToken = await validateTurnstileToken(body.token, env.TURNSTILE_SECRET);
        if (!isValidToken) {
          return jsonResponse({ error: 'Invalid Turnstile token' }, 401, env.ALLOWED_ORIGIN, request);
        }
      } else {
        // Development mode - log warning
        console.warn('Turnstile validation disabled (TURNSTILE_SECRET not set)');
      }
      
      // Check cache first
      const cacheKey = `geocode:${CACHE_VERSION}:${query.toLowerCase()}`;
      const cached = await env.GEOCODING_CACHE.get(cacheKey);
      
      if (cached) {
        console.log(`Cache hit for: ${query}`);
        return jsonResponse(JSON.parse(cached), 200, env.ALLOWED_ORIGIN, request);
      }
      
      console.log(`Cache miss for: ${query}, fetching from OpenCage`);
      
      let geocodingResults: GeocodeResult[];
      if (isCoordinates) {
        const coords = parseCoordinates(query);
        if (!coords) {
          return jsonResponse({ error: 'Invalid coordinate format. Use "latitude,longitude" (e.g., 51.5074,-0.1278).' }, 400, env.ALLOWED_ORIGIN, request);
        }
        geocodingResults = await reverseGeocode(coords.lat, coords.lng, env.OPENCAGE_API_KEY);
      } else {
        geocodingResults = await forwardToOpenCage(query, env.OPENCAGE_API_KEY);
      }
      
      // Cache results for 30 days (birth cities don't move)
      if (geocodingResults.length > 0) {
        await env.GEOCODING_CACHE.put(
          cacheKey,
          JSON.stringify(geocodingResults),
          { expirationTtl: 30 * 24 * 60 * 60 } // 30 days in seconds
        );
      }
      
      return jsonResponse(geocodingResults, 200, env.ALLOWED_ORIGIN, request);
      
    } catch (error) {
      console.error('Geocoding error:', error);
      return jsonResponse({ 
        error: 'Internal server error',
        details: env.ALLOWED_ORIGIN?.includes('localhost') ? (error as Error).message : undefined
      }, 500, env.ALLOWED_ORIGIN, request);
    }
  },
};

async function checkRateLimit(clientIp: string, kv: KVNamespace): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
  const rateLimitKey = `ratelimit:${clientIp}:${windowStart}`;
  
  try {
    const currentCount = await kv.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    
    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }
    
    // Increment counter with expiration at end of window
    await kv.put(rateLimitKey, (count + 1).toString(), {
      expirationTtl: RATE_LIMIT_WINDOW * 2, // Keep for 2 windows
    });
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limiting fails
    return true;
  }
}

async function validateTurnstileToken(token: string, secret: string): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json<{ success: boolean }>();
    return data.success;
  } catch {
    return false;
  }
}

function isCoordinateQuery(query: string): boolean {
  const coordinateRegex = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
  return coordinateRegex.test(query.trim());
}

function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const trimmed = query.trim();
  const parts = trimmed.split(/\s*,\s*/);
  if (parts.length !== 2) return null;
  
  const lat = parseFloat(parts[0]!);
  const lng = parseFloat(parts[1]!);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  
  return { lat, lng };
}

async function forwardToOpenCage(query: string, apiKey: string): Promise<GeocodeResult[]> {
  const encodedQuery = encodeURIComponent(query);
  // Include annotations parameter to get timezone data
  // min_confidence=3 filters out low-quality matches (helps partial queries like "lond" → London)
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${apiKey}&limit=10&min_confidence=3&no_dedupe=1&annotations=timezone`;
  
  console.log(`Forward geocoding URL: ${url.replace(apiKey, 'REDACTED')}`);
  
  const response = await fetch(url);
  const data = await response.json<{
    results: Array<{
      formatted: string;
      geometry: { lat: number; lng: number };
      components: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country: string;
      };
      annotations?: {
        timezone?: {
          name: string;
        };
      };
    }>;
  }>();
  
  // Debug log first result's structure
  if (data.results.length > 0) {
    const firstResult = data.results[0]!;
    console.log('First result annotations:', JSON.stringify(firstResult.annotations));
    console.log('First result timezone:', firstResult.annotations?.timezone?.name);
  }
  
  return data.results.map(result => ({
    name: result.components.city || result.components.town || result.components.village || '',
    lat: result.geometry.lat,
    lng: result.geometry.lng,
    country: result.components.country,
    formatted: result.formatted,
    timezone: result.annotations?.timezone?.name || '',
  }));
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<GeocodeResult[]> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&limit=1&annotations=timezone`;
  
  const response = await fetch(url);
  const data = await response.json<{
    results: Array<{
      formatted: string;
      geometry: { lat: number; lng: number };
      components: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country: string;
      };
      annotations?: {
        timezone?: {
          name: string;
        };
      };
    }>;
  }>();
  
  return data.results.map(result => ({
    name: result.components.city || result.components.town || result.components.village || '',
    lat: result.geometry.lat,
    lng: result.geometry.lng,
    country: result.components.country,
    formatted: result.formatted,
    timezone: result.annotations?.timezone?.name || '',
  }));
}

function getAllowedOrigin(request: Request, allowedOrigin?: string): string {
  // If no allowed origin configured, use default
  const defaultOrigin = 'https://jdonaghy.github.io';
  const allowedOrigins = allowedOrigin ? allowedOrigin.split(',').map(o => o.trim()) : [defaultOrigin];
  
  // Get request origin
  const requestOrigin = request.headers.get('Origin');
  
  // If request has an origin and it's in allowed list, use it
  if (requestOrigin) {
    for (const origin of allowedOrigins) {
      // Case-insensitive comparison for origins (scheme and host are case-insensitive)
      if (origin.toLowerCase() === requestOrigin.toLowerCase() || origin === '*') {
        return requestOrigin;
      }
    }
  }
  
  // Otherwise, use the first allowed origin (guaranteed to exist)
  return allowedOrigins[0] || defaultOrigin;
}

function jsonResponse(data: any, status = 200, allowedOrigin?: string, request?: Request): Response {
  const origin = request ? getAllowedOrigin(request, allowedOrigin) : (allowedOrigin || 'https://jdonaghy.github.io');
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function handleCors(allowedOrigin?: string, request?: Request): Response {
  const origin = request ? getAllowedOrigin(request, allowedOrigin) : (allowedOrigin || 'https://jdonaghy.github.io');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}