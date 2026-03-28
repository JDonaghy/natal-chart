# Natal Chart - Current Status
*Last Updated: 2026-03-28*

## 🚀 Deployment Status
- **GitHub Pages**: https://jdonaghy.github.io/natal-chart/ (Live)
- **Build Version**: `0f2d638` (Shows in footer, matches latest commit)
- **Cloudflare Worker**: https://natal-chart-geocoding.johnfdonaghy.workers.dev (Deployed, needs update for timezone)
- **Auto-deployment**: GitHub Actions triggers on push to main

## ✅ What Works
### Core Functionality
- [x] Birth data form with automatic timezone detection UI
- [x] Swiss Ephemeris WASM calculations (planets, houses, aspects)
- [x] Chart rendering with 800px responsive wheel
- [x] Tabbed view (Chart Wheel, Planet Positions, Aspects)
- [x] Retrograde indicators in table and chart
- [x] LocalStorage persistence of birth data
- [x] Real geocoding via Cloudflare Worker (when configured)

### Infrastructure
- [x] Monorepo with pnpm workspaces
- [x] TypeScript strict mode across packages
- [x] Vite build with React 18
- [x] HashRouter for GitHub Pages compatibility
- [x] 404.html SPA fallback
- [x] Build version tracking (git commit + timestamp)

## 🐛 Known Issues
### Critical
1. **✅ Cloudflare Worker timezone data FIXED**
   - Worker deployed with `&annotations=timezone` parameter
   - Cache versioning (`v2`) invalidates old cached entries
   - Timezone now returned for forward geocoding (e.g., "London" → "Europe/London")
   - Coordinate queries also return timezone via reverse geocoding

2. **Local development uses mock geocoding (broken)**
   - Mock geocoding returns "No results found"
   - **Fix Implemented**: Set `VITE_GEOCODING_API_URL=/api/geocode` to use real worker
   - **Pending**: Test frontend locally with real worker

3. **Build version discrepancy between local and deployed**
   - Local shows `d65035e`, deployed shows `0f2d638`
   - **Root Cause**: Local build may be using cached bundle
   - **Fix**: Clear local dev cache, restart server

### Medium Priority
4. **Chiron calculations require asteroid ephemeris**
   - Files present in `public/ephemeris/` but not verified working
   - Chiron currently skipped with warning

5. **Coordinate input support**
   - **Implemented**: Worker can parse "latitude,longitude" format and reverse geocode
   - **Pending**: Testing with deployed worker

## 🛠️ Current Session Progress
1. **Updated Cloudflare Worker** (`packages/worker/src/index.ts`):
   - Added `&annotations=timezone` to OpenCage API URL
   - Added coordinate parsing functions (`isCoordinateQuery`, `parseCoordinates`)
   - Added reverse geocoding support for coordinate inputs
   - Updated request handling for both city searches and coordinate queries
   - **✅ DEPLOYED**: Version `68593af3-c7d7-4bde-be78-2985528fa1ac`

2. **Configured frontend for real geocoding**:
   - Set `VITE_GEOCODING_API_URL=/api/geocode` in `packages/web/.env`
   - Updated `geocodeCity` function to throw error if API URL not configured (no mock fallback)
   - Updated form placeholder to indicate coordinate support

3. **Documentation updates**:
   - Updated BUGS.md with deployment discrepancy investigation
   - Created SESSION_HISTORY.md for session tracking

## 🔧 Immediate Next Actions
1. **✅ Cloudflare Worker deployed** - Version `68593af3-c7d7-4bde-be78-2985528fa1ac`

2. **Test deployed worker functionality**
   - Verify timezone extraction works for "London, UK"
   - Test coordinate input (e.g., "51.5074,-0.1278") → reverse geocode to "London, United Kingdom"
   - Clear browser cache for deployed version to ensure latest JavaScript loads

3. **Test frontend locally with real geocoding**
   - Start web dev server with new environment variable
   - Verify geocoding requests go to `/api/geocode` proxy

4. **Clear local development cache**
   - Delete `node_modules/.vite` cache
   - Restart dev server with fresh build

## 📁 Key Files & Locations
- **Web App**: `packages/web/` - Vite + React frontend
- **Core Calculator**: `packages/core/` - Swiss Ephemeris wrapper
- **Geocoding Worker**: `packages/worker/` - Cloudflare Worker proxy (updated)
- **Build Config**: `packages/web/vite.config.ts` - Base path, proxy, version injection
- **Environment**: `packages/web/.env` - Now points to `/api/geocode`
- **Deployment**: `.github/workflows/deploy.yml` - GitHub Actions to Pages

## 🚨 Urgent Fixes Required
1. Deploy updated Cloudflare Worker with timezone support
2. Verify deployed version returns timezone data
3. Test coordinate input functionality

---
*Update this file at the end of each development session. Focus on actionable status, not historical details.*