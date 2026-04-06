import { verifyFirebaseToken, type AuthUser } from './auth';

export interface Env {
  OPENCAGE_API_KEY: string;
  TURNSTILE_SECRET?: string;
  GEOCODING_CACHE: KVNamespace;
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  FIREBASE_PROJECT_ID?: string;
}

interface GeocodeRequest {
  query: string;
  token?: string;
}

interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  country: string;
  formatted: string;
  timezone: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;
const CACHE_VERSION = 'v2';

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors(env.ALLOWED_ORIGIN, request);
    }

    // --- Geocoding (existing) ---
    if (url.pathname === '/geocode' && request.method === 'POST') {
      return handleGeocode(request, env);
    }

    // --- Auth & Data API ---
    // Public: shared chart view
    if (url.pathname.startsWith('/shared/') && request.method === 'GET') {
      return handleSharedChart(url, env);
    }

    // All other API routes require authentication
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleAuthenticatedRoute(request, url, env);
      } catch (error) {
        console.error('API error:', error);
        return jsonResponse({
          error: 'Internal server error',
        }, 500, env.ALLOWED_ORIGIN, request);
      }
    }

    return jsonResponse({ error: 'Not Found' }, 404, env.ALLOWED_ORIGIN, request);
  },
};

// ─── Authenticated API Routes ───────────────────────────────────────────────

async function handleAuthenticatedRoute(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    return jsonResponse({ error: 'Authentication not configured' }, 503, env.ALLOWED_ORIGIN, request);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization token' }, 401, env.ALLOWED_ORIGIN, request);
  }

  let user: AuthUser;
  try {
    user = await verifyFirebaseToken(authHeader.slice(7), projectId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    return jsonResponse({ error: message }, 401, env.ALLOWED_ORIGIN, request);
  }

  // Route dispatch
  const path = url.pathname;
  const method = request.method;

  // User upsert
  if (path === '/api/user' && method === 'POST') {
    return handleUpsertUser(user, env, request);
  }
  // Delete all user data
  if (path === '/api/user' && method === 'DELETE') {
    return handleDeleteUser(user, env, request);
  }

  // Preferences
  if (path === '/api/preferences' && method === 'GET') {
    return handleGetPreferences(user, env, request);
  }
  if (path === '/api/preferences' && method === 'PUT') {
    return handlePutPreferences(user, request, env);
  }

  // Charts
  if (path === '/api/charts' && method === 'GET') {
    return handleListCharts(user, env, request);
  }
  if (path === '/api/charts' && method === 'POST') {
    return handleCreateChart(user, request, env);
  }

  // Single chart operations: /api/charts/:id
  const chartMatch = path.match(/^\/api\/charts\/([^/]+)$/);
  if (chartMatch) {
    const chartId = chartMatch[1]!;
    if (method === 'GET') return handleGetChart(user, chartId, env, request);
    if (method === 'PUT') return handleUpdateChart(user, chartId, request, env);
    if (method === 'DELETE') return handleDeleteChart(user, chartId, env, request);
  }

  // Chart sharing: /api/charts/:id/share
  const shareMatch = path.match(/^\/api\/charts\/([^/]+)\/share$/);
  if (shareMatch) {
    const chartId = shareMatch[1]!;
    if (method === 'POST') return handleCreateShareToken(user, chartId, env, request);
    if (method === 'DELETE') return handleRevokeShareToken(user, chartId, env, request);
  }

  return jsonResponse({ error: 'Not Found' }, 404, env.ALLOWED_ORIGIN, request);
}

// ─── User ───────────────────────────────────────────────────────────────────

