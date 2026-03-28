# Natal Chart - Current Status
*Last Updated: 2026-03-28*

## 🚀 Deployment Status
- **GitHub Pages**: https://jdonaghy.github.io/natal-chart/ (Live, previous build `0f2d638`)
- **Latest Commit**: `56ce411` (includes coordinate detection and OpenStreetMap link)
- **Cloudflare Worker**: https://natal-chart-geocoding.johnfdonaghy.workers.dev (v2 with timezone support)
- **Auto-deployment**: GitHub Actions pending for latest commit
- **Local Development**: http://localhost:3000 with coordinate detection and real geocoding

### New Features in Latest Update
- ✅ Coordinate input detection in birth city field
- ✅ OpenStreetMap validation link for coordinate inputs
- ✅ Enhanced documentation (`ARCHITECTURE.md`)
- ✅ API key management documentation (`.tokens` file)

## 📦 Deployment Progress
### ✅ Completed
- **Cloudflare Worker updated**: Timezone extraction and coordinate support working
- **Frontend code committed**: Real geocoding with fallback URL, mock removed
- **Local testing passed**: Proxy works, geocoding returns timezone data

### ⏳ Pending
- **GitHub Actions deployment**: Workflow not yet triggered for commit `56ce411`
  - Possible causes: workflow disabled, rate limiting, or delay
  - **Action needed**: Check GitHub Actions page for pending runs
  - **Manual trigger option**: Use "Run workflow" button on GitHub UI

### 🔍 Verification Steps (After Deployment)
1. **Test geocoding on live site**: Enter "London, UK" → should detect timezone
2. **Test coordinate input**: Enter "51.5074,-0.1278" → should reverse geocode to London
3. **Clear browser cache**: Ensure latest JavaScript loads
4. **Verify footer version**: Should show commit `56ce411` (or newer)

### ⚙️ Environment Configuration
- **Frontend default**: Uses Cloudflare Worker URL directly if `VITE_GEOCODING_API_URL` not set
- **CORS configured**: Worker allows requests from `https://jdonaghy.github.io`
- **Cache versioned**: Worker cache uses `v2` prefix to avoid stale timezone data

## ✅ What Works
### Core Functionality
- [x] Birth data form with automatic timezone detection UI
- [x] Swiss Ephemeris WASM calculations (planets, houses, aspects)
- [x] Chart rendering with 800px responsive wheel
- [x] Tabbed view (Chart Wheel, Planet Positions, Aspects)
- [x] Retrograde indicators in table and chart
- [x] LocalStorage persistence of birth data
- [x] Real geocoding via Cloudflare Worker (when configured)
- [x] Coordinate input detection with OpenStreetMap validation link

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

5. **✅ Coordinate input support IMPLEMENTED**
   - Worker can parse "latitude,longitude" format and reverse geocode
   - Frontend detects coordinate input and shows OpenStreetMap validation link
   - Timezone extraction works via reverse geocoding

## 🛠️ Current Session Progress
1. **Updated Cloudflare Worker** (`packages/worker/src/index.ts`):
   - Added `&annotations=timezone` to OpenCage API URL
   - Added coordinate parsing functions (`isCoordinateQuery`, `parseCoordinates`)
   - Added reverse geocoding support for coordinate inputs
   - Updated request handling for both city searches and coordinate queries
   - **✅ DEPLOYED**: Version `5618909e-ece2-4c6d-8a0b-40c930e7745c`

2. **Enhanced frontend for coordinate input** (`packages/web/src/components/BirthDataForm.tsx`):
   - Added coordinate detection in city input field
   - Added subtle OpenStreetMap validation link for coordinate inputs
   - Link opens map in new tab to validate location
   - Only appears when coordinate format detected (e.g., "44.9816505,-93.132362")

3. **Configured frontend for real geocoding**:
   - Set `VITE_GEOCODING_API_URL=/api/geocode` in `packages/web/.env`
   - Updated `geocodeCity` function to throw error if API URL not configured (no mock fallback)
   - Updated form placeholder to indicate coordinate support

4. **Documentation updates**:
   - Created `ARCHITECTURE.md` with comprehensive setup guide
   - Documented Cloudflare Worker setup and API key management
   - Added `.tokens` file documentation for local development
   - Updated BUGS.md with deployment discrepancy investigation
   - Created SESSION_HISTORY.md for session tracking

## 🔧 Immediate Next Actions
1. **✅ Cloudflare Worker deployed and tested** - Version `5618909e-ece2-4c6d-8a0b-40c930e7745c`
   - Timezone extraction working: "London" → "Europe/London"
   - Coordinate support working: "51.5074,-0.1278" → reverse geocode with timezone
   - Coordinate parsing functions available in frontend

2. **✅ Frontend enhanced with coordinate detection** - Commit includes:
   - Coordinate detection in city input field
   - OpenStreetMap validation link for coordinate inputs
   - Default geocoding URL fallback to worker
   - Mock geocoding removed (always use real API)

3. **⏳ GitHub Actions deployment verification**
   - Check if workflow has run for commit `56ce411`
   - If not triggered manually, run workflow from GitHub UI
   - Verify new build deploys to GitHub Pages

4. **Test new features on deployed version**
   - Test coordinate input: "44.9816505,-93.132362" → should show OpenStreetMap link
   - Click OpenStreetMap link → should open map with coordinates
   - Test geocoding: "London, UK" → should detect timezone
   - Clear browser cache to ensure latest JavaScript loads

5. **Documentation completed**
   - Created `ARCHITECTURE.md` with comprehensive setup guide
   - Documented `.tokens` file for API key management
   - Updated all status and bug tracking documents

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