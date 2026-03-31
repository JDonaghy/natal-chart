# Session History

*This file tracks completed work across development sessions. Items are moved here from PLAN.md and BUGS.md when marked as completed or resolved.*

## Session 2026-03-28: Timezone Automation & UI Enhancement

### ✅ Features Completed
1. **Automatic timezone detection** - Removed manual timezone selector, auto-detect from geocoding
2. **Luxon integration** - Added Luxon for historical DST accuracy (pre-1970 dates)
3. **Tabbed chart view** - Implemented Chart Wheel, Planet Positions, and Aspects tabs
4. **Chart wheel optimization** - Doubled size to 800px, reduced white space
5. **Retrograde indicators** - Added "R" column to planet positions table
6. **Form UI reorganization** - Moved city search to top, streamlined layout
7. **UTC calculation display** - Added subtle UTC note at bottom of form
8. **GitHub Pages SPA routing** - Added 404.html for HashRouter support
9. **Build version tracking** - Added git commit hash and timestamp display in footer
10. **Responsive chart wheel** - Added aspect-ratio wrapper for mobile scaling

### ✅ Bugs Fixed
1. **Timezone conversion edge cases** - Fixed historical DST handling for UK 1968-1971
2. **Geocoding error handling** - Improved fallback to mock data when API unavailable
3. **Deployment discrepancy** - Fixed build version showing 'unknown' by using GITHUB_SHA in CI

### 🔄 Deployment
- GitHub Actions workflow configured for auto-deployment
- Multiple successful deployments completed
- 404.html added for SPA routing support
- Build version tracking fixed to show commit hash in CI (uses GITHUB_SHA)

### 📝 Notes
- Cloudflare Worker updated to return timezone data but not yet deployed
- Real geocoding requires OpenCage API key in production
- Asteroid ephemeris files (seas_18.se1, sepl_18.se1) placed in public/ephemeris/ for Chiron calculations
- Chart wheel now responsive on mobile devices with aspect-ratio wrapper

---

## Session 2026-03-28: Chart Wheel Professional Enhancements

### ✅ Features Completed
1. **Zodiac degree markings** - Added 5° tick marks, sign boundaries, and degree numbers around outer ring
2. **House cusp degree display** - Show exact degree/minute in zodiac notation (e.g., "15° ♈ 30′") at each house cusp
3. **Chart information overlay** - Birth data box with date, time, location, and house system
4. **Visual polish** - Parchment gradient background, drop shadows, serif typography

### ✅ Technical Improvements
- Enhanced `formatLongitude` helper for zodiac notation formatting
- Added SVG filters for shadow effects and radial gradients
- Improved coordinate display readability with smaller fonts
- Chart wheel now includes professional astrological details matching traditional charts

### 📝 Notes
- Degree markings include small ticks every degree, medium every 5°, thick lines at sign boundaries
- House cusp degrees positioned between house number and center for clarity
- Overlay uses saved birth data from localStorage; falls back gracefully if missing
- Visual enhancements maintain classic parchment/gold aesthetic while adding depth

---

## Session 2026-03-29: v0.3.0 — Chart Wheel Redesign, PDF Vector Glyphs, Date Picker

### ✅ Features Completed
1. **Professional chart wheel redesign** — Concentric ring layout: outer tick ring, zodiac sign band with alternating parchment fills, planet band with radial labels, inner house wheel with aspect lines
2. **SVG vector glyphs** — Created `astro-glyph-paths.ts` with SVG path data for all 24 astrological symbols (12 planets + 12 zodiac signs), replacing Unicode text elements
3. **PDF vector rendering** — Astrological symbols now render as crisp vectors in PDF at any zoom level; removed glyph stripping workaround
4. **Fixed corrupted DejaVuSans.ttf** — Replaced HTML file with real 760KB TrueType font binary for PDF table symbols
5. **Planet collision avoidance** — Improved algorithm with angular separation, damped pushing, wrap-around handling, and connector lines from displaced labels to true ecliptic tick positions
6. **International date picker** — Replaced browser-native date input with Year/Month/Day dropdown selects
7. **Brighter planet colors** — Increased saturation for better visibility against parchment background
8. **ASC/DSC/MC/IC as full-diameter axes** — Bold lines spanning the entire wheel

### ✅ Technical Improvements
- House numbers centered in wedges inside the inner wheel
- Aspect lines confined to inner house wheel area
- Removed info overlay box for cleaner chart
- House cusp degrees shown in planet band near cusp lines
- Angular house cusps (1, 4, 7, 10) drawn through planet band

### 📝 Notes
- Version bumped from 0.2.1 to 0.3.0
- PR #3 created for merge to main
- All 19 tests pass, TypeScript clean, build succeeds

---

## Session 2026-03-29: v0.4.0 — Client Feedback Items (Part 1)

