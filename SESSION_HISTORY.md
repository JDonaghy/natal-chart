# Session History

*This file tracks completed work across development sessions. Items are moved here from PLAN.md and BUGS.md when marked as completed or resolved.*

## Session 2026-04-05b: v0.13.0 — Multiple Glyph Sets & Preferences Tab

### ✅ Features Completed
1. **Multiple glyph sets** — Two selectable glyph sets: "Classic" (DejaVu Sans) and "Modern" (Noto Sans Symbols / Symbols 2). Extracted 24 SVG glyph paths from Noto fonts using opentype.js. Refactored `astro-glyph-paths.ts` with `GlyphSet` type, `GLYPH_SETS` registry, and `getPlanetPath()`/`getSignPathByIndex()` accepting optional set parameter. Active set stored in ChartContext, persisted in localStorage, share URLs (`gs` param), and saved charts.
2. **Preferences tab** — New `/preferences` route with centralized settings page. Moved Glyph Style (Classic/Modern radio buttons with live preview), House System (Whole Sign/Placidus), and ASC Horizontal toggle from scattered locations into one page. All changes take effect immediately with localStorage persistence. Added "Preferences" NavLink in header navigation.
3. **Cleaned up chart views** — Removed inline Glyphs dropdown from ChartView, TransitView, and CurrentPlanetsView. Removed House System radios and ASC Horizontal checkbox from BirthDataForm. Chart views now read `ascHorizontal` from context instead of `birthData?.ascHorizontal`.

### 📁 Files Created
- `packages/web/src/components/PreferencesView.tsx` — Preferences page component
- `scripts/extract-noto-glyphs.mjs` — One-time script for extracting SVG paths from TTF fonts

### 📁 Files Changed
- `packages/web/src/utils/astro-glyph-paths.ts` — Added GlyphSet/GlyphPath types, GLYPH_SETS registry (classic + modern), refactored lookup functions
- `packages/web/src/contexts/ChartContext.tsx` — Exported ChartContext, added glyphSet/houseSystem/ascHorizontal state with localStorage persistence
- `packages/web/src/components/GlyphIcon.tsx` — Auto-reads glyphSet from ChartContext, accepts optional glyphSet prop
- `packages/web/src/components/ChartWheel.tsx` — Added glyphSet prop, passed through to all PlanetGlyph/SignGlyph calls
- `packages/web/src/services/pdfExport.ts` — Threaded glyphSet through generateChartPdf → addChartWheel → replaceGlyphTextWithPaths
- `packages/web/src/components/ChartView.tsx` — Removed Glyphs dropdown, uses context ascHorizontal, passes glyphSet to share/save/PDF
- `packages/web/src/components/TransitView.tsx` — Same cleanup as ChartView
- `packages/web/src/components/CurrentPlanetsView.tsx` — Removed Glyphs dropdown and local glyphSet state, reads from context
- `packages/web/src/components/BirthDataForm.tsx` — Removed house system/ASC horizontal controls, reads from context
- `packages/web/src/utils/shareUrl.ts` — Added glyphSet to ShareData, encode/decode `gs` param
- `packages/web/src/services/savedCharts.ts` — Added glyphSet to SavedChart interface and save logic
- `packages/web/src/components/ShareLoader.tsx` — Restores glyphSet from share URL
- `packages/web/src/components/Layout.tsx` — Added "Preferences" NavLink
- `packages/web/src/App.tsx` — Added /preferences lazy route

### 📝 Notes
- PDF table glyphs still use Unicode text via DejaVuSans font (not glyph set system) — changing those would require rendering SVG paths as inline images in jsPDF cells
- Noto Sans Symbols doesn't have all planet codepoints; sun and pluto came from Noto Sans Symbols 2
- Changes on `develop` branch, not yet committed

---

## Session 2026-04-05: v0.12.0 — Inner Wheel Enlargement, Transit Animations, Lot of Spirit

