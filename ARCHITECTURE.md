# Natal Chart Application Architecture

*Last Updated: 2026-04-05 (v0.14.0)*

## System Overview

```
                     +---------------------------+
                     |     GitHub Pages           |
                     |  jdonaghy.github.io/       |
                     |      natal-chart/          |
                     |                            |
                     |  Static SPA (React+Vite)   |
                     |  Swiss Ephemeris WASM       |
                     |  Firebase Auth SDK          |
                     +----------+--+--------------+
                                |  |
                   Firebase Auth |  | API calls (Bearer JWT)
                   (Google SSO)  |  |
                                |  |
          +---------------------+  +----------------------+
          |                                                |
          v                                                v
+-------------------+              +--------------------------------------+
| Firebase Auth     |              | Cloudflare Worker                    |
| (Google-managed)  |              | natal-chart-geocoding                |
|                   |              | .johnfdonaghy.workers.dev            |
| - Google SSO      |              |                                      |
| - GitHub SSO      |              | POST /geocode     (geocoding proxy)  |
| - JWT issuance    |              | POST /api/user    (upsert user)      |
| - Session mgmt    |              | GET|PUT /api/preferences             |
+-------------------+              | GET|POST /api/charts                 |
                                   | GET|PUT|DELETE /api/charts/:id       |
                                   | POST|DELETE /api/charts/:id/share    |
                                   | GET /shared/:token                   |
                                   +--------+----------+------------------+
                                            |          |
                                            v          v
                                   +--------+--+  +----+----------+
                                   | Cloudflare |  | Cloudflare    |
                                   | KV         |  | D1 (SQLite)   |
                                   |            |  |               |
                                   | Geocoding  |  | users         |
                                   | cache      |  | preferences   |
                                   | (30d TTL)  |  | saved_charts  |
                                   +------------+  +---------------+
```

## Monorepo Structure

```
natal-chart/
  packages/
    core/           # Pure TypeScript Swiss Ephemeris wrapper
    web/            # Vite + React SPA (GitHub Pages)
    worker/         # Cloudflare Worker (geocoding + user data API)
    mobile/         # React Native (placeholder, unused)
  .github/
    workflows/
      deploy.yml    # Build + deploy to GitHub Pages on push to main
      release.yml   # Create GitHub Release on version tags
  ephemeris/        # Swiss Ephemeris .se1 data files
  scripts/          # One-off utility scripts
```

### Package Dependencies
- `@natal-chart/web` depends on `@natal-chart/core` (via pnpm workspace protocol)
- `@natal-chart/worker` is standalone (deployed independently to Cloudflare)
- `@natal-chart/core` has no internal dependencies

## Component Details

### 1. Frontend (packages/web)

**Hosting**: GitHub Pages at `https://jdonaghy.github.io/natal-chart/`
**Framework**: React 18 + TypeScript + Vite
**Routing**: HashRouter (`/#/chart`, `/#/transits`, etc.) — required for GitHub Pages SPA

**Key design decisions:**
- All astrological calculations run client-side via Swiss Ephemeris WASM
- Firebase Auth SDK handles Google/GitHub SSO entirely in-browser
- localStorage is the primary data store; cloud sync is optional/additive
- Auth is optional — the app works fully without logging in

**Routes:**
| Path | Component | Description |
|------|-----------|-------------|
| `/` | BirthDataForm | Birth data input form |
| `/chart` | ChartView | Natal chart wheel + data |
| `/transits` | TransitView | Transit chart with animation |
| `/current` | CurrentPlanetsView | Current planetary positions |
| `/compare` | CompareView | Side-by-side chart comparison |
| `/releasing` | ReleasingView | Zodiacal releasing |
| `/preferences` | PreferencesView | Settings + account management |

**Build output**: Static files in `packages/web/dist/`, deployed to GitHub Pages via GitHub Actions.

### 2. Cloudflare Worker (packages/worker)

**URL**: `https://natal-chart-geocoding.johnfdonaghy.workers.dev`
**Runtime**: Cloudflare Workers (V8 isolates)

The Worker serves two purposes:

