import { commonScreenChecks, expect, openScreen, test } from '../support/fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Reset password', () => {
  test('without a recovery session it offers a new link and returns to sign-in', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/reset-password', 'screen-reset-password');
    await expect(screen.getByTestId('btn-request-new-link')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByTestId('input-new-password')).toHaveCount(0);
    await commonScreenChecks(page, testInfo, screen, 'reset-password');
    await screen.getByTestId('btn-request-new-link').click();
    await expect(page.getByTestId('screen-forgot-password')).toBeVisible();
  });
});
