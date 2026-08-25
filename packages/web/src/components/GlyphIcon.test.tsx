import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { getPlanetPath, getSignPathByIndex } from '../utils/astro-glyph-paths';
import { getPlanetGlyphScale } from '../utils/symbols';

// --- issue #32: Chiron's glyph was cut off top and bottom everywhere
// PlanetGlyphIcon rendered it (planet position list, aspect table, transit
// planet-position list). Chiron's PLANET_GLYPH_SCALE (1.25) makes GlyphIcon
// zoom in by shrinking its declared viewBox; with zero margin in the source
// data, that shrink cropped straight into the glyph's own path.
//
// Round 2 finding: the fix only patched `classic`'s viewBox — the same
// zero-margin bug was still live in `modern`, `astronomicon`, and
// `dejavu-full`, all of which are selectable from Preferences. This test
// covers every registered glyph source, not just DEFAULT_GLYPH_SET. --------

// Tight (zero-margin) bounding box of Chiron's path in each source, as it
// was declared pre-fix — the invariant under test is that each source's
// *current* viewBox, once shrunk by the scale factor, still fully contains
// this box on both axes.
const CHIRON_TIGHT_BOUNDS: Record<string, { w: number; h: number }> = {
  classic: { w: 820, h: 1667 },
  modern: { w: 416, h: 736 },
  'dejavu-full': { w: 820, h: 1667 },
  astronomicon: { w: 466, h: 850 },
};

describe('PlanetGlyphIcon — Chiron does not clip (issue #32)', () => {
  for (const [glyphSet, tight] of Object.entries(CHIRON_TIGHT_BOUNDS)) {
    describe(`glyphSet=${glyphSet}`, () => {
      it('pads the declared viewBox enough that shrinking it by the scale factor does not crop the path', () => {
        const path = getPlanetPath('chiron', glyphSet, {});
        expect(path).toBeDefined();
        const [, , w, h] = path!.viewBox.split(' ').map(Number);
        const scale = getPlanetGlyphScale('chiron');
        expect(w! / scale).toBeGreaterThanOrEqual(tight.w);
        expect(h! / scale).toBeGreaterThanOrEqual(tight.h);
      });

      it('renders an adjusted viewBox that fully contains the known tight glyph bounds', () => {
        const { container } = render(<PlanetGlyphIcon planet="chiron" glyphSet={glyphSet} />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        const [, , w, h] = svg!.getAttribute('viewBox')!.split(' ').map(Number);
        expect(w!).toBeGreaterThanOrEqual(tight.w);
        expect(h!).toBeGreaterThanOrEqual(tight.h);
      });
    });
  }
});

// --- issue #36: Lilith and Vertex rendered black on the planet-positions
// list. Neither has SVG path data in any glyph source, so PlanetGlyphIcon
// always falls back to a text <span>, and that fallback's inline style never
// included the `color` prop — it silently ignored whatever color the caller
// passed and rendered in the browser default (black) instead. Verify the
// fallback span now honors `color` for both PlanetGlyphIcon and the
// analogous SignGlyphIcon fallback. -----------------------------------------
describe('text-fallback glyphs honor the color prop (issue #36)', () => {
  it('PlanetGlyphIcon applies color to the fallback span for planets with no path data', () => {
    // lilith and vertex have no path data in any registered glyph source,
    // so this always exercises the text-fallback branch.
    expect(getPlanetPath('lilith', 'classic', {})).toBeUndefined();
    const { container } = render(<PlanetGlyphIcon planet="lilith" color="#D4761C" />);
    expect(container.querySelector('svg')).toBeNull();
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.color).toBe('rgb(212, 118, 28)');
  });

  it('PlanetGlyphIcon applies color to the fallback span for vertex', () => {
    expect(getPlanetPath('vertex', 'classic', {})).toBeUndefined();
    const { container } = render(<PlanetGlyphIcon planet="vertex" color="#D4761C" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.color).toBe('rgb(212, 118, 28)');
  });

  it('SignGlyphIcon applies color to its fallback span when no sign matches', () => {
    const { container } = render(<SignGlyphIcon sign="not-a-real-sign" color="#D4761C" />);
    expect(container.querySelector('svg')).toBeNull();
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.color).toBe('rgb(212, 118, 28)');
  });
});

