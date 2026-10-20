import { commonScreenChecks, expect, failTables, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Messages (Messages tab)', () => {
  test('renders the conversation list or empty state', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/messages', 'screen-messages');
    await waitForLoaded(page);
    const cards = screen.locator('[data-testid^="conversation-card-"]');
    await expect(cards.first().or(screen.getByTestId('state-empty-messages'))).toBeVisible();
    if ((await cards.count()) > 3) await expect(screen.getByTestId('input-messages-search')).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'messages');
  });

  test('search with no match shows the search empty state', async ({ page }) => {
    const screen = await openScreen(page, '/messages', 'screen-messages');
    await waitForLoaded(page);
    test.skip((await screen.locator('[data-testid^="conversation-card-"]').count()) <= 3, 'search is only shown with more than 3 conversations');
    await screen.getByTestId('input-messages-search').fill('zzzz-no-such-doctor-qa');
    await expect(screen.getByTestId('state-empty-messages-search')).toBeVisible();
    await screen.getByTestId('input-messages-search').fill('');
    await expect(screen.locator('[data-testid^="conversation-card-"]').first()).toBeVisible();
  });

  test('opening a conversation shows the thread and back returns', async ({ page }) => {
    const screen = await openScreen(page, '/messages', 'screen-messages');
    await waitForLoaded(page);
    const first = screen.locator('[data-testid^="conversation-card-"]').first();
    test.skip((await first.count()) === 0, 'no conversations');
    await first.click();
    await expect(page.getByTestId('screen-conversation')).toBeVisible();
    await page.goBack();
    await expect(screen).toBeVisible();
  });

  test('shows an error state when conversations fail to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['conversations']);
    const screen = await openScreen(page, '/messages', 'screen-messages');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
