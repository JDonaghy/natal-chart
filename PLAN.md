# Natal Chart Development Plan

## Current Sprint: v0.14.0 User Accounts & Cloud Sync
**Status**: Complete
**Last Updated**: 2026-04-05

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

### 🎯 Chart Wheel Polish (v0.8.0)
- [x] **Transit wheel degree markers** - Add 1° tick marks around the transit chart wheel, one per degree (360 total). 5° ticks at 20% depth, 1° ticks at 10% depth from outer edge of transit band.
- [x] **ASC Horizontal toggle** - Added "ASC Horizontal" checkbox (default checked) like Astro-Seek. When checked, ASC at 9 o'clock; when unchecked, 1st house cusp at 9 o'clock. Replaces original "First house at 9 o'clock" plan item.
- [x] **Fix planet glyph positioning and sizing** - (1) Reduced glyph size (bandH*0.11). (2) Radial label layout: planet, degree, sign, minute from outside in. (3) Cluster-based collision avoidance with even spacing.
- [x] **Remove Koch house system** - Removed Koch ('K') from UI, types, and calculator. Kept only Placidus and Whole Sign. Whole Sign first. Removed "(most common)" from Placidus.
- [x] **Fix duplicate Lot of Fortune glyph** - Removed separate lot marker rendering; Fortune already in planets array.
- [x] **Shrink Vertex (VX) label** - Reduced VX glyph to 65% of normal planet glyph size.
- [x] **Increase degree/minute text size** - Bumped degree and minute labels from 0.85× to 1.0× labelSz in both natal and transit bands.
- [x] **Change Pluto glyph** - Replaced ♇ with ⯓ (Astro-Seek style) in ChartWheel, pdfExport, and chart-helpers.
- [x] **Rotate Lot of Fortune glyph** - Added 45° SVG rotation transform on ⊕ glyph in natal and transit bands.
- [x] **Add option to hide aspect lines** - Added `showAspects` prop to ChartWheel and "Show aspect lines" checkbox toggle in both ChartView and TransitView.
- [x] **Thicker ASC/MC lines** - Increased ASC/DSC and MC/IC axis stroke width from 2 to 3.
- [x] **Degree labels without planet glyph** - Verified: degree/sign/minute labels are already separate from planet glyph. No repeated glyph in current code (Bug #16 resolved).

### 🔧 Client Feedback (v0.9.0)
- [x] **Aspect grid legend** - Added color-coded symbol legend below the aspect grid showing all 9 aspect types with glyphs, names, and angles.
- [x] **Current planets page** - New `/current` route showing chart wheel for current planetary positions. Calculates for current date/time at Greenwich. DateTime picker + "Now" button. Chart wheel + planet legend sidebar. Lazy-loaded component.
- [x] **Redesign legend sidebar (natal + transit)** - Removed 12-house cusp listing from both natal and transit legend panels. Only ASC/IC/DSC/MC angles remain.
- [x] **Transit legend: remove full houses section** - Removed house cusps table from transit legend. Only 4 angles remain with birth + transit columns.

### 🔮 Chart Enhancements (v0.10.0)
- [x] **Bounds and decans rings** - Two concentric rings inside zodiac ring: Egyptian bounds (Ptolemy) outer, Chaldean decans inner. Segments colored by ruling planet (25% opacity fill + planet glyph). Toggle checkbox (default off) in ChartView and CurrentPlanetsView. Sign glyph area shrinks to 30% when enabled; ticks keep full 25% zone.
- [x] **Persist chart view flags in share URLs and saved charts** - Store `showAspects` and `showBoundsDecans` toggle states in share URL params and saved chart data. Restore flag values when loading from either source so the chart renders identically to when it was shared/saved.
- [x] **Shrink minute label font on chart wheel** - Reduce the font size of the minute text (MM′) in the planet radial labels to ~70% of the current size, in both natal and transit bands.
- [x] **Fix PDF degree/minute rendering** - The minute prime character ′ (U+2032) was not in svg2pdf's default Helvetica font, causing garbled multi-character output. Fixed by replacing ′ with ASCII apostrophe ' in SVG text elements before svg2pdf processing.

### 🔧 Bug Fixes (v0.11.1)
- [x] **Fix PDF autoTable font handling** - autoTable ignored `doc.setFont('DejaVuSans')` and rendered Unicode glyphs in Helvetica, producing garbled output. Added `font: 'DejaVuSans'` to autoTable head/body styles. Registered DejaVuSans and Cormorant as both normal and bold weight to eliminate font lookup warnings.
- [x] **Font-independent glyph rendering** - Replaced Unicode `<text>` elements in ChartWheel with SVG `<path>` elements for all planet and zodiac glyphs (using existing path data from astro-glyph-paths.ts). Created `GlyphIcon.tsx` with `PlanetGlyphIcon`/`SignGlyphIcon` components for HTML contexts. Fixes Pluto ⯓ (U+2BD3) rendering as rectangle on systems without DejaVuSans.
- [x] **Fix timezone detection on city selection** - `CitySearch.handleSelect()` called `onSelect` (setting timezone) then `setQuery` (triggering onChange which cleared timezone). Fixed by swapping call order so onChange fires before onSelect.
- [x] **Move chart toggle checkboxes above chart** - Moved "Show aspect lines" and "Bounds & decans" checkboxes from below to above the chart wheel in ChartView, TransitView, and CurrentPlanetsView.

### 🎯 Chart Wheel Layout (v0.12.0)
- [x] **Enlarge inner wheel diameter** - Increase the diameter of the inner wheel (aspect lines area + house numbers circle) without changing overall chart size. The outer edge of the house numbers ring should sit much closer to the minute labels in the planet radial band, reducing the gap between the planet info and the inner wheel.

### 🎬 Transit Animations (v0.12.0)
- [x] **Transit time-step animation** - Transport bar with ◀ step-back, ⏪ play-backward, ⏩ play-forward, ▶ step-forward buttons. Pill-shaped increment selector: 1m, 5m, 10m, 15m, 30m, 1h, 12h, 24h. Auto-play at 1.2s interval. Desktop: inline on same row as date picker. Mobile: stacked below. "Now" button hidden during playback. Uses refs to avoid stale closures during rapid updates.

### 🪐 Traditional Planets Toggle (v0.12.0)
- [x] **Traditional planets only mode** - Add a "Traditional planets" toggle checkbox to chart views. When enabled, hide modern/outer planets (Uranus, Neptune, Pluto) and minor points (Chiron, Lilith, Vertex, Lot of Spirit) from the chart wheel, planet positions table, legend panel, and aspect grid. Only show the 7 classical planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn), North Node, and Lot of Fortune. Persist toggle state in share URLs and saved charts. Apply to natal, transit, and current planets views.

