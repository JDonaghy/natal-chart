import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tamaguiPlugin } from '@tamagui/vite-plugin';
import { execSync } from 'child_process';
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';

// Get build version information
function getBuildInfo() {
  const buildTimestamp = new Date().toISOString();
  
  // Try to get commit hash from environment (GitHub Actions)
  // GITHUB_SHA is the full commit hash in CI
  let commitHash = process.env.GITHUB_SHA?.substring(0, 7) || 'unknown';
  
  // If not in CI or GITHUB_SHA not set, try to get from git locally
  if (commitHash === 'unknown') {
    try {
      commitHash = execSync('git rev-parse --short HEAD', { stdio: 'pipe' })
        .toString()
        .trim();
    } catch (error: any) {
      console.warn('Could not get git commit hash:', error.message);
    }
  }
  
  // Add build context indicator
  const buildContext = process.env.GITHUB_ACTIONS ? 'ci' : 'local';
  
  return {
    commitHash,
    buildTimestamp,
    buildContext,
  };
}

const buildInfo = getBuildInfo();

// Read version from package.json
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    tamaguiPlugin({
      config: './tamagui.config.ts',
      components: ['tamagui'],
    }),
  ],
  base: '/natal-chart/',
  define: {
    '__APP_VERSION__': JSON.stringify(buildInfo.commitHash),
    '__APP_SEMVER__': JSON.stringify(pkg.version),
    '__BUILD_TIME__': JSON.stringify(buildInfo.buildTimestamp),
    '__BUILD_CONTEXT__': JSON.stringify(buildInfo.buildContext),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0, // Don't inline wasm files
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    headers: ((req: IncomingMessage, res: ServerResponse) => {
      const host = req.headers.host || '';
      const origin = req.headers.origin || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('127.0.0.1');
      
      // COOP/COEP headers require secure context (HTTPS or localhost)
      // Only set them for localhost to avoid browser warnings on LAN HTTP
      if (isLocalhost) {
        return {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        };
      }
      // For LAN access via HTTP, don't set these headers
      // to avoid browser warnings and allow the app to work
      return {};
    }) as any,
    proxy: {
      '/api/geocode': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, '/geocode'),
        secure: true,
      },
      // Auth & data API routes — proxy to Worker
      '/api/user': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        secure: true,
      },
      '/api/preferences': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        secure: true,
      },
      '/api/charts': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        secure: true,
      },
      '/shared': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['swisseph-wasm'], // Don't optimize wasm package
  },
  assetsInclude: ['**/*.wasm', '**/*.se1', '**/*.data'],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});