### ✅ Features Completed
1. **Fix planet house assignments** — Fixed falsy-zero bug in `calculator.ts` where `cusps[i + 1] || cusps[1]` treated 0° Aries as falsy, substituting the wrong cusp boundary. Replaced with explicit index check `i < 12 ? cusps[i + 1] : cusps[1]`.
2. **Remove Angle column from aspects table** — Removed from both ChartView.tsx web table and pdfExport.ts PDF table. Adjusted PDF column widths.
3. **Add house number ring** — New dedicated ring (radii 0.38–0.30) between planet band and aspect area. House numbers 1-12 positioned in this ring. Added two structural circles.
4. **Extend house cusp lines** — All 12 house cusp lines now extend from outer circle (`R.outer`) through zodiac band and planet band down to house number ring inner edge (`R.houseNumInner`). Angular vs regular styling preserved.
5. **Remove cusp degree text** — Deleted cusp degree labels from planet band and unused helper functions (`getSignIndex`, `getDegreeInSign`, `formatLongitude`).
6. **Replace all 23 glyph SVG paths** — Rewrote all 12 zodiac sign + 11 planet SVG paths in `astro-glyph-paths.ts` with clean, properly proportioned traditional astrology symbols matching Astro-Seek reference style.
7. **Aspect lines repositioned** — Now draw inside `houseNumInner` (0.30) instead of `planetInner` (was 0.40).

---

## Session 2026-03-29: v0.4.0 — Glyph Rendering & PDF Fixes (Part 2)

### ✅ Features Completed
1. **Fix `toAngle` normalization** — Fixed JS `%` operator returning negative values by using `((180 - longitude + ascendant) % 360 + 360) % 360` for correct inner wheel rotation matching Astro-Seek.
2. **Switch to Unicode text glyphs (web)** — Replaced SVG `<path>` rendering with Unicode `<text>` elements using DejaVu Sans font (♈♉♊… ☉☽☿…). Added `@font-face` for local DejaVuSans.ttf. Symbols now match familiar Astro-Seek style.
3. **Hybrid glyph rendering (web/PDF)** — Web uses Unicode `<text>` with `data-glyph` attributes; PDF uses `replaceGlyphTextWithPaths()` to swap text elements for SVG `<path>` vectors before svg2pdf conversion.
4. **Extract font-accurate SVG paths** — Used opentype.js to extract actual glyph outlines from DejaVuSans.ttf. Paths in `astro-glyph-paths.ts` use native font coordinate space (viewBox like `'170 -1496 1496 1496'`).
5. **Fix PDF glyph scaling** — Updated `replaceGlyphTextWithPaths()` to parse each glyph's `viewBox` and compute correct scale factor. Previously used hardcoded `scale(sz/100)` which was wrong for font-coordinate paths (~1500x1500). Now uses `scale = sz / maxDim` with proper centering and viewBox origin translation. Changed from stroke to fill rendering to match font path style.
6. **Improved aspect line visibility** — Updated strokeWidth (0.8/1.5) and opacity (0.5/0.85).

### 📝 Notes
- All core tests pass (4/4), build succeeds
- Changes on `develop` branch, not yet merged to `main`
- DejaVuSans.ttf loaded via `@font-face` in App.css from `/natal-chart/fonts/`
- Font extraction script at `/tmp/extract-glyphs.mjs` (requires opentype.js)

---

## Session 2026-03-29: v0.4.0 — Shareable URLs (Part 3)

### ✅ Features Completed
1. **Shareable URLs** — Birth data encoded as readable URL query params (`d`, `t`, `lat`, `lng`, `tz`, `city`, `hs`). Format: `/#/chart?d=1990-06-15&t=12:00&lat=51.5074&lng=-0.1278&tz=Europe/London&city=London&hs=P`
2. **Share button** — "Share Link" button next to "Download PDF" in ChartView. Copies URL to clipboard with "Link Copied!" green feedback.
3. **ShareLoader component** — Invisible component inside Router that detects share params on `/chart` route, converts to UTC via timezone service, triggers chart calculation. Always recalculates when share params present (overrides cached data).
4. **Birth data in context** — Exposed `birthData` from ChartContext so ChartView can build share URLs without reading localStorage directly.

### Files Created
- `packages/web/src/utils/shareUrl.ts` — `encodeShareParams()`, `buildShareUrl()`, `parseShareParams()`
- `packages/web/src/components/ShareLoader.tsx` — Auto-load shared charts

### Files Modified
- `packages/web/src/App.tsx` — Added `<ShareLoader />`
- `packages/web/src/contexts/ChartContext.tsx` — Added `birthData` to context
- `packages/web/src/components/ChartView.tsx` — Added share button, uses `birthData` from context

### 📝 Notes
- All core tests pass (4/4), build succeeds
- Uses `exactOptionalPropertyTypes`-safe patterns (no `undefined` in optional props)
- Placidus (`P`) is default house system and omitted from URL for brevity

---

## Session 2026-03-30: v0.5.0 — Separate Natal & Transit Chart Routes

