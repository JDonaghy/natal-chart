import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlanetGlyphIcon } from './GlyphIcon';
import { getPlanetPath, DEFAULT_GLYPH_SET } from '../utils/astro-glyph-paths';
import { getPlanetGlyphScale } from '../utils/symbols';

// --- issue #32: Chiron's glyph was cut off top and bottom everywhere
// PlanetGlyphIcon rendered it (planet position list, aspect table, transit
// planet-position list). Chiron's PLANET_GLYPH_SCALE (1.25) makes GlyphIcon
// zoom in by shrinking its declared viewBox; with zero margin in the source
// data, that shrink cropped straight into the glyph's own path. -----------

describe('PlanetGlyphIcon — Chiron does not clip (issue #32)', () => {
  it('pads the declared viewBox enough that shrinking it by the scale factor does not crop the path', () => {
    const path = getPlanetPath('chiron', DEFAULT_GLYPH_SET, {});
    expect(path).toBeDefined();
    const [, , w, h] = path!.viewBox.split(' ').map(Number);
    const scale = getPlanetGlyphScale('chiron');
    // The tight bounding box of chiron's path is 820×1667 — pre-fix, the
    // declared viewBox *was* that tight box, so dividing by scale (1.25)
    // shrank the visible window below it on both axes and cropped the glyph.
    expect(w! / scale).toBeGreaterThanOrEqual(820);
    expect(h! / scale).toBeGreaterThanOrEqual(1667);
  });

  it('renders an adjusted viewBox that fully contains the known tight glyph bounds', () => {
    const { container } = render(<PlanetGlyphIcon planet="chiron" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const [, , w, h] = svg!.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w!).toBeGreaterThanOrEqual(820);
    expect(h!).toBeGreaterThanOrEqual(1667);
  });
});
