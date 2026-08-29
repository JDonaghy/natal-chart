import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ZRTimeline, ZRPeriod } from '@natal-chart/core';
import { ReleasingTimeline } from './ReleasingTimeline';

// Issue #61: the periods table was restyled to the astroseek density already
// used by TransitAspectList (#56) — smaller type, tighter cell padding, a
// content-width cap instead of width: 100%. This guards that the restyle
// didn't silently drop rows, the NOW badge, or sub-period expansion, which is
// the actual failure mode a pure style change risks.

function makePeriod(overrides: Partial<ZRPeriod>): ZRPeriod {
  return {
    sign: 'leo',
    signIndex: 4,
    ruler: 'sun',
    startDate: new Date('1998-03-12T00:00:00Z'),
    endDate: new Date('2010-08-04T00:00:00Z'),
    durationDays: 4528,
    level: 1,
    isPeak: false,
    isLoosingOfBond: false,
    element: 'fire',
    modality: 'fixed',
    modalityMatch: false,
    ...overrides,
  };
}

function makeTimeline(periods: ZRPeriod[]): ZRTimeline {
  return {
    lot: 'fortune',
    lotLongitude: 220,
    lotSign: 'scorpio',
    lotSignIndex: 7,
    birthDate: new Date('1990-06-15T12:00:00Z'),
    periods,
  };
}

describe('ReleasingTimeline (issue #61 restyle)', () => {
  it('renders one row per top-level period with its sign and ruler', () => {
    const timeline = makeTimeline([
      makePeriod({ sign: 'leo', ruler: 'sun' }),
      makePeriod({
        sign: 'virgo',
        ruler: 'mercury',
        startDate: new Date('2010-08-04T00:00:00Z'),
        endDate: new Date('2028-01-01T00:00:00Z'),
      }),
    ]);

    // currentDate outside both periods so nothing auto-expands or shows NOW.
    render(<ReleasingTimeline timeline={timeline} currentDate={new Date('1980-01-01T00:00:00Z')} />);

    const rows = screen.getAllByRole('row').slice(1); // drop header row
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Leo');
    expect(rows[0]?.textContent).toContain('Sun');
    expect(rows[1]?.textContent).toContain('Virgo');
    expect(rows[1]?.textContent).toContain('Mercury');
  });

  it('shows the NOW badge and auto-expands sub-periods for the active L1 period', () => {
    const subPeriods: ZRPeriod[] = [
      makePeriod({
        sign: 'virgo',
        ruler: 'mercury',
        level: 2,
        startDate: new Date('1999-01-01T00:00:00Z'),
        endDate: new Date('2000-01-01T00:00:00Z'),
        durationDays: 365,
      }),
      makePeriod({
        sign: 'libra',
        ruler: 'venus',
        level: 2,
        startDate: new Date('2000-01-01T00:00:00Z'),
        endDate: new Date('2001-01-01T00:00:00Z'),
        durationDays: 365,
      }),
    ];
    const timeline = makeTimeline([
      makePeriod({ sign: 'leo', ruler: 'sun', subPeriods }),
    ]);

    // currentDate falls inside the L1 period and its first sub-period.
    render(<ReleasingTimeline timeline={timeline} currentDate={new Date('1999-06-01T00:00:00Z')} />);

    expect(screen.getAllByText('NOW').length).toBeGreaterThan(0);

    // Sub-periods are auto-expanded because the parent L1 period is active.
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3); // L1 + 2 sub-periods
    expect(rows.some(r => r.textContent?.includes('Virgo'))).toBe(true);
    expect(rows.some(r => r.textContent?.includes('Libra'))).toBe(true);
  });

  it('toggles sub-period rows on click for a non-active period', () => {
    const subPeriods: ZRPeriod[] = [
      makePeriod({
        sign: 'scorpio',
        ruler: 'mars',
        level: 2,
        startDate: new Date('2011-01-01T00:00:00Z'),
        endDate: new Date('2012-01-01T00:00:00Z'),
        durationDays: 365,
      }),
    ];
    const timeline = makeTimeline([
      makePeriod({
        sign: 'libra',
        ruler: 'venus',
        startDate: new Date('2010-08-04T00:00:00Z'),
        endDate: new Date('2028-01-01T00:00:00Z'),
        subPeriods,
      }),
    ]);

    render(<ReleasingTimeline timeline={timeline} currentDate={new Date('1980-01-01T00:00:00Z')} />);

    // Collapsed initially — only the L1 row renders.
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);

    const l1Row = screen.getAllByRole('row')[1]!;
    fireEvent.click(l1Row);

    const expandedRows = screen.getAllByRole('row').slice(1);
    expect(expandedRows).toHaveLength(2);
    expect(expandedRows.some(r => r.textContent?.includes('Scorpio'))).toBe(true);
  });

  it('renders Peak and Loosing-of-the-Bond markers when present', () => {
    const timeline = makeTimeline([
      makePeriod({
        sign: 'leo',
        ruler: 'sun',
        isPeak: true,
        isLoosingOfBond: true,
        loosingDate: new Date('2005-01-01T00:00:00Z'),
        loosingSign: 'aquarius',
      }),
    ]);

    render(<ReleasingTimeline timeline={timeline} currentDate={new Date('1980-01-01T00:00:00Z')} />);

    screen.getByText('Peak');
    screen.getByText('LB');
  });

  it('caps the table to a content width instead of stretching to 100%', () => {
    const timeline = makeTimeline([makePeriod({})]);
    const { container } = render(
      <ReleasingTimeline timeline={timeline} currentDate={new Date('1980-01-01T00:00:00Z')} />
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.style.width).not.toBe('100%');
    expect(table?.style.maxWidth).toBeTruthy();
  });
});
