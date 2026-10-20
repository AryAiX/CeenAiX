// Ad-hoc: dump all console output for a route (not part of the suite).
import { chromium } from '@playwright/test';

const base = process.env.MOBILE_E2E_BASE_URL ?? 'http://localhost:8082';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', async (msg) => {
    if (/WebSocket|expo-notifications/.test(msg.text())) return;
    const args = await Promise.all(msg.args().map((a) => a.evaluate((v: unknown) => (v instanceof Error ? `${v.message}\n${v.stack ?? ''}` : String(v))).catch(() => '?')));
    console.log(`[${msg.type()}]`, args.join(' | ').slice(0, 1500));
  });
  await page.goto(base + (process.argv[2] ?? '/'));
  await page.waitForTimeout(8000);
  await browser.close();
}

void main();