### 🔤 Glyph Set Selection (v0.13.0)
- [x] **Multiple glyph sets** - Two selectable glyph sets: "Classic" (DejaVu Sans) and "Modern" (Noto Sans Symbols / Symbols 2). Glyph set picker dropdown in chart views alongside existing toggles. Active set stored in ChartContext, persisted in localStorage, share URLs (`gs` param), and saved charts. `getPlanetPath()`/`getSignPathByIndex()` accept optional set parameter. GlyphIcon components auto-read from context. ChartWheel, PDF export, and all legend/grid components use the active set.

### ⚙️ Preferences Tab (v0.13.0)
- [x] **Preferences page** - New `/preferences` route with centralized settings. Moved Glyph Style, House System, and ASC Horizontal from scattered locations. All settings persist to localStorage and take effect immediately. NavLink in header navigation.

### 🔐 User Accounts & Cloud Sync (v0.14.0)

**Goal**: Allow users to log in and sync preferences + saved charts across browsers/devices. No custom server infrastructure — Firebase Auth for identity, Cloudflare D1 for storage, existing Worker for API.

#### Phase 1: Firebase Auth Integration
- [ ] **Firebase project setup** - Create Firebase project, enable Google sign-in provider. Configure OAuth consent screen. Add Firebase config to web app environment variables.
- [ ] **Firebase Auth SDK in SPA** - Add `firebase/auth` package. Initialize Firebase app in a new `services/auth.ts` module. Create `AuthContext` provider wrapping the app with `onAuthStateChanged` listener. Expose `user`, `loading`, `signIn()`, `signOut()` via context.
- [ ] **Login UI** - Add "Sign In" button to header (when logged out) and user avatar/menu (when logged in) with "Sign Out" option. Use Firebase's `signInWithPopup()` for Google. Keep the app fully functional without login — auth is optional.
- [ ] **Additional SSO providers** - Add GitHub, Facebook, and/or Apple sign-in buttons. Firebase SDK handles all OAuth flows. Each provider needs enabling in Firebase console + provider-specific app registration (GitHub OAuth App, Facebook App, Apple Developer config).

