import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression harness (issue #47).
 *
 * #42 was a purely visual defect (raw zodiac code points rendering as OS
 * colour-emoji badges instead of the app's SVG glyphs) that every other
 * automated gate passed. This harness renders the real app in a real
 * browser and diffs it against committed baseline screenshots so that
 * class of regression fails in CI instead of in front of a customer.
 *
 * Determinism, two axes:
 *  - Content: every spec drives the app from ONE fixed birth chart via the
 *    app's own share-link mechanism (see e2e/fixtures.ts) instead of
 *    filling in the form, so the wheel/positions/ZR timeline are identical
 *    on every run.
 *  - Time: "now" is frozen with page.clock.setFixedTime() before the app's
 *    first render, because the ZR tab's active-period highlight and "now"
 *    marker (and the Transit/annual-profections views) read the real wall
 *    clock via `new Date()`.
 *
 * See e2e/README.md for why the app is served at the '/natal-chart/' base
 * path here (not '/', which is what production actually uses) and for the
 * browser/OS provenance of the committed baselines.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Deliberately serial-ish: this is a small, few-screens-at-a-time suite
  // (see issue #47 scope), not worth parallelizing across many workers yet.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: './e2e/.test-results',
  use: {
    baseURL: 'http://localhost:4173/natal-chart/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
  },
  expect: {
    toHaveScreenshot: {
      // Tight on purpose. Pixel-exact diffing is notoriously flaky across
      // font rendering and browser versions -- but a threshold loose enough
      // to shrug off font-rendering differences would also have shrugged
      // off #42, which *was* a font-rendering difference (fallback glyph
      // vs. SVG glyph). Start tight; if it proves noisy in real CI runs,
      // that noise rate belongs in the PR description, not a silently
      // widened threshold.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Builds and serves the production bundle (not `vite dev`) so what gets
  // screenshotted is the same artifact a real deploy ships.
  webServer: {
    command: 'pnpm run build && pnpm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/natal-chart/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
