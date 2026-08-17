import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { getPlanetPath } from '../utils/astro-glyph-paths';
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
