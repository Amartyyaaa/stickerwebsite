import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

/**
 * Browser tests: `npm run e2e`. They start their own copy of the store on port 3200
 * (fresh database, demo catalog, its own uploads and email outbox; see e2e/server.ts)
 * and run the suites in order, one at a time, because later suites build on the store
 * as earlier ones leave it.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 8 * 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: E2E.baseURL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1360, height: 900 },
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'npx tsx e2e/server.ts',
    url: `${E2E.baseURL}/api/health`,
    timeout: 15 * 60_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
