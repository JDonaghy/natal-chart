import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TransitResult, TransitAspect } from '@natal-chart/core';
import { TransitAspectList } from './TransitAspectList';

function makeTransit(aspects: TransitAspect[]): TransitResult {
  return {
    planets: [],
    aspects,
    dateTimeUtc: new Date('2024-06-15T12:00:00Z'),
  };
}

// Issue #56: astroseek-style flat list of natal-to-transit aspects, filtered
// to a 3° orb, with an A/S (applying/separating) column — a different
// presentation of the same TransitAspect data TransitAspectGrid renders as a
// grid, above that grid on the Aspects tab.
describe('TransitAspectList (issue #56)', () => {
  it('renders one row per aspect within the 3° orb, tightest orb first', () => {
    render(
      <TransitAspectList
        transitData={makeTransit([
          { natalPlanet: 'sun', transitPlanet: 'mars', type: 'square', angle: 92, orb: 2, applying: true, exact: false },
          { natalPlanet: 'moon', transitPlanet: 'venus', type: 'trine', angle: 120.5, orb: 0.5, applying: false, exact: false },
        ])}
      />
    );

    const rows = screen.getAllByRole('row').slice(1); // drop header row
    expect(rows).toHaveLength(2);
    // Tightest orb (Moon trine Venus, 0.5°) should come first.
    expect(rows[0]?.textContent).toContain('Moon');
    expect(rows[0]?.textContent).toContain('Venus');
    expect(rows[1]?.textContent).toContain('Sun');
    expect(rows[1]?.textContent).toContain('Mars');
  });

  it('excludes aspects wider than the 3° orb cutoff', () => {
    render(
      <TransitAspectList
        transitData={makeTransit([
          { natalPlanet: 'sun', transitPlanet: 'saturn', type: 'opposition', angle: 175, orb: 5, applying: true, exact: false },
          { natalPlanet: 'moon', transitPlanet: 'jupiter', type: 'sextile', angle: 61, orb: 1, applying: false, exact: false },
        ])}
      />
    );

    expect(screen.queryByText(/Saturn/)).toBeNull();
    screen.getByText(/Jupiter/);
  });

  it('shows "A" for applying and "S" for separating aspects', () => {
    render(
      <TransitAspectList
        transitData={makeTransit([
          { natalPlanet: 'sun', transitPlanet: 'mars', type: 'conjunction', angle: 1, orb: 1, applying: true, exact: false },
          { natalPlanet: 'moon', transitPlanet: 'venus', type: 'conjunction', angle: 2, orb: 2, applying: false, exact: false },
        ])}
      />
    );

    const rows = screen.getAllByRole('row').slice(1);
    const applyingRow = rows.find(r => r.textContent?.includes('Sun'));
    const separatingRow = rows.find(r => r.textContent?.includes('Moon'));
    expect(applyingRow?.textContent).toContain('A');
    expect(separatingRow?.textContent).toContain('S');
  });

  it('renders a fallback message when nothing is within orb', () => {
    render(
      <TransitAspectList
        transitData={makeTransit([
          { natalPlanet: 'sun', transitPlanet: 'saturn', type: 'opposition', angle: 175, orb: 5, applying: true, exact: false },
        ])}
      />
    );

    screen.getByText(/No aspects within a 3° orb/);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
