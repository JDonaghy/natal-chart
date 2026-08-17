import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AspectGrid } from './AspectGrid';
import { getAspectGlyph } from '../utils/chart-helpers';
import type { Aspect, ChartResult } from '@natal-chart/core';

// useResponsive() calls window.matchMedia at module-evaluation time and jsdom
// doesn't implement it, so the stub has to be installed before the imports
// above are evaluated — hence vi.hoisted().
vi.hoisted(() => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

const baseChart: Omit<ChartResult, 'aspects'> = {
  planets: [
    {
      planet: 'sun', longitude: 0, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'aries', degree: 0, minute: 0, house: 1, retrograde: false,
    },
    {
      planet: 'moon', longitude: 150, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'virgo', degree: 0, minute: 0, house: 6, retrograde: false,
    },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1, longitude: i * 30, sign: 'aries' as const, degree: 0, minute: 0,
  })),
  angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 },
  skippedPlanets: [],
};

function chartWith(aspects: Aspect[]): ChartResult {
  return { ...baseChart, aspects };
}

describe('AspectGrid — five Ptolemaic aspects only (issue #28)', () => {
  it('lists exactly the five Ptolemaic aspects in its legend', () => {
    const { container } = render(<AspectGrid chartData={chartWith([])} />);
    const legend = container.querySelector('div > div:last-child')!;
    const text = legend.textContent ?? '';

    for (const label of ['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile']) {
      expect(text, label).toContain(label);
    }
    for (const label of ['Quincunx', 'Semi-sextile', 'Parallel', 'Contraparallel']) {
      expect(text, label).not.toContain(label);
    }
  });

  it('draws a Ptolemaic aspect that is present in the data', () => {
    const { container } = render(<AspectGrid chartData={chartWith([
      { planet1: 'sun', planet2: 'moon', type: 'trine', angle: 120, orb: 1.2, applying: true, exact: false },
    ])} />);
    expect(container.textContent).toContain(getAspectGlyph('trine'));
  });

  it('drops a non-Ptolemaic aspect that somehow reaches it', () => {
    // Nothing produces these any more, but a stale saved chart or an
    // out-of-date core build could still hand one over — the grid must not
    // render it. (Cast: the type has been narrowed to the five.)
    const stale = {
      planet1: 'sun', planet2: 'moon', type: 'quincunx',
      angle: 150, orb: 0.4, applying: false, exact: false,
    } as unknown as Aspect;

    const { container } = render(<AspectGrid chartData={chartWith([stale])} />);

    // The 150° separation between Sun and Moon in the fixture is a quincunx
    // and nothing else, so the pair's cell must come out empty.
    expect(container.textContent).not.toContain('0.4°');
    expect(container.textContent).not.toContain('⚻');
  });
});

describe('the "show all aspects (including minor)" option is gone (issue #28)', () => {
  const read = (relative: string): string =>
    readFileSync(resolve(process.cwd(), relative), 'utf8');

  it('renders no aspect-set toggle', () => {
    const { container } = render(<AspectGrid chartData={chartWith([])} />);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('leaves no trace of the checkbox or its prop in the views that hosted it', () => {
    for (const file of ['src/components/ChartView.tsx', 'src/components/TransitView.tsx']) {
      const source = read(file);
      expect(source, file).not.toContain('Show all aspects');
      expect(source, file).not.toContain('showAllAspects');
      expect(source, file).not.toContain('ptolemaicOnly');
    }
  });

  it('no longer exposes a ptolemaicOnly prop on either grid', () => {
    for (const file of ['src/components/AspectGrid.tsx', 'src/components/TransitAspectGrid.tsx']) {
      expect(read(file), file).not.toContain('ptolemaicOnly');
    }
  });
});
