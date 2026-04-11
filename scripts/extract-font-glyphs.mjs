/**
 * Extract SVG path data from any TTF/OTF font for astrological glyphs.
 *
 * Usage:
 *   node scripts/extract-font-glyphs.mjs --font <path> --source-id <id> --display-name <name> --output <path>
 *
 * Example:
 *   node scripts/extract-font-glyphs.mjs \
 *     --font /tmp/Symbola.otf \
 *     --source-id symbola \
 *     --display-name "Symbola" \
 *     --output packages/web/src/utils/glyphs/sources/symbola.ts
 */
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'fs';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    font: { type: 'string' },
    'source-id': { type: 'string' },
    'display-name': { type: 'string' },
    output: { type: 'string' },
  },
});

const fontPath = values.font;
const sourceId = values['source-id'];
const displayName = values['display-name'];
const outputPath = values.output;

if (!fontPath || !sourceId || !displayName || !outputPath) {
  console.error('Usage: --font <path> --source-id <id> --display-name <name> --output <path>');
  process.exit(1);
}

const buffer = readFileSync(fontPath);
const font = opentype.parse(buffer.buffer);

// Unicode codepoints for planet glyphs (primary + alternate)
const PLANET_CODEPOINTS = {
  sun:       [0x2609],             // ☉
  moon:      [0x263D],             // ☽
  mercury:   [0x263F],             // ☿
  venus:     [0x2640],             // ♀
  mars:      [0x2642],             // ♂
  jupiter:   [0x2643],             // ♃
  saturn:    [0x2644],             // ♄
  uranus:    [0x2645],             // ♅
  neptune:   [0x2646],             // ♆
  pluto:     [0x2BD3, 0x2647],     // ⯓ (preferred), ♇ (alternate)
  northNode: [0x260A],             // ☊
  chiron:    [0x26B7],             // ⚷
  lilith:    [0x26B8],             // ⚸
  fortune:   [0x2295],             // ⊕
};

// Unicode codepoints for zodiac sign glyphs
const SIGN_CODEPOINTS = {
  aries:       0x2648,
  taurus:      0x2649,
  gemini:      0x264A,
  cancer:      0x264B,
  leo:         0x264C,
  virgo:       0x264D,
  libra:       0x264E,
  scorpio:     0x264F,
  sagittarius: 0x2650,
  capricorn:   0x2651,
  aquarius:    0x2652,
  pisces:      0x2653,
};

function extractGlyph(name, codepoints) {
  const cps = Array.isArray(codepoints) ? codepoints : [codepoints];
  for (const cp of cps) {
    const glyph = font.charToGlyph(String.fromCodePoint(cp));
    if (!glyph || glyph.index === 0) continue;

    const path = glyph.getPath(0, 0, font.unitsPerEm);
    const d = path.toPathData(0);
    if (!d || d === '') continue;

    const bb = path.getBoundingBox();
    const x = Math.floor(bb.x1);
    const y = Math.floor(bb.y1);
    const w = Math.ceil(bb.x2) - x;
    const h = Math.ceil(bb.y2) - y;

    if (w === 0 || h === 0) continue;

    console.error(`  ✓ ${name} (U+${cp.toString(16).toUpperCase()})`);
    return { d, viewBox: `${x} ${y} ${w} ${h}` };
  }
  console.error(`  ✗ ${name} — not found`);
  return null;
}

// Extract all glyphs
console.error(`Extracting from: ${fontPath}`);
console.error(`Source: ${sourceId} (${displayName})\n`);

const planets = {};
let planetCount = 0;
console.error('Planets:');
for (const [name, cps] of Object.entries(PLANET_CODEPOINTS)) {
  const data = extractGlyph(name, cps);
  if (data) {
    planets[name] = data;
    planetCount++;
  }
}

const signs = {};
let signCount = 0;
console.error('\nSigns:');
for (const [name, cp] of Object.entries(SIGN_CODEPOINTS)) {
  const data = extractGlyph(name, cp);
  if (data) {
    signs[name] = data;
    signCount++;
  }
}

console.error(`\nExtracted: ${planetCount} planets, ${signCount} signs`);

if (planetCount === 0 && signCount === 0) {
  console.error('No glyphs found — skipping output.');
  process.exit(1);
}

// Generate TypeScript source file
let output = `import { registerSource } from '../registry';
import type { GlyphPath } from '../types';

const planets: Record<string, GlyphPath> = {
`;

for (const [name, data] of Object.entries(planets)) {
  output += `  ${name}: {\n    d: '${data.d}',\n    viewBox: '${data.viewBox}',\n  },\n`;
}

output += `};\n\nconst signs: Record<string, GlyphPath> = {\n`;

for (const [name, data] of Object.entries(signs)) {
  output += `  ${name}: {\n    d: '${data.d}',\n    viewBox: '${data.viewBox}',\n  },\n`;
}

output += `};

registerSource({
  id: '${sourceId}',
  displayName: '${displayName}',
  planets,
  signs,
});
`;

writeFileSync(outputPath, output);
console.error(`\nWritten to: ${outputPath}`);
