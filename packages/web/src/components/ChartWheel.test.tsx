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