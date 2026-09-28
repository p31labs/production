import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: { port: 5198, host: true },
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { sourcemap: 'hidden', chunkSizeWarningLimit: 800 },
  css: { preprocessorOptions: {} },
});