#### a) Geocoding Proxy (original)
- Proxies city search to OpenCage Geocoding API
- Validates Cloudflare Turnstile tokens (bot protection)
- Rate limits: 10 requests/minute per IP
- Caches results in KV (30-day TTL)
- Supports forward geocoding (city name) and reverse geocoding (lat/lng)

#### b) User Data API (v0.14.0)
- Verifies Firebase ID Tokens (JWT) via Google's public JWKS
- CRUD operations for user preferences and saved charts
- Chart sharing via unique tokens
- All data stored in Cloudflare D1 (serverless SQLite)

**Bindings:**
| Binding | Type | Purpose |
|---------|------|---------|
| `GEOCODING_CACHE` | KV Namespace | Geocoding result cache |
| `DB` | D1 Database | User accounts, preferences, saved charts |

**Secrets (set via `wrangler secret put`):**
| Secret | Purpose |
|--------|---------|
| `OPENCAGE_API_KEY` | OpenCage Geocoding API key |
| `TURNSTILE_SECRET` | Cloudflare Turnstile bot protection (optional) |
| `FIREBASE_PROJECT_ID` | Firebase project ID for JWT verification |

### 3. Cloudflare D1 Database

**Name**: `natal-chart-db`
**ID**: `ae3aa7c7-606b-490f-a1bd-cb7a9314e45c`
**Region**: ENAM (East North America)

**Schema** (defined in `packages/worker/migrations/0001_init.sql`):

```sql
-- User record (created on first login via Firebase)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Firebase UID
  email TEXT,
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- User preferences (one row per user, JSON blob)
CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,            -- { houseSystem, glyphSet, ascHorizontal }
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Saved charts (inputs only — recalculated on load)
CREATE TABLE saved_charts (
  id TEXT PRIMARY KEY,           -- UUID (generated server-side)
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  birth_data TEXT NOT NULL,      -- { dateTimeUtc, latitude, longitude, houseSystem, city, timezone }
  view_flags TEXT,               -- { showAspects, showBoundsDecans, traditionalPlanets, glyphSet }
  transit_data TEXT,             -- { transitDateStr, transitLocation } or null
  share_token TEXT UNIQUE,       -- Short token for public sharing (null = private)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Design decisions:**
- Charts store **inputs only** (~200 bytes), not full calculation results (~5-10KB). Recalculated on load.
- `share_token` enables public read-only links without authentication.
- Preferences stored as a JSON blob for flexibility.

### 4. Firebase Authentication

**Project**: `natal-chart-329b3`
**Console**: https://console.firebase.google.com/project/natal-chart-329b3

**Enabled providers:**
- Google (primary)
- GitHub (configured in code, needs OAuth App registration)

**How it works:**
1. User clicks Sign In → Firebase SDK opens Google popup
2. Firebase returns an ID Token (RS256 JWT)
3. SPA sends token as `Authorization: Bearer <token>` to Worker
4. Worker verifies JWT against Google's public JWKS (cached 1hr in memory)
5. Worker extracts `user_id` from JWT `sub` claim

**Authorized domains** (Firebase Console > Authentication > Settings):
- `jdonaghy.github.io`
- `localhost`

### 5. Cloudflare KV

**Namespace**: `GEOCODING_CACHE`
**ID**: `cda819617c704f4da6e6dad5cf2f6ebf`
**Preview ID**: `e563322cb3444710966cd296c28a829c`

Used exclusively for geocoding result caching. Keys are `geocode:v2:<query>`, values are JSON arrays, TTL is 30 days.

## Authentication & Data Flow

### Sign-In Flow
```
Browser                    Firebase              Worker               D1
  |                           |                    |                   |
  |-- signInWithPopup() ----->|                    |                   |
  |<-- Firebase ID Token -----|                    |                   |
  |                           |                    |                   |
  |-- POST /api/user ---------|-- Bearer JWT ----->|                   |
  |                           |                    |-- verify JWT ---->|
  |                           |                    |<-- valid ---------|
  |                           |                    |-- UPSERT user --->|
  |<-- 200 OK ----------------|--------------------+                   |
  |                           |                    |                   |
  |-- GET /api/preferences -->|-- Bearer JWT ----->|-- SELECT prefs -->|
  |<-- preferences JSON ------|--------------------+<-- data ---------|
