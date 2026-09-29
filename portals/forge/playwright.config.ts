import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/acceptance',
  use: {
    baseURL: 'http://localhost:5180',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'pnpm dev -- --port 5180',
    port: 5180,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
})