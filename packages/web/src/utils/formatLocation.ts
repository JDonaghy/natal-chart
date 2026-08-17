/**
 * Display-time formatting for place names (issue #32).
 *
 * Geocoding (mock data and the live /api/geocode worker) stores a raw
 * `formatted` string straight into `birthData.city` — full country names,
 * "United States of America" and all. Rewriting stored data would leave
 * existing saved charts showing the old, unformatted names, so instead this
 * normalizes known full country names to their short form at render time,
 * wherever a location string is displayed.
 */

// Keyed lowercase; matched against the final ", <Country>" segment of a
// location string (or the whole string, for bare country names).
const COUNTRY_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'united states of america': 'USA',
  'united states': 'USA',
  'the united states of america': 'USA',
});

/**
 * Normalize known full country names in a location string to their
 * abbreviation (e.g. "New York, NY, United States" → "New York, NY, USA").
 * Non-country segments and unrecognized country names pass through unchanged.
 */
export function formatLocationDisplay(location: string | undefined | null): string {
  if (!location) return location ?? '';
  const parts = location.split(',').map((p) => p.trim());
  const last = parts[parts.length - 1]!;
  const replacement = COUNTRY_DISPLAY_NAMES[last.toLowerCase()];
  if (replacement === undefined) return location;
  parts[parts.length - 1] = replacement;
  return parts.join(', ');
}
