import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// `@react-three/drei` (10.7.7) and `@react-three/fiber` (9.7.0) ship with a CJS
// `main` AND an ESM `module` entry but NO `exports` field. Vite's default
// resolution can pick the CJS entry for bare specifiers, and the CJS->ESM interop
// wraps the re-exported React components (e.g. `OrbitControls`) in a namespace
// object that lacks `$$typeof`, which makes React throw #185 ("Element type is
// invalid"). This plugin pins those packages to their ESM `module` entry so every
// component is a real React element type (forwardRef / function).
function forceEsmThree(): import('vite').PluginOption {
  const pkgs = new Set(['@react-three/drei', '@react-three/fiber']);
  const cache = new Map<string, string>();
  const require = createRequire(import.meta.url);
  return {
    name: 'force-esm-three',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !pkgs.has(source)) return null;
      let entry = cache.get(source);
      if (!entry) {
        try {
          const pj = require.resolve(source + '/package.json', { paths: [importer] });
          const manifest = JSON.parse(readFileSync(pj, 'utf8'));
          entry = manifest.module || manifest.exports?.['.']?.import || manifest.main;
          if (entry) {
            entry = require.resolve(source + '/' + entry, { paths: [importer] });
          }
          cache.set(source, entry || '');
        } catch {
          return null;
        }
      }
      if (!entry) return null;
      return entry;
    },
  };
}

export default defineConfig({
  plugins: [forceEsmThree(),
    react(),
    VitePWA({
      registerType: false,
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 7_000_000,
        importScripts: ['sw-outbox.js'],
        runtimeCaching: [
          {
            // Zenodo API must never be cached by the SW — a stale/empty 200
            // response would blank the research paper list for up to 24h.
            urlPattern: /^https:\/\/zenodo\.org\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*/, // other external resources
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
            },
          },
        ],
      },
      manifest: {
        name: 'P31 Sovereign Shell',
        short_name: 'P31 Shell',
        description: 'Sovereign OS for families',
        theme_color: '#0A0E17',
        background_color: '#0A0E17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { port: 5200, host: true },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('@electric-sql/pglite')) return 'vendor-pglite';
            if (id.includes('@sentry/react')) return 'vendor-sentry';
            if (id.includes('@mlc-ai/web-llm')) return 'vendor-webllm';
            if (id.includes('libp2p')) return 'vendor-libp2p';
            return 'vendor-other';
          }
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
