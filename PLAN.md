# Natal Chart Development Plan

## Current Sprint: Mobile Responsive & Polish
**Status**: In Progress
**Last Updated**: 2026-03-30

### ✅ Completed Features
- [x] **Automatic timezone detection** - Remove manual timezone selector from input form
- [x] **IANA timezone integration** - Get timezone from OpenCage API via Cloudflare Worker
- [x] **Luxon for historical accuracy** - Replace date-fns-tz with Luxon for pre-1970 DST rules
- [x] **Timezone-aware UTC conversion** - Convert local birth time using IANA timezone before Swiss Ephemeris
- [x] **Read-only timezone display** - Show detected timezone as "(detected from city)" information
- [x] **Geocoding validation** - Error message if geocoding succeeds but timezone is missing
- [x] **Tabbed chart view** - Implement 3 tabs: Chart Wheel, Planet Positions, Aspects
- [x] **Chart wheel size optimization** - Double diameter to 800px, reduce white space
- [x] **Retrograde indicators** - Add "R" column to planet positions table
- [x] **Form UI reorganization** - "Place of Birth" search at top, birth date/time on next row
- [x] **UTC subtle display** - Show UTC calculation as note at bottom of form
- [x] **Chart wheel enhancements** - Degree markings, house cusp display, visual polish
- [x] **Client-side PDF export** - Generate PDF of chart wheel, planet positions, aspects, and birth data
- [x] **Professional chart wheel redesign** (v0.3.0) - Concentric ring layout with zodiac band, planet band, inner house wheel
- [x] **SVG vector glyphs** (v0.3.0) - Replaced Unicode text with SVG path elements for font-independent rendering
- [x] **PDF vector glyph rendering** (v0.3.0) - Fixed corrupted font, removed glyph stripping, symbols render as vectors
- [x] **Planet collision avoidance** (v0.3.0) - Spread clustered planets with connector lines to true positions
- [x] **International date picker** (v0.3.0) - Year/Month/Day dropdowns instead of browser-native date input

### 🎨 Client Feedback (v0.4.0)
- [x] **Replace zodiac sign glyphs** - Unicode text via DejaVu Sans @font-face (web), font-extracted SVG paths (PDF)
- [x] **Replace planet glyphs** - Unicode text via DejaVu Sans @font-face (web), font-extracted SVG paths (PDF)
- [x] **Extend house cusp lines** - All house cusp lines now extend from outer circle to house number ring inner edge
- [x] **Add house number ring** - Dedicated ring between planet band and aspect area with numbers 1-12
- [x] **Remove inner wheel text** - Removed cusp degree text from planet band
- [x] **Aspects table: remove Angle column** - Removed from both web table and PDF export
- [x] **Fix planet house assignments** - Fixed falsy-zero bug in cusp boundary lookup (`||` → explicit index check)
- [x] **Fix inner wheel rotation** - Fixed `toAngle` JS modular arithmetic bug (negative values from `%` operator)
- [x] **PDF glyph rendering** - Hybrid approach: Unicode `<text>` for web, SVG `<path>` swap for PDF via `replaceGlyphTextWithPaths()`

### 🔗 Shareable URLs (v0.4.0)
- [x] **Shareable URLs** - Encode birth data as URL query params for sharing charts via clipboard
- [x] **Share button** - "Share Link" button next to "Download PDF" with copy-to-clipboard feedback
- [x] **Auto-load from URL** - ShareLoader component detects share params and auto-calculates chart

