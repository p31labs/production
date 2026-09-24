import { defineConfig, devices } from '@playwright/test';

// When testing the DEPLOYED origin (SONG_E2E_URL set, e.g. the song-iframe
// spec), do NOT boot the local vite servers — they add weight and are never
// hit. Local runs (default) keep them for the app specs that need them.
const webServer = process.env.SONG_E2E_URL
  ? []
  : [
      { command: 'pnpm dev', url: 'http://localhost:5193', reuseExistingServer: !process.env.CI },
      { command: 'pnpm preview --port 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
    ];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5193',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer,
});