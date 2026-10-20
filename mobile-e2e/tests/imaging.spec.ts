import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Imaging', () => {
  test('renders, segments switch and show the empty state', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/imaging', 'screen-imaging');
    await waitForLoaded(page);
    await expect(screen.getByTestId('segment-imaging-reports')).toHaveAttribute('aria-selected', 'true');
    const hasStudies = (await screen.locator('[data-testid^="imaging-card-"]').count()) > 0;
    const empty = screen.getByTestId('state-empty-imaging').or(screen.getByTestId('state-empty-imaging-segment'));
    if (!hasStudies) await expect(empty.first()).toBeVisible();
    await screen.getByTestId('segment-imaging-scheduled').click();
    await expect(screen.getByTestId('segment-imaging-scheduled')).toHaveAttribute('aria-selected', 'true');
    if (!hasStudies) await expect(empty.first()).toBeVisible();
    await screen.getByTestId('segment-imaging-reports').click();
    if (!hasStudies) testInfo.annotations.push({ type: 'note', description: 'no imaging studies in DEV: detail screen not reachable' });
    await commonScreenChecks(page, testInfo, screen, 'imaging');
  });

  test('back returns to the health hub', async ({ page }) => {
    const hub = await openScreen(page, '/health', 'screen-health');
    await hub.getByTestId('row-imaging').click();
    await expect(page.getByTestId('screen-imaging')).toBeVisible();
    await headerBack(page).click();
    await expect(hub).toBeVisible();
  });

  test('shows an error state with retry when imaging fails to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['lab_portal_imaging_studies']);
    const screen = await openScreen(page, '/imaging', 'screen-imaging');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
