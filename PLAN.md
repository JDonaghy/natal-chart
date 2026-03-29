# Natal Chart Development Plan

## Current Sprint: Polish & Sharing
**Status**: Planning
**Last Updated**: 2026-03-29

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

### 🚧 Planned Features
- [ ] **Shareable URLs** - Encode birth data in URL for sharing charts
- [ ] **Multiple chart comparison** - Side-by-side chart comparison feature

### 📋 Technical Debt & Refactoring
- [ ] **Test coverage** - Increase unit test coverage for timezone calculations
- [ ] **Error handling** - More graceful error handling for failed geocoding
- [ ] **Performance optimization** - Lazy loading of WASM modules
- [ ] **Code splitting** - Split bundle by routes/features
- [ ] **Type safety** - More strict TypeScript configuration

### 🔄 Deployment Pipeline
- [x] **GitHub Actions workflow** - Automated build and deploy to GitHub Pages
- [x] **Build version tracking** - Git commit hash and timestamp display in footer
- [ ] **Environment variables** - Proper handling of dev vs production API URLs
- [ ] **Build caching** - Ensure consistent builds between local and CI
- [ ] **Health checks** - Automated testing of deployed application

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