# Natal Chart Application

A browser-first natal chart (birth chart) calculator and visualizer using WebAssembly for astronomical calculations.

## Project Status

✅ **Core Features Complete** - Ready for testing and deployment

### Current Status
- ✅ Swiss Ephemeris WebAssembly integration validated
- ✅ Natal chart calculation engine (planets, houses, aspects, angles)
- ✅ React web application with birth data form
- ✅ SVG chart wheel visualization with houses, planets, aspects
- ✅ Timezone conversion and geocoding (real API via Cloudflare Worker)
- ✅ Local storage persistence
- ✅ Cloudflare Worker deployed and operational
- ✅ GitHub Actions CI/CD configured

## Architecture

- **Type**: pnpm monorepo
- **Hosting**: GitHub Pages (web), Cloudflare Workers (geocoding proxy)
- **Calculations**: Client-side via swisseph-wasm (Swiss Ephemeris)
- **UI**: React + TypeScript + Vite

### Packages

- `packages/core` - Pure TypeScript calculation engine
- `packages/web` - Vite + React web application  
- `packages/worker` - Cloudflare Worker for geocoding
 - `packages/mobile` - React Native (future)

### Features

- **Complete Natal Chart Calculation**: Sun, Moon, planets (Mercury through Pluto), North Node, Chiron
- **Multiple House Systems**: Placidus, Whole Sign, and Koch
- **Aspect Calculation**: Conjunctions, oppositions, trines, squares, sextiles, quincunxes, semi-sextiles
- **Timezone-Aware**: Convert birth times from any timezone to UTC
- **Geocoding Integration**: City search for coordinates (mock data + Cloudflare Worker proxy)
- **Interactive Chart Wheel**: SVG visualization with houses, planets, aspect lines, retrograde indicators
- **Privacy-First**: All calculations performed client-side in WebAssembly
- **Offline Capable**: Chart data persists in localStorage

## Quick Start

### Prerequisites

- Node.js v18+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm --filter web dev

# Run tests
pnpm -r test

# Build for production
pnpm build
```

## Development Priority

⚠️ **CRITICAL FIRST STEP**: Validate swisseph-wasm works correctly before building features.

See `AGENTS.md` for comprehensive development guidelines.

### Suggested First Task

```bash
# Spike swisseph-wasm to validate it works
pnpm --filter core test:spike
```

This validates the highest-risk dependency (WASM + ephemeris files) before investing in UI work.

## Ephemeris Files Setup

For complete functionality including Chiron (asteroid #2060) calculations, Swiss Ephemeris data files are required:

### Required Files
- `seas_18.se1` - Asteroid ephemeris (1800-2100) - **Required for Chiron**
- `sepl_18.se1` - Planetary ephemeris (1800-2100) - Optional but recommended for better accuracy

### Quick Setup
```bash
# Run the download script
./scripts/download-ephemeris.sh

# Or manually download from Astrodienst FTP:
# ftp://ftp.astro.com/pub/swisseph/ephe/
```

Files should be placed in `packages/web/public/ephemeris/`. The application will automatically detect and use them.

### Verification
After adding files, check the browser console when calculating a chart:
- "Ephemeris path set to: ephemeris/" - Path configured
- No "Chiron calculation skipped" warning - Files working
- "Planet X calculated with Swiss Ephemeris" - Using files

Without these files, the application falls back to Moshier ephemeris (built-in) which provides accurate planetary positions but cannot calculate Chiron.

### Licensing
Swiss Ephemeris is dual-licensed (GPL/commercial). For commercial applications, ensure you have the appropriate license from Astrodienst AG.

## Documentation

- **AGENTS.md** - Comprehensive guidelines for AI coding agents
- **claude-notes.md** - Quick development notes
- **natal-chart-architecture.docx** - Full architecture specification

## Tech Stack

- **Language**: TypeScript (strict mode)
- **UI**: React 18
- **Build**: Vite
- **Calculations**: swisseph-wasm
- **Routing**: React Router (hash mode for GitHub Pages)
- **Security**: Cloudflare Turnstile
- **Deployment**: GitHub Actions → GitHub Pages

## License

TBD