#### Phase 2: Cloudflare D1 Database
- [ ] **D1 database creation** - Create D1 database via `wrangler d1 create natal-chart-db`. Add D1 binding to `wrangler.toml` in `packages/worker`.
- [ ] **Schema design** - Create migration with tables:
  ```sql
  -- User record (created on first login)
  CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Firebase UID
    email TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- User preferences (one row per user)
  CREATE TABLE preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    data TEXT NOT NULL,            -- JSON blob: { houseSystem, glyphSet, ascHorizontal, ... }
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Saved charts (inputs only — recalculate on load, cache in localStorage)
  CREATE TABLE saved_charts (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    birth_data TEXT NOT NULL,      -- JSON: { dateTimeLocal, latitude, longitude, locationName, timezone }
    view_flags TEXT,               -- JSON: { houseSystem, showAspects, showBoundsDecans, traditionalPlanets, glyphSet, ascHorizontal }
    transit_data TEXT,             -- JSON: { transitDateStr, transitLocation } (null for natal-only)
    share_token TEXT UNIQUE,       -- Short random token for public sharing (null = private)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_charts_user ON saved_charts(user_id);
  CREATE INDEX idx_charts_share ON saved_charts(share_token) WHERE share_token IS NOT NULL;
  ```
- [ ] **Run migration** - `wrangler d1 migrations apply natal-chart-db`

#### Phase 3: Worker API Endpoints
- [ ] **JWT verification middleware** - Worker verifies Firebase ID token on protected routes. Fetch Google's JWKS (`googleapis.com/.../jwk/securetoken@...`), cache in KV (1hr TTL). Verify RS256 signature + claims (`exp`, `iss`, `aud`). Extract `user_id` from token `sub` claim. Return 401 if invalid.
- [ ] **User endpoints** - `POST /auth/user` — Upsert user record on first login (Firebase UID, email, display name).
- [ ] **Preferences endpoints** - `GET /preferences` — Return user preferences JSON. `PUT /preferences` — Save preferences JSON. Both authenticated via JWT.
- [ ] **Saved charts endpoints** - `GET /charts` — List user's saved charts (id, name, created_at). `GET /charts/:id` — Load single chart (authenticated owner). `POST /charts` — Save new chart (inputs + view flags only, generate UUID server-side). `PUT /charts/:id` — Update existing chart. `DELETE /charts/:id` — Delete chart. All authenticated, all scoped to the authenticated user_id.
- [ ] **Chart sharing endpoints** - `POST /charts/:id/share` — Generate a `share_token` for a chart (owner only). Returns short URL-safe token. `DELETE /charts/:id/share` — Revoke sharing. `GET /shared/:token` — Load chart by share token (no auth required, read-only). Returns birth_data + view_flags + transit_data so the viewer's browser can recalculate and render the chart.
- [ ] **CORS configuration** - Extend existing CORS headers for new endpoints.

#### Phase 4: SPA Cloud Sync
- [ ] **Preferences sync service** - New `services/cloudSync.ts` module. On login: fetch cloud preferences, merge with localStorage (cloud wins if newer, prompt if conflict). On preference change: write to localStorage immediately + debounced PUT to cloud. On logout: continue using localStorage only.
- [ ] **Saved charts sync** - Replace current localStorage-only `savedCharts.ts` with a cloud-aware version. When logged in: CRUD goes through Worker API. When logged out: falls back to localStorage (current behavior). On first login with existing localStorage charts: offer to upload them to cloud.
- [ ] **Saved charts UI updates** - Update saved charts list to show cloud sync status. Add "Save to Cloud" prompt for localStorage-only charts when user logs in.
- [ ] **Offline / error handling** - If Worker is unreachable, queue writes and retry. Always keep localStorage as cache so the app works offline. Show subtle sync status indicator (synced / syncing / offline).

