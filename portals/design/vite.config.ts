import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DESIGN_ENTRY = path.resolve(__dirname, 'design.html');
const HAS_DESIGN_ENTRY = fs.existsSync(DESIGN_ENTRY);

export default defineConfig({
  plugins: [
    react(),
  ],
  server: { port: 5190, host: true },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 800,
    cssMinify: false,
    /* The ambient chunk (570KB, three.js) must stay OUT of the initial graph:
       Vite's modulepreload polyfill emits a <link> for dynamic chunks in the
       HTML, which fetches the ambient eagerly on every surface. Filter it so
       the chunk loads only when the dynamic import executes (after load — see
       useAmbientReady in App.tsx). */
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes('vendor-p31ca-ambient')),
    },
    ...(HAS_DESIGN_ENTRY ? {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          design: path.resolve(__dirname, 'design.html'),
        },
        output: {
          manualChunks: (id: string) => {
            /* The ambient's rendering core (three.js + MolecularHeart +
               Starfield) is the 570KB. Split it into its own chunk so only
               the lazy importers (DomeBackground, LedController) reach it —
               the light stores/controller chunk is what the eager graph may
               touch via the main facade. */
            if (id.includes('three') || id.includes('MolecularHeart') || id.includes('background/Starfield') ||
                id.includes('lib/starfield') || id.includes('lib/geodesic') || id.includes('lib/color') ||
                id.includes('lumiIntent')) return 'vendor-p31ca-ambient-heavy';
            if (id.includes('p31ca-ambient')) return 'vendor-p31ca-ambient';
            if (id.includes('design-core')) return 'vendor-design-core';
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('src/design')) return 'design-route';
          },
        },
      },
    } : {}),
  },
});
