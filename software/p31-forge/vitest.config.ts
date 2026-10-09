import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      enabled: false, // coverage off by default; enable with --coverage
      thresholds: { statements: 50, branches: 40, functions: 50, lines: 50 },
      include: ['forge.js', 'brand.js'],
    },
  },
});