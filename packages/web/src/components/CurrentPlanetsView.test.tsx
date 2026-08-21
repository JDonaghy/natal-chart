import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ChartResult, BirthData } from '@natal-chart/core';
import type { GeocodeResult } from '../services/geocoding';
import { convertToUTC, convertFromUTC } from '../services/timezone';

// useResponsive() calls window.matchMedia at module-evaluation time and jsdom
// doesn't implement it, so the stub has to be installed before the imports
// below are evaluated — hence vi.hoisted() (pattern copied from
// AspectGrid.test.tsx).
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

const minimalChart: ChartResult = {
  planets: [
    {
      planet: 'sun', longitude: 0, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'aries', degree: 0, minute: 0, house: 1, retrograde: false,
    },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1, longitude: i * 30, sign: 'aries' as const, degree: 0, minute: 0,
  })),
  angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 },
  aspects: [],
  skippedPlanets: [],
};

const calculateChartMock = vi.fn(async (_data: BirthData): Promise<ChartResult> => minimalChart);

vi.mock('@natal-chart/core', () => ({
  calculateChart: (data: BirthData) => calculateChartMock(data),
}));

const geocodeCityMock = vi.fn();
vi.mock('../services/geocoding', () => ({
  geocodeCity: (query: string) => geocodeCityMock(query),
}));

import { CurrentPlanetsView } from './CurrentPlanetsView';
import { ChartProvider } from '../contexts/ChartContext';
import { AuthProvider } from '../contexts/AuthContext';

const CHICAGO_RESULT: GeocodeResult = {
  name: 'Chicago',
  lat: 41.8781,
  lng: -87.6298,
  country: 'United States',
  formatted: 'Chicago, Illinois, USA',
  timezone: 'America/Chicago',
};

function renderView() {
  return render(
    <AuthProvider>
      <ChartProvider>
        <CurrentPlanetsView />
      </ChartProvider>
    </AuthProvider>
  );
}

function getDateTimeInput(): HTMLInputElement {
  return document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
}

async function selectChicago() {
  const input = screen.getByPlaceholderText('Search city...');
  fireEvent.change(input, { target: { value: 'Chicago' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  const option = await screen.findByText(CHICAGO_RESULT.formatted);
  fireEvent.click(option);
}

describe('CurrentPlanetsView — local city field (issue #38)', () => {
  beforeEach(() => {
    calculateChartMock.mockClear();
    geocodeCityMock.mockReset();
    geocodeCityMock.mockResolvedValue([CHICAGO_RESULT]);
  });

  it('defaults to Greenwich with no city selected, unchanged from today', async () => {
    renderView();

    await waitFor(() => expect(calculateChartMock).toHaveBeenCalled());
    const firstCall = calculateChartMock.mock.calls[0]![0] as BirthData;
    expect(firstCall.latitude).toBeCloseTo(51.4769);
    expect(firstCall.longitude).toBeCloseTo(-0.0005);
    // getByText throws if no match is found, so a successful call is itself
    // the assertion (no `@testing-library/jest-dom` matchers configured here).
    screen.getByText(/Greenwich \(51\.48°N, 0\.00°W\)/);
  });

  it("recalculates using the selected city's coordinates for houses/Ascendant", async () => {
    renderView();
    await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(1));

    await selectChicago();

    await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(2));
    const lastCall = calculateChartMock.mock.calls[1]![0] as BirthData;
    expect(lastCall.latitude).toBeCloseTo(CHICAGO_RESULT.lat);
    expect(lastCall.longitude).toBeCloseTo(CHICAGO_RESULT.lng);
    // Regex matcher (partial text-node match) since the readout span's text
    // node sits alongside a sibling text node ("· Whole Sign"), which a
    // plain string matcher (whole-element-text equality) would miss.
    // getByText throws if no match is found, so a successful call is itself
    // the assertion.
    screen.getByText(/Chicago, Illinois, USA/);
    screen.getByText(/America\/Chicago/);
  });

  it("interprets the typed date/time as the selected city's local clock, not browser-local (America/Chicago noon != Europe/London noon)", async () => {
    renderView();
    await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(1));

    await selectChicago();
    await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(2));

    const dateInput = getDateTimeInput();
    fireEvent.change(dateInput, { target: { value: '2024-06-15T12:00' } });

    await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(3));
    const call = calculateChartMock.mock.calls[2]![0] as BirthData;

    const expectedUtc = convertToUTC('2024-06-15', '12:00', 'America/Chicago');
    const londonUtc = convertToUTC('2024-06-15', '12:00', 'Europe/London');

    expect(new Date(call.dateTimeUtc).getTime()).toBe(expectedUtc.getTime());
    expect(expectedUtc.getTime()).not.toBe(londonUtc.getTime());
  });

  it('"Now" uses the selected city\'s current local wall-clock time, not the browser\'s', async () => {
    // shouldAdvanceTime keeps real timers ticking (in real time) so that
    // @testing-library's waitFor polling doesn't hang against a frozen
    // clock; Date.now() still starts at fixedNow.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fixedNow = new Date('2024-06-15T18:30:00Z');
    vi.setSystemTime(fixedNow);

    try {
      renderView();
      await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(1));

      await selectChicago();
      await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(2));

      fireEvent.click(screen.getByRole('button', { name: 'Now' }));
      await waitFor(() => expect(calculateChartMock).toHaveBeenCalledTimes(3));

      const { dateString, timeString } = convertFromUTC(fixedNow, 'America/Chicago');
      const expectedDateStr = `${dateString}T${timeString.slice(0, 5)}`;
      expect(getDateTimeInput().value).toBe(expectedDateStr);

      const call = calculateChartMock.mock.calls[2]![0] as BirthData;
      const expectedUtc = convertToUTC(dateString, timeString.slice(0, 5), 'America/Chicago');
      expect(new Date(call.dateTimeUtc).getTime()).toBe(expectedUtc.getTime());
    } finally {
      vi.useRealTimers();
    }
  });
});
