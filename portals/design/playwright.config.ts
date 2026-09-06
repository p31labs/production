import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // iPad profile on Chromium engine — WebKit host libs unavailable in CI box
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-ff', use: { ...devices['Desktop Firefox'] } },
  ],
});
