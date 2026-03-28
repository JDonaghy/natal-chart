import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Get git commit hash for build version
let commitHash = 'unknown';
let buildTimestamp = new Date().toISOString();

try {
  commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString()
    .trim();
} catch (error: any) {
  console.warn('Could not get git commit hash:', error.message);
}

export default defineConfig({
  plugins: [react()],
  base: '/natal-chart/',
  define: {
    '__APP_VERSION__': JSON.stringify(commitHash),
    '__BUILD_TIME__': JSON.stringify(buildTimestamp),
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