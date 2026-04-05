/**
 * Firebase JWT verification for Cloudflare Workers.
 * Verifies Firebase ID tokens using Google's public JWKS.
 */

interface JwksKey extends JsonWebKey {
  kid: string;
}

// JWKS cache: store in module scope (persists across requests within same isolate)
let jwksCache: { keys: JwksKey[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

interface JwtHeader {
  alg: string;
  kid: string;
  typ: string;
}

interface FirebaseTokenClaims {
  sub: string;       // Firebase UID
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
}

export interface AuthUser {
  uid: string;
  email?: string | undefined;
  displayName?: string | undefined;
  photoURL?: string | undefined;
}

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

function base64UrlDecode(str: string): Uint8Array {
  // Add padding
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  const decoded = new TextDecoder().decode(base64UrlDecode(part));
  return JSON.parse(decoded) as T;
}

async function fetchJwks(): Promise<JwksKey[]> {
  const now = Date.now();
  if (jwksCache && (now - jwksCache.fetchedAt) < JWKS_TTL_MS) {
    return jwksCache.keys;
  }

  const response = await fetch(JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const data = await response.json<{ keys: JwksKey[] }>();
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

export async function verifyFirebaseToken(
  token: string,
  projectId: string,
): Promise<AuthUser> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const header = decodeJwtPart<JwtHeader>(parts[0]!);
  const claims = decodeJwtPart<FirebaseTokenClaims>(parts[1]!);

  // Validate claims before crypto verification
  const now = Math.floor(Date.now() / 1000);

  if (claims.exp <= now) {
    throw new Error('Token expired');
  }
  if (claims.iat > now + 5) {
    throw new Error('Token issued in the future');
  }
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid issuer');
  }
  if (claims.aud !== projectId) {
    throw new Error('Invalid audience');
  }
  if (!claims.sub) {
    throw new Error('Missing subject');
  }

  // Verify signature
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  const jwks = await fetchJwks();
  const jwk = jwks.find(k => k.kid === header.kid);
  if (!jwk) {
    // Key might have rotated — force refetch
    jwksCache = null;
    const refreshedJwks = await fetchJwks();
    const refreshedJwk = refreshedJwks.find(k => k.kid === header.kid);
    if (!refreshedJwk) {
      throw new Error('Signing key not found in JWKS');
    }
    return verifySignatureAndReturn(refreshedJwk, parts, claims);
  }

  return verifySignatureAndReturn(jwk, parts, claims);
}

async function verifySignatureAndReturn(
  jwk: JwksKey,
  parts: string[],
  claims: FirebaseTokenClaims,
): Promise<AuthUser> {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]!);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    signatureInput,
  );

  if (!valid) {
    throw new Error('Invalid signature');
  }

  return {
    uid: claims.sub,
    email: claims.email,
    displayName: claims.name,
    photoURL: claims.picture,
  };
}
