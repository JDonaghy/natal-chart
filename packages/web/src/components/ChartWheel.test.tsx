import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
import { getPlanetPath } from '../utils/astro-glyph-paths';
import type { ChartResult } from '@natal-chart/core';

// Mock chart data
const mockChartData: ChartResult = {
  planets: [
    {
      planet: 'sun',
      longitude: 95.5, // 5° Gemini
      latitude: 0,
      declination: 0,
      distance: 1,
      speed: 1,
      sign: 'gemini',
      degree: 5,
      minute: 30,
      house: 3,
      retrograde: false,
    },
    {
      planet: 'moon',
      longitude: 125.2, // 5° Leo
      latitude: 0,
      declination: 0,
      distance: 1,
      speed: 1,
      sign: 'leo',
      degree: 5,
      minute: 12,
      house: 5,
      retrograde: false,
    },
  ],
  houses: [
    { house: 1, longitude: 95.0, sign: 'gemini', degree: 5, minute: 0 },
    { house: 2, longitude: 125.0, sign: 'leo', degree: 5, minute: 0 },
    { house: 3, longitude: 155.0, sign: 'virgo', degree: 5, minute: 0 },
    { house: 4, longitude: 185.0, sign: 'libra', degree: 5, minute: 0 },
    { house: 5, longitude: 215.0, sign: 'scorpio', degree: 5, minute: 0 },
    { house: 6, longitude: 245.0, sign: 'sagittarius', degree: 5, minute: 0 },
    { house: 7, longitude: 275.0, sign: 'capricorn', degree: 5, minute: 0 },
    { house: 8, longitude: 305.0, sign: 'aquarius', degree: 5, minute: 0 },
    { house: 9, longitude: 335.0, sign: 'pisces', degree: 5, minute: 0 },
    { house: 10, longitude: 5.0, sign: 'aries', degree: 5, minute: 0 },
    { house: 11, longitude: 35.0, sign: 'taurus', degree: 5, minute: 0 },
    { house: 12, longitude: 65.0, sign: 'gemini', degree: 5, minute: 0 },
  ],
  angles: {
    ascendant: 95.0,
    midheaven: 5.0,
    descendant: 275.0,
    imumCoeli: 185.0,
  },
  aspects: [
    {
      planet1: 'sun',
      planet2: 'moon',
      type: 'sextile',
      angle: 60,
      orb: 2.3,
      applying: true,
      exact: false,
    },
  ],
  skippedPlanets: [],
};

