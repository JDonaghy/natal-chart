import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PLANET_SYMBOLS,
  SIGN_SYMBOLS,
  ASPECT_SYMBOLS,
  ASPECT_COLORS,
  PTOLEMAIC_ASPECTS,
  UNKNOWN_SYMBOL,
  getPlanetGlyph,
  getAspectGlyph,
  getPlanetGlyphScale,
  formatPlanetName,
} from './symbols';

// ---------------------------------------------------------------------------
// Minimal TrueType cmap reader.
//
// The PDF export embeds public/fonts/DejaVuSans.ttf and draws the symbols in
// this module with it. A symbol whose code point is absent from that font
// renders as *nothing* in the PDF while still looking fine on screen, which is
// exactly the Pluto bug in issue #28 (U+2BD3 is not in DejaVu). Reading the
// real font's cmap is the only way to catch that class of drift, so we do it
// here rather than taking a dependency on a font-parsing library.
// ---------------------------------------------------------------------------

/** The very font `pdfExport.ts` fetches from `./fonts/` and embeds. */
const FONT_PATH = (() => {
  // vitest runs with cwd = packages/web; tolerate a repo-root runner too.
  for (const candidate of ['public/fonts/DejaVuSans.ttf', 'packages/web/public/fonts/DejaVuSans.ttf']) {
    const abs = resolve(process.cwd(), candidate);
    if (existsSync(abs)) return abs;
  }
  throw new Error('DejaVuSans.ttf not found relative to ' + process.cwd());
})();

function loadCoveredCodePoints(): Set<number> {
  const buf = readFileSync(FONT_PATH);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Table directory: sfntVersion(4) numTables(2) searchRange(2)
  // entrySelector(2) rangeShift(2), then 16-byte records.
  const numTables = view.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(rec), view.getUint8(rec + 1), view.getUint8(rec + 2), view.getUint8(rec + 3),
    );
    if (tag === 'cmap') {
      cmapOffset = view.getUint32(rec + 8);
      break;
    }
  }
  if (cmapOffset < 0) throw new Error(`No cmap table in ${FONT_PATH}`);

  // Pick a Unicode BMP subtable: (3,1) Windows/Unicode-BMP, else (0,*).
  const numSubtables = view.getUint16(cmapOffset + 2);
  let subtableOffset = -1;
  for (let i = 0; i < numSubtables; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const platformId = view.getUint16(rec);
    const encodingId = view.getUint16(rec + 2);
    const offset = cmapOffset + view.getUint32(rec + 4);
    if (platformId === 3 && encodingId === 1) { subtableOffset = offset; break; }
    if (platformId === 0 && subtableOffset < 0) subtableOffset = offset;
  }
  if (subtableOffset < 0) throw new Error(`No Unicode cmap subtable in ${FONT_PATH}`);

  const format = view.getUint16(subtableOffset);
  if (format !== 4) throw new Error(`Unsupported cmap format ${format} in ${FONT_PATH}`);

  // Format 4: segment mapping to delta values.
  const segCount = view.getUint16(subtableOffset + 6) / 2;
  const endCodes = subtableOffset + 14;
  const startCodes = endCodes + segCount * 2 + 2; // + reservedPad
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  const covered = new Set<number>();
  for (let seg = 0; seg < segCount; seg++) {
    const end = view.getUint16(endCodes + seg * 2);
    const start = view.getUint16(startCodes + seg * 2);
    if (start === 0xffff) continue;
    const delta = view.getInt16(idDeltas + seg * 2);
    const rangeOffsetPos = idRangeOffsets + seg * 2;
    const rangeOffset = view.getUint16(rangeOffsetPos);

    for (let cp = start; cp <= end; cp++) {
      let glyphId: number;
      if (rangeOffset === 0) {
        glyphId = (cp + delta) & 0xffff;
      } else {
        const glyphIndexPos = rangeOffsetPos + rangeOffset + (cp - start) * 2;
        if (glyphIndexPos + 1 >= buf.byteLength) continue;
        const raw = view.getUint16(glyphIndexPos);
        glyphId = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyphId !== 0) covered.add(cp);
    }
  }
  return covered;
}

const COVERED = loadCoveredCodePoints();

function missingCodePoints(text: string): string[] {
  return [...text]
    .filter((ch) => !COVERED.has(ch.codePointAt(0)!))
    .map((ch) => `${ch} (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`);
}

