/**
 * Guard test for issue #44.
 *
 * `ReleasingTimeline.tsx` and `ReleasingView.tsx` were missed by the
 * font-independent-rendering migration (v0.11.1, 631c5dc) and kept emitting
 * raw Unicode zodiac characters. On Linux/Android/ChromeOS, whose default
 * emoji font covers U+2648–U+2653 (`Emoji_Presentation=Yes`), that renders as
 * a colour emoji badge instead of the parchment-and-gold glyph everywhere
 * else uses. A customer reported it five months after the migration; nothing
 * in the test suite could have caught it because #28 consolidated the *data*
 * (the symbol table) without consolidating the *rendering path*.
 *
 * This is a source scan rather than a render assertion deliberately: a
 * render-assertion guard only protects views a test happens to mount, and
 * that is exactly the property that let this bug hide for five months. A
 * scan over every .ts/.tsx file protects the next view too, before it ever
 * renders.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

// vitest runs with cwd = packages/web; tolerate a repo-root runner too (same
// pattern as utils/symbols.test.ts).
const SRC_ROOT = (() => {
  for (const candidate of ['src', 'packages/web/src']) {
    const abs = resolve(process.cwd(), candidate);
    if (statSync(abs, { throwIfNoEntry: false })?.isDirectory()) return abs;
  }
  throw new Error('packages/web/src not found relative to ' + process.cwd());
})();

/** The twelve zodiac sign code points — Emoji_Presentation=Yes, so a raw one
 *  renders as an OS colour-emoji badge wherever the author's font is missing. */
const ZODIAC_RANGE = /[♈-♓]/u;

/** Planet / node / point symbols. Not emoji-presentation, so a raw one is a
 *  font-independence *consistency* gap rather than a visible colour-emoji bug
 *  — included at lower severity per issue #44. */
