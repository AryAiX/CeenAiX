import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCREENSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');

/** Console noise that is not an app defect (dev tooling, documented web stubs). */
const IGNORED_CONSOLE: RegExp[] = [/WebSocket connection to/, /Download the React DevTools/, /\[expo-notifications\]/];

export interface ConsoleGuard {
  errors: string[];
  /** Tolerate console errors matching `pattern` for this test (e.g. a deliberately mocked 500). */
  allow: (pattern: RegExp) => void;
}

interface Fixtures {
  consoleGuard: ConsoleGuard;
}

export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, use) => {
      const allowed: RegExp[] = [];
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
        errors.push(`console.error @ ${page.url()}: ${text.slice(0, 400)}`);
      });
      page.on('pageerror', (err) => errors.push(`pageerror @ ${page.url()}: ${err.message}`));
      const guard: ConsoleGuard = { errors, allow: (pattern) => allowed.push(pattern) };
      await use(guard);
      const unexpected = errors.filter((e) => !allowed.some((re) => re.test(e)));
      expect(unexpected, 'unexpected console errors / page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const isRtlProject = (testInfo: TestInfo): boolean => testInfo.project.name === 'rtl-ar';

/** Picks the English or Arabic copy depending on the project. */
export const tr = (testInfo: TestInfo, en: string | RegExp, ar: string | RegExp): string | RegExp => (isRtlProject(testInfo) ? ar : en);

export const byTestId = (page: Page, id: string): Locator => page.getByTestId(id);

/** Navigates and waits until the screen container with `screen-<name>` testID is visible. */
export async function openScreen(page: Page, path: string, screenTestId: string): Promise<Locator> {
  await page.goto(path);
  const screen = page.getByTestId(screenTestId);
  await expect(screen).toBeVisible({ timeout: 60_000 });
  return screen;
}

/** Waits until no loading skeleton is visible. */
export async function waitForLoaded(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="state-loading"]:visible')).toHaveCount(0, { timeout: 60_000 });
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  });
  expect(overflow, 'page is wider than the phone viewport').toBeLessThanOrEqual(1);
}

export async function expectDirection(page: Page, testInfo: TestInfo): Promise<void> {
  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') ?? getComputedStyle(document.body).direction);
  expect(dir, 'document direction').toBe(isRtlProject(testInfo) ? 'rtl' : 'ltr');
}

/** Every visible interactive control must expose a non-empty accessible name. */
export async function expectAccessibleControls(scope: Locator): Promise<void> {
  const unnamed = await scope.evaluate((root) => {
    const iconGlyphs = /[\uE000-\uF8FF]|[\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFD}]/gu;
    const selector = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"]';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    return nodes
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        const labelledBy = el.getAttribute('aria-labelledby');
        const labelText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
          : '';
        const name = [el.getAttribute('aria-label'), labelText, el.getAttribute('title'), el.getAttribute('placeholder'), el.innerText]
          .filter((v): v is string => Boolean(v))
          .join(' ')
          .replace(iconGlyphs, '')
          .trim();
        return name.length === 0;
      })
      .map((el) => `${el.tagName.toLowerCase()}[role=${el.getAttribute('role') ?? ''}][testid=${el.getAttribute('data-testid') ?? ''}]`);
  });
  expect(unnamed, 'interactive controls without an accessible name').toEqual([]);
}

/** Saves a viewport screenshot to `screenshots/<project>/<name>.png` (iPhone + RTL only, to keep the repo small). */
export async function snap(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  if (testInfo.project.name === 'pixel-7') return;
  const dir = join(SCREENSHOT_DIR, testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`) });
}

const SUPABASE_REST = /\/rest\/v1\//;

/** Delays Supabase REST responses so the loading skeleton is observable. */
export async function slowSupabase(page: Page, delayMs = 2500): Promise<void> {
  await page.route(SUPABASE_REST, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue().catch(() => undefined);
  });
}

/** Makes Supabase REST GETs on the given tables fail so error states can be exercised. */
export async function failTables(page: Page, guard: ConsoleGuard, tables: string[]): Promise<void> {
  guard.allow(/500|Internal Server Error|Failed to load resource/);
  const pattern = new RegExp(`/rest/v1/(${tables.join('|')})(\\?|$)`);
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'GET' && route.request().method() !== 'HEAD') return route.continue();
    return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'QA forced failure', code: 'XX000' }) });
  });
}

/** Header back control rendered by the native stack on web. */
export const headerBack = (page: Page): Locator => page.getByRole('link', { name: /back|رجوع|عودة/i }).last();

/** Standard per-screen checks: direction, no overflow, accessible controls, screenshot. */
export async function commonScreenChecks(page: Page, testInfo: TestInfo, screen: Locator, name: string): Promise<void> {
  await expectDirection(page, testInfo);
  await expectNoHorizontalOverflow(page);
  await expectAccessibleControls(screen);
  await snap(page, testInfo, name);
}
