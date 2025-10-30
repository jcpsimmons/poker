import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid conflicts
  reporter: [['html', { open: 'never' }]],
  
  use: {
    baseURL: 'http://localhost:9867',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'cd .. && ./poker server',
    url: 'http://localhost:9867',
    reuseExistingServer: true, // Always reuse - test.sh manages the server
    timeout: 120 * 1000,
  },
});

