// Ad-hoc: dump the Expo dev error overlay text for a route (not part of the suite).
import { chromium } from '@playwright/test';

const base = process.env.MOBILE_E2E_BASE_URL ?? 'http://localhost:8082';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + (process.argv[2] ?? '/'));
  await page.waitForTimeout(8000);
  const toast = page.getByRole('button').first();
  if (await toast.isVisible()) await toast.click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i += 1) {
    console.log('----- overlay page', i + 1);
    console.log((await page.locator('body').innerText()).slice(0, 2500));
    const prev = page.getByText('◀').or(page.getByLabel(/previous/i)).first();
    if (!(await prev.isVisible().catch(() => false))) break;
    await prev.click();
    await page.waitForTimeout(500);
  }
  await browser.close();
}

void main();
