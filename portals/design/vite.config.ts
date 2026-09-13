import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DESIGN_ENTRY = path.resolve(__dirname, 'design.html');
const HAS_DESIGN_ENTRY = fs.existsSync(DESIGN_ENTRY);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: { port: 5190, host: true },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 800,
    cssMinify: true,
    ...(HAS_DESIGN_ENTRY ? {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          design: path.resolve(__dirname, 'design.html'),
        },
        output: {
          manualChunks: (id: string) => {
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('design-core')) return 'vendor-design-core';
            if (id.includes('src/design')) return 'design-route';
          },
        },
      },
    } : {}),
  },
});
