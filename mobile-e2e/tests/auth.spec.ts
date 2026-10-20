import { mockAuthSideEffects } from '../support/auth-mocks';
import { SMOKE_PATIENT } from '../support/env';
import { commonScreenChecks, expect, openScreen, snap, test, tr } from '../support/fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sign in', () => {
  test('renders, validates and rejects bad credentials', async ({ page, consoleGuard }, testInfo) => {
    consoleGuard.allow(/400|Failed to load resource/);
    const screen = await openScreen(page, '/', 'screen-sign-in');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByTestId('btn-sign-in')).toBeDisabled();
    await page.getByTestId('input-login-email').fill(SMOKE_PATIENT.email);
    await expect(page.getByTestId('btn-sign-in')).toBeDisabled();
    await page.getByTestId('input-login-password').fill('definitely-wrong-password');
    await expect(page.getByTestId('btn-sign-in')).toBeEnabled();
    await page.getByTestId('btn-sign-in').click();
    await expect(page.getByTestId('message-danger')).toContainText(/invalid login credentials/i);
    await expect(page.getByTestId('screen-sign-in')).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'auth-sign-in');
  });

  test('password visibility toggle has an accessible name and flips the input type', async ({ page }) => {
    await openScreen(page, '/sign-in', 'screen-sign-in');
    const password = page.getByTestId('input-login-password');
    await password.fill('secret123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password|إظهار/i }).click();
    await expect(password).not.toHaveAttribute('type', 'password');
  });

  test('signs in with the smoke patient and lands on the dashboard', async ({ page }) => {
    await openScreen(page, '/sign-in', 'screen-sign-in');
    await page.getByTestId('input-login-email').fill(SMOKE_PATIENT.email);
    await page.getByTestId('input-login-password').fill(SMOKE_PATIENT.password);
    await page.getByTestId('input-login-password').press('Enter');
    await expect(page.getByTestId('screen-dashboard')).toBeVisible({ timeout: 45_000 });
  });

  test('MB-005: a patient never sees the patient-only screen while the profile loads', async ({ page }) => {
    await openScreen(page, '/sign-in', 'screen-sign-in');
    await page.getByTestId('input-login-email').fill(SMOKE_PATIENT.email);
    await page.getByTestId('input-login-password').fill(SMOKE_PATIENT.password);
    await page.getByTestId('btn-sign-in').click();
    const dashboard = page.getByTestId('screen-dashboard');
    const wrongScreen = page.getByTestId('screen-patient-only');
    let sawPatientOnly = false;
    await expect
      .poll(
        async () => {
          if (await wrongScreen.isVisible()) sawPatientOnly = true;
          return dashboard.isVisible();
        },
        { timeout: 45_000, intervals: [100] }
      )
      .toBe(true);
    expect(sawPatientOnly, 'patient-only screen flashed for a patient account').toBe(false);
  });

  test('phone OTP mode validates the number and opens the OTP screen', async ({ page }, testInfo) => {
    await mockAuthSideEffects(page);
    await openScreen(page, '/sign-in', 'screen-sign-in');
    await page.getByTestId('segment-login-mode-otp').click();
    const phone = page.getByTestId('input-login-phone');
    await expect(phone).toBeVisible();
    await phone.fill('12');
    await page.getByTestId('btn-send-code').click();
    await expect(page.getByTestId('message-danger')).toContainText(/\+971|٩٧١/);
    await phone.fill('+971501234567');
    await page.getByTestId('btn-send-code').click();
    await expect(page.getByTestId('screen-otp')).toBeVisible();
    await expect(page).toHaveURL(/\/otp/);
  });

  test('links to forgot password and sign up, and back works', async ({ page }) => {
    await openScreen(page, '/sign-in', 'screen-sign-in');
    await page.getByTestId('link-forgot-password').click();
    await expect(page.getByTestId('screen-forgot-password')).toBeVisible();
    await page.getByTestId('btn-return-sign-in').click();
    await expect(page.getByTestId('screen-sign-in')).toBeVisible();
    await page.getByTestId('link-sign-up').click();
    await expect(page.getByTestId('screen-sign-up')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('screen-sign-in')).toBeVisible();
  });

  test('protected routes redirect to sign-in when signed out', async ({ page }) => {
    await page.goto('/records');
    await expect(page.getByTestId('screen-sign-in')).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Forgot password', () => {
  test('requires an email and confirms the reset was sent', async ({ page }, testInfo) => {
    await mockAuthSideEffects(page);
    const screen = await openScreen(page, '/forgot-password', 'screen-forgot-password');
    await expect(page.getByTestId('btn-send-reset')).toBeDisabled();
    await page.getByTestId('input-forgot-email').fill('not-an-email');
    await expect(page.getByTestId('btn-send-reset')).toBeDisabled();
    await page.getByTestId('input-forgot-email').fill(SMOKE_PATIENT.email);
    await page.getByTestId('btn-send-reset').click();
    await expect(page.getByTestId('message-success')).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'auth-forgot-password');
  });
});

