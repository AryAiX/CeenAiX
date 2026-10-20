// Ad-hoc exploration: `npx tsx scripts/explore.ts <path>` (not part of the suite).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.MOBILE_E2E_BASE_URL ?? 'http://localhost:4173';
const target = process.argv[2] ?? '/';
const state = process.argv[3];

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    storageState: state,
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
  });
  page.on('pageerror', (err) => console.log(`[pageerror] ${err.stack ?? err.message}`));
  await page.goto(base + target);
  await page.waitForTimeout(6000);
  mkdirSync('scratch', { recursive: true });
  await page.screenshot({ path: `scratch/explore.png`, fullPage: true });
  console.log('URL', page.url());
  console.log((await page.locator('body').ariaSnapshot()).slice(0, 6000));
  await browser.close();
}

void main();
