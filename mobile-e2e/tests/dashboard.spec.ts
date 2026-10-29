import { commonScreenChecks, expect, failTables, openScreen, slowSupabase, test } from '../support/fixtures';

const DASHBOARD_TABLES = ['appointments', 'prescriptions', 'allergies', 'patient_insurance', 'patient_vitals', 'lab_orders', 'medication_logs'];

test.describe('Dashboard (Home tab)', () => {
  test('renders real data for the smoke patient', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/', 'screen-dashboard');
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible({ timeout: 60_000 });
    await expect(screen).toContainText('Smoke');
    for (const id of ['section-health-score', 'section-medications', 'section-messages', 'section-activity', 'section-care-team']) {
      await expect(screen.getByTestId(id)).toBeVisible();
    }
    await expect(screen.getByTestId('care-team-card-22222222-3333-4333-8444-000000000201')).toContainText('Smoke Doctor');
    await expect(screen.getByTestId('btn-open-profile')).toHaveAccessibleName(/.+/);
    await expect(screen.getByTestId('btn-open-notifications')).toHaveAccessibleName(/.+/);
    await commonScreenChecks(page, testInfo, screen, 'dashboard');
  });

  test('shows a loading skeleton before content', async ({ page }) => {
    await page.addInitScript(() => {
      for (const key of Object.keys(localStorage)) if (key.startsWith('ceenaix.cache.')) localStorage.removeItem(key);
    });
    await slowSupabase(page, 3000);
    const screen = await openScreen(page, '/', 'screen-dashboard');
    await expect(screen.getByTestId('section-next-appointment')).toHaveCount(0);
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible({ timeout: 90_000 });
  });

  test('MB-008: cold start shows a loading state, not a blank page, while the session loads', async ({ page }) => {
    await slowSupabase(page, 6000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    const painted = await page.evaluate(() => {
      const text = document.body.innerText.trim().length > 0;
      const media = Array.from(document.querySelectorAll('img, svg, [data-testid="state-loading"], [role="progressbar"]')).some((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return text || media;
    });
    expect(painted, 'nothing is rendered while auth/profile load').toBe(true);
  });

  test('quick actions and header buttons navigate, and back returns home', async ({ page }) => {
    const screen = await openScreen(page, '/', 'screen-dashboard');
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible({ timeout: 60_000 });

    await screen.getByTestId('btn-quick-labs').click();
    await expect(page.getByTestId('screen-lab-results')).toBeVisible();
    await page.goBack();
    await expect(screen).toBeVisible();

    await screen.getByTestId('btn-open-notifications').click();
    await expect(page.getByTestId('screen-notifications')).toBeVisible();
    await page.goBack();

    await screen.getByTestId('btn-open-profile').click();
    await expect(page.getByTestId('screen-profile')).toBeVisible();
    await page.goBack();

    await screen.getByTestId('btn-quick-assistant').click();
    await expect(page.getByTestId('screen-assistant')).toBeVisible();
    await page.getByTestId('tab-home').click();

    await screen.getByTestId('btn-quick-messages').click();
    await expect(page.getByTestId('screen-messages')).toBeVisible();
    await page.getByTestId('tab-home').click();

    await screen.getByTestId('btn-book-appointment').first().click();
    await expect(page.getByTestId('screen-book')).toBeVisible();
    await page.getByTestId('btn-booking-close').click();
    await expect(screen).toBeVisible();
  });

  test('care team card opens booking pre-selected for that doctor', async ({ page }) => {
    const screen = await openScreen(page, '/', 'screen-dashboard');
    const card = screen.getByTestId('care-team-card-22222222-3333-4333-8444-000000000201');
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toHaveAccessibleName(/Smoke Doctor/);
    await card.click();
    const book = page.getByTestId('screen-book');
    await expect(book).toBeVisible();
    await expect(book).toContainText('Smoke Doctor');
    await page.getByTestId('btn-booking-close').click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog-btn-cancel').click();
    await expect(book).toBeVisible();
    await page.getByTestId('btn-booking-close').click();
    await page.getByTestId('dialog').getByRole('button').filter({ hasNotText: /keep|متابعة|الاستمرار/i }).first().click();
    await expect(screen).toBeVisible();
  });

  test('bottom tabs switch screens and expose names + selection state', async ({ page }) => {
    await openScreen(page, '/', 'screen-dashboard');
    const tabs: Array<[string, string]> = [
      ['tab-appointments', 'screen-appointments'],
      ['tab-assistant', 'screen-assistant'],
      ['tab-messages', 'screen-messages'],
      ['tab-health', 'screen-health'],
      ['tab-home', 'screen-dashboard'],
    ];
    for (const [tab, screenId] of tabs) {
      const trigger = page.getByTestId(tab);
      await expect(trigger).toHaveAccessibleName(/\S+/);
      await trigger.click();
      await expect(page.getByTestId(screenId)).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('falls back to the offline cache with a banner when reads fail', async ({ page, consoleGuard }) => {
    const screen = await openScreen(page, '/', 'screen-dashboard');
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('ceenaix.cache.v1.dashboard')))).toBe(true);
    await failTables(page, consoleGuard, DASHBOARD_TABLES);
    await page.reload();
    await expect(screen.getByTestId('banner-offline')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible();
  });

  test('shows an error state with retry when reads fail and nothing is cached', async ({ page, consoleGuard }) => {
    await page.addInitScript(() => {
      for (const key of Object.keys(localStorage)) if (key.startsWith('ceenaix.cache.')) localStorage.removeItem(key);
    });
    await failTables(page, consoleGuard, DASHBOARD_TABLES);
    const screen = await openScreen(page, '/', 'screen-dashboard');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await screen.getByTestId('btn-retry').click();
    await expect(screen.getByTestId('section-next-appointment')).toBeVisible({ timeout: 60_000 });
  });
});