async function handleUpsertUser(
  user: AuthUser,
  env: Env,
  request: Request,
): Promise<Response> {
  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, updated_at = datetime('now')`,
  )
    .bind(user.uid, user.email ?? null, user.displayName ?? null)
    .run();

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

async function handleDeleteUser(
  user: AuthUser,
  env: Env,
  request: Request,
): Promise<Response> {
  // Delete in order: charts, preferences, user (foreign key dependencies)
  await env.DB.prepare('DELETE FROM saved_charts WHERE user_id = ?').bind(user.uid).run();
  await env.DB.prepare('DELETE FROM preferences WHERE user_id = ?').bind(user.uid).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.uid).run();

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

// ─── Preferences ────────────────────────────────────────────────────────────

async function handleGetPreferences(
  user: AuthUser,
  env: Env,
  request: Request,
): Promise<Response> {
  const row = await env.DB.prepare('SELECT data, updated_at FROM preferences WHERE user_id = ?')
    .bind(user.uid)
    .first<{ data: string; updated_at: string }>();

  if (!row) {
    return jsonResponse({ data: null }, 200, env.ALLOWED_ORIGIN, request);
  }

  return jsonResponse({ data: JSON.parse(row.data), updatedAt: row.updated_at }, 200, env.ALLOWED_ORIGIN, request);
}

async function handlePutPreferences(
  user: AuthUser,
  request: Request,
  env: Env,
): Promise<Response> {
  const contentLength = parseInt(request.headers.get('Content-Length') || '0');
  if (contentLength > 10_000) { // 10KB max for preferences
    return jsonResponse({ error: 'Payload too large' }, 413, env.ALLOWED_ORIGIN, request);
  }

  const body = await request.json<{ data: Record<string, unknown> }>();
  if (!body.data || typeof body.data !== 'object') {
    return jsonResponse({ error: 'Invalid preferences data' }, 400, env.ALLOWED_ORIGIN, request);
  }

  await env.DB.prepare(
    `INSERT INTO preferences (user_id, data) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
  )
    .bind(user.uid, JSON.stringify(body.data))
    .run();

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

// ─── Charts ─────────────────────────────────────────────────────────────────

async function handleListCharts(
  user: AuthUser,
  env: Env,
  request: Request,
): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT id, name, created_at, updated_at, share_token FROM saved_charts WHERE user_id = ? ORDER BY updated_at DESC',
  )
    .bind(user.uid)
    .all<{ id: string; name: string; created_at: string; updated_at: string; share_token: string | null }>();

  return jsonResponse({ charts: results }, 200, env.ALLOWED_ORIGIN, request);
}

async function handleCreateChart(
  user: AuthUser,
  request: Request,
  env: Env,
): Promise<Response> {
  const body = await request.json<{
    name: string;
    birthData: Record<string, unknown>;
    viewFlags?: Record<string, unknown>;
    transitData?: Record<string, unknown>;
  }>();

  const contentLength = parseInt(request.headers.get('Content-Length') || '0');
  if (contentLength > 50_000) { // 50KB max for chart data
    return jsonResponse({ error: 'Payload too large' }, 413, env.ALLOWED_ORIGIN, request);
  }

  if (!body.name || !body.birthData) {
    return jsonResponse({ error: 'name and birthData are required' }, 400, env.ALLOWED_ORIGIN, request);
  }

  // Limit charts per user
  const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM saved_charts WHERE user_id = ?')
    .bind(user.uid)
    .first<{ cnt: number }>();
  if (countRow && countRow.cnt >= 500) {
    return jsonResponse({ error: 'Chart limit reached (500)' }, 400, env.ALLOWED_ORIGIN, request);
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO saved_charts (id, user_id, name, birth_data, view_flags, transit_data)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      user.uid,
      body.name,
      JSON.stringify(body.birthData),
      body.viewFlags ? JSON.stringify(body.viewFlags) : null,
      body.transitData ? JSON.stringify(body.transitData) : null,
    )
    .run();

  return jsonResponse({ id, name: body.name }, 201, env.ALLOWED_ORIGIN, request);
}

async function handleGetChart(
  user: AuthUser,
  chartId: string,
  env: Env,
  request: Request,
): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT id, name, birth_data, view_flags, transit_data, share_token, created_at, updated_at FROM saved_charts WHERE id = ? AND user_id = ?',
  )
    .bind(chartId, user.uid)
    .first<{ id: string; name: string; birth_data: string; view_flags: string | null; transit_data: string | null; share_token: string | null; created_at: string; updated_at: string }>();

  if (!row) {
    return jsonResponse({ error: 'Chart not found' }, 404, env.ALLOWED_ORIGIN, request);
  }

  return jsonResponse({
    id: row.id,
    name: row.name,
    birthData: JSON.parse(row.birth_data),
    viewFlags: row.view_flags ? JSON.parse(row.view_flags) : null,
    transitData: row.transit_data ? JSON.parse(row.transit_data) : null,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, 200, env.ALLOWED_ORIGIN, request);
}

