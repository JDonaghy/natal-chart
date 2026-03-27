# Quick Start - Natal Chart App

## Installation

### Option 1: Run the installation script (Recommended)
```bash
cd /home/john/src/natal-chart
./install-deps.sh
```

### Option 2: Manual installation
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm

# Verify installations
node --version  # Should show v20+
pnpm --version  # Should show v8+
```

## After Installation

1. **Install project dependencies:**
   ```bash
   pnpm install
   ```

2. **CRITICAL: Run swisseph-wasm spike test**
   ```bash
   pnpm --filter core test:spike
   ```
   This validates the Swiss Ephemeris WASM library works correctly before any UI development.

3. **Start development server:**
   ```bash
   pnpm dev
   ```
   Open http://localhost:3000 in your browser.

## Project Structure

```
packages/
├── core/     # TypeScript calculation engine (swisseph-wasm)
├── web/      # Vite + React app (GitHub Pages)
├── worker/   # Cloudflare Worker (geocoding proxy)
└── mobile/   # React Native (future)
```

## Next Development Steps

After successful spike test:
1. Implement actual calculation engine in `packages/core/src/calculator.ts`
2. Add geocoding integration to birth data form
3. Enhance SVG chart wheel with collision detection
4. Add aspect line rendering
5. Set up Cloudflare Worker deployment

## Cloudflare Worker Deployment

### Prerequisites
1. Cloudflare account (free tier includes 100,000 requests/day)
2. OpenCage account (2,500 free requests/day, no credit card required)

### Step 1: Deploy the Worker
```bash
# Navigate to worker directory
cd packages/worker

# Login to Cloudflare (first time only)
pnpm exec wrangler login

# Create KV namespace for caching
pnpm exec wrangler kv:namespace create "GEOCODING_CACHE"

# Update wrangler.toml with the generated KV namespace ID
# Replace `id = ""` with the actual ID from the previous command

# Deploy the worker
pnpm exec wrangler deploy
```

### Step 2: Configure Secrets
```bash
# Set OpenCage API key (get from https://opencagedata.com)
pnpm exec wrangler secret put OPENCAGE_API_KEY

# Set Turnstile secret (optional for bot protection)
# First, create a Turnstile widget in Cloudflare Dashboard
# Then set the secret:
pnpm exec wrangler secret put TURNSTILE_SECRET

# Set allowed origin for CORS (your GitHub Pages URL)
pnpm exec wrangler secret put ALLOWED_ORIGIN
```

### Step 3: Configure Web App
1. Copy `.env.example` to `.env` in `packages/web/`
 2. Set `VITE_GEOCODING_API_URL` to your worker URL (e.g., `https://natal-chart-geocoding.johnfdonaghy.workers.dev/geocode`)
3. Rebuild and deploy the web app

### Step 4: Deploy to GitHub Pages
The GitHub Actions workflow (`/.github/workflows/deploy.yml`) will automatically:
- Build the web app
- Deploy to GitHub Pages
- Use environment variables from GitHub Secrets

Add these secrets to your GitHub repository:
1. `VITE_GEOCODING_API_URL` - Your Cloudflare Worker URL
2. (Optional) Other build-time variables

## Testing
- Run all tests: `pnpm -r test`
- Type check: `pnpm -r typecheck`
- Build all packages: `pnpm -r build`