import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChartResult, TransitResult, Aspect } from '@natal-chart/core';

// useResponsive() calls window.matchMedia at module-evaluation time and jsdom
// doesn't implement it, so the stub has to be installed before the imports
// below are evaluated — hence vi.hoisted() (pattern copied from
// AspectGrid.test.tsx / CurrentPlanetsView.test.tsx).
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
    {
      planet: 'moon', longitude: 150, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'virgo', degree: 0, minute: 0, house: 6, retrograde: false,
    },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1, longitude: i * 30, sign: 'aries' as const, degree: 0, minute: 0,
  })),
  angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 },
  aspects: [
    { planet1: 'sun', planet2: 'moon', type: 'trine', angle: 150, orb: 0, applying: false, exact: false } as Aspect,
  ],
  skippedPlanets: [],
};

const minimalTransit: TransitResult = {
  planets: [
    {
      planet: 'mars', longitude: 10, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'aries', degree: 10, minute: 0, house: 1, retrograde: false,
    },
  ],
  aspects: [],
  dateTimeUtc: new Date('2024-06-15T12:00:00Z'),
};

const calculateTransitPositionsMock = vi.fn(async (): Promise<TransitResult> => minimalTransit);

vi.mock('@natal-chart/core', async () => {
  const actual = await vi.importActual<typeof import('@natal-chart/core')>('@natal-chart/core');
  return {
    ...actual,
    calculateTransitPositions: (...callArgs: unknown[]) =>
      calculateTransitPositionsMock(...(callArgs as [])),
  };
});

import { TransitView } from './TransitView';
import { ChartProvider, type ExtendedBirthData } from '../contexts/ChartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { SyncProvider } from '../contexts/SyncContext';

const minimalBirthData: ExtendedBirthData = {
  dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
  latitude: 51.5,
  longitude: -0.1,
  houseSystem: 'P',
  city: 'London',
  timezone: 'Europe/London',
};

function renderView() {
  localStorage.setItem('natal-chart-data', JSON.stringify(minimalChart));
  localStorage.setItem('natal-chart-birth-data', JSON.stringify(minimalBirthData));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <SyncProvider>
          <ChartProvider>
            <TransitView />
          </ChartProvider>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// Issue #55: the customer asked for the "Planets" tab (positions table)
// between the chart wheel and aspects tab, and the "Natal Aspects" card
// under the aspects tab, to be removed from the transit view. The
// "Natal-to-Transit Aspects" card must stay untouched.
describe('TransitView — Planets tab and Natal Aspects card removed (issue #55)', () => {
  beforeEach(() => {
    localStorage.clear();
    calculateTransitPositionsMock.mockClear();
  });

  it('shows only Chart Wheel and Aspects tabs, no Planets tab', async () => {
    renderView();

    await waitFor(() => expect(calculateTransitPositionsMock).toHaveBeenCalled());

    screen.getByRole('button', { name: 'Chart Wheel' });
    screen.getByRole('button', { name: 'Aspects' });
    expect(screen.queryByRole('button', { name: 'Planets' })).toBeNull();
  });

  it('never renders the Planet Positions table content', async () => {
    renderView();

    await waitFor(() => expect(calculateTransitPositionsMock).toHaveBeenCalled());

    // "Planet Positions" heading and its column headers (Degree/Retrograde,
    // unique to the removed positions table — the aspect grids don't use
    // them) must both be gone.
    expect(screen.queryByText('Planet Positions')).toBeNull();
    expect(screen.queryByText('Degree')).toBeNull();
    expect(screen.queryByText('Retrograde')).toBeNull();
  });

  it('shows Natal-to-Transit Aspects but not the Natal Aspects card under the Aspects tab', async () => {
    renderView();

    await waitFor(() => expect(calculateTransitPositionsMock).toHaveBeenCalled());

    screen.getByRole('button', { name: 'Aspects' }).click();

    await screen.findByText('Natal-to-Transit Aspects');
    expect(screen.queryByText('Natal Aspects')).toBeNull();
  });
});
