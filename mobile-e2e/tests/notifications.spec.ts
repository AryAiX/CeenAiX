import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Notifications', () => {
  test('renders the log with All / Unread segments', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/notifications', 'screen-notifications');
    await waitForLoaded(page);
    const cards = screen.locator('[data-testid^="notification-card-"]');
    await expect(cards.first().or(screen.getByTestId('state-empty-notifications'))).toBeVisible();
    await expect(screen.getByTestId('segment-notifications-all')).toHaveAttribute('aria-selected', 'true');
    await screen.getByTestId('segment-notifications-unread').click();
    await expect(screen.getByTestId('segment-notifications-unread')).toHaveAttribute('aria-selected', 'true');
    await expect(cards.first().or(screen.getByTestId('state-empty-notifications'))).toBeVisible();
    await screen.getByTestId('segment-notifications-all').click();
    if ((await cards.count()) > 0) await expect(cards.first()).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'notifications');
  });

  test('mark all read empties the Unread segment', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/notifications', 'screen-notifications');
    await waitForLoaded(page);
    await expect(screen.locator('[data-testid^="notification-card-"]').first().or(screen.getByTestId('state-empty-notifications'))).toBeVisible();
    const markAll = page.getByTestId('btn-mark-all-read').filter({ visible: true });
    if ((await markAll.count()) > 0) {
      await expect(markAll).toHaveAccessibleName(/\S+/);
      await markAll.click();
      await expect(markAll).toHaveCount(0, { timeout: 60_000 });
    } else {
      testInfo.annotations.push({ type: 'note', description: 'no unread notifications, so "Mark all read" is hidden (by design)' });
    }
    await screen.getByTestId('segment-notifications-unread').click();
    await expect(screen.getByTestId('state-empty-notifications')).toBeVisible({ timeout: 60_000 });
  });

  test('opens from the dashboard bell and back returns', async ({ page }) => {
    const home = await openScreen(page, '/', 'screen-dashboard');
    await page.getByTestId('btn-open-notifications').filter({ visible: true }).click();
    await expect(page.getByTestId('screen-notifications')).toBeVisible();
    await headerBack(page).click();
    await expect(home).toBeVisible();
  });

  test('shows an error state with retry when notifications fail to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['notifications']);
    const screen = await openScreen(page, '/notifications', 'screen-notifications');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
