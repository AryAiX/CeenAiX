import type { Page } from '@playwright/test';
import { commonScreenChecks, expect, openScreen, test } from '../support/fixtures';

type ProfileRow = Record<string, unknown>;

/** Rewrites the signed-in user's `user_profiles` row while `active()` is true; writes to it are stubbed. */
async function overrideProfile(page: Page, patch: ProfileRow, active: () => boolean = () => true): Promise<void> {
  await page.route('**/rest/v1/user_profiles?**', async (route) => {
    const method = route.request().method();
    if (method !== 'GET' && method !== 'HEAD') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: route.request().postData() ?? '[]' });
      return;
    }
    if (!active()) return route.continue();
    const response = await route.fetch();
    const json: unknown = await response.json();
    const apply = (row: unknown): unknown => (row && typeof row === 'object' ? { ...(row as ProfileRow), ...patch } : row);
    const body = Array.isArray(json) ? json.map(apply) : apply(json);
    await route.fulfill({ response, json: body });
  });
}

test.describe('Patient-only gate', () => {
  test('a non-patient account sees the patient-only screen and can sign out', async ({ page }, testInfo) => {
    await overrideProfile(page, { role: 'doctor' });
    await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
    const screen = await openScreen(page, '/', 'screen-patient-only');
    await expect(page.getByTestId('screen-dashboard')).toHaveCount(0);
    await expect(screen.getByTestId('btn-open-web-portal')).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'patient-only');
    await page.goto('/records');
    await expect(page.getByTestId('screen-patient-only')).toBeVisible({ timeout: 60_000 });
    await page.getByTestId('screen-patient-only').getByTestId('btn-sign-out').click();
    await expect(page.getByTestId('screen-sign-in')).toBeVisible({ timeout: 60_000 });
  });

  test('a failed profile lookup shows a retryable error, then recovers', async ({ page, consoleGuard }) => {
    consoleGuard.allow(/status of 500/);
    let failing = true;
    await page.route('**/rest/v1/user_profiles?**', (route) =>
      failing ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"qa forced failure"}' }) : route.continue()
    );
    const screen = await openScreen(page, '/', 'screen-patient-only');
    await expect(screen.getByTestId('state-profile-error')).toBeVisible({ timeout: 60_000 });
    failing = false;
    await screen.getByTestId('btn-retry').click();
    await expect(page.getByTestId('screen-dashboard')).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('Onboarding', () => {
  test('incomplete profile is routed to onboarding, validates, and saving lands on the dashboard', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    let incomplete = true;
    await overrideProfile(page, { profile_completed: false, terms_accepted: false }, () => incomplete);
    let patientUpsert = false;
    await page.route('**/rest/v1/patient_profiles?**', async (route) => {
      if (route.request().method() === 'GET' || route.request().method() === 'HEAD') return route.continue();
      patientUpsert = true;
      incomplete = false;
      await route.fulfill({ status: 201, contentType: 'application/json', body: route.request().postData() ?? '[]' });
    });

    const screen = await openScreen(page, '/', 'screen-onboarding');
    await page.goto('/records');
    await expect(page.getByTestId('screen-onboarding')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('input-onboarding-name')).toHaveValue(/Smoke/);

    await screen.getByTestId('btn-onboarding-save').click();
    await expect(screen.getByTestId('message-danger')).toBeVisible();
    await screen.getByTestId('input-onboarding-name').fill('');
    await screen.getByTestId('btn-onboarding-save').click();
    await expect(screen.getByTestId('message-danger')).toBeVisible();
    await screen.getByTestId('input-onboarding-name').fill('Smoke Patient');
    await commonScreenChecks(page, testInfo, screen, 'onboarding');

    await screen.getByTestId('toggle-onboarding-terms').getByRole('switch').click();
    await screen.getByTestId('btn-onboarding-save').click();
    await expect(page.getByTestId('screen-dashboard')).toBeVisible({ timeout: 60_000 });
    expect(patientUpsert, 'patient_profiles upsert was sent').toBe(true);
  });
});
