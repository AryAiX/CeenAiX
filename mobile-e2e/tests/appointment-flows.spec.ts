import type { Locator, Page, TestInfo } from '@playwright/test';
import { SMOKE_VIRTUAL_APPOINTMENT_ID } from '../support/env';
import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

/** "Doctor Test" (Family Medicine) has published availability in DEV. */
const BOOKABLE_DOCTOR = 'db7c61f2-1283-438a-b25f-a5647d717346';
const PROJECT_DATE_OFFSET: Record<string, number> = { 'iphone-14': 2, 'pixel-7': 5, 'rtl-ar': 8 };

const visible = (page: Page, selector: string): Locator => page.locator(`${selector}:visible`);

async function pickSlot(page: Page, testInfo: TestInfo, extraOffset = 0): Promise<string> {
  const book = page.getByTestId('screen-book');
  const dates = book.locator('[data-testid^="date-"]');
  await expect(dates.first()).toBeVisible({ timeout: 60_000 });
  const count = await dates.count();
  const index = Math.min((PROJECT_DATE_OFFSET[testInfo.project.name] ?? 1) + extraOffset, count - 1);
  await dates.nth(index).click();
  const slots = book.locator('[data-testid^="slot-"]');
  await expect(slots.first()).toBeVisible();
  const slot = slots.nth(Math.min(1, (await slots.count()) - 1));
  const slotId = (await slot.getAttribute('data-testid')) ?? '';
  await slot.click();
  return slotId;
}

async function completePreVisit(page: Page): Promise<void> {
  const screen = visible(page, '[data-testid="screen-pre-visit"]');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await screen.getByTestId('btn-previsit-start').click();
  for (let i = 0; i < 40; i += 1) {
    const next = screen.getByTestId('btn-previsit-next');
    if (!(await next.isVisible().catch(() => false))) break;
    const input = screen.getByTestId('input-previsit-answer');
    if ((await input.count()) > 0 && (await input.first().isVisible())) {
      const isDate = (await input.first().getAttribute('placeholder'))?.includes('YYYY') ?? false;
      if (!(await input.first().inputValue())) await input.first().fill(isDate ? '2026-01-15' : 'QA automated answer');
    } else if (await screen.getByTestId('option-no').isVisible().catch(() => false)) {
      await screen.getByTestId('option-no').click();
    } else if (await screen.getByTestId('option-0').isVisible().catch(() => false)) {
      await screen.getByTestId('option-0').click();
    }
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(screen.getByTestId('btn-previsit-complete')).toBeVisible();
  await expect(screen.locator('[data-testid^="previsit-review-"]').first()).toBeVisible();
  await screen.getByTestId('btn-previsit-complete').click();
  const finishWithout = screen.getByTestId('btn-previsit-finish-without');
  await expect(finishWithout.or(page.getByTestId('screen-appointment-detail').filter({ visible: true }))).toBeVisible({ timeout: 90_000 });
  if (await finishWithout.isVisible()) await finishWithout.click();
}

test.describe('Past virtual visit 901: detail and video lobby', () => {
  test('detail shows summary, follow-up message action and no cancel/reschedule', async ({ page }, testInfo) => {
    const screen = await openScreen(page, `/appointment/${SMOKE_VIRTUAL_APPOINTMENT_ID}`, 'screen-appointment-detail');
    await expect(screen.getByTestId('card-appointment-summary')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('card-appointment-summary')).toContainText('Smoke Doctor');
    await expect(screen.getByTestId('btn-message-doctor')).toBeVisible();
    await expect(screen.getByTestId('btn-cancel-appointment')).toHaveCount(0);
    await expect(screen.getByTestId('btn-reschedule')).toHaveCount(0);
    await commonScreenChecks(page, testInfo, screen, 'appointment-detail-past');
  });

  test('deep link has a working back button', async ({ page }) => {
    await openScreen(page, `/appointment/${SMOKE_VIRTUAL_APPOINTMENT_ID}`, 'screen-appointment-detail');
    await headerBack(page).click();
    await expect(page.locator('[data-testid^="screen-"]:visible').first()).toBeVisible();
    await expect(page.getByTestId('screen-appointment-detail')).toBeHidden();
  });

  test('unknown appointment id shows the not-found state', async ({ page }) => {
    const screen = await openScreen(page, '/appointment/00000000-0000-4000-8000-000000000000', 'screen-appointment-detail');
    await expect(screen.getByTestId('state-empty-appointment').or(screen.getByTestId('state-error'))).toBeVisible({ timeout: 60_000 });
  });

  test('error state with retry when the detail fails to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['appointments']);
    const screen = await openScreen(page, `/appointment/${SMOKE_VIRTUAL_APPOINTMENT_ID}`, 'screen-appointment-detail');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await screen.getByTestId('btn-retry').click();
    await expect(screen.getByTestId('card-appointment-summary')).toBeVisible({ timeout: 60_000 });
  });

  test('video lobby on web shows the "requires the mobile app" state (native video not covered)', async ({ page }, testInfo) => {
    const screen = await openScreen(page, `/visit/${SMOKE_VIRTUAL_APPOINTMENT_ID}`, 'screen-visit');
    await expect(screen.getByTestId('state-video-unavailable').or(screen.getByTestId('message-join-status')).first()).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-visit-close')).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'video-lobby');
    await screen.getByTestId('btn-visit-close').click();
    await expect(screen).toBeHidden();
  });

  test('message follow-up opens a conversation with the doctor', async ({ page }) => {
    const screen = await openScreen(page, `/appointment/${SMOKE_VIRTUAL_APPOINTMENT_ID}`, 'screen-appointment-detail');
    await screen.getByTestId('btn-message-doctor').click();
    const thread = visible(page, '[data-testid="screen-conversation"]');
    await expect(thread).toBeVisible({ timeout: 60_000 });
    await expect(thread.getByTestId('input-message')).toBeVisible();
  });
});

