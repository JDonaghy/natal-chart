#!/usr/bin/env bash
#
# Natal Chart Infrastructure Setup
# =================================
# Recreates all Cloudflare infrastructure from scratch.
# Run this after cloning the repo to set up a fresh environment,
# or as a disaster recovery procedure.
#
# Prerequisites:
#   - Node.js >= 18, pnpm >= 8
#   - Cloudflare account with API token (see below)
#   - Firebase project (must be created manually, see instructions)
#   - OpenCage API key (https://opencagedata.com)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN="your-token"
#   export OPENCAGE_API_KEY="your-key"
#   export FIREBASE_PROJECT_ID="your-project-id"
#   bash scripts/setup-infrastructure.sh
#
# The script will:
#   1. Create Cloudflare KV namespace
#   2. Create Cloudflare D1 database
#   3. Apply D1 migrations
#   4. Update wrangler.toml with new resource IDs
#   5. Set Worker secrets
#   6. Deploy the Worker
#
# After this script completes, you still need to:
#   - Set up GitHub repository secrets (see output)
#   - Create/configure Firebase project (if new)
#   - Push to main to trigger GitHub Pages deployment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_DIR="$REPO_ROOT/packages/worker"

# ─── Preflight Checks ───────────────────────────────────────────────────────

echo "=== Natal Chart Infrastructure Setup ==="
echo ""

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set."
  echo ""
  echo "Create an API token at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Required permissions:"
  echo "  - Account > D1 > Edit"
  echo "  - Account > Workers Scripts > Edit"
  echo "  - Account > Workers KV Storage > Edit"
  echo ""
  echo "Then run: export CLOUDFLARE_API_TOKEN=\"your-token\""
  exit 1
fi

if [ -z "${OPENCAGE_API_KEY:-}" ]; then
  echo "WARNING: OPENCAGE_API_KEY is not set. Geocoding will not work."
  echo "Get a key at: https://opencagedata.com/dashboard"
  echo ""
fi

if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then
  echo "WARNING: FIREBASE_PROJECT_ID is not set. Auth will not work."
  echo "See Firebase setup instructions below."
  echo ""
fi

# Check wrangler is available
if ! npx wrangler --version &>/dev/null; then
  echo "ERROR: wrangler not found. Run 'pnpm install' first."
  exit 1
fi

echo "Working directory: $WORKER_DIR"
echo ""

# ─── Step 1: Create KV Namespace ────────────────────────────────────────────

echo "--- Step 1: Creating KV Namespace ---"

KV_OUTPUT=$(cd "$WORKER_DIR" && npx wrangler kv namespace create GEOCODING_CACHE 2>&1) || true
echo "$KV_OUTPUT"

KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)
if [ -n "$KV_ID" ]; then
  echo "KV Namespace created: $KV_ID"
else
  echo "KV Namespace may already exist. Check wrangler.toml for the current ID."
  KV_ID=$(grep -A1 'binding = "GEOCODING_CACHE"' "$WORKER_DIR/wrangler.toml" | grep 'id =' | grep -oP '"[^"]+"' | tr -d '"' || true)
  echo "Using existing KV ID: $KV_ID"
fi

# Create preview namespace
KV_PREVIEW_OUTPUT=$(cd "$WORKER_DIR" && npx wrangler kv namespace create GEOCODING_CACHE --preview 2>&1) || true
KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)

echo ""

# ─── Step 2: Create D1 Database ─────────────────────────────────────────────

echo "--- Step 2: Creating D1 Database ---"

D1_OUTPUT=$(cd "$WORKER_DIR" && npx wrangler d1 create natal-chart-db 2>&1) || true
echo "$D1_OUTPUT"

D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || true)
if [ -n "$D1_ID" ]; then
  echo "D1 Database created: $D1_ID"
else
  echo "D1 Database may already exist. Check wrangler.toml for the current ID."
  D1_ID=$(grep -A2 'database_name = "natal-chart-db"' "$WORKER_DIR/wrangler.toml" | grep 'database_id' | grep -oP '"[^"]+"' | tr -d '"' || true)
  echo "Using existing D1 ID: $D1_ID"
fi

echo ""

# ─── Step 3: Update wrangler.toml ───────────────────────────────────────────

