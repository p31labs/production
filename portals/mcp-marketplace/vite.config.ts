import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // The canon-v2 family (design-core node_modules TSX) ships JSX without a
  // React import (automatic runtime). Vitest's esbuild path defaults to the
  // classic transform for dependency files, so pin the automatic runtime.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Vite 7 still bundles with Rollup 4 (rolldownOptions/oxc arrive with
    // Vite 8 — see @vitejs/plugin-react@6 which peers vite ^8). rollupOptions
    // remains the correct key on vite 7.3.x.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react')) return 'react-vendor'
        },
      },
    },
  },
  server: {
    port: 5199,
  },
})