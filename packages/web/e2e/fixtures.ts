import type { Page } from '@playwright/test';

/**
 * One fixed birth chart, shared by every visual-regression spec in this
 * suite. Screenshot tests are worthless against non-deterministic input
 * (issue #47) -- do not change these values without regenerating every
 * baseline under e2e/**\/*-snapshots/.
 */
export const FIXED_BIRTH = {
  date: '1990-06-15',
  time: '12:00',
  lat: '51.5074',
  lng: '-0.1278',
  tz: 'Europe/London',
  city: 'London, UK',
  houseSystem: 'P' as const,
};

/**
 * "Now", frozen for every test. The ZR tab highlights the currently-active
 * period and draws a "now" marker off the real wall clock (see
 * ReleasingView's `new Date()`), and the Transit page / annual-profections
 * overlay are date-dependent too -- a suite that lets the app read the real
 * clock passes today and silently starts failing tomorrow.
 */
export const FROZEN_NOW = new Date('2026-01-15T12:00:00Z');

/**
 * Build the hash-router URL (relative to baseURL) that loads FIXED_BIRTH
 * via the app's own share-link mechanism (src/utils/shareUrl.ts /
 * ShareLoader.tsx), rather than driving the birth-data form through the UI.
 * This is the same mechanism "Share Link" produces, so it's already a
 * real, exercised code path -- not a test-only backdoor.
 */
export function chartShareUrl(): string {
  const params = new URLSearchParams({
    d: FIXED_BIRTH.date,
    t: FIXED_BIRTH.time,
    lat: FIXED_BIRTH.lat,
    lng: FIXED_BIRTH.lng,
    tz: FIXED_BIRTH.tz,
    city: FIXED_BIRTH.city,
    hs: FIXED_BIRTH.houseSystem,
  });
  return `/#/chart?${params.toString()}`;
}

/**
 * Freeze the clock, navigate to the fixed chart, and wait for the WASM
 * calculation to finish rendering plus self-hosted webfonts to be ready.
 *
 * The clock must be set *before* navigation so nothing the app touches via
 * `new Date()` during its first render (including on routes reached later
 * by client-side navigation, since Playwright's clock persists across
 * navigations in the same page) can observe the real wall clock.
 *
 * Waiting for fonts is not optional here: the whole point of this harness
 * is to catch font-fallback regressions (#42), so a screenshot taken before
 * the self-hosted webfont swaps in would itself be a flaky false negative.
 */
export async function gotoChart(page: Page): Promise<void> {
  await page.clock.setFixedTime(FROZEN_NOW);
  await page.goto(chartShareUrl());
  // The planet-positions table only renders once calculateChart() resolves;
  // waiting for a known planet name is a more reliable "chart is ready"
  // signal than a fixed timeout.
  await page.getByText('Sun', { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
}
