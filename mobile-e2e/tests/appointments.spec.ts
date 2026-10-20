import { SMOKE_VIRTUAL_APPOINTMENT_ID } from '../support/env';
import { commonScreenChecks, expect, failTables, headerBack, openScreen, slowSupabase, test, waitForLoaded } from '../support/fixtures';

const card = `appointment-card-${SMOKE_VIRTUAL_APPOINTMENT_ID}`;

test.describe('Appointments (Visits tab)', () => {
  test('renders segments with counts and real past visits', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await waitForLoaded(page);
    const status = screen.getByTestId('segment-appointments-status');
    await expect(status.getByRole('tab')).toHaveCount(3);
    await expect(screen.getByTestId('btn-book-appointment')).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'appointments-upcoming');

    await screen.getByTestId('segment-appointments-status-past').click();
    await expect(screen.getByTestId(card)).toBeVisible();
    await expect(screen.getByTestId(card)).toContainText('Smoke Doctor');
    await commonScreenChecks(page, testInfo, screen, 'appointments-past');
  });

  test('MB-007: segmented control exposes the selected segment to assistive tech', async ({ page }) => {
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await expect(screen.getByTestId('segment-appointments-status-upcoming')).toHaveAttribute('aria-selected', 'true');
    await screen.getByTestId('segment-appointments-status-past').click();
    await expect(screen.getByTestId('segment-appointments-status-past')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.getByTestId('segment-appointments-status-upcoming')).not.toHaveAttribute('aria-selected', 'true');
  });

  test('type filter narrows the list and shows a filtered empty state', async ({ page }) => {
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await waitForLoaded(page);
    await screen.getByTestId('segment-appointments-status-past').click();
    await screen.getByTestId('segment-appointments-type-virtual').click();
    await expect(screen.getByTestId(card)).toBeVisible();
    await screen.getByTestId('segment-appointments-type-in_person').click();
    await expect(screen.getByTestId(card)).toHaveCount(0);
    await screen.getByTestId('segment-appointments-type-all').click();
    await expect(screen.getByTestId(card)).toBeVisible();
  });

  test('opening a visit pushes the detail and back returns to the list', async ({ page }) => {
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await waitForLoaded(page);
    await screen.getByTestId('segment-appointments-status-past').click();
    await screen.getByTestId(card).click();
    await expect(page.getByTestId('screen-appointment-detail')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/appointment/${SMOKE_VIRTUAL_APPOINTMENT_ID}`));
    await headerBack(page).click();
    await expect(screen).toBeVisible();
  });

  test('book button opens the booking wizard', async ({ page }) => {
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await screen.getByTestId('btn-book-appointment').click();
    await expect(page.getByTestId('screen-book')).toBeVisible();
    await page.getByTestId('btn-booking-close').click();
    await expect(screen).toBeVisible();
  });

  test('shows a skeleton while loading', async ({ page }) => {
    await slowSupabase(page, 3000);
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await expect(screen.getByTestId('state-loading')).toBeVisible();
    await waitForLoaded(page);
  });

  test('shows an error state with retry when the list fails', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['appointments']);
    const screen = await openScreen(page, '/appointments', 'screen-appointments');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await screen.getByTestId('btn-retry').click();
    await expect(screen.getByTestId('state-error')).toHaveCount(0, { timeout: 60_000 });
  });
});
