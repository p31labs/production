import { defineConfig } from '@playwright/test';

/**
 * Visual regression gate (WP-2026-09-27) — screenshots every surface at three
 * breakpoints and diffs against committed baselines (Linux/chromium canonical).
 * Runs against `vite preview` of the built dist (build:pwa builds first).
 * Baselines regenerate with: npx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/visual.spec.ts',
  timeout: 60_000,
  expect: {
    timeout: 20_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: 'http://127.0.0.1:5190',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx vite preview --port 5190 --strictPort',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});