echo "--- Step 3: Updating wrangler.toml ---"

if [ -n "$KV_ID" ]; then
  # Update KV ID in wrangler.toml
  sed -i "s/^id = \".*\"  # GEOCODING_CACHE/id = \"$KV_ID\"  # GEOCODING_CACHE/" "$WORKER_DIR/wrangler.toml" 2>/dev/null || true
fi

if [ -n "$D1_ID" ]; then
  # Update D1 ID in wrangler.toml
  sed -i "s/database_id = \".*\"/database_id = \"$D1_ID\"/" "$WORKER_DIR/wrangler.toml" 2>/dev/null || true
fi

echo "wrangler.toml updated."
echo ""

# ─── Step 4: Apply D1 Migrations ────────────────────────────────────────────

echo "--- Step 4: Applying D1 Migrations ---"

cd "$WORKER_DIR" && npx wrangler d1 migrations apply natal-chart-db --remote

echo ""

# ─── Step 5: Set Worker Secrets ──────────────────────────────────────────────

echo "--- Step 5: Setting Worker Secrets ---"

if [ -n "${OPENCAGE_API_KEY:-}" ]; then
  echo "$OPENCAGE_API_KEY" | cd "$WORKER_DIR" && npx wrangler secret put OPENCAGE_API_KEY
  echo "OPENCAGE_API_KEY set."
else
  echo "Skipping OPENCAGE_API_KEY (not provided)."
fi

if [ -n "${FIREBASE_PROJECT_ID:-}" ]; then
  echo "$FIREBASE_PROJECT_ID" | cd "$WORKER_DIR" && npx wrangler secret put FIREBASE_PROJECT_ID
  echo "FIREBASE_PROJECT_ID set."
else
  echo "Skipping FIREBASE_PROJECT_ID (not provided)."
fi

echo ""

# ─── Step 6: Deploy Worker ──────────────────────────────────────────────────

echo "--- Step 6: Deploying Worker ---"

cd "$WORKER_DIR" && npx wrangler deploy

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────

WORKER_URL="https://natal-chart-geocoding.johnfdonaghy.workers.dev"

echo "==========================================="
echo "  Infrastructure Setup Complete"
echo "==========================================="
echo ""
echo "Worker URL: $WORKER_URL"
echo "KV Namespace: ${KV_ID:-unknown}"
echo "D1 Database: ${D1_ID:-unknown}"
echo ""
echo "--- Remaining Manual Steps ---"
echo ""
echo "1. SET GITHUB REPOSITORY SECRETS"
echo "   https://github.com/JDonaghy/natal-chart/settings/secrets/actions"
echo ""
echo "   VITE_GEOCODING_API_URL = $WORKER_URL/geocode"
echo "   VITE_WORKER_API_URL    = $WORKER_URL/api"
echo "   VITE_FIREBASE_API_KEY       = (from Firebase console)"
echo "   VITE_FIREBASE_AUTH_DOMAIN   = (from Firebase console)"
echo "   VITE_FIREBASE_PROJECT_ID    = (from Firebase console)"
echo "   VITE_FIREBASE_APP_ID        = (from Firebase console)"
echo ""
echo "2. FIREBASE PROJECT SETUP (if creating from scratch)"
echo "   a. Go to https://console.firebase.google.com"
echo "   b. Create project (or use existing: natal-chart-329b3)"
echo "   c. Add web app, copy config values for GitHub secrets above"
echo "   d. Authentication > Sign-in method > Enable Google"
echo "   e. Authentication > Settings > Authorized domains > Add: jdonaghy.github.io"
echo "   f. (Optional) Enable GitHub provider — needs GitHub OAuth App:"
echo "      https://github.com/settings/developers > New OAuth App"
echo "      Callback URL: provided by Firebase when enabling GitHub"
echo ""
echo "3. LOCAL DEVELOPMENT SETUP"
echo "   cp packages/web/.env.example packages/web/.env"
echo "   # Edit .env with your Firebase config values"
echo "   # VITE_GEOCODING_API_URL=/api/geocode  (uses Vite proxy)"
echo ""
echo "4. TRIGGER GITHUB PAGES DEPLOYMENT"
echo "   git push origin main"
echo "   # Or: gh workflow run deploy.yml --ref main"
echo ""
