/**
 * Extract SVG path data from Noto Sans Symbols 2 for astrological glyphs.
 * Usage: node scripts/extract-noto-glyphs.mjs /path/to/NotoSansSymbols2-Regular.ttf
 */
import opentype from 'opentype.js';
import { readFileSync } from 'fs';

const fontPath = process.argv[2] || '/tmp/NotoSansSymbols2-Regular.ttf';
const buffer = readFileSync(fontPath);
const font = opentype.parse(buffer.buffer);

// Unicode codepoints for planet glyphs
const PLANET_CODEPOINTS = {
  sun: 0x2609,       // ☉
  moon: 0x263D,       // ☽
  mercury: 0x263F,    // ☿
  venus: 0x2640,      // ♀
  mars: 0x2642,       // ♂
  jupiter: 0x2643,    // ♃
  saturn: 0x2644,     // ♄
  uranus: 0x2645,     // ♅
  neptune: 0x2646,    // ♆
  pluto: 0x2BD3,      // ⯓ (Astro-Seek style)
  northNode: 0x260A,  // ☊
  chiron: 0x26B7,     // ⚷
};

// Unicode codepoints for zodiac sign glyphs
const SIGN_CODEPOINTS = {
  aries: 0x2648,
  taurus: 0x2649,
  gemini: 0x264A,
  cancer: 0x264B,
  leo: 0x264C,
  virgo: 0x264D,
  libra: 0x264E,
  scorpio: 0x264F,
  sagittarius: 0x2650,
  capricorn: 0x2651,
  aquarius: 0x2652,
  pisces: 0x2653,
};

function extractGlyph(name, codepoint) {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  if (!glyph || glyph.index === 0) {
    console.error(`WARNING: No glyph found for ${name} (U+${codepoint.toString(16).toUpperCase()})`);
    return null;
  }

  const path = glyph.getPath(0, 0, font.unitsPerEm);
  const d = path.toPathData(0); // 0 decimal places for integer coords
  if (!d || d === '') {
    console.error(`WARNING: Empty path for ${name}`);
    return null;
  }

  // Compute bounding box
  const bb = path.getBoundingBox();
  const x = Math.floor(bb.x1);
  const y = Math.floor(bb.y1);
  const w = Math.ceil(bb.x2) - x;
  const h = Math.ceil(bb.y2) - y;
  const viewBox = `${x} ${y} ${w} ${h}`;

  return { d, viewBox };
}

function formatEntry(name, data) {
  if (!data) return `  // ${name}: not found in font`;
  return `  ${name}: {\n    d: '${data.d}',\n    viewBox: '${data.viewBox}',\n  },`;
}

console.log('// Noto Sans Symbols 2 — Planet glyph SVG paths');
console.log('export const NOTO_PLANET_GLYPH_PATHS: Record<string, { d: string; viewBox: string }> = {');
for (const [name, cp] of Object.entries(PLANET_CODEPOINTS)) {
  const data = extractGlyph(name, cp);
  console.log(formatEntry(name, data));
}
console.log('};\n');

console.log('// Noto Sans Symbols 2 — Zodiac sign SVG paths');
console.log('export const NOTO_SIGN_GLYPH_PATHS: Record<string, { d: string; viewBox: string }> = {');
for (const [name, cp] of Object.entries(SIGN_CODEPOINTS)) {
  const data = extractGlyph(name, cp);
  console.log(formatEntry(name, data));
}
console.log('};');
