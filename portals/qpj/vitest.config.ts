import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    projects: [
      {
        test: {
          name: 'qpj:local',
          environment: 'jsdom',
          env: {},
          setupFiles: ['src/__tests__/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/lib/substrate.edge.test.ts'],
        },
      },
      {
        test: {
          name: 'qpj:edge',
          environment: 'jsdom',
          env: {
            VITE_P31_SUBSTRATE_URL: 'https://p31-dispatch.example.workers.dev',
            VITE_P31_SUBSTRATE_ENABLED: 'true',
          },
          setupFiles: ['src/__tests__/setup.ts'],
          include: ['src/lib/substrate.edge.test.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
    },
  },
  server: {
    deps: {
      inline: [/^@p31\//, /^zustand/, /^@sentry/],
    },
  },
});
