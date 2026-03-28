import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

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

export default defineConfig({
  plugins: [react()],
  base: '/natal-chart/',
  define: {
    '__APP_VERSION__': JSON.stringify(buildInfo.commitHash),
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
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/api/geocode': {
        target: 'https://natal-chart-geocoding.johnfdonaghy.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, '/geocode'),
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