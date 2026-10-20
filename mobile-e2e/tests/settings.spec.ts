import { mockAuthSideEffects } from '../support/auth-mocks';
import { commonScreenChecks, expect, headerBack, isRtlProject, openScreen, test, waitForLoaded } from '../support/fixtures';

const PREFERENCE_WRITE_PROJECT = 'iphone-14';

test.describe('Settings', () => {
  test('renders account, language, theme, notification and privacy controls', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    await expect(screen.getByTestId('section-account')).toBeVisible();
    const lang = isRtlProject(testInfo) ? 'ar' : 'en';
    await expect(screen.getByTestId(`segment-language-${lang}`)).toHaveAttribute('aria-selected', 'true');
    for (const id of ['toggle-push', 'toggle-email', 'toggle-sms', 'toggle-ai-consent', 'toggle-share-doctors', 'toggle-share-pharmacy', 'toggle-share-insurance']) {
      await expect(screen.getByTestId(id)).toBeVisible();
    }
    await expect(screen.getByRole('switch').first()).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'settings');
  });

  test('theme switch to dark and back to system', async ({ page }) => {
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    const before = await screen.evaluate((el) => getComputedStyle(el).backgroundColor);
    await screen.getByTestId('segment-theme-dark').click();
    await expect(screen.getByTestId('segment-theme-dark')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => screen.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
    await screen.getByTestId('segment-theme-system').click();
    await expect(screen.getByTestId('segment-theme-system')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => screen.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(before);
  });

  test('switching language asks to restart and flips direction, then switches back', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const [from, to] = isRtlProject(testInfo) ? (['ar', 'en'] as const) : (['en', 'ar'] as const);
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    for (const [target, dir] of [
      [to, to === 'ar' ? 'rtl' : 'ltr'],
      [from, from === 'ar' ? 'rtl' : 'ltr'],
    ] as const) {
      await page.getByTestId(`segment-language-${target}`).click();
      const dialog = page.getByTestId('dialog');
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      await dialog.getByTestId('dialog-btn-0').click();
      await expect(page.locator('html')).toHaveAttribute('dir', dir, { timeout: 60_000 });
      await expect(page.getByTestId('screen-settings')).toBeVisible({ timeout: 60_000 });
      await waitForLoaded(page);
      await expect(page.getByTestId(`segment-language-${target}`)).toHaveAttribute('aria-selected', 'true');
    }
    expect(await page.evaluate(() => localStorage.getItem('ceenaix.lang'))).toBe(from);
  });

  test('notification and sharing toggles save and restore', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== PREFERENCE_WRITE_PROJECT, `shared preference writes run once, on ${PREFERENCE_WRITE_PROJECT}`);
    test.setTimeout(180_000);
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    for (const id of ['toggle-email', 'toggle-sms', 'toggle-share-pharmacy']) {
      const toggle = screen.getByTestId(id).getByRole('switch');
      await expect(toggle).toHaveAccessibleName(/\S+/);
      const before = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !before, timeout: 30_000 });
      await expect(screen.getByTestId('message-danger')).toHaveCount(0);
      await expect(page.getByTestId('screen-settings').getByRole('switch').first()).toBeEnabled({ timeout: 30_000 });
      await page.reload();
      await expect(page.getByTestId('screen-settings')).toBeVisible({ timeout: 60_000 });
      await waitForLoaded(page);
      await expect(toggle).toBeChecked({ checked: !before, timeout: 30_000 });
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: before, timeout: 30_000 });
    }
  });

  test('password reset email request shows a confirmation', async ({ page }) => {
    await mockAuthSideEffects(page);
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    await screen.getByTestId('btn-reset-password').click();
    await expect(screen.getByTestId('message-success')).toBeVisible({ timeout: 30_000 });
  });

  test('sign out: cancel keeps the session, confirm returns to sign-in and clears cached health data', async ({ page, consoleGuard }, testInfo) => {
    consoleGuard.allow(/status of 401/);
    await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
    let signedOut = false;
    const lateRequests: string[] = [];
    page.on('response', (response) => {
      if (signedOut && response.status() === 401 && response.url().includes('/rest/v1/')) lateRequests.push(new URL(response.url()).pathname);
    });
    await openScreen(page, '/', 'screen-dashboard');
    await waitForLoaded(page);
    const screen = await openScreen(page, '/settings', 'screen-settings');
    await waitForLoaded(page);
    expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('ceenaix.cache.v1.')))).toBe(true);
    await screen.getByTestId('btn-sign-out').click();
    const dialog = page.getByTestId('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('dialog-btn-cancel').click();
    await expect(screen).toBeVisible();
    await screen.getByTestId('btn-sign-out').click();
    signedOut = true;
    await dialog.getByTestId('dialog-btn-0').click();
    await expect(page.getByTestId('screen-sign-in')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('ceenaix.cache.v1.') || key.startsWith('sb-')))).toEqual([]);
    if (lateRequests.length > 0) testInfo.annotations.push({ type: 'MB-014', description: `401 after sign-out: ${lateRequests.join(', ')}` });
    await page.goto('/records');
    await expect(page.getByTestId('screen-sign-in')).toBeVisible({ timeout: 60_000 });
  });

  test('opens from the health hub and back returns', async ({ page }) => {
    const hub = await openScreen(page, '/health', 'screen-health');
    await hub.getByTestId('row-settings').click();
    await expect(page.getByTestId('screen-settings')).toBeVisible();
    await headerBack(page).click();
    await expect(hub).toBeVisible();
  });
});
