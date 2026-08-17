import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
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