### ✅ Features Completed
1. **Split `/chart` and `/transits` routes** — Natal Chart at `/chart` (no transits), Transit Chart at `/transits` (always-on transit controls). Previously a single `/chart` route with a toggle button.
2. **TransitView component** — New component with always-visible transit date picker, "Now" button, and city search. Auto-initializes to current date/time on mount.
3. **Extracted chart-helpers.ts** — Shared helper functions (`getPlanetGlyph`, `getSignGlyph`, `formatPlanetName`, `formatSignName`, `formatAspectName`, `getAspectColor`) extracted from ChartView for reuse.
4. **Route-aware share URLs** — `buildShareUrl()` routes to `/transits` when transit data present, `/chart` otherwise.
5. **NavLink active styling** — Navigation links use React Router's `NavLink` with bold+underline for active route. Nav order: Calculate | Natal Chart | Transit Chart | Compare | Releasing.
6. **Cross-route saved chart loading** — Loading a saved chart with transit data from Natal view navigates to Transit view (and vice versa).
7. **ShareLoader handles both routes** — Detects share params on `/chart` or `/transits` and navigates to appropriate route after calculation.

### ✅ Technical Improvements
- Removed `transitsEnabled` boolean from ChartContext (route determines transit state)
- Transit state (`transitData`, `transitDateStr`, `transitLocation`) persists in context across route changes
- ChartView stripped of all transit code (toggle, controls, transit aspects section)
- PDF export from natal = natal only; from transit = natal + transits

### Files Created
- `packages/web/src/components/TransitView.tsx`
- `packages/web/src/utils/chart-helpers.ts`

### Files Modified
- `packages/web/src/components/ChartView.tsx` — Stripped transit code
- `packages/web/src/contexts/ChartContext.tsx` — Removed `transitsEnabled`/`setTransitsEnabled`
- `packages/web/src/App.tsx` — Added `/transits` route
- `packages/web/src/components/Layout.tsx` — NavLink active styling, added Transit Chart nav
- `packages/web/src/utils/shareUrl.ts` — Route-aware URL building
- `packages/web/src/components/ShareLoader.tsx` — Handles `/chart` and `/transits` routes

### 📝 Notes
- Version bumped from 0.4.0 to 0.5.0
- All tests pass, TypeScript clean, build succeeds
- Pre-existing lint error in CompareView.tsx (setState in effect) unchanged

---

## Session 2026-03-30: Aspect Grid Tables & Chiron Fix

### ✅ Features Completed
1. **Aspect grid table (natal)** — Triangular aspectarian grid replacing linear aspects table. Planet glyphs along diagonal with retrograde indicators. Lower-left triangle shows color-coded aspect glyphs (☌ ☍ △ □ ⚹ ⚻ ⚺ ∥ ⊥) with orb values. Includes all planets (Sun through Chiron), Lilith, Part of Fortune, Vertex, ASC, MC. Luminary-aware orbs (wider for Sun/Moon). Parallel/contraparallel aspects (declination-based, 1° orb). Grid also rendered in PDF export.
2. **Aspect grid table (transits)** — Rectangular grid for natal-to-transit aspects like Astro-Seek. Rows = natal planets (Sun through MC). Columns = transit planets with sign glyph, degree, and minute in header. Each cell shows aspect glyph color-coded by type. Transit planet positions displayed in column headers. Included in Transit Chart view and PDF export.
3. **Fixed Chiron ephemeris loading** — Path mismatch in Emscripten virtual filesystem: `FS.mkdir` used relative path while `FS.writeFile` and `set_ephe_path` used absolute. All now use `/ephemeris` (absolute).

### ✅ Technical Improvements
- Extended calculator with declination-based parallel/contraparallel aspect support (1° orb)
- Added `chart-helpers.ts` utility functions for aspect glyph/color formatting
- PDF export updated to render both natal and transit aspect grids
- Core types extended with declination and additional aspect types

### Files Created
- `packages/web/src/components/AspectGrid.tsx` — Natal triangular aspect grid
- `packages/web/src/components/TransitAspectGrid.tsx` — Transit rectangular aspect grid

### Files Modified
- `packages/core/src/calculator.ts` — Declination calculations, parallel/contraparallel aspects, Chiron path fix
- `packages/core/src/types.ts` — Extended aspect types, declination fields
- `packages/core/test/calculator.test.ts` — Updated tests
- `packages/web/src/components/ChartView.tsx` — Integrated AspectGrid
- `packages/web/src/components/ChartWheel.tsx` — Minor updates
- `packages/web/src/components/PlanetLegend.tsx` — Minor updates
- `packages/web/src/components/TransitView.tsx` — Integrated TransitAspectGrid
- `packages/web/src/services/pdfExport.ts` — Render aspect grids in PDF
- `packages/web/src/utils/chart-helpers.ts` — Added aspect formatting helpers

### 📝 Notes
- Changes on `develop` branch, not yet committed
- Polish pass still needed for transit aspect grid (visual differences vs Astro-Seek)
- Two planned features remain: transit legend panel redesign, planet cluster rendering improvements

---

*Add new sessions below with date headers. Move completed items from PLAN.md and resolved items from BUGS.md to appropriate sections above.*