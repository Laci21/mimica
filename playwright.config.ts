import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Mimica persona testing
 * 
 * Configures video recording, trace capture, and output directories
 * for AI/UX agent persona runs.
 */
export default defineConfig({
  // Test directory (we'll use scripts/playwright/ for test files)
  testDir: './scripts/playwright',

  // Output directory for test results, videos, traces
  outputDir: './playwright-runs/test-results',

  // Timeout for each test (generous for LLM-driven tests)
  timeout: 120 * 1000, // 2 minutes

  // Fail immediately if a test fails (no retries for POC)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,

  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: './playwright-runs/test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the app under test
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Video recording - always record for demo purposes
    video: 'on', // Options: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'

    // Trace recording - capture detailed timeline
    trace: 'on', // Options: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Headless mode (can be overridden via CLI: --headed)
    headless: true,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration (optional - for running app during tests)
  // Uncomment if you want Playwright to start the app automatically
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});

