import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT || 'p31-portal',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['**/*.map'],
      },
    })
  : [];

export default defineConfig({
  plugins: [react(), ...sentryPlugin],
  server: { port: Number(process.env.PORTAL_PORT) || 5193, host: true },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
          if (id.includes('sovereign-core') || id.includes('design-core')) return 'vendor-sovereign';
        },
      },
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