async function handleUpdateChart(
  user: AuthUser,
  chartId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const body = await request.json<{
    name?: string;
    birthData?: Record<string, unknown>;
    viewFlags?: Record<string, unknown>;
    transitData?: Record<string, unknown>;
  }>();

  // Verify ownership
  const existing = await env.DB.prepare('SELECT id FROM saved_charts WHERE id = ? AND user_id = ?')
    .bind(chartId, user.uid)
    .first();

  if (!existing) {
    return jsonResponse({ error: 'Chart not found' }, 404, env.ALLOWED_ORIGIN, request);
  }

  // Build dynamic update
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: (string | null)[] = [];

  if (body.name !== undefined) {
    sets.push('name = ?');
    values.push(body.name);
  }
  if (body.birthData !== undefined) {
    sets.push('birth_data = ?');
    values.push(JSON.stringify(body.birthData));
  }
  if (body.viewFlags !== undefined) {
    sets.push('view_flags = ?');
    values.push(JSON.stringify(body.viewFlags));
  }
  if (body.transitData !== undefined) {
    sets.push('transit_data = ?');
    values.push(body.transitData ? JSON.stringify(body.transitData) : null);
  }

  values.push(chartId);

  await env.DB.prepare(`UPDATE saved_charts SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

async function handleDeleteChart(
  user: AuthUser,
  chartId: string,
  env: Env,
  request: Request,
): Promise<Response> {
  const result = await env.DB.prepare('DELETE FROM saved_charts WHERE id = ? AND user_id = ?')
    .bind(chartId, user.uid)
    .run();

  if (!result.meta.changes) {
    return jsonResponse({ error: 'Chart not found' }, 404, env.ALLOWED_ORIGIN, request);
  }

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

// ─── Chart Sharing ──────────────────────────────────────────────────────────

function generateShareToken(): string {
  const bytes = new Uint8Array(9); // 9 bytes = 12 base64url chars
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function handleCreateShareToken(
  user: AuthUser,
  chartId: string,
  env: Env,
  request: Request,
): Promise<Response> {
  // Verify ownership and check existing token
  const existing = await env.DB.prepare('SELECT share_token FROM saved_charts WHERE id = ? AND user_id = ?')
    .bind(chartId, user.uid)
    .first<{ share_token: string | null }>();

  if (!existing) {
    return jsonResponse({ error: 'Chart not found' }, 404, env.ALLOWED_ORIGIN, request);
  }

  if (existing.share_token) {
    return jsonResponse({ shareToken: existing.share_token }, 200, env.ALLOWED_ORIGIN, request);
  }

  const token = generateShareToken();
  await env.DB.prepare("UPDATE saved_charts SET share_token = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(token, chartId)
    .run();

  return jsonResponse({ shareToken: token }, 201, env.ALLOWED_ORIGIN, request);
}

async function handleRevokeShareToken(
  user: AuthUser,
  chartId: string,
  env: Env,
  request: Request,
): Promise<Response> {
  const result = await env.DB.prepare(
    "UPDATE saved_charts SET share_token = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
  )
    .bind(chartId, user.uid)
    .run();

  if (!result.meta.changes) {
    return jsonResponse({ error: 'Chart not found' }, 404, env.ALLOWED_ORIGIN, request);
  }

  return jsonResponse({ ok: true }, 200, env.ALLOWED_ORIGIN, request);
}

// ─── Public Shared Chart ────────────────────────────────────────────────────

async function handleSharedChart(
  url: URL,
  env: Env,
): Promise<Response> {
  const token = url.pathname.replace('/shared/', '');
  if (!token || token.length > 20 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return jsonResponse({ error: 'Invalid share token' }, 400, env.ALLOWED_ORIGIN);
  }

  const row = await env.DB.prepare(
    'SELECT name, birth_data, view_flags, transit_data FROM saved_charts WHERE share_token = ?',
  )
    .bind(token)
    .first<{ name: string; birth_data: string; view_flags: string | null; transit_data: string | null }>();

  if (!row) {
    return jsonResponse({ error: 'Shared chart not found' }, 404, env.ALLOWED_ORIGIN);
  }

  return jsonResponse({
    name: row.name,
    birthData: JSON.parse(row.birth_data),
    viewFlags: row.view_flags ? JSON.parse(row.view_flags) : null,
    transitData: row.transit_data ? JSON.parse(row.transit_data) : null,
  }, 200, env.ALLOWED_ORIGIN);
}

// ─── Geocoding (existing logic, unchanged) ──────────────────────────────────

async function handleGeocode(request: Request, env: Env): Promise<Response> {
  try {
    const clientIp = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                    'unknown';

    const rateLimitOk = await checkRateLimit(clientIp, env.GEOCODING_CACHE);
    if (!rateLimitOk) {
      return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429, env.ALLOWED_ORIGIN);
    }

    const body = await request.json<GeocodeRequest>();
    const query = body.query.trim();
    console.log('Geocoding request:', query);
    if (!query || typeof query !== 'string') {
      return jsonResponse({ error: 'Invalid query.' }, 400, env.ALLOWED_ORIGIN, request);
    }

    const isCoordinates = isCoordinateQuery(query);
    console.log('Is coordinate query:', isCoordinates, 'query:', query);

    if (!isCoordinates && query.length < 2) {
      return jsonResponse({ error: 'Invalid query. Must be at least 2 characters.' }, 400, env.ALLOWED_ORIGIN, request);
    }

    if (env.TURNSTILE_SECRET) {
      if (!body.token) {
        return jsonResponse({ error: 'Turnstile token required' }, 401, env.ALLOWED_ORIGIN, request);
      }
      const isValidToken = await validateTurnstileToken(body.token, env.TURNSTILE_SECRET);
      if (!isValidToken) {
        return jsonResponse({ error: 'Invalid Turnstile token' }, 401, env.ALLOWED_ORIGIN, request);
      }
    } else {
      console.warn('Turnstile validation disabled (TURNSTILE_SECRET not set)');
    }

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

    if (geocodingResults.length > 0) {
      await env.GEOCODING_CACHE.put(
        cacheKey,
        JSON.stringify(geocodingResults),
        { expirationTtl: 30 * 24 * 60 * 60 },
      );
    }

    return jsonResponse(geocodingResults, 200, env.ALLOWED_ORIGIN, request);
  } catch (error) {
    console.error('Geocoding error:', error);
    return jsonResponse({
      error: 'Internal server error',
      details: env.ALLOWED_ORIGIN?.includes('localhost') ? (error as Error).message : undefined,
    }, 500, env.ALLOWED_ORIGIN, request);
  }
}

// ─── Geocoding Helpers ──────────────────────────────────────────────────────

async function checkRateLimit(clientIp: string, kv: KVNamespace): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
  const rateLimitKey = `ratelimit:${clientIp}:${windowStart}`;

  try {
    const currentCount = await kv.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    if (count >= RATE_LIMIT_MAX_REQUESTS) return false;
    await kv.put(rateLimitKey, (count + 1).toString(), { expirationTtl: RATE_LIMIT_WINDOW * 2 });
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
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
  return /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(query.trim());
}

function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const parts = query.trim().split(/\s*,\s*/);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]!);
  const lng = parseFloat(parts[1]!);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

async function forwardToOpenCage(query: string, apiKey: string): Promise<GeocodeResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${apiKey}&limit=10&min_confidence=3&no_dedupe=1&annotations=timezone`;
  console.log(`Forward geocoding URL: ${url.replace(apiKey, 'REDACTED')}`);

  const response = await fetch(url);
  const data = await response.json<{
    results: Array<{
      formatted: string;
      geometry: { lat: number; lng: number };
      components: { city?: string; town?: string; village?: string; state?: string; country: string };
      annotations?: { timezone?: { name: string } };
    }>;
  }>();

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
      components: { city?: string; town?: string; village?: string; state?: string; country: string };
      annotations?: { timezone?: { name: string } };
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

// ─── Response Helpers ───────────────────────────────────────────────────────

function getAllowedOrigin(request: Request, allowedOrigin?: string): string {
  const defaultOrigin = 'https://jdonaghy.github.io';
  const allowedOrigins = allowedOrigin ? allowedOrigin.split(',').map(o => o.trim()) : [defaultOrigin];
  const requestOrigin = request.headers.get('Origin');

  if (requestOrigin) {
    for (const origin of allowedOrigins) {
      if (origin.toLowerCase() === requestOrigin.toLowerCase() || origin === '*') {
        return requestOrigin;
      }
    }
  }

  return allowedOrigins[0] || defaultOrigin;
}

function jsonResponse(data: unknown, status = 200, allowedOrigin?: string, request?: Request): Response {
  const origin = request ? getAllowedOrigin(request, allowedOrigin) : (allowedOrigin || 'https://jdonaghy.github.io');
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function handleCors(allowedOrigin?: string, request?: Request): Response {
  const origin = request ? getAllowedOrigin(request, allowedOrigin) : (allowedOrigin || 'https://jdonaghy.github.io');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
