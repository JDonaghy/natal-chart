# Natal Chart - Current Status
*Last Updated: 2026-04-11*

## Deployment Status
- **GitHub Pages**: https://jdonaghy.github.io/natal-chart/
- **Cloudflare Worker**: https://natal-chart-geocoding.johnfdonaghy.workers.dev (geocoding + user data API)
- **Cloudflare D1**: natal-chart-db (user accounts, preferences, saved charts)
- **Firebase Auth**: natal-chart-329b3 (Google SSO)
- **Auto-deployment**: GitHub Actions on push to `main`
- **Current Version**: 0.17.0 (Beta)

## What Works

### Core Functionality
- [x] Birth data form with Year/Month/Day dropdowns (locale-independent)
- [x] Automatic timezone detection via OpenCage geocoding
- [x] Swiss Ephemeris WASM calculations (planets, houses, aspects, declinations)
- [x] Professional chart wheel with concentric ring layout
- [x] Astrological glyphs: SVG vector paths on web chart wheel, inline SVG icons in HTML, SVG paths in PDF
- [x] Planet collision avoidance with degree-ordered radial stacking and connector lines
- [x] Planet degree labels as "DD sign-glyph" (e.g. "19 Aries") Astro-Seek style
- [x] Dedicated house number ring (1-12) between planet band and aspect area
- [x] House cusp lines extending from outer circle through all bands
- [x] Tabbed view (Chart Wheel, Planet Positions, Aspects)
- [x] Natal aspect grid — triangular aspectarian with color-coded glyphs, parallel/contraparallel aspects
- [x] Transit aspect grid — rectangular natal-to-transit grid with sign/degree column headers
- [x] Transit legend panel — Astro-Seek style "Birth x Transits" with side-by-side positions
- [x] Retrograde indicators in table, chart, and legend
- [x] Client-side PDF export with aspect grids and hybrid glyph rendering
- [x] Shareable URLs — encode birth data as query params, auto-load shared charts
- [x] Separate Natal Chart (`/chart`) and Transit Chart (`/transits`) routes
- [x] Transit Chart auto-initializes to current date with always-on controls
- [x] Transit time-step animation with configurable increments
- [x] Chart comparison view — side-by-side saved chart comparison
- [x] Current Planets page (`/current`) — chart wheel for current date/time
- [x] LocalStorage persistence of birth data and form state
- [x] Real geocoding via Cloudflare Worker
- [x] Chiron calculations via asteroid ephemeris files

### Chart Wheel Polish (v0.8.0-v0.12.0)
- [x] Transit wheel 1/5 degree tick marks
- [x] ASC Horizontal toggle (Astro-Seek style)
- [x] Planet glyph sizing and radial label layout
- [x] Placidus and Whole Sign only (Koch removed)
- [x] Show/hide aspect lines toggle
- [x] Egyptian bounds and Chaldean decans rings (toggle)
- [x] Enlarged inner wheel diameter
- [x] House cusp degree labels at zodiac ring boundary
- [x] Traditional planets only mode (hide modern/outer planets)

### Glyph Sets & Preferences (v0.13.0)
- [x] Multiple glyph sets: Classic (DejaVu Sans) and Modern (Noto Sans Symbols)
- [x] Centralized Preferences page (`/preferences`) with Glyph Style, House System, ASC Horizontal
- [x] All settings persist to localStorage and take effect immediately

### Theme & Customization (v0.17.0–v0.19.0)
- [x] Theme presets: Classic Parchment, Rose Quartz, Sage & Stone, Sky & Silver
- [x] Per-color customization with grouped color pickers and reset buttons
- [x] Per-glyph overrides — choose variant per planet/sign from multiple glyph sources
- [x] Astronomicon and Astromoony Sans glyph sets added
- [x] Font size preference (Small / Medium / Large)
- [x] Orb-weighted aspect line thickness and opacity
- [x] Ptolemaic-only aspect filtering (chart wheel and grid)

### Chart Wheel Layout Polish (v0.20.0)
- [x] Shrunk house number ring (~20% smaller), enlarged planet glyphs (~20% larger)
- [x] Planet labels shifted inward for tighter layout
- [x] Beta label in footer