const PLANET_CODEPOINTS = [
  0x2609, // sun
  0x263d, // moon
  0x263f, // mercury
  0x2640, // venus
  0x2642, // mars
  0x2643, // jupiter
  0x2644, // saturn
  0x2645, // uranus
  0x2646, // neptune
  0x2647, // pluto
  0x260a, // north node
  0x260b, // south node
  0x26b7, // chiron
  0x26b8, // lilith
] as const;
const PLANET_RANGE = new RegExp(
  `[${PLANET_CODEPOINTS.map((cp) => `\\u${cp.toString(16).padStart(4, '0')}`).join('')}]`,
  'u',
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function pathSegments(relPath: string): string[] {
  return relPath.split(sep);
}

function isTestFile(relPath: string): boolean {
  return /\.(test|spec)\.(ts|tsx)$/.test(basename(relPath)) || pathSegments(relPath).includes('__tests__');
}

/** Files that render astrological symbols entirely through GlyphIcon.tsx (or
 *  are the shared symbol table / test files themselves) are exempt from the
 *  zodiac-range scan. */
function isExemptFromZodiacScan(relPath: string): boolean {
  const base = basename(relPath);
  if (base === 'GlyphIcon.tsx') return true; // the rendering path itself
  if (relPath === join('utils', 'symbols.ts')) return true; // the symbol table itself
  return isTestFile(relPath);
}

/**
 * Deliberate allow-list, per issue #44: `Layout.tsx` has a decorative header
 * strip ("☉ ☽ ☿ ♀ ♂ ♃ ♄") that is intentionally plain text, not a rendered
 * chart element. It is outside the zodiac range (which always fails the
 * build) and is allow-listed explicitly here — by name, with this comment —
 * rather than by narrowing PLANET_RANGE to dodge it by accident.
 */
const PLANET_SCAN_ALLOWLIST = new Set<string>([join('components', 'Layout.tsx')]);

function isExemptFromPlanetScan(relPath: string): boolean {
  if (isExemptFromZodiacScan(relPath)) return true;
  return PLANET_SCAN_ALLOWLIST.has(relPath);
}

function findMatches(text: string, pattern: RegExp): string[] {
  return [...text].filter((ch) => pattern.test(ch));
}

function formatMatches(matches: string[]): string {
  return matches
    .map((ch) => `${ch} (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`)
    .join(', ');
}

const allFiles = walk(SRC_ROOT).map((abs) => ({ abs, rel: relative(SRC_ROOT, abs) }));

describe('no raw astrological code points outside GlyphIcon (issue #44)', () => {
  it('scans a plausible number of files (sanity check on the walker)', () => {
    // If this drops near zero, the walker is broken, not the tree clean.
    expect(allFiles.length).toBeGreaterThan(20);
  });

  const zodiacCandidates = allFiles.filter((f) => !isExemptFromZodiacScan(f.rel));

  it.each(zodiacCandidates.map((f) => [f.rel, f.abs] as const))(
    '%s has no raw zodiac sign code points (U+2648–U+2653)',
    (rel, abs) => {
      const text = readFileSync(abs, 'utf8');
      const matches = findMatches(text, ZODIAC_RANGE);
      expect(
        matches,
        `${rel} renders a raw zodiac code point as text: ${formatMatches(matches)}. ` +
          `These are Emoji_Presentation=Yes, so any browser whose emoji font covers ` +
          `U+2648–U+2653 (Linux, Android, ChromeOS) substitutes a colour-emoji badge for ` +
          `it instead of the intended glyph (issue #44). Use <SignGlyphIcon sign="..." /> ` +
          `from packages/web/src/components/GlyphIcon.tsx instead of embedding the ` +
          `Unicode character directly.`,
      ).toEqual([]);
    },
  );

  const planetCandidates = allFiles.filter((f) => !isExemptFromPlanetScan(f.rel));

  it.each(planetCandidates.map((f) => [f.rel, f.abs] as const))(
    '%s has no raw planet/node/point code points (lower severity: text, not emoji, but still font-dependent)',
    (rel, abs) => {
      const text = readFileSync(abs, 'utf8');
      const matches = findMatches(text, PLANET_RANGE);
      expect(
        matches,
        `${rel} renders a raw planet/node symbol as text: ${formatMatches(matches)}. ` +
          `These render as monochrome text rather than a colour-emoji badge, so this is a ` +
          `font-independence consistency gap rather than a visible bug — but the fix is the ` +
          `same one from issue #44: use <PlanetGlyphIcon planet="..." /> from ` +
          `packages/web/src/components/GlyphIcon.tsx instead of embedding the Unicode ` +
          `character directly. If this file intentionally renders decorative text (not a ` +
          `chart element), add it to PLANET_SCAN_ALLOWLIST in this test with a comment ` +
          `explaining why.`,
      ).toEqual([]);
    },
  );
});

describe('detector sanity (in-memory fixtures, not real source files)', () => {
  // These prove the scanner itself would catch the #44 defect — without
  // reintroducing it into a real component to do so.
  it('flags a raw zodiac character the way it would in a reintroduced bug', () => {
    const fixture = `export const Bad = () => <span>{'♊'}</span>;`;
    expect(findMatches(fixture, ZODIAC_RANGE)).toEqual(['♊']);
  });

  it('does not flag SignGlyphIcon usage', () => {
    const fixture = `<SignGlyphIcon sign="gemini" size="1rem" />`;
    expect(findMatches(fixture, ZODIAC_RANGE)).toEqual([]);
  });

  it('flags a raw planet character', () => {
    const fixture = `const s = '☉';`;
    expect(findMatches(fixture, PLANET_RANGE)).toEqual(['☉']);
  });

  it('does not flag PlanetGlyphIcon usage', () => {
    const fixture = `<PlanetGlyphIcon planet="sun" />`;
    expect(findMatches(fixture, PLANET_RANGE)).toEqual([]);
  });
});
