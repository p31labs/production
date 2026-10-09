import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { dedupe: ['react','react-dom','three','@react-three/fiber','@react-three/drei'] },
  build: { outDir: '/tmp/opencode/fixed3', sourcemap: true, emptyOutDir: true,
    rollupOptions: { input: { main: 'index.html' }, output: {
      manualChunks(id) {
        if (id.includes('node_modules')) {
          if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          if (id.includes('libp2p')) return 'vendor-libp2p';
          if (id.includes('pglite')) return 'vendor-pglite';
          return 'vendor-other';
        }
      },
    }},
  },
});
