# Natal Chart - Current Status
*Last Updated: 2026-03-29*

## 🚀 Deployment Status
- **GitHub Pages**: https://jdonaghy.github.io/natal-chart/
- **Cloudflare Worker**: https://natal-chart-geocoding.johnfdonaghy.workers.dev (v2 with timezone support)
- **Auto-deployment**: GitHub Actions on push to `main`
- **Current Version**: 0.4.0

## ✅ What Works

### Core Functionality
- [x] Birth data form with Year/Month/Day dropdowns (locale-independent)
- [x] Automatic timezone detection via OpenCage geocoding
- [x] Swiss Ephemeris WASM calculations (planets, houses, aspects)
- [x] Professional chart wheel with concentric ring layout
- [x] Astrological glyphs: Unicode text (DejaVu Sans) on web, font-extracted SVG vector paths in PDF
- [x] Planet collision avoidance with connector lines to true ecliptic positions
- [x] Dedicated house number ring (1-12) between planet band and aspect area
- [x] House cusp lines extending from outer circle through all bands
- [x] Tabbed view (Chart Wheel, Planet Positions, Aspects)
- [x] Retrograde indicators in table and chart
- [x] Client-side PDF export with hybrid glyph rendering (text→path swap for svg2pdf)
- [x] Shareable URLs — encode birth data as query params, auto-load shared charts
- [x] LocalStorage persistence of birth data and form state
- [x] Real geocoding via Cloudflare Worker
- [x] Coordinate input detection with OpenStreetMap validation link

### Infrastructure
- [x] Monorepo with pnpm workspaces
- [x] TypeScript strict mode across packages
- [x] Vite build with React 18
- [x] HashRouter for GitHub Pages compatibility
- [x] GitHub Actions CI/CD
- [x] Build version tracking (git commit + timestamp)

## 🐛 Known Issues

### Medium Priority
1. **Chiron calculations require asteroid ephemeris** — Files present in `public/ephemeris/` but Chiron currently skipped with warning

### Low Priority
2. **TypeScript `as any` assertions** — 6 instances remain in core calculator where swisseph-wasm types are challenging

## 📁 Key Files & Locations
- **Web App**: `packages/web/` — Vite + React frontend
- **Core Calculator**: `packages/core/` — Swiss Ephemeris wrapper
- **Geocoding Worker**: `packages/worker/` — Cloudflare Worker proxy
- **Glyph Paths**: `packages/web/src/utils/astro-glyph-paths.ts` — SVG path data for astrological symbols
- **Share URL Utils**: `packages/web/src/utils/shareUrl.ts` — Encode/decode birth data for shareable URLs
- **Build Config**: `packages/web/vite.config.ts` — Base path, proxy, version injection
- **Deployment**: `.github/workflows/deploy.yml` — GitHub Actions to Pages

---
*Update this file at the end of each development session.*
