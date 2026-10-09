import { defineConfig } from '@playwright/test';

/**
 * Runtime parity gate — mounts each design-core component in isolation and
 * holds it to its @p31ca/canon contract (state predicate + a11y). Dev-mode
 * webServer (vite --port 5195) so the harness needs no build step.
 *
 * Separate from playwright.config.ts (which runs the portal's visual/a11y
 * gates against `vite preview`): this one tests components, not routes.
 */
export default defineConfig({
  testDir: './parity',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5195',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 5195 --strictPort',
    url: 'http://127.0.0.1:5195/parity.html',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});