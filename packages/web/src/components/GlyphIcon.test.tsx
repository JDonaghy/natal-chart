import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlanetGlyphIcon } from './GlyphIcon';
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