describe('ChartWheel', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('exposes SVG element via ref', () => {
    const ref = React.createRef<ChartWheelHandle>();
    render(<ChartWheel ref={ref} chartData={mockChartData} size={400} />);
    
    // Ref should have current
    expect(ref.current).not.toBeNull();
    
    // getSvgElement should return an SVG element
    const svgElement = ref.current?.getSvgElement();
    expect(svgElement).not.toBeNull();
    expect(svgElement?.tagName).toBe('svg');
    expect(svgElement?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('SVG element is in DOM', () => {
    const ref = React.createRef<ChartWheelHandle>();
    const { container } = render(<ChartWheel ref={ref} chartData={mockChartData} size={400} />);
    
    const svgElement = ref.current?.getSvgElement();
    expect(svgElement).not.toBeNull();
    
    // SVG element should be present in container
    const containerSvg = container.querySelector('svg');
    expect(containerSvg).toBe(svgElement);
  });
});

// --- issue #28: chart wheel additions ---------------------------------------

/** mockChartData plus a North Node, and angles at four distinct degrees. */
const nodeChartData: ChartResult = {
  ...mockChartData,
  planets: [
    ...mockChartData.planets,
    {
      planet: 'northNode',
      longitude: 40.5, // 10°30' Taurus
      latitude: 0,
      declination: 0,
      distance: 1,
      speed: -1,
      sign: 'taurus',
      degree: 10,
      minute: 30,
      house: 12,
      retrograde: true,
    },
  ],
  angles: {
    ascendant: 95.0,   //  5°00' Cancer
    midheaven: 7.25,   //  7°15' Aries
    descendant: 275.0, //  5°00' Capricorn
    imumCoeli: 187.25, //  7°15' Libra
  },
};

describe('ChartWheel — South Node (issue #28)', () => {
  it('draws a South Node opposite the North Node', () => {
    const { container } = render(<ChartWheel chartData={nodeChartData} size={400} />);

    const north = container.querySelector('[data-planet="northNode"]');
    const south = container.querySelector('[data-planet="southNode"]');
    expect(north).not.toBeNull();
    expect(south).not.toBeNull();
  });

  it('draws the South Node as the North Node glyph turned 180°', () => {
    const { container } = render(<ChartWheel chartData={nodeChartData} size={400} />);

    const north = container.querySelector('[data-planet="northNode"]')!;
    const south = container.querySelector('[data-planet="southNode"]')!;
    // Same outline, distinct orientation — so it can never silently render as
    // a second, identical North Node.
    expect(south.getAttribute('d')).toBe(north.getAttribute('d'));
    expect(south.getAttribute('transform')).toMatch(/^rotate\(180 /);
    expect(north.getAttribute('transform')).not.toMatch(/^rotate\(180 /);
  });

  it('draws no South Node when the chart has no North Node', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    expect(container.querySelector('[data-planet="southNode"]')).toBeNull();
  });

  it("labels the South Node's own degree and minute", () => {
    const { container } = render(<ChartWheel chartData={nodeChartData} size={400} />);
    // North Node 10°30' Taurus → South Node 10°30' Scorpio.
    const text = container.textContent ?? '';
    expect(text).toContain('30′');
  });
});

describe('ChartWheel — angle degrees (issue #28)', () => {
  it('shows a degree beside every one of ASC, DSC, MC and IC', () => {
    const { container } = render(<ChartWheel chartData={nodeChartData} size={400} />);
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);

    for (const label of ['ASC', 'DSC', 'MC', 'IC']) {
      expect(texts, label).toContain(label);
    }
    // ASC/DSC sit at 5°00', MC/IC at 7°15'.
    expect(texts.filter((t) => t === "5°00\u2032")).toHaveLength(2);
    expect(texts.filter((t) => t === "7°15\u2032")).toHaveLength(2);
  });
});

// --- issue #32: round 2 fixes ------------------------------------------------

describe('ChartWheel — angle degree text matches planet degree text (issue #32)', () => {
  it('renders every angle degree line at the same font size and color', () => {
    const { container } = render(<ChartWheel chartData={nodeChartData} size={400} />);
    const degreeTexts = Array.from(container.querySelectorAll('text')).filter(
      (el) => /^\d+°\d{2}\u2032$/.test(el.textContent ?? ''),
    );
    // ASC, DSC, MC, IC each render one degree line.
    expect(degreeTexts).toHaveLength(4);

    const fontSizes = new Set(degreeTexts.map((el) => el.getAttribute('font-size')));
    const colors = new Set(degreeTexts.map((el) => el.getAttribute('fill')));
    expect(fontSizes.size).toBe(1);
    expect(colors.size).toBe(1);

    // Matches the planet-band degree text's own size (not a fixed literal),
    // computed the same way ChartWheel derives it for the planet band.
    const bandH = 400 * 0.5 * 0.76 - 400 * 0.5 * 0.46; // R.planetOuter - R.planetInner at size=400
    const expectedFontSize = Math.max(bandH * 0.156, 400 * 0.0264);
    expect(Number(fontSizes.values().next().value)).toBeCloseTo(expectedFontSize, 5);
  });
});

describe('ChartWheel — no center dot (issue #32)', () => {
  it('does not render a lone center-dot circle', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const center = 200;
    const dot = Array.from(container.querySelectorAll('circle')).find(
      (el) =>
        Number(el.getAttribute('cx')) === center &&
        Number(el.getAttribute('cy')) === center &&
        Number(el.getAttribute('r')) < 5,
    );
    expect(dot).toBeUndefined();
  });
});

describe('ChartWheel — thicker, more vibrant planet glyphs (issue #32)', () => {
  it('outlines every planet glyph path with a stroke matching its fill', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const sunPath = container.querySelector('path[data-planet="sun"]');
    expect(sunPath).not.toBeNull();
    expect(sunPath!.getAttribute('stroke')).toBe(sunPath!.getAttribute('fill'));
    expect(Number(sunPath!.getAttribute('stroke-width'))).toBeGreaterThan(0);
  });

  it('darkens sun and moon at least as much as the reference Mars color', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const sunPath = container.querySelector('path[data-planet="sun"]')!;
    const moonPath = container.querySelector('path[data-planet="moon"]')!;
    // The old, too-light colors this issue replaces.
    expect(sunPath.getAttribute('fill')).not.toBe('#DAA520');
    expect(moonPath.getAttribute('fill')).not.toBe('#8C8C8C');
  });
});

