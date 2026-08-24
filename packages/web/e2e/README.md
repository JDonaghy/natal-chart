# Visual regression harness (issue #47)

Playwright screenshot tests for the highest-traffic screens: the natal chart
wheel, the planet positions table, and the ZR (Zodiacal Releasing) tab --
the screen #42 shipped a purely-visual regression on that no other
automated gate caught.

## Why this exists

#42: the ZR tab rendered zodiac signs as OS colour-emoji badges instead of
the app's SVG glyphs. Typecheck, lint, and every unit/integration test
passed, because nothing was *functionally* wrong -- the bug only existed in
rendered pixels. #44 added a source-level guard for that specific class (raw
zodiac code points outside `GlyphIcon`). This harness is the general case: a
test that looks at the rendered page.

## Running it

```bash
# one-time: download the pinned Chromium build (see "Provenance" below)
pnpm --filter web exec playwright install chromium

pnpm --filter web test:e2e            # build + preview + run the suite
pnpm --filter web test:e2e:update     # same, but rewrite baselines
```

`test:e2e` builds the web app and serves it with `vite preview` itself
(see `webServer` in `playwright.config.ts`), so it does not depend on a
`build` step having already run. It also runs as part of `pnpm --filter web
test` (i.e. the repo's normal `pnpm -r test` / `pnpm test`), so the
coordinator's Test gate picks it up automatically -- see "Running in CI"
below for the one thing that still needs doing outside this package.

## How determinism is achieved

Screenshot tests are worthless against non-deterministic input. Two axes,
both handled in `e2e/fixtures.ts`:

- **Content.** Every spec drives the app from *one* fixed birth chart
  (1990-06-15, 12:00 Europe/London, 51.5074/-0.1278, Placidus) via the
  app's own share-link URL mechanism (`src/utils/shareUrl.ts` /
  `ShareLoader.tsx`) instead of filling in the birth-data form. This is the
  same mechanism the app's own "Share Link" button produces, so it's a real
  code path, not a test-only backdoor.
- **Time.** "Now" is frozen with `page.clock.setFixedTime()` before
  navigation. The ZR tab highlights the currently-active period and draws a
  "now" marker off `new Date()` (`ReleasingView.tsx`), and the Transit page
  / annual-profections overlay are date-dependent too -- without this, a
  suite that's green today silently starts failing tomorrow.

Each screenshot is scoped to `page.locator('main')`, not the full page.
That excludes the header (nav + the auth widget, whose loading state can
legitimately race a page load) and the footer (build hash / semver / build
date -- see `Layout.tsx`, intentionally different on every build) from the
comparison entirely, which is why there's no `mask` configuration here: the
variable chrome is structurally outside what gets compared, not painted
over.

## Why the app is served at `/natal-chart/`, not `/`

Production (Cloudflare Pages) serves the app at `/` (`DEPLOY_BASE=/` in
`deploy-cloudflare.yml`). This harness instead builds and previews with the
*default* base path (`/natal-chart/`, historically GitHub Pages' path).

Reason: `packages/core/src/calculator.ts`'s browser ephemeris loader
(`loadEphemerisFiles`) fetches `` `/natal-chart/ephemeris/${filename}` ``
with that path hardcoded, rather than reading it from `DEPLOY_BASE` /
`import.meta.env.BASE_URL` the way `loadFonts.ts` was fixed to in #43. Under
`DEPLOY_BASE=/`, that fetch targets a path that doesn't exist; in this
sandbox, `vite preview`'s SPA fallback serves `index.html` for it (200 OK,
wrong content), and the WASM layer reports every real planet's ephemeris
file as "damaged" -- Sun through Pluto all fail, leaving only the
parts of the chart calculated without a file (nodes, Lilith, angles). Under
`/natal-chart/`, the hardcoded fetch resolves correctly and the full chart
(all 10 classical + modern planets, correct ZR timeline) renders as
intended, matching what `pnpm dev` / historical GitHub Pages already relied
on.

**This is a real, separate bug** worth its own issue: it means the
Cloudflare Pages production build likely can't load the bundled Swiss
Ephemeris files at all and is silently falling back to lower-precision
Moshier calculations (or worse, depending on how Cloudflare Pages'
default 404 behavior differs from `vite preview`'s SPA fallback) for every
real user. It is out of scope for this harness to fix (out of the file set
for #47), but was flagged rather than worked around silently.

## Provenance

Baselines under `e2e/*-snapshots/` were captured with:

- Playwright: `1.62.1` (pinned exactly in `package.json`, not `^1.62.1`) --
  bundles Chromium `151.0.7922.34` (`chromium-1234` in Playwright's build
  registry).
- OS: Ubuntu 24.04.4 LTS (`dellserver`, x86_64), headless, no `--with-deps`
  system packages beyond what was already present.
- Viewport: 1440x1024, `deviceScaleFactor: 1` (see `playwright.config.ts`).

If baselines need regenerating on a different browser build or OS, do it
deliberately (`test:e2e:update`) and update this section, so the next
diff's provenance is traceable instead of "someone's laptop, unknown
Chromium version."

## Running in CI

`playwright test` needs the Chromium binary present; `pnpm install` alone
does not download it. CI (or whichever runner the coordinator routes this
repo's Test stage to) needs a `playwright install --with-deps chromium`
step before running tests, and that runner needs to actually be
browser-capable -- check `smoke_tests.capability_rules` routing for this
repo before assuming any given machine picks this up by default.
