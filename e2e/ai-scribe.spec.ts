import { expect, test } from '@playwright/test';
import { installSupabaseMocks, seedAuthenticatedRole } from './support/supabase-mock';
import {
  SCRIBE_APPOINTMENT_ID,
  installScribeRoutes,
  sampleNote,
  sampleRecording,
  sampleTranscript,
  type ScribeState,
} from './support/scribe-mock';

test.use({
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

test.describe('AI Consultation Scribe', () => {
  test('shows a processed AI clinical note with editable SOAP and smart suggestions', async ({ browser }) => {
    const page = await browser.newPage();
    await installSupabaseMocks(page, { role: 'doctor' });
    const state: ScribeState = {
      recording: sampleRecording('ready'),
      transcript: sampleTranscript(),
      note: sampleNote(),
    };
    await installScribeRoutes(page, state);
    await seedAuthenticatedRole(page, 'doctor');

    await page.goto(`/doctor/appointments/${SCRIBE_APPOINTMENT_ID}`);

    await expect(page.getByText('Ready for review')).toBeVisible();

    await page.getByRole('button', { name: 'AI Scribe' }).click();

    await expect(page.getByText('Acute bronchitis').first()).toBeVisible();
    await expect(page.getByText('J20.9')).toBeVisible();
    await expect(page.getByText('AI-generated').first()).toBeVisible();
    await expect(page.getByText('I have had chest tightness').first()).toBeVisible();
    await expect(page.getByText('Low confidence').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve & Save to Record' })).toBeVisible();

    await page.close();
  });

  test('captures consent before recording can start', async ({ browser }) => {
    const page = await browser.newPage();
    await installSupabaseMocks(page, { role: 'doctor' });
    const state: ScribeState = { recording: null, transcript: null, note: null };
    await installScribeRoutes(page, state);
    await seedAuthenticatedRole(page, 'doctor');

    await page.goto(`/doctor/appointments/${SCRIBE_APPOINTMENT_ID}`);

    await page.getByRole('button', { name: 'Start Recording' }).click();

    await expect(page.getByText('Patient Consent Required')).toBeVisible();
    const confirm = page.getByRole('button', { name: 'Confirm & Start Recording' });
    await expect(confirm).toBeDisabled();

    await page.getByText('I have informed the patient').click();
    await page.getByText('The patient has given verbal consent').click();
    await expect(confirm).toBeEnabled();

    await page.close();
  });
});

test.describe('AI Consultation Scribe — live mode', () => {
  test('streams a live transcript and AI copilot cues', async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext();
    await context.grantPermissions(['microphone'], { origin: 'http://127.0.0.1:4173' });
    const page = await context.newPage();

    await installSupabaseMocks(page, { role: 'doctor' });
    const state: ScribeState = { recording: null, transcript: null, note: null };
    await installScribeRoutes(page, state);
    await seedAuthenticatedRole(page, 'doctor');

    await page.goto(`/doctor/appointments/${SCRIBE_APPOINTMENT_ID}`);

    // Switch to Live mode, then start.
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    await page.getByRole('button', { name: 'Start Live Scribe' }).click();

    // Consent.
    await page.getByText('I have informed the patient').click();
    await page.getByText('The patient has given verbal consent').click();
    await page.getByRole('button', { name: 'Confirm & Start Recording' }).click();

    // Live session panel appears.
    await expect(page.getByText('Live session')).toBeVisible();

    // First ~7s segment closes → transcript entry appears.
    await expect(page.getByText('Patient reports chest tightness and a cough.').first()).toBeVisible({
      timeout: 20_000,
    });

    // Cue engine polls (~18s) → at least one copilot cue appears.
    await expect(page.getByText(/radiates to the arm or jaw|consider cardiac/).first()).toBeVisible({
      timeout: 25_000,
    });

    await context.close();
  });
});

