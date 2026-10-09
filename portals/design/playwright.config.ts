import { defineConfig } from '@playwright/test';

/**
 * Visual regression gate (WP-2026-09-27) — screenshots every surface at three
 * breakpoints and diffs against committed baselines (Linux/chromium canonical).
 * Runs against `vite preview` of the built dist (build:pwa builds first).
 * Baselines regenerate with: npx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: {
    timeout: 20_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: 'http://127.0.0.1:5190',
    browserName: 'chromium',
    // Persist a trace on the first retry so a failure keeps a DOM snapshot +
    // action log WITHOUT re-running the suite. Open with `npx playwright show-trace`.
    trace: 'on-first-retry',
  },
  // Keep failures machine-readable: the HTML report (playwright-report/) and
  // JSON (test-results/results.json) both persist after a run — the failure
  // detail is there WITHOUT re-running. `--last-failed` reads .last-run.json.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  webServer: {
    command: 'npx vite preview --port 5190 --strictPort',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});