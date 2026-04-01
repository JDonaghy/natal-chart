# Natal Chart - Current Status
*Last Updated: 2026-04-01*

## 🚀 Deployment Status
- **GitHub Pages**: https://jdonaghy.github.io/natal-chart/
- **Cloudflare Worker**: https://natal-chart-geocoding.johnfdonaghy.workers.dev (v2 with timezone support)
- **Auto-deployment**: GitHub Actions on push to `main`
- **Current Version**: 0.11.0

## ✅ What Works

### Core Functionality
- [x] Birth data form with Year/Month/Day dropdowns (locale-independent)
- [x] Automatic timezone detection via OpenCage geocoding
- [x] Swiss Ephemeris WASM calculations (planets, houses, aspects, declinations)
- [x] Professional chart wheel with concentric ring layout
- [x] Astrological glyphs: Unicode text (DejaVu Sans) on web, font-extracted SVG vector paths in PDF
- [x] Planet collision avoidance with degree-ordered radial stacking and connector lines
- [x] Planet degree labels as "DD° sign-glyph" (e.g. "19° ♈") Astro-Seek style
- [x] Dedicated house number ring (1-12) between planet band and aspect area
- [x] House cusp lines extending from outer circle through all bands
- [x] Tabbed view (Chart Wheel, Planet Positions, Aspects)
- [x] Natal aspect grid — triangular aspectarian with color-coded glyphs, parallel/contraparallel aspects
- [x] Transit aspect grid — rectangular natal-to-transit grid with sign/degree column headers
- [x] Transit legend panel — Astro-Seek style "Birth × Transits" with side-by-side positions
- [x] Retrograde indicators in table, chart, and legend
- [x] Client-side PDF export with aspect grids and hybrid glyph rendering
- [x] Shareable URLs — encode birth data as query params, auto-load shared charts
- [x] Separate Natal Chart (`/chart`) and Transit Chart (`/transits`) routes
- [x] Transit Chart auto-initializes to current date with always-on controls
- [x] Chart comparison view — side-by-side saved chart comparison
- [x] Route-aware share URLs and saved chart loading
- [x] NavLink active styling in navigation header
- [x] LocalStorage persistence of birth data and form state
- [x] Real geocoding via Cloudflare Worker
- [x] Coordinate input detection with OpenStreetMap validation link
- [x] Chiron calculations via asteroid ephemeris files

### Chart Wheel Polish (v0.8.0)
- [x] Transit wheel 1°/5° tick marks
- [x] ASC Horizontal toggle (Astro-Seek style)
- [x] Planet glyph sizing and radial label layout
- [x] Placidus and Whole Sign only (Koch removed)
- [x] Show/hide aspect lines toggle
- [x] Pluto glyph (⯓), Lot of Fortune rotation, thicker ASC/MC lines

### Client Feedback (v0.9.0)
- [x] Aspect grid legend with color-coded symbols
- [x] Current Planets page (`/current`) — chart wheel for current date/time
- [x] Redesigned legend sidebar — angles only (ASC/IC/DSC/MC), no 12-house cusp listing

### Chart Enhancements (v0.10.0)
- [x] Egyptian bounds and Chaldean decans rings (toggle)
- [x] Persist showAspects and showBoundsDecans in share URLs and saved charts
- [x] Shrink minute label font on chart wheel
- [x] Fix PDF prime character rendering

### PDF & Glyph Fixes (v0.11.0)
- [x] Fix planet-band zodiac signs all rendering as Aries in PDF (missing data-glyph-index)
- [x] Fix transit planet glyphs not converted to SVG paths in PDF (missing data attributes)
- [x] Cormorant font bundled locally for PDF export (font mismatch still open — Bug #18)

### Mobile-Responsive Layout (v0.7.0)
- [x] Tamagui v1.116.14 with custom responsive hook (`useResponsive`)
- [x] Breakpoints: mobile (<=640px), tablet (641-1024px), desktop (>=1025px)
- [x] Hamburger navigation menu on mobile
- [x] Chart wheel scales to any width via SVG viewBox (pinch-to-zoom on mobile)
- [x] Chart + legend stacks vertically on mobile
- [x] BirthDataForm single-column grid on mobile with full-width submit
- [x] CompareView stacks charts vertically on mobile
- [x] Aspect grids: 28px cells on mobile, 34px on desktop, horizontal scroll
- [x] Button bars and transit controls wrap gracefully on narrow viewports

### Infrastructure
- [x] Monorepo with pnpm workspaces
- [x] TypeScript strict mode across packages (zero `as any` in core)
- [x] Vite build with React 18
- [x] HashRouter for GitHub Pages compatibility
- [x] GitHub Actions CI/CD
- [x] Build version tracking (git commit + timestamp)
- [x] Tamagui Vite plugin for responsive design tokens

## 🐛 Known Issues

### Low Priority
1. **Ephemeris file loading in tests** — "Failed to parse URL" error logs in Node.js test environment (tests still pass)
2. **City search returns only 5 results** — OpenCage API may cap results for short/ambiguous queries
3. **PDF degree/minute font mismatch** — Cormorant font registered with jsPDF but svg2pdf still falls back to Helvetica (Bug #18)
4. **Missing house cusp degree labels** — Cusp lines lack degree/minute labels at zodiac ring boundary (Bug #14)

## 📁 Key Files & Locations
- **Web App**: `packages/web/` — Vite + React frontend
- **Core Calculator**: `packages/core/` — Swiss Ephemeris wrapper
- **Geocoding Worker**: `packages/worker/` — Cloudflare Worker proxy
- **Aspect Grids**: `packages/web/src/components/AspectGrid.tsx`, `TransitAspectGrid.tsx`
- **Chart Helpers**: `packages/web/src/utils/chart-helpers.ts` — Shared glyph/formatting utilities
- **Glyph Paths**: `packages/web/src/utils/astro-glyph-paths.ts` — SVG path data for astrological symbols
- **Share URL Utils**: `packages/web/src/utils/shareUrl.ts` — Encode/decode birth data for shareable URLs
- **Build Config**: `packages/web/vite.config.ts` — Base path, proxy, version injection
- **Deployment**: `.github/workflows/deploy.yml` — GitHub Actions to Pages

---
*Update this file at the end of each development session.*