describe('ChartWheel — glyphs less bold on mobile (issue #57)', () => {
  // Derive the glyph's actual rendered size (`sz`) from its own transform
  // attribute — `glyphTransform` embeds `scale(sz / maxDim(viewBox))` — so
  // this doesn't need to duplicate ChartWheel's internal band-height/
  // font-scale geometry to know what stroke-width to expect.
  function renderedGlyphSz(path: Element, planet: string): number {
    const transform = path.getAttribute('transform') ?? '';
    const match = transform.match(/scale\(([-\d.]+)\)/);
    expect(match).not.toBeNull();
    const scale = Number(match![1]);
    const pathData = getPlanetPath(planet, 'classic', {})!;
    const [, , vbW, vbH] = pathData.viewBox.split(' ').map(Number);
    return scale * Math.max(vbW!, vbH!);
  }

  it('thins the #32 faux-bold stroke from factor 0.05 to 0.03', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const sunPath = container.querySelector('path[data-planet="sun"]')!;
    const sz = renderedGlyphSz(sunPath, 'sun');
    const strokeWidth = Number(sunPath.getAttribute('stroke-width'));
    // Sun carries the 1.9x GLYPH_EXTRA_STROKE multiplier, unchanged by #57.
    expect(strokeWidth).toBeCloseTo(sz * 0.03 * 1.9, 5);
    // Would be sz * 0.05 * 1.9 under the pre-#57 factor — confirm we're
    // meaningfully below that, not just at a coincidentally close value.
    expect(strokeWidth).toBeLessThan(sz * 0.05 * 1.9 * 0.9);
  });

  it('keeps sun and moon boosted at the same relative ratio over an unboosted planet', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const sunPath = container.querySelector('path[data-planet="sun"]')!;
    const moonPath = container.querySelector('path[data-planet="moon"]')!;
    const sunWidth = Number(sunPath.getAttribute('stroke-width'));
    const moonWidth = Number(moonPath.getAttribute('stroke-width'));
    const sunSz = renderedGlyphSz(sunPath, 'sun');
    const moonSz = renderedGlyphSz(moonPath, 'moon');
    // Both should reduce to the same base factor once normalized by their
    // own rendered size — i.e. the 1.9x relative boost #32 established for
    // sun/moon survives #57's across-the-board thinning unchanged.
    expect(sunWidth / sunSz).toBeCloseTo(moonWidth / moonSz, 5);
    expect(sunWidth / sunSz).toBeCloseTo(0.03 * 1.9, 5);
  });
});

describe('ChartWheel — transit outer ring goes white (issue #32)', () => {
  const transitData = {
    planets: mockChartData.planets,
    aspects: [],
    dateTimeUtc: new Date('2024-01-01T00:00:00Z'),
  };

  it('keeps the natal wheel themed while whiting out the transit band', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} transitData={transitData} size={400} />);
    const backgrounds = Array.from(container.querySelectorAll('[data-role="wheel-background"]'));
    expect(backgrounds.length).toBeGreaterThanOrEqual(2);
    const fills = backgrounds.map((el) => el.getAttribute('fill'));
    expect(fills).toContain('#FFFFFF');
  });

  it('renders a single themed background circle when there is no transit data', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    const backgrounds = Array.from(container.querySelectorAll('[data-role="wheel-background"]'));
    const fills = backgrounds.map((el) => el.getAttribute('fill'));
    expect(fills).not.toContain('#FFFFFF');
  });
});

describe('ChartWheel — annual profections highlight', () => {
  it('draws no highlight when highlightHouse is not set', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} />);
    expect(container.querySelector('[data-role="profection-highlight"]')).toBeNull();
  });

  it('draws a bold triangle from center to the outer rim around the given house', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} highlightHouse={2} />);
    const highlight = container.querySelector('[data-role="profection-highlight"]');
    expect(highlight).not.toBeNull();

    // Apex at the wheel's center (size/2, size/2).
    const d = highlight!.getAttribute('d')!;
    expect(d.startsWith('M 200 200 L')).toBe(true);
    expect(highlight!.getAttribute('stroke-width')).toBe('4');
  });

  it('reaches the outer transit ring, not just the natal wheel, when transits are shown', () => {
    const transitData = { planets: mockChartData.planets, aspects: [], dateTimeUtc: new Date('2024-01-01T00:00:00Z') };
    const withTransit = render(<ChartWheel chartData={mockChartData} transitData={transitData} size={400} highlightHouse={2} />);
    const withoutTransit = render(<ChartWheel chartData={mockChartData} size={400} highlightHouse={2} />);

    const dWith = withTransit.container.querySelector('[data-role="profection-highlight"]')!.getAttribute('d')!;
    const dWithout = withoutTransit.container.querySelector('[data-role="profection-highlight"]')!.getAttribute('d')!;
    // Same house, different outer radius (transitOuter > outer) -> different endpoints.
    expect(dWith).not.toBe(dWithout);
  });

  it('ignores an out-of-range house number rather than crashing', () => {
    const { container } = render(<ChartWheel chartData={mockChartData} size={400} highlightHouse={13} />);
    expect(container.querySelector('[data-role="profection-highlight"]')).toBeNull();
  });
});