```

### Preference Sync
- On login: fetch cloud preferences → overwrite localStorage (cloud wins)
- On change: update localStorage immediately → debounced PUT to cloud (2s delay)
- On logout: continue using localStorage only

### Chart Saving
- Always saved to localStorage (existing behavior, synchronous)
- When logged in: also fire-and-forget POST to D1 (inputs only)
- Cloud charts store birth data + view flags, recalculated on load

## CI/CD Pipeline

### GitHub Actions: Deploy (`.github/workflows/deploy.yml`)

**Triggers**: Push to `main`, version tags (`v*`), manual dispatch
**What it does**: Build → Deploy to GitHub Pages

**Required GitHub Secrets:**
| Secret | Value | Purpose |
|--------|-------|---------|
| `VITE_GEOCODING_API_URL` | `https://natal-chart-geocoding.johnfdonaghy.workers.dev/geocode` | Geocoding API |
| `VITE_FIREBASE_API_KEY` | `AIzaSyA0N0-Rf_5Z-56ZO_KFnnZ1If8mWOjUHlM` | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | `natal-chart-329b3.firebaseapp.com` | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | `natal-chart-329b3` | Firebase config |
| `VITE_FIREBASE_APP_ID` | `1:684749947061:web:aa16aa701228f325a27efc` | Firebase config |
| `VITE_WORKER_API_URL` | `https://natal-chart-geocoding.johnfdonaghy.workers.dev/api` | Cloud sync API |

### GitHub Actions: Release (`.github/workflows/release.yml`)

**Trigger**: Version tags (`v*`)
**What it does**: Creates a GitHub Release with auto-generated changelog

### Worker Deployment

Worker is deployed manually (not via GitHub Actions):
```bash
export CLOUDFLARE_API_TOKEN="your-token"
cd packages/worker
npx wrangler deploy
```

## Environment Variables

### Local Development (`packages/web/.env`)
```env
VITE_GEOCODING_API_URL=/api/geocode

VITE_FIREBASE_API_KEY=AIzaSyA0N0-Rf_5Z-56ZO_KFnnZ1If8mWOjUHlM
VITE_FIREBASE_AUTH_DOMAIN=natal-chart-329b3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=natal-chart-329b3
VITE_FIREBASE_APP_ID=1:684749947061:web:aa16aa701228f325a27efc
```

In dev, Vite proxies `/api/*` to the Cloudflare Worker (configured in `vite.config.ts`).

### Cloudflare API Token

Required for Worker deployment and D1 management. Create at https://dash.cloudflare.com/profile/api-tokens with these permissions:
- Account > D1 > Edit
- Account > Workers Scripts > Edit
- Account > Workers KV Storage > Edit

## External Service Accounts

| Service | Account | Dashboard |
|---------|---------|-----------|
| GitHub | JDonaghy | https://github.com/JDonaghy/natal-chart |
| Cloudflare | e0d454095ccede9384dde5fd8120c5a5 | https://dash.cloudflare.com |
| Firebase | natal-chart-329b3 | https://console.firebase.google.com |
| OpenCage | (API key in Worker secrets) | https://opencagedata.com/dashboard |

## Disaster Recovery

See `scripts/setup-infrastructure.sh` for a complete script to recreate all infrastructure from scratch. The general process:

1. **GitHub Pages**: Automatic — push to `main` triggers deploy
2. **Cloudflare Worker**: `npx wrangler deploy` from `packages/worker/`
3. **Cloudflare D1**: Create database + apply migrations
4. **Cloudflare KV**: Will be recreated by wrangler (update ID in wrangler.toml)
5. **Firebase**: Requires manual project creation in Firebase Console
6. **Secrets**: Must be re-entered manually (GitHub secrets + Cloudflare secrets)

### Data that would be lost
- D1 database contents (user accounts, preferences, saved charts) — no automated backup
- KV cache contents (geocoding results) — not critical, will repopulate on use
- User localStorage data is on their devices (not affected by infrastructure loss)

### Data that is safe
- All source code is in GitHub
- Firebase user accounts are managed by Google (not in our infrastructure)
- Ephemeris data files are checked into the repo

---

*This document should be updated when infrastructure changes are made.*
