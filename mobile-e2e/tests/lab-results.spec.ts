import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Lab results', () => {
  test('renders, segments switch with aria-selected and show their empty states', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/lab-results', 'screen-lab-results');
    await waitForLoaded(page);
    await expect(screen.getByTestId('segment-labs-results')).toHaveAttribute('aria-selected', 'true');
    const cards = screen.locator('[data-testid^="lab-order-card-"]');
    const hasOrders = (await cards.count()) > 0;
    if (!hasOrders) await expect(screen.getByTestId('state-empty-labs')).toBeVisible();
    for (const segment of ['upcoming', 'trends', 'results'] as const) {
      await screen.getByTestId(`segment-labs-${segment}`).click();
      await expect(screen.getByTestId(`segment-labs-${segment}`)).toHaveAttribute('aria-selected', 'true');
      if (!hasOrders) await expect(screen.getByTestId('state-empty-labs')).toBeVisible();
    }
    if (hasOrders) testInfo.annotations.push({ type: 'note', description: 'smoke patient now has lab orders' });
    else testInfo.annotations.push({ type: 'note', description: 'no lab orders in DEV: detail screen and "Explain with AI" not reachable' });
    await commonScreenChecks(page, testInfo, screen, 'lab-results');
  });

  test('back returns to the health hub', async ({ page }) => {
    const hub = await openScreen(page, '/health', 'screen-health');
    await hub.getByTestId('row-lab-results').click();
    await expect(page.getByTestId('screen-lab-results')).toBeVisible();
    await headerBack(page).click();
    await expect(hub).toBeVisible();
  });

  test('shows an error state with retry when labs fail to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['lab_orders']);
    const screen = await openScreen(page, '/lab-results', 'screen-lab-results');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
