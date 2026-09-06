import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5200, host: true },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/portals/')) {
            return 'portals';
          }
          if (id.includes('src/store/')) {
            return 'store';
          }
        },
      },
    },
  },
});