### ✅ Features Completed
1. **Enlarge inner wheel diameter** — Increased `planetInner`/`houseNumOuter` from 0.38→0.54 (natal) and 0.32→0.44 (transit). Adjusted label positioning (`labelStep` 0.14→0.20, `topR` offset 0.15) with `Math.max(bandH*0.11, size*0.018)` floor for label size. Gap between minute label and house ring reduced ~60%.
2. **Lighter bounds/decans colors** — Reduced `fillOpacity` from 0.25 to 0.10 on both bounds and decans ring segments.
3. **House cusp degree labels** (Bug #14) — Added DD°MM' labels on cusp lines at zodiac ring boundary. Rendered last with parchment background rect. Hidden for Whole Sign houses.
4. **Transit time-step animation** — New `TransitAnimationControls` component. Transport buttons (◀ ⏪ ⏩ ▶) + pill increment selector (1m→24h). Desktop: inline with date picker. Mobile: stacked. Uses refs to avoid stale closures. 1.2s auto-play interval. "Now" button hidden during playback.
5. **Transit band label sizing** — Matched natal band formula: `labelStep=bandWidth*0.20`, `topR` offset 0.15, `labelSz=Math.max(bandWidth*0.11, size*0.018)`.
6. **Transit outer ring narrowed** — `transitOuter` from 0.98→0.96.
7. **ASC/DSC and MC/IC axis clipping** — Axes clipped via SVG `clipPath` with `clipRule="evenodd"` to exclude the inner circle (`R.houseNumInner`). Lines no longer cross through center.
8. **Aspect line clipping** — Both natal and transit aspect lines clipped to `R.houseNumInner` circle via SVG `clipPath`.
9. **Transit city defaults to birth city** — When no transit city selected, calculation uses birth location coordinates. Transit city input initialized with birth city name. Placeholder shows birth city.
10. **Lot of Spirit** — Added `'spirit'` to Planet type. Calculator computes Spirit (inverse Fortune formula). Added ☩ glyph, medium slate blue color. Appears on chart wheel, legend, positions table, aspect grid.

### 🐛 Bugs Fixed
- **#14 House cusp degree labels** — Resolved (see feature #3 above)

### 📁 Files Created
- `packages/web/src/components/TransitAnimationControls.tsx` — Transit animation controls component

### 📁 Files Changed
- `packages/web/src/components/ChartWheel.tsx` — Ring radii, label sizing, bounds opacity, cusp labels, aspect/axis clipping, spirit glyph+color
- `packages/web/src/components/TransitView.tsx` — Animation controls integration, fixed-width datetime input, transit city defaults
- `packages/web/src/components/CitySearch.tsx` — Layout fix (`inline-block` for compact mode)
- `packages/web/src/components/GlyphIcon.tsx` — Spirit glyph
- `packages/web/src/utils/chart-helpers.ts` — Spirit display name
- `packages/web/src/contexts/ChartContext.tsx` — Transit calculation defaults to birth location
- `packages/core/src/types.ts` — Added 'spirit' to Planet type
- `packages/core/src/calculator.ts` — Lot of Spirit calculation, skip spirit in declination aspects
- `PLAN.md` — v0.12.0 items added and completed
- `BUGS.md` — #14 resolved, #22 opened (transit city search)

### 📝 Notes
- Transit city search (Bug #22) still has issues — button disabled when no text typed, compact CitySearch layout needs rework
- Changes on `develop` branch, not yet committed

---

## Session 2026-04-01b: v0.10.0 Complete — View Flags, Minute Labels, PDF Fix

### ✅ Features Completed
1. **Persist chart view flags in share URLs and saved charts** — Added `showAspects` (`asp=0`) and `showBoundsDecans` (`bd=1`) params to share URL encoding/decoding. Added fields to `SavedChart` interface. Flags restored when loading from share URL (via ShareLoader) or saved chart. Only non-default values encoded to keep URLs short.
2. **Shrink minute label font on chart wheel** — Reduced minute text (MM′) from `labelSz` to `labelSz * 0.7` in both natal and transit planet bands in ChartWheel.
3. **Fix PDF degree/minute rendering** — The prime character ′ (U+2032) was not in svg2pdf's default Helvetica font, causing garbled multi-character output. Fixed by replacing ′ with ASCII apostrophe in SVG text clone before svg2pdf processing.

### 🐛 Bugs Fixed
4. **Share link broken on HTTP** — `navigator.clipboard` is undefined in non-secure contexts (HTTP dev server). Added fallback using hidden textarea + `execCommand('copy')` in both ChartView and TransitView.
5. **View flags reset on route navigation** — `showAspects` and `showBoundsDecans` were local component state, resetting on unmount. Moved to ChartContext so they persist across route changes.

### 📁 Files Changed
- `packages/web/src/utils/shareUrl.ts` — Added `showAspects`/`showBoundsDecans` to ShareData, encode/decode
- `packages/web/src/services/savedCharts.ts` — Added view flags to SavedChart and saveChart()
- `packages/web/src/contexts/ChartContext.tsx` — Added showAspects/showBoundsDecans state
- `packages/web/src/components/ChartView.tsx` — Use context flags, clipboard fallback, pass flags to share/save
- `packages/web/src/components/TransitView.tsx` — Use context flags, clipboard fallback, pass flags to share/save
- `packages/web/src/components/ShareLoader.tsx` — Restore view flags from share URL
- `packages/web/src/components/ChartWheel.tsx` — Minute label fontSize reduced to 0.7×
- `packages/web/src/services/pdfExport.ts` — Replace ′ with ' in SVG text before svg2pdf
- `PLAN.md` — All v0.10.0 items marked complete

### 📝 Notes
- v0.10.0 Chart Enhancements is now fully complete (all 4 items done)
- CurrentPlanetsView keeps local showAspects/showBoundsDecans state (no ChartContext dependency)
- Changes on `develop` branch, not yet committed

---

## Session 2026-04-01: v0.9.0/v0.10.0 — Current Planets Page & Bounds/Decans Rings

### ✅ Features Completed
1. **Current planets page** — New `/current` route with `CurrentPlanetsView.tsx`. Calculates chart for current date/time at Greenwich using Whole Sign houses. `fixedAnchor={0}` puts 0° Aries at 9 o'clock (natural zodiac wheel). DateTime picker + "Now" button. Chart wheel + planet legend sidebar. Lazy-loaded.
2. **Bounds and decans rings** — Egyptian bounds (Ptolemy) and Chaldean decans as two concentric rings inside the zodiac ring. Segments filled with planet color at 25% opacity + ruler planet glyph. When enabled, zodiac ring redistributes: sign glyphs 30%, ticks 25%, bounds 22.5%, decans 22.5%. Toggle checkbox (default off) in ChartView and CurrentPlanetsView.
3. **Show aspect lines toggle on Current Planets** — Added `showAspects` state and checkbox to CurrentPlanetsView.
4. **ChartWheel `fixedAnchor` prop** — Overrides rotation anchor for natural zodiac wheel (0° Aries at 9 o'clock).
5. **ChartWheel `showBoundsDecans` prop** — Conditionally renders bounds/decans rings and adjusts tick/glyph layout.

### 📁 Files Created
- `packages/web/src/components/CurrentPlanetsView.tsx` — Current planets page

### 📁 Files Changed
- `packages/web/src/components/ChartWheel.tsx` — `fixedAnchor`, `showBoundsDecans` props, Egyptian bounds + Chaldean decans data, conditional ring layout
- `packages/web/src/components/ChartView.tsx` — `showBoundsDecans` state + checkbox
- `packages/web/src/components/Layout.tsx` — "Current Planets" nav link
- `packages/web/src/App.tsx` — `/current` route
- `PLAN.md` — v0.9.0 complete, v0.10.0 items added

### 📝 Notes
- v0.9.0 Client Feedback is now fully complete (all 4 items done)
- v0.10.0 has 3 remaining items: persist view flags in URLs/saved charts, shrink minute label font, investigate PDF degree/minute rendering
- Changes on `develop` branch, not yet committed

---

## Session 2026-03-31e: v0.9.0 Client Feedback — Aspect Legend & Legend Sidebar Redesign

### ✅ Features Completed
1. **Aspect grid legend** — Added color-coded symbol legend below the aspect grid in `AspectGrid.tsx`. Shows all 9 aspect types (conjunction, opposition, trine, square, sextile, quincunx, semi-sextile, parallel, contraparallel) with glyphs, names, and angles. Wraps responsively.
2. **Redesign legend sidebar (natal)** — Removed 12-house cusp listing from natal `PlanetLegend`. Only ASC/IC/DSC/MC angles remain under "Houses (Placidus)" header.
3. **Transit legend: remove full houses section** — Removed 12-house cusp table from transit `PlanetLegend`. Only 4 angles remain with Birth/Transit columns.

### 📁 Files Changed
- `packages/web/src/components/AspectGrid.tsx` — Added aspect symbol legend section
- `packages/web/src/components/PlanetLegend.tsx` — Removed 12-house cusp tables from both natal and transit modes
- `PLAN.md` — Marked 3 v0.9.0 items complete

### 📝 Notes
- v0.9.0 Client Feedback has 1 remaining item: "Current planets page" (requires client screenshot)
- Changes on `develop` branch, not yet committed

---

## Session 2026-03-31d: v0.8.0 Chart Wheel Polish — Final Items

### ✅ Features Completed
1. **Shrink Vertex (VX) label** — Reduced VX glyph to 65% of normal planet glyph size in both natal and transit bands.
2. **Increase degree/minute text size** — Bumped degree and minute labels from 0.85× to 1.0× labelSz in both natal and transit bands.
3. **Change Pluto glyph** — Replaced ♇ with ⯓ (Astro-Seek style) across ChartWheel, pdfExport, and chart-helpers.
4. **Rotate Lot of Fortune glyph** — Added 45° SVG rotation transform on ⊕ glyph so it renders as "x" instead of "+". Applied to natal and transit bands.
5. **Add option to hide aspect lines** — Added `showAspects` prop to ChartWheel (guards both natal and transit aspect lines). Added "Show aspect lines" checkbox toggle in ChartView and TransitView.
6. **Thicker ASC/MC lines** — Increased ASC/DSC and MC/IC axis stroke width from 2 to 3.
7. **Degree labels without planet glyph** — Verified current code already renders planet glyph separately from degree/sign/minute labels. No repeated glyph. Bug #16 resolved.

### ✅ Bugs Resolved
- **#16 Degree labels repeat planet glyph** — Verified: labels already separate, no repeated glyph in current code.

### 📁 Files Changed
- `packages/web/src/components/ChartWheel.tsx` — VX size, degree/min text size, Pluto glyph, Fortune rotation, showAspects prop, ASC/MC stroke width
- `packages/web/src/components/ChartView.tsx` — showAspects state + checkbox
- `packages/web/src/components/TransitView.tsx` — showAspects state + checkbox
- `packages/web/src/services/pdfExport.ts` — Pluto glyph ⯓
- `packages/web/src/utils/chart-helpers.ts` — Pluto glyph ⯓
- `PLAN.md` — All v0.8.0 items marked complete, sprint updated to v0.9.0
- `BUGS.md` — #15, #16 archived

### 📝 Notes
- v0.8.0 Chart Wheel Polish section is now **fully complete** (all 12 items done)
- Next sprint: v0.9.0 Client Feedback (aspect grid legend, current planets page, legend sidebar redesign)
- Changes on `develop` branch, not yet committed

---

## Session 2026-03-31c: Planet Glyph Sizing, Radial Layout & Collision Avoidance

### ✅ Features Completed
1. **Planet glyph sizing reduction** — Reduced natal planet glyphs from `bandH * 0.22` to `bandH * 0.11`, transit glyphs from `bandWidth * 0.25` to `bandWidth * 0.11`. Planets no longer dominate or overlap the wheel.
2. **Radial label layout** — Planet info now stacks radially from outside in: planet glyph, degree, sign glyph, minute — matching Astro-Seek's layout. Previously degree+sign were merged on one line.
3. **Cluster-based collision avoidance** — Replaced damped pairwise push algorithm with cluster detection + even spacing. Detects groups of overlapping labels and spreads them evenly around the cluster center. Handles wrap-around at 0°/360°. Extracted as shared `spreadLabels()` function for both natal and transit.
4. **Removed duplicate lot markers** — Removed the separate lot rendering section (Fortune ⊕ and Spirit ☉) since Fortune is already in the planets array. Eliminates bug #61 (duplicate Fortune glyph) and the confusing Spirit ☉ that looked like a duplicate Sun.

### ✅ Bugs Fixed
1. **#15 Planet glyphs too large / overlapping** — Resolved by glyph size reduction and tighter collision avoidance (minSeparation 8° → 6°).
2. **#61 (PLAN) Duplicate Lot of Fortune glyph** — Resolved by removing separate lot marker rendering.

### 📁 Files Changed
- `packages/web/src/components/ChartWheel.tsx` — Radial label layout, cluster-based `spreadLabels()`, removed lot rendering, removed `showLots` prop, removed `calculateLots`/`LotResult` imports

---

## Session 2026-03-31b: ASC Horizontal, Koch Removal & Whole Sign House Fix

### ✅ Features Completed
1. **ASC Horizontal toggle** (v0.8.0) — Added "ASC Horizontal" checkbox to house system UI (default checked). When checked, ASC at 9 o'clock; when unchecked, 1st house cusp at 9 o'clock. Matches Astro-Seek's dual Whole Sign modes.
2. **Remove Koch house system** (v0.8.0) — Removed Koch ('K') from `HouseSystem` type, calculator map, UI radio buttons, share URL parsing, and all display strings. Whole Sign listed first, "(most common)" removed from Placidus.

### ✅ Bugs Fixed
1. **#13 Wheel rotation / ASC Horizontal** — Clarified client intent: Astro-Seek-style dual rotation. Implemented as toggle.
2. **#17 Whole Sign house assignment always same house** — All planets showed house 4 with Whole Sign. Root cause: cusp-range algorithm didn't work with Swiss Ephemeris Whole Sign cusps. Fixed with Whole Sign-specific fast path: `house = ((planetSign - ascSign + 12) % 12) + 1`. Applied to natal, fortune, vertex, and transit calculations.

### 🐛 Bugs Identified (from Astro-Seek comparison `samples/avu.png`)
- **#14** Missing house cusp degree labels on thick lines
- **#15** Planet glyphs too large / overlapping
- **#16** Degree labels repeat planet glyph

### 📁 Files Changed
- `packages/core/src/types.ts` — HouseSystem: removed 'K'
- `packages/core/src/calculator.ts` — Removed Koch map entry, Whole Sign house assignment fast path (natal + transit + findHouse)
- `packages/web/src/components/BirthDataForm.tsx` — Removed Koch radio, added ascHorizontal checkbox, Whole Sign first, localStorage persistence
- `packages/web/src/components/ChartWheel.tsx` — ascHorizontal prop, rotationAnchor logic
- `packages/web/src/components/ChartView.tsx` — Pass ascHorizontal, removed Koch display string
- `packages/web/src/components/TransitView.tsx` — Pass ascHorizontal, removed Koch display string
- `packages/web/src/components/CompareView.tsx` — Pass ascHorizontal, removed Koch display string
- `packages/web/src/contexts/ChartContext.tsx` — ascHorizontal on ExtendedBirthData
- `packages/web/src/services/pdfExport.ts` — Removed Koch display string
- `packages/web/src/utils/shareUrl.ts` — Removed 'K' from type and parser
- `PLAN.md` — Marked ASC Horizontal and Koch removal complete
- `BUGS.md` — Added #13-17, marked #13 and #17 fixed

---

## Session 2026-03-31: ZR Bug Fix, Transit Tick Marks & Client Feedback

### ✅ Bugs Fixed
1. **#12 Zodiacal Releasing period dates incorrect** — Two root causes: (a) period durations used 365.25-day tropical years instead of 360-day zodiacal years; (b) Capricorn sign period was 30 years instead of 27 (Saturn's lesser period). Total cycle corrected from 214→211 years. Verified against Astro-Seek reference — all L1 and L2 dates now match exactly.

### ✅ Features Completed
1. **Transit wheel degree markers** (v0.8.0) — Added 1° tick marks around the transit chart outer ring. 5° ticks at 20% band depth (0.6px), 1° ticks at 10% depth (0.3px). Sign boundaries (30°) skipped as they're already drawn as full lines.
2. **Editable timezone field** — Replaced read-only timezone display with searchable dropdown (same as coordinates input mode). Removed "Timezone is automatically determined from the birth city" helper text.
3. **Dev proxy for LAN access** — Changed `.env.development` to use Vite proxy (`/api/geocode`) instead of direct worker URL, fixing CORS issues when accessing from LAN IP.

### 📋 Client Feedback Added to Plan
Added 16 new items to PLAN.md from client feedback:
- v0.8.0 Chart Wheel Polish: duplicate Fortune glyph, VX label size, degree text size, Pluto glyph, Fortune glyph rotation, hide aspect lines toggle, ASC/MC line thickness, degree label layout
- v0.9.0 Client Feedback: aspect grid legend, current planets page, legend sidebar redesign, transit houses section removal
- Updated Koch removal to include Whole Sign first + remove "(most common)"

### 📁 Files Changed
- `packages/core/src/zodiacal-releasing.ts` — 360-day years, Capricorn=27, total=211
- `packages/core/test/zodiacal-releasing.test.ts` — Updated duration assertions
- `packages/web/src/components/ChartWheel.tsx` — Transit ring tick marks
- `packages/web/src/components/ReleasingTimeline.tsx` — Display divisors 360/30
- `packages/web/src/components/BirthDataForm.tsx` — Editable timezone dropdown
- `packages/web/src/services/pdfExport.ts` — PDF duration divisor
- `packages/web/.env.development` — Proxy URL for LAN dev
- `PLAN.md` — Client feedback items, transit ticks complete
- `BUGS.md` — Added and resolved #12

---

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

## Session 2026-03-30: Mobile-Responsive Layout (v0.7.0)

### ✅ Features Completed
1. **Tamagui integration** — Installed Tamagui v1.116.14 with Vite plugin, custom tokens (parchment, gold, navy, cream), and responsive breakpoints (sm<=640px, md<=1024px, lg>=1025px)
2. **Custom useResponsive hook** — `window.matchMedia` + `useSyncExternalStore` (Tamagui's `useMedia()` was unreliable for viewport detection)
3. **Hamburger navigation** — Mobile nav collapses to animated hamburger toggle with vertical dropdown
4. **Responsive chart rendering** — Chart SVG renders at full 800px internal size and scales down via viewBox to any container width; works on screens as small as 320px
5. **Chart + legend stacking** — Side-by-side on desktop/tablet, vertically stacked on mobile with full-width legend
6. **Responsive header bars** — Title + buttons wrap on mobile; transit date/time controls reflow
7. **BirthDataForm responsive grid** — 2-column desktop, single-column mobile, full-width submit button
8. **CompareView responsive** — Charts stack vertically on mobile with responsive sizes (600px desktop, 450px tablet)
9. **Aspect grid responsive cells** — 28px cells on mobile, 34px on desktop, horizontal scroll preserved

### 🐛 Bugs Resolved
- **#7 Mobile responsiveness** — Fully resolved with responsive layout across all views

### 📁 Files Changed
- `packages/web/tamagui.config.ts` — New: Tamagui configuration
- `packages/web/src/hooks/useResponsive.ts` — New: Responsive breakpoint hook
- `packages/web/vite.config.ts` — Added Tamagui Vite plugin
- `packages/web/src/App.tsx` — TamaguiProvider wrapper
- `packages/web/src/components/Layout.tsx` — Hamburger menu, responsive padding
- `packages/web/src/components/ChartView.tsx` — Responsive chart size, stacked layout
- `packages/web/src/components/TransitView.tsx` — Responsive chart size, controls reflow
- `packages/web/src/components/CompareView.tsx` — Stacked charts, responsive sizes
- `packages/web/src/components/BirthDataForm.tsx` — Single-column mobile grid
- `packages/web/src/components/AspectGrid.tsx` — Responsive cell size
- `packages/web/src/components/TransitAspectGrid.tsx` — Responsive cell size
- `packages/web/src/components/ChartWheel.tsx` — Touch action for mobile
- `packages/web/package.json` — Tamagui dependencies

### 📝 Notes
- Tamagui v2.0.0-rc requires React 19; used v1.116.14 for React 18 compatibility
- Tamagui's `useMedia()` didn't respond to viewport changes — custom hook using native `window.matchMedia` works reliably
- Chart SVG already had viewBox + width:100%; the fix was removing flex constraints that prevented the container from shrinking below 640px

## Session 2026-04-01c: v0.11.0 Release — Chart Wheel Polish, Current Planets, Bounds/Decans, PDF Glyph Fixes

### ✅ Features Completed (v0.8.0 – v0.11.0)
1. **Chart wheel polish (v0.8.0)** — Transit wheel 1°/5° tick marks, ASC Horizontal toggle, planet glyph sizing/radial layout, Koch house system removed, show/hide aspect lines toggle, Pluto glyph (⯓), Lot of Fortune rotation, thicker ASC/MC lines, Vertex label shrink, degree/minute text size increase.
2. **Client feedback (v0.9.0)** — Aspect grid legend with color-coded symbols, Current Planets page (`/current` route) with chart wheel for current date/time at Greenwich, redesigned legend sidebar (angles only, no 12-house cusp listing), transit legend houses section removed.
3. **Chart enhancements (v0.10.0)** — Egyptian bounds (Ptolemy) and Chaldean decans rings inside zodiac ring with toggle checkbox, persist showAspects and showBoundsDecans flags in share URLs and saved charts, shrink minute label font to 70%, fix PDF prime character (′) rendering.
4. **PDF glyph fixes (v0.11.0)** — Fixed planet-band zodiac sign glyphs all rendering as Aries in PDF (missing `data-glyph-index` attribute on natal and transit band zodiac text elements). Fixed transit planet glyphs not converted to SVG paths (missing `data-glyph` and `data-planet` attributes). Bundled Cormorant font locally for PDF export.

### 🐛 Bugs Filed
- **Bug #18**: PDF degree/minute font mismatch — Cormorant registered with jsPDF but svg2pdf still falls back to Helvetica.

### 📁 Key Files Changed
- `packages/web/src/components/ChartWheel.tsx` — LABEL_FONT constant, explicit fontFamily on degree/minute/house text, data-glyph-index on planet-band zodiac signs, data-glyph/data-planet on transit planet glyphs
- `packages/web/src/services/pdfExport.ts` — Refactored font loading into generic `addFontToDoc`, loads Cormorant alongside DejaVuSans, normalizes font-family on SVG clone
- `packages/web/src/App.css` — Local @font-face for Cormorant
- `packages/web/public/fonts/Cormorant-Regular.ttf` — New font file

---

## Session 2026-04-01c: v0.11.1 Patch — Glyph Rendering, PDF Fonts, Timezone Fix

### 🐛 Bugs Fixed
1. **PDF autoTable garbled glyphs** — `autoTable` ignored `doc.setFont('DejaVuSans')` and rendered Unicode glyphs in Helvetica, producing garbled `&H &= &L` output. Fixed by adding `font: 'DejaVuSans'` to autoTable `headStyles`/`bodyStyles` when fontLoaded is true.
2. **PDF font lookup warnings** — DejaVuSans and Cormorant were only registered as 'normal' weight. autoTable/svg2pdf tried bold/500normal, causing console warnings. Fixed by registering both fonts as 'bold' too (same regular TTF).
3. **Pluto glyph ⯓ rendering as rectangle** — U+2BD3 is in a rare Unicode block unsupported by most system fonts. Replaced all `<text>` glyph rendering in ChartWheel with `<path>` elements using SVG path data from `astro-glyph-paths.ts`. Created `GlyphIcon.tsx` with `PlanetGlyphIcon`/`SignGlyphIcon` for HTML contexts (PlanetLegend, AspectGrid, TransitAspectGrid, ChartView, TransitView).
4. **Timezone detection broken on city selection** — In `CitySearch.handleSelect()`, `onSelect(result)` set the timezone, then `setQuery(result.formatted)` triggered `onChange` which cleared it. Fixed by swapping call order: `setQuery` fires before `onSelect`.

### ✅ UI Changes
5. **Chart toggle checkboxes above chart** — Moved "Show aspect lines" and "Bounds & decans" checkboxes from below to above the chart wheel in ChartView, TransitView, and CurrentPlanetsView.

### 📁 Key Files Changed
- `packages/web/src/utils/astro-glyph-paths.ts` — Added exported `glyphTransform()` function
- `packages/web/src/components/ChartWheel.tsx` — `PlanetGlyph`/`SignGlyph` components render SVG paths instead of text
- `packages/web/src/components/GlyphIcon.tsx` — New: `PlanetGlyphIcon`/`SignGlyphIcon` for HTML inline SVG
- `packages/web/src/components/PlanetLegend.tsx` — Use GlyphIcon instead of Unicode text
- `packages/web/src/components/AspectGrid.tsx` — Use GlyphIcon for planet diagonal cells
- `packages/web/src/components/TransitAspectGrid.tsx` — Use GlyphIcon for row/column headers
- `packages/web/src/components/ChartView.tsx` — Use GlyphIcon, move checkboxes above chart
- `packages/web/src/components/TransitView.tsx` — Use GlyphIcon, move checkbox above chart
- `packages/web/src/components/CurrentPlanetsView.tsx` — Move checkboxes above chart
- `packages/web/src/services/pdfExport.ts` — Register bold font variants, add font to autoTable styles
- `packages/web/src/components/CitySearch.tsx` — Swap setQuery/onSelect order in handleSelect

---

## Session 2026-04-05c: v0.14.0 — User Accounts & Cloud Sync

### Features Completed
1. **Firebase Authentication** — Google SSO via Firebase Auth SDK. Sign In button in header with provider picker dropdown. Avatar + name display when logged in with Sign Out menu. Auth is optional — app works fully without login.
2. **Cloudflare D1 database** — Serverless SQLite database for user accounts, preferences, and saved charts. Schema: users, preferences, saved_charts tables with share_token support. Inputs-only chart storage (~200 bytes vs ~5-10KB full ChartResult).
3. **Worker API endpoints** — JWT verification middleware (Firebase ID tokens via Google JWKS, cached 1hr). CRUD for user, preferences, charts. Chart sharing via tokens. Account deletion. Extended existing geocoding Worker.
4. **Cloud preferences sync** — Preferences loaded from cloud on login (cloud wins). Debounced 2-second writes to cloud on every preference change. localStorage remains as offline cache.
5. **Cloud chart saving** — Fire-and-forget save to D1 alongside localStorage on every chart save. New async functions for listing, loading, and deleting cloud charts.
6. **localStorage migration** — Modal on first login when existing localStorage charts detected. Uploads charts one-by-one with progress indicator. Skippable, only shown once.
7. **Account management** — Account section in Preferences page showing user info, sync status, Sign Out, and "Delete My Data" with confirmation flow that removes all D1 records.
8. **GitHub SSO ready** — Provider support added in code, needs GitHub OAuth App registration in Firebase console.

### Bug Fixes
- Marked Bug #22 (Transit city search button disabled) as resolved from previous session

### Files Created
- `packages/web/src/services/auth.ts` — Firebase init, sign-in/out, getIdToken, auth state subscription
- `packages/web/src/services/cloudSync.ts` — Worker API client (user, preferences, charts, sharing)
- `packages/web/src/contexts/AuthContext.tsx` — React context for auth state, migration modal trigger
- `packages/web/src/components/LoginButton.tsx` — Sign In / user avatar dropdown component
- `packages/web/src/components/CloudMigrationModal.tsx` — localStorage-to-cloud import modal
- `packages/worker/src/auth.ts` — Firebase JWT verification for Cloudflare Workers
- `packages/worker/migrations/0001_init.sql` — D1 schema (users, preferences, saved_charts)

### Files Changed
- `packages/web/src/App.tsx` — Wrapped app in AuthProvider
- `packages/web/src/components/Layout.tsx` — Added LoginButton to header, CloudMigrationModal overlay, updated footer
- `packages/web/src/components/PreferencesView.tsx` — Added Account section (user info, sync status, delete data)
- `packages/web/src/contexts/ChartContext.tsx` — Added cloud preferences sync (load on login, debounced writes)
- `packages/web/src/services/savedCharts.ts` — Cloud-aware saving, async cloud chart functions
- `packages/web/vite.config.ts` — Added dev proxies for /api/* and /shared/* routes
- `packages/web/.env.example` — Added VITE_FIREBASE_* variables
- `packages/worker/src/index.ts` — Refactored with auth middleware + CRUD endpoints + chart sharing
- `packages/worker/wrangler.toml` — Added D1 binding

### Infrastructure
- Firebase project: natal-chart-329b3
- D1 database: natal-chart-db (ae3aa7c7-606b-490f-a1bd-cb7a9314e45c)
- Worker deployed with D1 + KV bindings
- Firebase project ID stored as Cloudflare secret

---

## Session 2026-04-06: v0.15.0 — Saved Charts Management, Security, Docs

### Features Completed
1. **My Charts tab** (`/charts`) — Dedicated saved charts management page with unified local + cloud list. Inline rename, delete with confirmation, Open button (loads/recalculates), share link toggle.
2. **Three-state sync badges** — Local (grey, not synced), Synced (green, in both localStorage and cloud), Cloud (blue, cloud-only from another device).
3. **Chart deduplication** — `cloudId` field on local charts links them to their cloud copy. `getAllSavedChartSummaries()` deduplicates so synced charts appear once. Charts remain in localStorage after sync for offline access.
4. **Auto-sync on open** — Opening a cloud-only chart recalculates from inputs and saves to localStorage, becoming "Synced".
5. **CompareView refactored** — Removed chart list/delete UI. Now purely two dropdowns + side-by-side chart rendering.
6. **Security hardening** — Removed error details from 500 responses. Added 10KB/50KB payload limits. 500 chart cap per user. Share token format validation.
7. **D1 database backups** — `scripts/backup-d1.sh` exports D1 as compressed SQL dumps. Cron job runs nightly at 3am on dellserver, 30-day retention.
8. **ARCHITECTURE.md rewrite** — Full system overview with diagrams, all endpoints, D1 schema, auth flow, CI/CD, env vars, external accounts, backup/restore procedures, disaster recovery, secrets inventory.
9. **Infrastructure setup script** — `scripts/setup-infrastructure.sh` recreates all Cloudflare resources from scratch.
10. **Secrets audit** — Scanned all tracked files and git history. Clean. Removed Firebase config literals from ARCHITECTURE.md.

### Bug Fixes
- Fixed Worker 500 errors on authenticated routes (missing try/catch with CORS headers)
- Fixed Firebase env vars not passed to GitHub Pages build (added to deploy.yml)
- Fixed Worker API URL pointing to GitHub Pages instead of Cloudflare Worker (added VITE_WORKER_API_URL)
- Fixed D1 migration not applied to remote (was local-only)

### Files Created
- `packages/web/src/components/SavedChartsView.tsx` — My Charts management page
- `packages/worker/src/auth.ts` — Firebase JWT verification for Workers
- `packages/worker/migrations/0001_init.sql` — D1 schema
- `scripts/backup-d1.sh` — Nightly D1 backup script
- `scripts/setup-infrastructure.sh` — Disaster recovery / infrastructure setup

### Files Changed
- `packages/web/src/services/savedCharts.ts` — cloudId tracking, deduplication, rename, cloud-aware CRUD
- `packages/web/src/components/CompareView.tsx` — Simplified to comparison-only
- `packages/web/src/components/CloudMigrationModal.tsx` — Stores cloudId after migration
- `packages/web/src/components/Layout.tsx` — Added "My Charts" NavLink
- `packages/web/src/App.tsx` — Added /charts route
- `packages/worker/src/index.ts` — Security hardening, error handling, account deletion
- `.github/workflows/deploy.yml` — Firebase + Worker API URL env vars
- `ARCHITECTURE.md` — Complete rewrite
- `.gitignore` — Added backups/

### Infrastructure Changes
- D1 migration applied to remote
- Firebase env vars added as GitHub repository secrets
- VITE_WORKER_API_URL secret added
- Worker redeployed with security hardening
- Nightly backup cron installed on dellserver

---

*Add new sessions below with date headers. Move completed items from PLAN.md and resolved items from BUGS.md to appropriate sections above.*