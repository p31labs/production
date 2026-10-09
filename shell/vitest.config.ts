import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['scripts/verify-shell/**', 'scripts/verify-spaceship.cjs'],
  },
});