### User Accounts & Cloud Sync (v0.14.0)
- [x] Firebase Authentication with Google SSO (GitHub SSO ready)
- [x] Sign In / Sign Out button in header with avatar and dropdown menu
- [x] Cloudflare D1 database for user data (users, preferences, saved_charts tables)
- [x] JWT verification in Worker (Firebase ID tokens via Google JWKS)
- [x] Cloud preferences sync — loaded on login (cloud wins), debounced writes on change
- [x] Cloud chart saving — fire-and-forget save to D1 alongside localStorage
- [x] Chart sharing via share tokens (public read-only links, no auth required)
- [x] localStorage migration modal — import existing charts to cloud on first login
- [x] Account management in Preferences — sync status, sign out, delete all data
- [x] Auth is optional — app works fully without login (existing behavior preserved)
- [x] Inputs-only cloud storage — birth data + view flags stored, chart recalculated on load

### Mobile-Responsive Layout (v0.7.0)
- [x] Tamagui with custom responsive hook (`useResponsive`)
- [x] Hamburger navigation menu on mobile
- [x] Chart wheel scales to any width via SVG viewBox
- [x] Chart + legend stacks vertically on mobile
- [x] Aspect grids: 28px cells on mobile, 34px on desktop, horizontal scroll

### Saved Charts Management (v0.15.0)
- [x] Dedicated "My Charts" page (`/charts`) with unified local + cloud chart list
- [x] Inline chart rename (click to edit, Enter to save)
- [x] Delete with confirmation (removes from both localStorage and cloud)
- [x] Three-state sync badges: Local (grey), Synced (green), Cloud (blue)
- [x] Cloud charts auto-sync to localStorage on open (becomes "Synced", works offline)
- [x] Share link management (generate/revoke share token, copy URL)
- [x] Chart deduplication via cloudId tracking
- [x] Cloud sync merge on refresh — renamed charts from other devices update via Sync button
- [x] Automatic bidirectional sync on login — local charts push to cloud, cloud charts pull to localStorage
- [x] All "Load saved..." dropdowns show all charts (local + cloud) via useSyncedCharts hook
- [x] Save chart dialog with optional "Keep local only" checkbox
- [x] Refactored CompareView to pure comparison (no chart management)
- [x] Security hardening: payload size limits, chart count cap, error detail removal, share token validation
- [x] Nightly D1 database backups via cron to dellserver
- [x] Comprehensive ARCHITECTURE.md and disaster recovery script

### Infrastructure
- [x] Monorepo with pnpm workspaces
- [x] TypeScript strict mode across packages
- [x] Vite build with React 18
- [x] HashRouter for GitHub Pages compatibility
- [x] GitHub Actions CI/CD
- [x] Build version tracking (git commit + timestamp)

## Known Issues

### Low Priority
1. **Ephemeris file loading in tests** — "Failed to parse URL" error logs in Node.js test environment (tests still pass)
2. **City search returns only 5 results** — OpenCage API may cap results for short/ambiguous queries (Bug #11)
3. **PDF degree/minute font mismatch** — svg2pdf falls back to Helvetica for degree labels (Bug #18)

## Key Files & Locations
- **Web App**: `packages/web/` — Vite + React frontend
- **Core Calculator**: `packages/core/` — Swiss Ephemeris wrapper
- **Geocoding Worker**: `packages/worker/` — Cloudflare Worker (geocoding + user data API)
- **D1 Migrations**: `packages/worker/migrations/` — Database schema
- **Auth Service**: `packages/web/src/services/auth.ts` — Firebase Auth wrapper
- **Cloud Sync**: `packages/web/src/services/cloudSync.ts` — Worker API client
- **Auth Context**: `packages/web/src/contexts/AuthContext.tsx` — React auth state
- **Glyph Paths**: `packages/web/src/utils/astro-glyph-paths.ts` — SVG path data
- **Build Config**: `packages/web/vite.config.ts` — Base path, proxy, version injection
- **Deployment**: `.github/workflows/deploy.yml` — GitHub Actions to Pages

---
*Update this file at the end of each development session.*
