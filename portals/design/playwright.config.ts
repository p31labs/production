import { defineConfig } from '@playwright/test';

/**
 * Visual regression config — TWO explicit projects, one config.
 *
 * 1. `legacy-visual` — the existing gate: 39 baselines in
 *    tests/visual.spec.ts-snapshots/ (default snapshot path). Screenshots every
 *    surface at three breakpoints. This is the shipped production gate.
 * 2. `acceptance` — the Wave-0 freeze: baselines commit to
 *    tests/acceptance/__screenshots__/ via a scoped snapshotPathTemplate.
 *    Uses Playwright's built-in stability loop + reduced-motion emulation.
 *
 * Per-project snapshotPathTemplate keeps the two systems disjoint — the
 * multi-truth problem, resolved by making each baseline's location explicit.
 */
export default defineConfig({
  testDir: './tests',
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
  projects: [
    {
      name: 'legacy-visual',
      testMatch: /visual\.spec\.ts/,
      // CRITICAL: default snapshotPathTemplate appends {-projectName} to the arg
      // (desktop-index-legacy-visual-linux.png). The committed baselines have NO
      // project suffix. Pin the exact legacy template so we compare against the
      // 39 committed images, not freshly-created suffixed copies.
      snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-linux{ext}',
    },
    {
      name: 'acceptance',
      testMatch: /acceptance-freeze\.spec\.ts/,
      snapshotPathTemplate: '{testDir}/acceptance/__screenshots__/{testFilePath}/{arg}{ext}',
    },
    {
      name: 'triage',
      testMatch: /acceptance-triage\.spec\.ts/,
      // Read-only diagnostic — no baseline writes. Run: npx playwright test --project=triage
    },
  ],
});