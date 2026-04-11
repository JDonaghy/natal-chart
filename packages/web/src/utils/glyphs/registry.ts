import type { GlyphPath, GlyphSource } from './types';

const sources: Map<string, GlyphSource> = new Map();

/** Register a glyph source. Called by each source module at import time. */
export function registerSource(source: GlyphSource): void {
  sources.set(source.id, source);
}

/** Get a source by ID. */
export function getSource(id: string): GlyphSource | undefined {
  return sources.get(id);
}

/** Get all registered sources. */
export function getAllSources(): GlyphSource[] {
  return Array.from(sources.values());
}

export interface GlyphVariant {
  sourceId: string;
  displayName: string;
  path: GlyphPath;
}

/** Get all available variants for a planet. */
export function getVariantsForPlanet(planet: string): GlyphVariant[] {
  const variants: GlyphVariant[] = [];
  for (const source of sources.values()) {
    const path = source.planets[planet];
    if (path) {
      variants.push({ sourceId: source.id, displayName: source.displayName, path });
    }
  }
  return variants;
}

/** Get all available variants for a zodiac sign. */
export function getVariantsForSign(sign: string): GlyphVariant[] {
  const variants: GlyphVariant[] = [];
  for (const source of sources.values()) {
    const path = source.signs[sign];
    if (path) {
      variants.push({ sourceId: source.id, displayName: source.displayName, path });
    }
  }
  return variants;
}
