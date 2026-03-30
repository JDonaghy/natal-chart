/**
 * Shareable URL encoding/decoding for natal chart birth data.
 *
 * URL format (inside hash router):
 *   /#/chart?d=1990-06-15&t=12:00&lat=51.5074&lng=-0.1278&tz=Europe/London&city=London%2C+UK&hs=P
 */

export interface ShareData {
  birthDate: string;     // YYYY-MM-DD
  birthTime: string;     // HH:MM or HH:MM:SS
  latitude: number;
  longitude: number;
  timezone: string;      // IANA timezone
  city?: string;
  houseSystem: 'P' | 'W' | 'K';
}

/**
 * Encode birth data into URL search params string.
 */
export function encodeShareParams(data: ShareData): string {
  const params = new URLSearchParams();
  params.set('d', data.birthDate);
  params.set('t', data.birthTime);
  params.set('lat', data.latitude.toFixed(4));
  params.set('lng', data.longitude.toFixed(4));
  params.set('tz', data.timezone);
  if (data.city) {
    params.set('city', data.city);
  }
  if (data.houseSystem !== 'P') {
    params.set('hs', data.houseSystem);
  }
  return params.toString();
}

/**
 * Build the full shareable URL for the current page.
 */
export function buildShareUrl(data: ShareData): string {
  const params = encodeShareParams(data);
  const base = window.location.href.split('#')[0];
  return `${base}#/chart?${params}`;
}

/**
 * Try to parse share data from the current hash URL.
 * Returns null if required params are missing.
 */
export function parseShareParams(): ShareData | null {
  const hash = window.location.hash; // e.g. "#/chart?d=1990-06-15&t=12:00..."
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;

  const params = new URLSearchParams(hash.slice(qIndex + 1));

  const d = params.get('d');
  const t = params.get('t');
  const lat = params.get('lat');
  const lng = params.get('lng');
  const tz = params.get('tz');

  // All required
  if (!d || !t || !lat || !lng || !tz) return null;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) return null;

  // Validate date format loosely
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;

  const hs = params.get('hs');
  const houseSystem = (hs === 'W' || hs === 'K') ? hs : 'P';
  const city = params.get('city');

  const result: ShareData = {
    birthDate: d,
    birthTime: t,
    latitude,
    longitude,
    timezone: tz,
    houseSystem,
  };
  if (city) {
    result.city = city;
  }
  return result;
}
