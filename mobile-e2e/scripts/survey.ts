// Ad-hoc survey: sign in, then dump aria snapshots + screenshots for routes.
// Usage: MOBILE_E2E_BASE_URL=... npx tsx scripts/survey.ts /route1 /route2 ...
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import '../support/env';

const base = process.env.MOBILE_E2E_BASE_URL ?? 'http://localhost:4173';
const email = process.env.SMOKE_PATIENT_EMAIL ?? 'smoke.patient@ceenaix.test';
const password = process.env.SMOKE_PATIENT_PASSWORD ?? '';
const locale = process.env.SURVEY_LOCALE ?? 'en-US';

async function main(): Promise<void> {
  if (!password) throw new Error('Set SMOKE_PATIENT_PASSWORD');
  mkdirSync('scratch', { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/WebSocket/.test(msg.text())) console.log(`[console.error] ${page.url()} ${msg.text().slice(0, 300)}`);
  });
  page.on('pageerror', (err) => console.log(`[pageerror] ${page.url()} ${err.message}`));
  await page.goto(`${base}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 30_000 });
  await page.waitForTimeout(4000);
  const routes = process.argv.slice(2);
  for (const route of routes.length ? routes : ['/']) {
    if (route !== '/') await page.goto(base + route);
    await page.locator('[data-testid^="screen-"]:visible').first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.getByTestId('state-loading').first().waitFor({ state: 'detached', timeout: 60_000 }).catch(() => console.log(`  ${route}: still loading after 60s`));
    await page.waitForTimeout(1500);
    const name = route.replace(/[^a-z0-9]+/gi, '_') || 'root';
    await page.screenshot({ path: `scratch/survey${name}.png`, fullPage: false });
    const snap = await page.locator('body').ariaSnapshot();
    writeFileSync(`scratch/survey${name}.yml`, snap);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`=== ${route} -> ${page.url()} overflow=${overflow} dir=${await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.body).direction)}`);
  }
  await context.storageState({ path: 'scratch/state.json' });
  await browser.close();
}

void main();
