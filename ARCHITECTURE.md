# Natal Chart Application Architecture

## Overview

This is a browser-first natal chart calculator and visualizer built as a monorepo with the following architecture:

- **Frontend**: React + TypeScript + Vite application hosted on GitHub Pages
- **Calculations**: Swiss Ephemeris WebAssembly running entirely in browser
- **Geocoding**: Cloudflare Worker proxy to OpenCage Geocoding API
- **CI/CD**: GitHub Actions for automatic deployment to GitHub Pages
- **Development**: pnpm monorepo with TypeScript strict mode

## Monorepo Structure

```
natal-chart/
├── packages/
│   ├── core/           # Pure TypeScript calculation engine (swisseph-wasm wrapper)
│   ├── web/           # Vite + React application (main frontend)
│   └── worker/        # Cloudflare Worker for geocoding proxy
├── .github/workflows/ # GitHub Actions configuration
└── ephemeris/         # Swiss Ephemeris data files (optional, for Chiron)
```

### Package Dependencies
- `@natal-chart/web` → `@natal-chart/core` (via workspace protocol)
- `@natal-chart/worker` is standalone (deployed to Cloudflare)

## Cloudflare Worker Setup

### Purpose
The Cloudflare Worker acts as:
1. **Geocoding Proxy**: Forward requests to OpenCage Geocoding API
2. **Bot Protection**: Validate Cloudflare Turnstile tokens
3. **Rate Limiting**: 10 requests/minute per IP
4. **Caching**: 30-day KV cache for geocoding results

### Configuration Files

#### `packages/worker/wrangler.toml`
```toml
name = "natal-chart-geocoding"
main = "src/index.ts"
compatibility_date = "2025-03-26"
compatibility_flags = ["nodejs_compat"]

[vars]
ALLOWED_ORIGIN = "http://localhost:3000,http://192.168.1.109:3000,https://jdonaghy.github.io"

[[kv_namespaces]]
binding = "GEOCODING_CACHE"
id = "cda819617c704f4da6e6dad5cf2f6ebf"
preview_id = "e563322cb3444710966cd296c28a829c"
```

#### Worker Dependencies
- `@cloudflare/workers-types` - Type definitions
- `wrangler` - Development and deployment CLI

### Required Environment Variables (Worker Secrets)

Set via `wrangler secret` command or Cloudflare dashboard:

```bash
# OpenCage Geocoding API key (required)
wrangler secret put OPENCAGE_API_KEY

# Cloudflare Turnstile secret (optional, for bot protection)
wrangler secret put TURNSTILE_SECRET
```

### Development and Deployment

```bash
# Navigate to worker package
cd packages/worker

# Install dependencies
pnpm install

# Local development
pnpm dev  # or: npx wrangler dev

# Deploy to Cloudflare
pnpm deploy  # or: npx wrangler deploy

# Requires CLOUDFLARE_API_TOKEN environment variable
export CLOUDFLARE_API_TOKEN="your_token_here"
```

## API Keys and Secrets Management

### Local Development (`.tokens` file)
Create a `.tokens` file in the project root (already in `.gitignore`):

```bash
# .tokens
CLOUDFLARE_API_TOKEN="your_cloudflare_api_token_here"
# OPENCAGE_API_KEY="your_opencage_key_here"  # Optional for local dev
```

Load tokens in your shell:
```bash
source .tokens
```

### Environment Variables

#### Frontend (`packages/web/.env`)
```env
# Development: Proxy to local worker dev server
VITE_GEOCODING_API_URL=/api/geocode

# Production: Direct to Cloudflare Worker (fallback)
# VITE_GEOCODING_API_URL=https://natal-chart-geocoding.workers.dev/geocode
```

#### GitHub Actions Secrets
Set in repository settings → Secrets and variables → Actions:
- `VITE_GEOCODING_API_URL` - Optional, overrides default worker URL

### Security Notes
- Never commit API keys or secrets to version control
- `.tokens` is in `.gitignore` for local development
- Cloudflare Worker secrets are encrypted at rest
- Frontend environment variables are embedded in build (public)

## Frontend Configuration

### Vite Configuration (`packages/web/vite.config.ts`)
Key settings:
- `base: '/natal-chart/'` - GitHub Pages subpath
- Hash routing for SPA compatibility with GitHub Pages
- Proxy `/api/geocode` → Cloudflare Worker in development
- Build version injection from git commit hash

### Geocoding Service
- Always uses real geocoding (no mock fallback)
- Default fallback to Cloudflare Worker URL if `VITE_GEOCODING_API_URL` not set
- Coordinate input support: "latitude,longitude" format
- Reverse geocoding for coordinates to get timezone

## Deployment Process

### 1. Cloudflare Worker Deployment
```bash
cd packages/worker
source ../../.tokens  # Load CLOUDFLARE_API_TOKEN
pnpm deploy
```

### 2. Frontend Build and Deployment (Manual)
```bash
# Build all packages
pnpm build

# Deploy to GitHub Pages
pnpm deploy  # Runs `vite build` with base path
```

### 3. Automatic Deployment (GitHub Actions)
Triggered on push to `main` branch:
1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Build core package
5. Build web package (with environment variables)
6. Upload to GitHub Pages artifact
7. Deploy to GitHub Pages

Workflow file: `.github/workflows/deploy.yml`

## Local Development Setup

### Complete Setup from Scratch

```bash
# Clone repository
git clone https://github.com/JDonaghy/natal-chart.git
cd natal-chart

# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Set up API tokens
echo 'CLOUDFLARE_API_TOKEN="your_token_here"' > .tokens
source .tokens

# Configure environment
echo 'VITE_GEOCODING_API_URL="/api/geocode"' > packages/web/.env

# Start development servers
pnpm --filter web dev      # Frontend (localhost:3000)
pnpm --filter worker dev   # Worker proxy (optional)

# Run tests
pnpm -r test

# Type checking
pnpm -r typecheck
```

### Development Notes
- Frontend proxies `/api/geocode` → Cloudflare Worker in dev
- Worker requires `OPENCAGE_API_KEY` secret for real geocoding
- Without OpenCage key, geocoding will return empty results
- Coordinate input supported: e.g., "44.9816505,-93.132362"

## Troubleshooting

### Worker Deployment Issues
```bash
# Check authentication
npx wrangler whoami

# View logs
npx wrangler tail

# Test worker endpoint
curl -X POST https://natal-chart-geocoding.workers.dev/geocode \
  -H "Content-Type: application/json" \
  -d '{"query": "London"}'
```

### Frontend Build Issues
```bash
# Clear cache
rm -rf packages/web/node_modules/.vite

# Rebuild
pnpm --filter web build
```

### Geocoding Not Working
1. Check Cloudflare Worker is deployed and accessible
2. Verify `OPENCAGE_API_KEY` secret is set
3. Check browser console for CORS errors
4. Verify `VITE_GEOCODING_API_URL` is configured

## Monitoring and Maintenance

### Cloudflare Worker
- View logs: `wrangler tail`
- Monitor usage in Cloudflare dashboard
- Update `compatibility_date` periodically

### GitHub Pages
- Deployment status in Actions tab
- Build version shows in app footer (git commit hash)

### Dependencies
- Update pnpm lockfile: `pnpm install`
- Update TypeScript: Check compatibility with swisseph-wasm
- Update Swiss Ephemeris files annually for accuracy

---

*Last Updated: 2026-03-28*