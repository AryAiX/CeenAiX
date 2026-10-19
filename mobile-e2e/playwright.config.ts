import { defineConfig, devices } from '@playwright/test';
import { PATIENT_STATE } from './support/env';

const port = Number(process.env.PORT ?? 4173);
const externalBaseUrl = process.env.MOBILE_E2E_BASE_URL;
const baseURL = externalBaseUrl ?? `http://localhost:${port}`;

const iphone14 = {
  ...devices['iPhone 14'],
  viewport: { width: 390, height: 844 },
};

const pixel7 = {
  ...devices['Pixel 7'],
  viewport: { width: 412, height: 915 },
};

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'node serve.mjs',
        url: baseURL,
        reuseExistingServer: true,
        env: { PORT: String(port) },
      },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone-14',
      dependencies: ['setup'],
      use: { ...iphone14, locale: 'en-US', storageState: PATIENT_STATE },
    },
    {
      name: 'pixel-7',
      dependencies: ['setup'],
      use: { ...pixel7, locale: 'en-US', storageState: PATIENT_STATE },
    },
    {
      name: 'rtl-ar',
      dependencies: ['setup'],
      use: { ...pixel7, locale: 'ar-AE', storageState: PATIENT_STATE },
    },
  ],
});