test.describe('Booking wizard', () => {
  test('doctor search filters and shows an empty state', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/book', 'screen-book');
    await expect(screen.locator('[data-testid^="doctor-card-"]').first()).toBeVisible({ timeout: 60_000 });
    await commonScreenChecks(page, testInfo, screen, 'book-doctor');
    await screen.getByTestId('input-doctor-search').fill('zzzz-no-such-doctor');
    await expect(screen.getByTestId('state-empty-doctors')).toBeVisible();
    await screen.getByTestId('input-doctor-search').fill('Doctor Test');
    await expect(screen.getByTestId(`doctor-card-${BOOKABLE_DOCTOR}`)).toBeVisible();
  });

  test('time and details steps gate the Next button', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/book', 'screen-book');
    await screen.getByTestId('input-doctor-search').fill('Doctor Test');
    await screen.getByTestId(`doctor-card-${BOOKABLE_DOCTOR}`).click();
    await expect(screen.getByTestId('btn-booking-next')).toBeDisabled();
    await pickSlot(page, testInfo);
    await commonScreenChecks(page, testInfo, screen, 'book-time');
    await screen.getByTestId('btn-booking-next').click();
    await expect(screen.getByTestId('input-booking-reason')).toBeVisible();
    await expect(screen.getByTestId('btn-booking-next')).toBeDisabled();
    await screen.getByTestId('input-booking-reason').fill('QA check');
    await expect(screen.getByTestId('btn-booking-next')).toBeEnabled();
    await screen.getByTestId('btn-booking-back').click();
    await expect(screen.locator('[data-testid^="slot-"]').first()).toBeVisible();
  });
});

