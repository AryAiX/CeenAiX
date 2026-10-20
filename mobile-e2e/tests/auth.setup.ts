import { expect, test as setup } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PATIENT_STATE, SMOKE_PATIENT } from '../support/env';

setup('sign in as the smoke patient', async ({ page }) => {
  expect(SMOKE_PATIENT.password, 'set SMOKE_PATIENT_PASSWORD in mobile-e2e/.env').not.toBe('');
  await page.goto('/sign-in');
  await page.getByTestId('input-login-email').fill(SMOKE_PATIENT.email);
  await page.getByTestId('input-login-password').fill(SMOKE_PATIENT.password);
  await page.getByTestId('btn-sign-in').click();
  await expect(page.getByTestId('screen-dashboard')).toBeVisible({ timeout: 60_000 });
  mkdirSync(dirname(PATIENT_STATE), { recursive: true });
  await page.context().storageState({ path: PATIENT_STATE });
});
