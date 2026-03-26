# Natal Chart Application

A browser-first natal chart (birth chart) calculator and visualizer using WebAssembly for astronomical calculations.

## Project Status

🚧 **Early Development** - Initial setup phase

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
