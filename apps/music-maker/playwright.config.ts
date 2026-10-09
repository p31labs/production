import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the control surface E2E.
 *
 * Two modes:
 *   • Local (default): runs against `vite preview` of a `--mode test` build,
 *     which exposes the __controlRoom hook the persistence test needs.
 *   • Deployed: set BASE_URL to the workers.dev URL and the webServer block
 *     is skipped — the test drives the real deployment.
 *
 * The test-mode build is required because `__controlRoom` is gated on
 * import.meta.env.MODE === 'test'. A production build does not expose it.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const isDeployed = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // the WS/DO state is shared; serial avoids cross-test races
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Skip the webServer when targeting a deployed URL — there is nothing to
  // start locally.
  ...(isDeployed
    ? {}
    : {
        webServer: [
          {
            // The DO must be reachable before the surface's WS connects.
            // Start wrangler dev on :8787 (the vite preview proxy target) and
            // apply the local schema first so ensureHydrated() has tables to
            // read on the DO's first connect.
            command:
              'pnpm schema:apply:local && cd worker && npx wrangler dev --port 8787',
            url: 'http://127.0.0.1:8787/control/health',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm build:test && pnpm preview --port 4173 --strictPort',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }),
});