// --- issue #57 round 2 (review): the initial fix only thinned ChartWheel's
// planet-glyph stroke. GlyphIcon.tsx's PlanetGlyphIcon/SignGlyphIcon (used
// in tables/legends per the issue's own "Done when" section) are plain
// filled paths with no stroke to thin, and a background-colored erosion
// stroke isn't safe here — these icons render on inconsistent surfaces
// (page background, card background, hardcoded-color badges) across 8 theme
// presets including dark ones. GLYPH_BOLDNESS_SCALE (0.94) shrinks the
// rendered glyph slightly instead, which reads lighter without materially
// moving its center. ----------------------------------------------------
describe('glyphs shrink slightly for a lighter read on mobile (issue #57)', () => {
  it('PlanetGlyphIcon pads the viewBox further for a planet with no per-planet scale factor', () => {
    // 'sun' isn't in PLANET_GLYPH_SCALE, so its scale factor is 1 pre-#57 —
    // isolates GLYPH_BOLDNESS_SCALE's own effect from per-planet weight
    // normalization.
    const raw = getPlanetPath('sun', 'classic', {})!;
    const [, , vbW, vbH] = raw.viewBox.split(' ').map(Number);
    const { container } = render(<PlanetGlyphIcon planet="sun" />);
    const svg = container.querySelector('svg')!;
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    // newW = vbW / (scaleFactor * GLYPH_BOLDNESS_SCALE); scaleFactor is 1 for
    // sun, so this isolates the 0.94 factor directly.
    expect(w!).toBeCloseTo(vbW! / 0.94, 5);
    expect(h!).toBeCloseTo(vbH! / 0.94, 5);
    // Sanity: strictly bigger viewBox than the unscaled path (i.e. the
    // rendered glyph is strictly smaller than before #57).
    expect(w!).toBeGreaterThan(vbW!);
  });

  it('PlanetGlyphIcon shrinks the text-fallback glyph and sets a lighter font-weight', () => {
    // lilith has no path data in any source, so this always exercises the
    // text-fallback branch. Its PLANET_GLYPH_SCALE is 1.2.
    const { container } = render(<PlanetGlyphIcon planet="lilith" size={100} />);
    const span = container.querySelector('span')!;
    expect(span).not.toBeNull();
    expect(span.style.fontWeight).toBe('300');
    // fallbackSize = size * TEXT_FALLBACK_SCALE(1.4) * scaleFactor(1.2 * 0.94)
    const expected = 100 * 1.4 * (1.2 * 0.94);
    expect(parseFloat(span.style.fontSize)).toBeCloseTo(expected, 5);
  });

  it('SignGlyphIcon pads its viewBox by GLYPH_BOLDNESS_SCALE', () => {
    const raw = getSignPathByIndex(0, 'classic', {})!; // aries
    const [, , vbW, vbH] = raw.viewBox.split(' ').map(Number);
    const { container } = render(<SignGlyphIcon sign="aries" />);
    const svg = container.querySelector('svg')!;
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w!).toBeCloseTo(vbW! / 0.94, 5);
    expect(h!).toBeCloseTo(vbH! / 0.94, 5);
  });

  it('SignGlyphIcon shrinks its text-fallback glyph and sets a lighter font-weight', () => {
    const { container } = render(<SignGlyphIcon sign="not-a-real-sign" />);
    const span = container.querySelector('span')!;
    expect(span).not.toBeNull();
    expect(span.style.fontWeight).toBe('300');
    expect(span.style.fontSize).toBe('0.94em');
  });
});
