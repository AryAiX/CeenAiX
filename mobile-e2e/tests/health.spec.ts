import { commonScreenChecks, expect, headerBack, openScreen, test } from '../support/fixtures';

const destinations: Array<[string, string]> = [
  ['row-records', 'screen-records'],
  ['row-lab-results', 'screen-lab-results'],
  ['row-prescriptions', 'screen-prescriptions'],
  ['row-imaging', 'screen-imaging'],
  ['row-documents', 'screen-documents'],
  ['row-insurance', 'screen-insurance'],
  ['row-notifications', 'screen-notifications'],
  ['row-profile', 'screen-profile'],
  ['row-settings', 'screen-settings'],
];

test.describe('Health hub (Health tab)', () => {
  test('renders grouped links', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/health', 'screen-health');
    for (const [row] of destinations) await expect(screen.getByTestId(row)).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'health-hub');
  });

  test('MB-006: header back control has a human-readable accessible name', async ({ page }) => {
    const screen = await openScreen(page, '/health', 'screen-health');
    await screen.getByTestId('row-records').click();
    await expect(page.getByTestId('screen-records')).toBeVisible();
    const back = headerBack(page);
    await expect(back).toBeVisible();
    await expect(back).not.toHaveAccessibleName(/\(tabs\)|\(app\)/);
  });

  test('every link opens its screen and back returns to the hub', async ({ page }) => {
    test.setTimeout(240_000);
    const screen = await openScreen(page, '/health', 'screen-health');
    for (const [row, screenId] of destinations) {
      await screen.getByTestId(row).click();
      await expect(page.getByTestId(screenId)).toBeVisible({ timeout: 60_000 });
      await headerBack(page).click();
      await expect(screen).toBeVisible();
    }
  });
});