describe('shared symbol table', () => {
  it('reads a plausible cmap out of the bundled DejaVuSans (sanity check)', () => {
    // If this fails the parser is broken, not the symbol table.
    expect(COVERED.size).toBeGreaterThan(1000);
    expect(COVERED.has('A'.codePointAt(0)!)).toBe(true);
    // The Pluto code point the PDF used to use — the bug that started #28.
    expect(COVERED.has(0x2bd3)).toBe(false);
  });

  it('every planet symbol exists in the PDF font', () => {
    for (const [planet, symbol] of Object.entries(PLANET_SYMBOLS)) {
      expect(missingCodePoints(symbol), `${planet} → ${symbol}`).toEqual([]);
    }
  });

  it('every sign symbol exists in the PDF font', () => {
    for (const [sign, symbol] of Object.entries(SIGN_SYMBOLS)) {
      expect(missingCodePoints(symbol), `${sign} → ${symbol}`).toEqual([]);
    }
  });

  it('every aspect symbol exists in the PDF font', () => {
    for (const [aspect, symbol] of Object.entries(ASPECT_SYMBOLS)) {
      expect(missingCodePoints(symbol), `${aspect} → ${symbol}`).toEqual([]);
    }
  });

  it('carries the symbols the PDF used to get wrong', () => {
    // Lot of Fortune: circled x on both surfaces (the PDF used a circled plus).
    expect(getPlanetGlyph('fortune')).toBe('⊗');
    // Lot of Spirit: was absent from the PDF map, falling back to a plain circle.
    expect(getPlanetGlyph('spirit')).toBe('Φ');
    expect(getPlanetGlyph('spirit')).not.toBe(UNKNOWN_SYMBOL);
    // Pluto: was mapped to a code point DejaVu doesn't have, so it drew nothing.
    expect(getPlanetGlyph('pluto')).toBe('♇');
    // South Node: new, and the mirror of the North Node's symbol.
    expect(getPlanetGlyph('southNode')).toBe('☋');
    expect(getPlanetGlyph('northNode')).toBe('☊');
  });

  it('orders Pluto between Neptune and the North Node', () => {
    const keys = Object.keys(PLANET_SYMBOLS);
    expect(keys.indexOf('pluto')).toBe(keys.indexOf('neptune') + 1);
    expect(keys.indexOf('northNode')).toBe(keys.indexOf('pluto') + 1);
  });
});

describe('five-aspect set', () => {
  it('defines exactly the five Ptolemaic aspects', () => {
    expect([...PTOLEMAIC_ASPECTS]).toEqual([
      'conjunction', 'opposition', 'trine', 'square', 'sextile',
    ]);
    expect(Object.keys(ASPECT_SYMBOLS).sort()).toEqual([...PTOLEMAIC_ASPECTS].sort());
    expect(Object.keys(ASPECT_COLORS).sort()).toEqual([...PTOLEMAIC_ASPECTS].sort());
  });

  it('has no symbol or colour for the removed minor aspects', () => {
    for (const removed of ['quincunx', 'semiSextile', 'parallel', 'contraparallel']) {
      expect(ASPECT_SYMBOLS[removed as never], removed).toBeUndefined();
      expect(ASPECT_COLORS[removed as never], removed).toBeUndefined();
      // …and asking for one yields the generic marker, not a real glyph.
      expect(getAspectGlyph(removed), removed).toBe('•');
    }
  });
});

describe('glyph sizing', () => {
  it('scales the North Node down so it sits with its neighbours', () => {
    // It used to be 1.15, i.e. deliberately *larger* than everything around it.
    expect(getPlanetGlyphScale('northNode')).toBeLessThan(1);
    expect(getPlanetGlyphScale('southNode')).toBe(getPlanetGlyphScale('northNode'));
  });

  it('scales the Vertex marker down to match the glyphs beside it', () => {
    expect(getPlanetGlyphScale('vertex')).toBeLessThan(1);
  });

  it('leaves planets without an entry at 1x', () => {
    expect(getPlanetGlyphScale('sun')).toBe(1);
    expect(getPlanetGlyphScale('mars')).toBe(1);
  });
});

describe('planet names', () => {
  it('names every calculated point, including the ones the PDF map missed', () => {
    expect(formatPlanetName('northNode')).toBe('North Node');
    expect(formatPlanetName('southNode')).toBe('South Node');
    expect(formatPlanetName('spirit')).toBe('Spirit');
    expect(formatPlanetName('fortune')).toBe('Fortune');
    expect(formatPlanetName('sun')).toBe('Sun');
  });
});
