import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ChartResult } from '@natal-chart/core';

import { ReleasingView } from './ReleasingView';
import { ChartProvider, type ExtendedBirthData } from '../contexts/ChartContext';
import { AuthProvider } from '../contexts/AuthContext';

// --- issue #42: the ZR tab was the only sign-rendering surface still
// emitting raw Unicode sign glyphs (U+2648-U+2653) instead of the shared
// SignGlyphIcon SVG component. Those code points are Emoji_Presentation=Yes
// in Unicode, so on any browser whose emoji font is Noto Color Emoji
// (Linux/Android/ChromeOS) they rendered as coloured circular emoji badges
// instead of the app's monochrome line glyphs — the '.glyph' font stack
// (IM Fell English -> serif) doesn't cover that range, so the browser fell
// through to the system colour-emoji font. This test guards both halves of
// the fix: the sign renders as an SVG (SignGlyphIcon), and no raw sign
// code point survives anywhere in the rendered output. ----------------------

// Chosen so the math is deterministic and easy to hand-check:
// ascendant=180, descendant=0 -> dsc(0) < asc(180), so the "day birth" arc is
// [0, 180). sun=60 (gemini) falls inside it -> day birth.
// fortune = ASC + Moon - Sun = 180 + 100 - 60 = 220 -> floor(220/30)=7 -> scorpio
// spirit  = ASC + Sun - Moon = 180 + 60 - 100 = 140 -> floor(140/30)=4 -> leo
// The ZR timeline's lot sign is derived from the fortune longitude (220),
// which is also scorpio -- so "scorpio" is expected in both the Lot of
// Fortune summary line and the "Releasing from Lot of Fortune in ..." heading.
const minimalChart: ChartResult = {
  planets: [
    {
      planet: 'sun', longitude: 60, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'gemini', degree: 0, minute: 0, house: 1, retrograde: false,
    },
    {
      planet: 'moon', longitude: 100, latitude: 0, declination: 0, distance: 1, speed: 1,
      sign: 'cancer', degree: 10, minute: 0, house: 2, retrograde: false,
    },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1, longitude: i * 30, sign: 'aries' as const, degree: 0, minute: 0,
  })),
  angles: { ascendant: 180, midheaven: 90, descendant: 0, imumCoeli: 270 },
  aspects: [],
  skippedPlanets: [],
};

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
    <AuthProvider>
      <ChartProvider>
        <ReleasingView />
      </ChartProvider>
    </AuthProvider>
  );
}

describe('ReleasingView / ReleasingTimeline — sign glyphs (issue #42)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders zodiac signs as SVG glyphs (SignGlyphIcon), not raw Unicode text', () => {
    const { container } = renderView();

    // Half 1: the sign is present as an SVG produced by SignGlyphIcon
    // (aria-label matches the sign name), for both the Lot summary and the
    // ZR timeline heading/overview bar/table.
    const scorpioIcons = container.querySelectorAll('svg[aria-label="scorpio"]');
    expect(scorpioIcons.length).toBeGreaterThan(0);
    const leoIcons = container.querySelectorAll('svg[aria-label="leo"]');
    expect(leoIcons.length).toBeGreaterThan(0);

    // Every rendered sign glyph is an SVG path, never a bare text span with
    // the raw glyph character (the old `<span className="glyph">{SIGN_GLYPHS[...]}</span>`
    // pattern this issue removed).
    expect(container.querySelectorAll('span.glyph').length).toBe(0);
  });

  it('never emits a raw zodiac sign code point (U+2648-U+2653) anywhere in the page', () => {
    const { container } = renderView();

    // Half 2: the actual regression guard. If anyone reintroduces a raw
    // Unicode sign glyph on this page, this fails — that's exactly how the
    // bug survived five months (root cause: the '.glyph' font stack doesn't
    // cover the emoji-presentation zodiac range, so the browser falls back
    // to a colour-emoji font instead of a monochrome one).
    const rawSignCodePoints = /[♈-♓]/;
    expect(container.innerHTML).not.toMatch(rawSignCodePoints);
    expect(container.textContent ?? '').not.toMatch(rawSignCodePoints);
  });
});
