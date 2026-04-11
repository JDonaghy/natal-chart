/** SVG path data for a single glyph. */
export interface GlyphPath {
  d: string;
  viewBox: string;
}

/** A named collection of planet and/or sign glyph paths. */
export interface GlyphSource {
  id: string;
  displayName: string;
  planets: Record<string, GlyphPath>;
  signs: Record<string, GlyphPath>;
}