### 🚧 Planned Features
- [x] **Chart wheel ring consolidation** - Merge outer ruler circle with zodiac sign band; move degree ruler to inside edge (ticks facing outward); color sign glyphs by element (fire: red, earth: green, water: blue, air: yellow)
- [x] **Chart header cleanup** - Remove excess whitespace around header row; remove "Generated based on your birth details" subtitle; move PDF and share link buttons to same row as "Your Natal Chart" title (title left-aligned, buttons right-aligned)
- [x] **Planet positions legend panel** - Move chart wheel to the left; add a legend panel to the right (astroseek-style) showing: planet glyph, sign glyph, degree°minute', house number, and retrograde indicator for each planet. Include houses section below showing AC/DC/IC/MC cusps and all 12 house cusps with sign and degree.
- [x] **Manual timezone selection** - Allow manual timezone selection when lat/lng coordinates are entered directly into the place of birth field, bypassing the geocoding search button. Enables chart generation without geocoding lookup.
- [x] **Multiple chart comparison** - Side-by-side chart comparison feature
- [x] **Transit chart feature** - Separate `/transits` route with always-on transit controls, auto-initializing to current date. Natal chart at `/chart` is transit-free. Share URLs route-aware. NavLink active styling in header.
- [x] **Aspect grid table (natal)** - Triangular aspectarian grid replacing linear aspects table. Planet glyphs along diagonal with retrograde indicators. Lower-left triangle shows color-coded aspect glyphs (☌ ☍ △ □ ⚹ ⚻ ⚺ ∥ ⊥) with orb values. Includes all planets (Sun through Chiron), Lilith, Part of Fortune, Vertex, ASC, MC. Luminary-aware orbs (wider for Sun/Moon). Parallel/contraparallel aspects (declination-based, 1° orb). Grid also rendered in PDF export. Fixed Chiron ephemeris loading (absolute paths in Emscripten FS).
- [x] **Aspect grid table (transits)** - Rectangular grid for natal-to-transit aspects like Astro-Seek. Rows = natal planets (Sun through MC, including Node, Lilith, Chiron, Fortune, Vertex, ASC, MC). Columns = transit planets with sign glyph, degree, and minute in header. Each cell shows aspect glyph color-coded by type. Transit planet positions displayed in column headers with sign and degree. Include in Transit Chart view and PDF export. *(Polish pass needed: remaining visual differences vs Astro-Seek in row header detail, column header layout, and cell sizing.)*
- [x] **Transit legend panel redesign** - Redesign the PlanetLegend side panel on Transit Chart to match Astro-Seek style. Header section: "Birth x Transits" with birth date/time on left, transit date/time on right. Planet table: three columns — Planet (glyph + name), Birth (sign glyph + degree°minute'), Transit (sign glyph + degree°minute'). Show all planets including Node, Lilith, Chiron, Fortune, Vertex. Color planet glyphs orange for traditional style. Houses section at bottom: show ASC/IC/DSC/MC with both birth and transit cusps (sign + degree). Placidus system label.
- [x] **Planet cluster rendering improvements** - Improve how clustered planets render when many are close together in a sign. (1) Reduce planet glyph size slightly to allow more to fit without overlap. (2) Sort displaced labels by increasing degree so the radial order matches ecliptic order. (3) Replace text abbreviations (e.g. "Ari") with zodiac sign symbols (♈) in degree labels. (4) Show degree labels as "DD° sign-glyph" like Astro-Seek (e.g. "19° ♈" instead of "19° Ari"). Reference Astro-Seek's approach: planet glyphs stacked radially outward in degree order with degree+sign-symbol labels, connector lines to true positions on ecliptic.
- [x] **Mobile-friendly responsive layout** - Tamagui integration with custom `useResponsive` hook (`window.matchMedia`). Breakpoints: sm<=640px, md<=1024px, lg>=1025px. (1) Hamburger nav on mobile. (2) Chart+legend stacks vertically; chart SVG scales via viewBox to any width. (3) BirthDataForm single-column grid on mobile, full-width submit. (4) Aspect grids: 28px cells on mobile (34px desktop), horizontal scroll. (5) Button bars wrap with flexWrap. (6) Transit controls reflow. CompareView stacks charts vertically. Chart renders at full internal size (800px) for detail, CSS scales it down.

### 📋 Technical Debt & Refactoring
- [x] **Test coverage** - Increase unit test coverage for timezone calculations
- [x] **Error handling** - More graceful error handling for failed geocoding
- [x] **Performance optimization** - Lazy loading of WASM modules
- [x] **Code splitting** - Split bundle by routes/features
- [x] **Type safety** - More strict TypeScript configuration

### 🔄 Deployment Pipeline
- [x] **GitHub Actions workflow** - Automated build and deploy to GitHub Pages
- [x] **Build version tracking** - Git commit hash and timestamp display in footer
- [x] **Environment variables** - Proper handling of dev vs production API URLs
- [x] **Build caching** - Ensure consistent builds between local and CI
- [x] **Health checks** - Automated testing of deployed application

## Development Workflow
1. **Local testing** → `pnpm --filter web dev`
2. **Type checking** → `pnpm --filter web typecheck`
3. **Run tests** → `pnpm --filter web test`
4. **Build verification** → `pnpm --filter web build`
5. **Commit with conventional commits** → `feat:`, `fix:`, `docs:`, etc.
6. **Push to trigger deployment** → GitHub Actions auto-deploys to Pages

## Architecture Notes
- **Monorepo**: pnpm workspaces with core, web, worker packages
- **Frontend**: Vite + React with TypeScript, HashRouter for GitHub Pages
- **Calculations**: Swiss Ephemeris WASM in `@natal-chart/core` package
- **Geocoding**: Cloudflare Worker proxy to OpenCage API
- **Timezone**: Luxon for historical timezone accuracy
- **Styling**: Traditional parchment aesthetic with gold accents