test.describe('Phone OTP', () => {
  test('shows six cells, resend cooldown, and rejects a wrong code', async ({ page, consoleGuard }, testInfo) => {
    consoleGuard.allow(/403|Failed to load resource/);
    await mockAuthSideEffects(page);
    const screen = await openScreen(page, '/otp?phone=%2B971501234567&flow=signin', 'screen-otp');
    await expect(screen.getByText('+971501234567')).toBeVisible();
    await expect(page.getByTestId('btn-verify-otp')).toBeDisabled();
    await expect(page.getByTestId('btn-resend-otp')).toBeDisabled();
    await page.getByTestId('input-otp-code').fill('123456');
    await expect(page.getByTestId('message-danger')).toContainText(/expired or is invalid/i);
    await expect(page.getByTestId('input-otp-code')).toHaveValue('');
    await commonScreenChecks(page, testInfo, screen, 'auth-otp');
  });

  test('digits stay left-to-right in Arabic', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'rtl-ar', 'RTL only');
    await mockAuthSideEffects(page);
    await openScreen(page, '/otp?phone=%2B971501234567&flow=signin', 'screen-otp');
    const input = page.getByTestId('input-otp-code');
    await input.pressSequentially('12', { delay: 50 });
    const cells = page.getByTestId('input-otp-cells');
    const firstDigit = cells.getByText('1', { exact: true });
    const secondDigit = cells.getByText('2', { exact: true });
    const a = await firstDigit.boundingBox();
    const b = await secondDigit.boundingBox();
    expect(a && b && a.x < b.x, 'first OTP digit should be left of the second').toBe(true);
  });
});

test.describe('Sign up', () => {
  test('email flow validates each step and shows the check-email state', async ({ page }, testInfo) => {
    await mockAuthSideEffects(page);
    const screen = await openScreen(page, '/sign-up', 'screen-sign-up');
    await expect(page.getByTestId('option-signup-email')).toBeVisible();
    await expect(page.getByTestId('option-signup-phone')).toBeVisible();
    await commonScreenChecks(page, testInfo, screen, 'auth-sign-up-method');
    await page.getByTestId('option-signup-email').click();
    await page.getByTestId('btn-sign-up-continue').click();

    await expect(page.getByTestId('input-signup-name')).toBeVisible();
    await page.getByTestId('btn-sign-up-continue').click();
    const danger = page.getByTestId('message-danger');
    await expect(danger).toBeVisible();
    const nameError = await danger.innerText();
    await page.getByTestId('input-signup-name').fill('QA New Patient');
    await page.getByTestId('input-signup-email').fill('bad-email');
    await page.getByTestId('btn-sign-up-continue').click();
    await expect(danger).not.toHaveText(nameError);
    await expect(page.getByTestId('input-signup-password')).toHaveCount(0);
    await page.getByTestId('input-signup-email').fill('qa.new.patient@ceenaix.test');
    await page.getByTestId('btn-sign-up-continue').click();

    await expect(page.getByTestId('input-signup-password')).toBeVisible();
    await page.getByTestId('input-signup-password').fill('short');
    await page.getByTestId('input-signup-confirm-password').fill('short');
    await page.getByTestId('btn-sign-up-continue').click();
    await expect(danger).toContainText(tr(testInfo, /8 characters/, /8|٨/));
    await page.getByTestId('input-signup-password').fill('QaPassword!2026');
    await page.getByTestId('input-signup-confirm-password').fill('QaPassword!2027');
    await page.getByTestId('btn-sign-up-continue').click();
    const shortError = await danger.innerText();
    await expect(danger).not.toHaveText(shortError);
    await page.getByTestId('input-signup-confirm-password').fill('QaPassword!2026');
    await page.getByTestId('btn-sign-up-continue').click();
    const mismatchError = await danger.innerText();
    await expect(danger).not.toHaveText(mismatchError);
    await page.getByTestId('toggle-signup-terms').click();
    await page.getByTestId('btn-sign-up-continue').click();
    await expect(page.getByTestId('btn-sign-in-instead')).toBeVisible();
    await snap(page, testInfo, 'auth-sign-up-check-email');
    await page.getByTestId('btn-sign-in-instead').click();
    await expect(page.getByTestId('screen-sign-in')).toBeVisible();
  });

  test('back button returns to the previous step', async ({ page }) => {
    await openScreen(page, '/sign-up', 'screen-sign-up');
    await page.getByTestId('btn-sign-up-continue').click();
    await expect(page.getByTestId('input-signup-name')).toBeVisible();
    await page.getByTestId('btn-sign-up-back').click();
    await expect(page.getByTestId('option-signup-email')).toBeVisible();
  });

  test('phone flow sends a code and opens OTP', async ({ page }) => {
    await mockAuthSideEffects(page);
    await openScreen(page, '/sign-up', 'screen-sign-up');
    await page.getByTestId('option-signup-phone').click();
    await page.getByTestId('btn-sign-up-continue').click();
    await page.getByTestId('input-signup-name').fill('QA Phone Patient');
    await page.getByTestId('input-signup-phone').fill('+971501234567');
    await page.getByTestId('btn-sign-up-continue').click();
    await expect(page.getByTestId('screen-otp')).toBeVisible();
  });
});
