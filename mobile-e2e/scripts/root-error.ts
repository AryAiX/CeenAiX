// Ad-hoc: patch the dev bundle so RouteErrorBoundary logs the error it received.
import { chromium } from '@playwright/test';

const base = process.env.MOBILE_E2E_BASE_URL ?? 'http://localhost:8082';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route(/index\.ts\.bundle/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(
      /function RouteErrorBoundary\(\{\s*error,\s*retry\s*\}\) \{/,
      (m) => `${m} console.log('ROOT_ERROR', error && error.message, error && error.stack);`
    );
    await route.fulfill({ response: res, body });
  });
  page.on('console', (msg) => {
    if (msg.text().startsWith('ROOT_ERROR')) console.log(msg.text().slice(0, 3000));
  });
  await page.goto(base + (process.argv[2] ?? '/'));
  await page.waitForTimeout(8000);
  await browser.close();
}

void main();
