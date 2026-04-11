/**
 * Re-export facade — all glyph data now lives in glyphs/ directory.
 * This file exists for backward compatibility with existing imports.
 */
export type { GlyphPath } from './glyphs/types';
export {
  DEFAULT_GLYPH_SET,
  GLYPH_SETS,
  GLYPH_SET_NAMES,
  SIGN_ABBREVIATIONS,
  getPlanetPath,
  getSignPathByIndex,
  glyphTransform,
} from './glyphs/index';

// Re-export new registry API
export {
  getAllSources,
  getVariantsForPlanet,
  getVariantsForSign,
} from './glyphs/index';
