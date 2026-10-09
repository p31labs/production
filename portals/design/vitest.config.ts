import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Match the production build transform: @vitejs/plugin-react compiles JSX
  // with the automatic runtime, and the canon (@p31ca/design-core) ships
  // react-jsx source with no classic `import React`. The test env must use the
  // same transform or every canon component throws "React is not defined".
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
    },
  },
  server: {
    deps: {
      inline: [/^@p31\//, /^@sentry/],
    },
    ssr: {
      noExternal: [],
    },
  },
});
