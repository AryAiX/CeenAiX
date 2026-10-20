import { commonScreenChecks, expect, headerBack, openScreen, test } from '../support/fixtures';

const destinations: Array<[RegExp, string]> = [
  [/^(Records|السجلات)/, 'screen-records'],
  [/^(Lab Results|نتائج)/, 'screen-lab-results'],
  [/^(Prescriptions|الوصفات)/, 'screen-prescriptions'],
  [/^(Imaging|الأشعة|التصوير)/, 'screen-imaging'],
  [/^(Documents|المستندات)/, 'screen-documents'],
  [/^(Insurance|التأمين)/, 'screen-insurance'],
  [/^(Notifications|الإشعارات)/, 'screen-notifications'],
  [/^(Profile|الملف)/, 'screen-profile'],
  [/^(Settings|الإعدادات)/, 'screen-settings'],
];

test.describe('Health hub (Health tab)', () => {
  test('renders grouped links', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/health', 'screen-health');
    await expect(screen.getByRole('button')).toHaveCount(destinations.length);
    await commonScreenChecks(page, testInfo, screen, 'health-hub');
  });

  test('MB-006: header back control has a human-readable accessible name', async ({ page }) => {
    const screen = await openScreen(page, '/health', 'screen-health');
    await screen.getByRole('button', { name: destinations[0]![0] }).click();
    await expect(page.getByTestId('screen-records')).toBeVisible();
    const back = headerBack(page);
    await expect(back).toBeVisible();
    await expect(back).not.toHaveAccessibleName(/\(tabs\)|\(app\)/);
  });

  test('every link opens its screen and back returns to the hub', async ({ page }) => {
    test.setTimeout(240_000);
    const screen = await openScreen(page, '/health', 'screen-health');
    for (const [name, screenId] of destinations) {
      await screen.getByRole('button', { name }).click();
      await expect(page.getByTestId(screenId)).toBeVisible({ timeout: 60_000 });
      await headerBack(page).click();
      await expect(screen).toBeVisible();
    }
  });
});