#### Phase 5: Migration & Polish
- [ ] **localStorage migration flow** - First-login experience: detect existing localStorage data, show modal offering to import to cloud. Transfer preferences + saved charts. Keep localStorage as read-through cache.
- [ ] **Loading states** - Skeleton/spinner while fetching cloud data on login.
- [ ] **Account deletion** - "Delete my data" option in preferences that removes all D1 records for the user.

#### Architecture Diagram
```
┌─────────────────────────────────────┐
│  SPA (GitHub Pages)                 │
│  ├── Firebase Auth SDK              │
│  │     └── Google / GitHub / etc.   │
│  ├── AuthContext (user state)       │
│  ├── localStorage (offline cache)   │
│  └── cloudSync service              │
│        └── fetch() with Bearer JWT  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Cloudflare Worker (extended)       │
│  ├── /geocode (existing)            │
│  ├── /auth/user         POST        │
│  ├── /preferences       GET | PUT   │
│  ├── /charts            GET | POST  │
│  ├── /charts/:id    GET|PUT|DELETE  │
│  └── JWT verification middleware    │
│        └── Google JWKS (cached KV)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Cloudflare D1 (SQLite)             │
│  ├── users                          │
│  ├── preferences                    │
│  └── saved_charts                   │
└─────────────────────────────────────┘
```

#### Key Decisions
- **Firebase Auth over DIY OAuth** — Firebase SDK handles all provider flows, token refresh, and session persistence. No PKCE/secret management needed in our code.
- **D1 over Durable Objects** — D1 is free at our scale, supports SQL queries, and is simpler. Durable Objects require $5/mo minimum and are designed for real-time coordination we don't need.
- **Store inputs only, recalculate on load** — Saved charts store birth_data + view_flags + transit_data (~200 bytes) instead of full ChartResult (~5-10KB). Recalculation is fast (~1-2s with WASM). Avoids schema drift if ChartResult changes between versions. localStorage caches the full result after first calculation for instant subsequent renders.
- **share_token for future sharing** — Charts are private by default (share_token = null). Owner can generate a short token to create a public read-only link. No auth needed to view a shared chart. Lays groundwork for astrologer sharing / marketplace features.
- **localStorage as offline cache** — App works fully offline (current behavior preserved). Cloud sync is additive, not required.
- **Auth is optional** — Users can use the app without logging in. All existing functionality remains unchanged.
- **Cloud wins on conflict** — Simplest merge strategy. If localStorage and cloud diverge, cloud data takes precedence (it's the most recently synced from any device).

#### New Dependencies
- `firebase` (JS SDK, ~30KB gzipped for auth module)
- `uuid` or `crypto.randomUUID()` for chart IDs (Workers runtime supports this natively)

#### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `packages/web/src/services/auth.ts` | Create | Firebase init, AuthContext, sign-in/out |
| `packages/web/src/services/cloudSync.ts` | Create | Cloud preferences + charts sync logic |
| `packages/web/src/services/savedCharts.ts` | Modify | Add cloud-aware save/load with localStorage fallback |
| `packages/web/src/contexts/AuthContext.tsx` | Create | React context for auth state |
| `packages/web/src/components/LoginButton.tsx` | Create | Sign in / user menu component |
| `packages/web/src/components/Layout.tsx` | Modify | Add login button to header |
| `packages/web/src/components/PreferencesView.tsx` | Modify | Add account section (sync status, delete data) |
| `packages/worker/src/index.ts` | Modify | Add auth middleware + new API routes |
| `packages/worker/wrangler.toml` | Modify | Add D1 binding |
| `packages/worker/migrations/0001_init.sql` | Create | D1 schema |

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