test.describe.serial('Book → pre-visit → detail → reschedule → cancel', () => {
  let appointmentId = '';

  test('books a visit with Doctor Test', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const screen = await openScreen(page, '/book', 'screen-book');
    await screen.getByTestId('input-doctor-search').fill('Doctor Test');
    await screen.getByTestId(`doctor-card-${BOOKABLE_DOCTOR}`).click();
    await pickSlot(page, testInfo);
    await screen.getByTestId('btn-booking-next').click();
    await screen.getByTestId('input-booking-reason').fill(`QA automated booking (${testInfo.project.name})`);
    await screen.getByTestId('btn-booking-next').click();
    await expect(screen.getByTestId('card-booking-summary')).toContainText('Doctor Test');
    await commonScreenChecks(page, testInfo, screen, 'book-review');
    await screen.getByTestId('btn-booking-next').click();
    await page.waitForURL(/\/(appointment|pre-visit)\/[0-9a-f-]{36}/, { timeout: 90_000 });
    const match = /\/appointment\/([0-9a-f-]{36})/.exec(page.url());
    if (match?.[1]) {
      appointmentId = match[1];
    } else {
      await snapPreVisit(page, testInfo);
      await completePreVisit(page);
      appointmentId = /\/appointment\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? '';
    }
    await expect(page.getByTestId('screen-appointment-detail')).toBeVisible({ timeout: 60_000 });
    expect(appointmentId).not.toBe('');
  });

  test('upcoming detail offers reschedule, cancel and pre-visit', async ({ page }, testInfo) => {
    test.skip(!appointmentId, 'booking failed');
    const screen = await openScreen(page, `/appointment/${appointmentId}`, 'screen-appointment-detail');
    await expect(screen.getByTestId('card-appointment-summary')).toContainText('Doctor Test', { timeout: 60_000 });
    await expect(screen.getByTestId('btn-reschedule')).toBeVisible();
    await expect(screen.getByTestId('btn-cancel-appointment')).toBeVisible();
    await expect(screen.getByTestId('section-pre-visit')).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'appointment-detail-upcoming');
  });

  test('reschedules to another slot', async ({ page }, testInfo) => {
    test.skip(!appointmentId, 'booking failed');
    test.setTimeout(180_000);
    const detail = await openScreen(page, `/appointment/${appointmentId}`, 'screen-appointment-detail');
    await detail.getByTestId('btn-reschedule').click();
    const book = page.getByTestId('screen-book');
    await expect(book).toBeVisible();
    await expect(book.locator('[data-testid^="doctor-card-"]')).toHaveCount(0);
    await pickSlot(page, testInfo, 1);
    await book.getByTestId('btn-booking-next').click();
    await expect(book.getByTestId('input-booking-reason')).not.toHaveValue('');
    await book.getByTestId('btn-booking-next').click();
    await expect(book.getByTestId('card-booking-summary')).toBeVisible();
    await book.getByTestId('btn-booking-next').click();
    await expect(page.getByTestId('banner-appointments').or(visible(page, '[data-testid="screen-appointment-detail"]'))).toBeVisible({ timeout: 90_000 });
  });

  test('cancel sheet requires a reason, keep goes back, confirm cancels', async ({ page }, testInfo) => {
    test.skip(!appointmentId, 'booking failed');
    test.setTimeout(180_000);
    const detail = await openScreen(page, `/appointment/${appointmentId}`, 'screen-appointment-detail');
    await detail.getByTestId('btn-cancel-appointment').click();
    const sheet = page.getByTestId('screen-cancel-appointment');
    await expect(sheet).toBeVisible();
    await commonScreenChecks(page, testInfo, sheet, 'cancel-appointment');
    await sheet.getByTestId('btn-keep-appointment').click();
    await expect(detail).toBeVisible();
    await detail.getByTestId('btn-cancel-appointment').click();
    await expect(sheet.getByTestId('btn-confirm-cancel')).toBeDisabled();
    await sheet.locator('[data-testid^="option-cancel-reason-"]').first().click();
    await expect(sheet.getByTestId('btn-confirm-cancel')).toBeEnabled();
    await sheet.getByTestId('btn-confirm-cancel').click();
    const list = page.getByTestId('screen-appointments');
    await expect(list.or(detail)).toBeVisible({ timeout: 60_000 });
    await page.goto('/appointments');
    await waitForLoaded(page);
    await list.getByTestId('segment-appointments-status-cancelled').click();
    await expect(list.getByTestId(`appointment-card-${appointmentId}`)).toBeVisible({ timeout: 60_000 });
  });
});

async function snapPreVisit(page: Page, testInfo: TestInfo): Promise<void> {
  const screen = visible(page, '[data-testid="screen-pre-visit"]');
  await commonScreenChecks(page, testInfo, screen, 'pre-visit-intro');
}
