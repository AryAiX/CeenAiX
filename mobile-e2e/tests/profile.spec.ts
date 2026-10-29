import { commonScreenChecks, expect, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Profile', () => {
  test('renders personal, health summary, insurance and Emirates ID sections', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/profile', 'screen-profile');
    await waitForLoaded(page);
    for (const id of ['section-personal', 'section-health-summary', 'section-insurance', 'section-emirates-id']) await expect(screen.getByTestId(id)).toBeVisible();
    await expect(screen.getByTestId('section-personal')).toContainText(/Smoke/);
    await commonScreenChecks(page, testInfo, screen, 'profile');
  });

  test('edit personal info: cancel discards, empty name blocks save, save keeps values', async ({ page }) => {
    test.setTimeout(180_000);
    const screen = await openScreen(page, '/profile', 'screen-profile');
    await waitForLoaded(page);
    await screen.getByTestId('section-personal-action').click();
    const name = screen.getByTestId('input-profile-name');
    await expect(name).toBeVisible();
    const original = await name.inputValue();
    expect(original).toMatch(/Smoke/);

    await name.fill('QA temporary name');
    await screen.getByTestId('btn-cancel-personal').click();
    await expect(name).toHaveCount(0);
    await expect(screen.getByTestId('section-personal')).not.toContainText('QA temporary name');

    await screen.getByTestId('section-personal-action').click();
    await expect(name).toHaveValue(original);
    await name.fill('');
    await expect(screen.getByTestId('btn-save-personal')).toBeDisabled();
    await name.fill(original);
    await screen.getByTestId('btn-save-personal').click();
    await expect(page.getByTestId('message-success')).toBeVisible({ timeout: 60_000 });
    await expect(name).toHaveCount(0);
    await expect(screen.getByTestId('section-personal')).toContainText(original);
  });

  test('opens from the dashboard avatar and back returns', async ({ page }) => {
    const home = await openScreen(page, '/', 'screen-dashboard');
    await page.getByTestId('btn-open-profile').filter({ visible: true }).click();
    await expect(page.getByTestId('screen-profile')).toBeVisible();
    await headerBack(page).click();
    await expect(home).toBeVisible();
  });
});
