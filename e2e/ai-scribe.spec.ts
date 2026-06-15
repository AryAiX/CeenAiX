import { expect, test, type Page } from '@playwright/test';
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

const completeScribeSetup = async (page: Page, finalActionName = 'Start Recording') => {
  await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
  await expect(page.getByText('TX / voice source setup')).toBeVisible();
  await page.getByRole('button', { name: 'Doctor spoke' }).click();
  await expect(page.getByText('Aisha Patient voice / TX2 check')).toBeVisible();
  await expect(page.getByText("Confirm the doctor's voice")).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Doctor is on Left / Channel 1' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Patient spoke' }).click();
  await expect(page.getByText('Start the conversation')).toBeVisible();
  await page.getByRole('button', { name: finalActionName }).click();
  await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
};

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

  test('starts source setup and recording without a consent modal', async ({ browser }) => {
    const page = await browser.newPage();
    await installSupabaseMocks(page, { role: 'doctor' });
    const state: ScribeState = { recording: null, transcript: null, note: null };
    await installScribeRoutes(page, state);
    await seedAuthenticatedRole(page, 'doctor');

    await page.goto(`/doctor/appointments/${SCRIBE_APPOINTMENT_ID}`);

    await expect(page.getByText('TX / voice source setup')).not.toBeVisible();
    await page.getByRole('button', { name: 'Start source setup' }).click();
    await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
    await expect(page.getByText('TX / voice source setup')).toBeVisible();
    await page.getByRole('button', { name: 'Doctor spoke' }).click();
    await page.getByRole('button', { name: 'Patient spoke' }).click();
    await expect(page.getByText('Start the conversation')).toBeVisible();
    await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
    await page.getByRole('button', { name: 'Start Recording' }).click();
    await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
    await expect(page.getByText('Recording').first()).toBeVisible();

    await page.close();
  });

  test('shows mixed-input source labeling without immediate manual channel choices', async ({ browser }) => {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: undefined,
      });
    });
    await installSupabaseMocks(page, { role: 'doctor' });
    const state: ScribeState = { recording: null, transcript: null, note: null };
    await installScribeRoutes(page, state);
    await seedAuthenticatedRole(page, 'doctor');

    await page.goto(`/doctor/appointments/${SCRIBE_APPOINTMENT_ID}`);

    await expect(page.getByText('Source setup', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Check the doctor and patient voices before you begin.')).not.toBeVisible();

    await page.getByRole('button', { name: 'Start source setup' }).click();
    await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
    await expect(page.getByText('TX / voice source setup')).toBeVisible();
    await page.getByRole('button', { name: 'Doctor spoke' }).click();

    await expect(page.getByText('Aisha Patient voice / TX2 check')).toBeVisible();
    await expect(page.getByText('Ask Aisha Patient to speak using TX2 so the scribe can compare the audio signal.')).toBeVisible();
    await expect(page.getByText("Confirm the doctor's voice")).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Doctor is on Left / Channel 1' })).not.toBeVisible();
    await expect(page.getByText('Both voices appear to be coming through the same microphone').first()).not.toBeVisible();

    await expect(page.getByRole('button', { name: 'Continue with conversation content' })).not.toBeVisible();

    await page.getByRole('button', { name: 'Patient spoke' }).click();
    await expect(page.getByText('Start the conversation')).toBeVisible();
    await expect(page.getByText(/TX1 and TX2 voice checks are complete/).first()).toBeVisible();
    await expect(page.getByText(/The scribe will use those checks and conversation content to identify Doctor and Patient/).first()).toBeVisible();
    await expect(page.getByText(/separation unclear/i).first()).not.toBeVisible();
    await expect(page.getByText(/Input detected:/i).first()).not.toBeVisible();
    await expect(page.getByText('Both voices appear to be coming through the same microphone').first()).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Advanced diagnostics' })).not.toBeVisible();
    await expect(page.locator('section').filter({ hasText: 'Start the conversation' }).first()).not.toContainText(/\b(review|correct|manual|assign)\b/i);
    await page.getByRole('button', { name: 'Start Recording' }).click();
    await expect(page.getByText('Patient Consent Required')).not.toBeVisible();
    await expect(page.getByText('Recording').first()).toBeVisible();

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
    await page.getByRole('button', { name: 'Start source setup' }).click();
    await completeScribeSetup(page, 'Start Live Scribe');

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

