/**
 * Extract normalized SVG path data from Kibo/AstroChart svg.ts.
 * The paths use relative `m x, y ...` with position baked in.
 * We normalize by setting the initial moveto to 0,0 and computing the bounding box.
 */
import { readFileSync } from 'fs';

const src = readFileSync('/tmp/astrochart-svg.ts', 'utf-8');

// Map of method names to our glyph names
const PLANET_MAP = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn',
  uranus: 'uranus', neptune: 'neptune', pluto: 'pluto',
  chiron: 'chiron', lilith: 'lilith', nnode: 'northNode',
  fortune: 'fortune',
};

const SIGN_MAP = {
  aries: 'aries', taurus: 'taurus', gemini: 'gemini', cancer: 'cancer',
  leo: 'leo', virgo: 'virgo', libra: 'libra', scorpio: 'scorpio',
  sagittarius: 'sagittarius', capricorn: 'capricorn', aquarius: 'aquarius',
  pisces: 'pisces',
};

// Extract all path d attributes from the source
// Pattern: node.setAttribute('d', 'm' + x + ', ' + y + ' REST')
// We want the REST part (relative commands after the initial moveto)
const pathRegex = /(\w+)\(x:\s*number,\s*y:\s*number\)[\s\S]*?\.setAttribute\('d',\s*'m'\s*\+\s*x\s*\+\s*',\s*'\s*\+\s*y\s*\+\s*'\s*(.*?)'\)/g;

const glyphs = {};
let match;

while ((match = pathRegex.exec(src)) !== null) {
  const funcName = match[1].toLowerCase();
  const relPath = match[2].trim();

  // Build a full path starting at 0,0
  const fullPath = `m0,0 ${relPath}`;

  glyphs[funcName] = fullPath;
}

// For multi-path glyphs, collect additional paths
// Some glyphs have multiple node.setAttribute('d', ...) calls
const multiPathRegex = /(\w+)\(x:\s*number,\s*y:\s*number\)[\s\S]*?return\s+wrapper/g;

function extractAllPaths(funcBody) {
  const paths = [];
  // Match: 'm' + x + ', ' + y + ' REST' or 'm ' + x + ', ' + y + ' REST'
  const dRegex = /setAttribute\('d',\s*'m\s*'\s*\+\s*x\s*\+\s*',\s*'\s*\+\s*y\s*\+\s*'\s*(.*?)'\)/g;
  let m;
  while ((m = dRegex.exec(funcBody)) !== null) {
    paths.push(`m0,0 ${m[1].trim()}`);
  }
  // Also match patterns with (y + offset) or similar expressions
  const altRegex = /setAttribute\('d',\s*'m\s*'\s*\+\s*x\s*\+\s*',\s*'\s*\+\s*\([^)]+\)\s*\+\s*'\s*(.*?)'\)/g;
  while ((m = altRegex.exec(funcBody)) !== null) {
    if (!paths.some(p => p.includes(m[1].trim()))) {
      paths.push(`m0,0 ${m[1].trim()}`);
    }
  }
  return paths;
}

// Re-extract with full function bodies
// Match glyph functions (exclude createRectForClick which also takes x,y)
const funcRegex = /\n\s{2}(\w+)\(x:\s*number,\s*y:\s*number\):\s*Element\s*\{([\s\S]*?)return\s+wrapper/g;
const allGlyphs = {};

while ((match = funcRegex.exec(src)) !== null) {
  const funcName = match[1].toLowerCase();
  const body = match[2];
  const paths = extractAllPaths(body);
  if (paths.length > 0) {
    allGlyphs[funcName] = paths.join(' ');
  }
}

/**
 * Compute approximate bounding box of an SVG path by parsing commands.
 * This is a simplified parser for relative commands.
 */
function computeBBox(d) {
  let x = 0, y = 0;
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  // Tokenize
  const tokens = d.replace(/,/g, ' ').replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/);
  let i = 0;
  let cmd = '';

  function updateBounds() {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t) && t.length === 1) {
      cmd = t;
      i++;
    }

    switch (cmd) {
      case 'm': case 'l':
        x += parseFloat(tokens[i] || '0');
        y += parseFloat(tokens[i+1] || '0');
        updateBounds();
        i += 2;
        if (cmd === 'm') cmd = 'l'; // implicit lineto after moveto
        break;
      case 'M': case 'L':
        x = parseFloat(tokens[i] || '0');
        y = parseFloat(tokens[i+1] || '0');
        updateBounds();
        i += 2;
        break;
      case 'a':
        // a rx ry xrot large-arc sweep dx dy
        x += parseFloat(tokens[i+5] || '0');
        y += parseFloat(tokens[i+6] || '0');
        // Also account for arc extent (approximate with center)
        const arx = parseFloat(tokens[i] || '0');
        const ary = parseFloat(tokens[i+1] || '0');
        minX = Math.min(minX, x - arx);
        minY = Math.min(minY, y - ary);
        maxX = Math.max(maxX, x + arx);
        maxY = Math.max(maxY, y + ary);
        updateBounds();
        i += 7;
        break;
      case 'A':
        x = parseFloat(tokens[i+5] || '0');
        y = parseFloat(tokens[i+6] || '0');
        updateBounds();
        i += 7;
        break;
      case 'c':
        // cubic bezier: dx1 dy1 dx2 dy2 dx dy
        x += parseFloat(tokens[i+4] || '0');
        y += parseFloat(tokens[i+5] || '0');
        updateBounds();
        i += 6;
        break;
      case 'z': case 'Z':
        break;
      default:
        i++;
    }
  }

  const pad = 1;
  return {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    w: Math.ceil(maxX - minX + pad * 2),
    h: Math.ceil(maxY - minY + pad * 2),
  };
}

// Manually add sun (its function is consumed by createRectForClick's greedy match)
allGlyphs['sun'] = 'm0,0 -2.18182,0.727268 -2.181819,1.454543 -1.454552,2.18182 -0.727268,2.181819 0,2.181819 0.727268,2.181819 1.454552,2.18182 2.181819,1.454544 2.18182,0.727276 2.18181,0 2.18182,-0.727276 2.181819,-1.454544 1.454552,-2.18182 0.727268,-2.181819 0,-2.181819 -0.727268,-2.181819 -1.454552,-2.18182 -2.181819,-1.454543 -2.18182,-0.727268 -2.18181,0 m 0.727267,6.54545 -0.727267,0.727276 0,0.727275 0.727267,0.727268 0.727276,0 0.727267,-0.727268 0,-0.727275 -0.727267,-0.727276 -0.727276,0 m 0,0.727276 0,0.727275 0.727276,0 0,-0.727275 -0.727276,0';

// Output
const planets = {};
const signs = {};

for (const [funcName, pathD] of Object.entries(allGlyphs)) {
  const planetKey = PLANET_MAP[funcName];
  const signKey = SIGN_MAP[funcName];

  if (planetKey || signKey) {
    const bbox = computeBBox(pathD);
    const entry = {
      d: pathD,
      viewBox: `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`,
    };
    if (planetKey) {
      planets[planetKey] = entry;
      console.error(`  ✓ planet: ${planetKey}`);
    } else {
      signs[signKey] = entry;
      console.error(`  ✓ sign: ${signKey}`);
    }
  }
}

console.error(`\nExtracted: ${Object.keys(planets).length} planets, ${Object.keys(signs).length} signs`);

// Generate TypeScript
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
  id: 'astrochart',
  displayName: 'Geometric (AstroChart)',
  planets,
  signs,
});
`;

process.stdout.write(output);
