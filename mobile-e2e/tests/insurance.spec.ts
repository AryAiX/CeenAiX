import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Insurance', () => {
  test('renders plan (or no-plan state), claims and benefits', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/insurance', 'screen-insurance');
    await waitForLoaded(page);
    await expect(screen.getByTestId('card-insurance-coverage').or(screen.getByTestId('state-empty-insurance')).first()).toBeVisible();
    await expect(screen.getByTestId('segment-insurance-activity')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.locator('[data-testid^="insurance-activity-"]').first().or(screen.getByTestId('state-empty-insurance-activity'))).toBeVisible();
    await screen.getByTestId('segment-insurance-benefits').click();
    await expect(screen.getByTestId('segment-insurance-benefits')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.locator('[data-testid^="benefit-card-"]').first()).toBeVisible();
    await screen.getByTestId('segment-insurance-activity').click();
    await commonScreenChecks(page, testInfo, screen, 'insurance');
  });

  test('status chips filter the claims list', async ({ page }) => {
    const screen = await openScreen(page, '/insurance', 'screen-insurance');
    await waitForLoaded(page);
    const rows = screen.locator('[data-testid^="insurance-activity-"]');
    await expect(rows.first().or(screen.getByTestId('state-empty-insurance-activity'))).toBeVisible({ timeout: 60_000 });
    const total = await rows.count();
    for (const status of ['approved', 'pending', 'review', 'denied'] as const) {
      await screen.getByTestId(`chip-insurance-status-${status}`).click();
      await expect(rows.first().or(screen.getByTestId('state-empty-insurance-activity'))).toBeVisible();
      expect(await rows.count()).toBeLessThanOrEqual(total);
    }
    await screen.getByTestId('chip-insurance-status-all').click();
    await expect(rows).toHaveCount(total);
  });

  test('no-plan action opens the profile and back returns', async ({ page }) => {
    const screen = await openScreen(page, '/insurance', 'screen-insurance');
    await waitForLoaded(page);
    const empty = screen.getByTestId('state-empty-insurance');
    await expect(screen.getByTestId('card-insurance-coverage').or(empty).first()).toBeVisible({ timeout: 60_000 });
    test.skip((await empty.count()) === 0, 'smoke patient has an insurance plan');
    await empty.getByRole('button').click();
    await expect(page.getByTestId('screen-profile')).toBeVisible();
    await headerBack(page).click();
    await expect(screen).toBeVisible();
  });

  test('shows an error state with retry when insurance fails to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['patient_insurance', 'insurance_claims', 'appointments']);
    const screen = await openScreen(page, '/insurance', 'screen-insurance');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
