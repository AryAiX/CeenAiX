import type { Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PATIENT_STATE, SMOKE_VIRTUAL_APPOINTMENT_ID } from '../support/env';
import { commonScreenChecks, expect, openScreen, test } from '../support/fixtures';

/**
 * The smoke patient has no pre-visit assessments and no bookable doctor has a
 * template in DEV, so the intake UI is driven by a mocked assessment row.
 * Reads of related tables hit DEV for real; intake writes are stubbed.
 */
const FAKE_ASSESSMENT_ID = 'aaaaaaaa-0000-4000-8000-000000000a01';
const SMOKE_DOCTOR_ID = '22222222-3333-4333-8444-000000000201';

function patientId(): string {
  const state = JSON.parse(readFileSync(PATIENT_STATE, 'utf8')) as { origins: Array<{ localStorage: Array<{ name: string; value: string }> }> };
  const token = state.origins.flatMap((o) => o.localStorage).find((e) => e.name.endsWith('-auth-token'));
  const parsed = JSON.parse(token?.value ?? '{}') as { user?: { id?: string } };
  return parsed.user?.id ?? '';
}

const questions = [
  { key: 'chief_concern', label: 'What is the main reason for your visit?', type: 'short_text', required: true, options: [], displayOrder: 0 },
  { key: 'has_fever', label: 'Have you had a fever in the last 48 hours?', type: 'boolean', required: true, options: [], displayOrder: 1 },
  {
    key: 'pain_level',
    label: 'How would you rate your pain?',
    type: 'single_select',
    required: true,
    options: [
      { label: 'None', value: 'none' },
      { label: 'Mild', value: 'mild' },
      { label: 'Severe', value: 'severe' },
    ],
    displayOrder: 2,
  },
  {
    key: 'symptoms',
    label: 'Which symptoms do you have?',
    type: 'multi_select',
    required: false,
    options: [
      { label: 'Cough', value: 'cough' },
      { label: 'Headache', value: 'headache' },
    ],
    displayOrder: 3,
  },
  { key: 'onset', label: 'When did it start?', type: 'date', required: false, options: [], displayOrder: 4 },
];

async function mockAssessment(page: Page): Promise<void> {
  const row = {
    id: FAKE_ASSESSMENT_ID,
    appointment_id: SMOKE_VIRTUAL_APPOINTMENT_ID,
    patient_id: patientId(),
    doctor_id: SMOKE_DOCTOR_ID,
    template_id: null,
    template_title: 'QA intake',
    template_snapshot: { templateId: null, title: 'QA intake', description: 'Automated QA questionnaire', questions },
    status: 'not_started',
    due_at: null,
    started_at: null,
    completed_at: null,
    reviewed_at: null,
    last_answered_at: null,
  };
  await page.route(/\/rest\/v1\/appointment_pre_visit_assessments/, async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) });
    }
    return route.fulfill({ status: 204, body: '' });
  });
  await page.route(/\/rest\/v1\/(appointment_pre_visit_answers|appointment_pre_visit_summaries|patient_memory_facts|patient_canonical_update_requests)/, async (route) => {
    if (route.request().method() === 'GET') return route.continue();
    return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  });
}

test.describe('Pre-visit intake (mocked assessment)', () => {
  test('intro, one question per screen with validation, review, and complete', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await mockAssessment(page);
    const screen = await openScreen(page, `/pre-visit/${FAKE_ASSESSMENT_ID}`, 'screen-pre-visit');
    await expect(screen.getByTestId('btn-previsit-start')).toBeVisible({ timeout: 60_000 });
    await expect(screen).toContainText('QA intake');
    await commonScreenChecks(page, testInfo, screen, 'pre-visit-intro');
    await screen.getByTestId('btn-previsit-start').click();

    await expect(screen).toContainText(questions[0]!.label);
    await expect(screen.getByTestId('btn-previsit-next')).toBeDisabled();
    await screen.getByTestId('input-previsit-answer').fill('Sore throat (QA)');
    await commonScreenChecks(page, testInfo, screen, 'pre-visit-question');
    await screen.getByTestId('btn-previsit-next').click();

    await expect(screen).toContainText(questions[1]!.label);
    await expect(screen.getByTestId('btn-previsit-next')).toBeDisabled();
    await screen.getByTestId('option-no').click();
    await screen.getByTestId('btn-previsit-next').click();

    await expect(screen).toContainText(questions[2]!.label);
    await screen.getByTestId('btn-previsit-back').click();
    await expect(screen).toContainText(questions[1]!.label);
    await screen.getByTestId('btn-previsit-next').click();
    await screen.getByTestId('option-1').click();
    await screen.getByTestId('btn-previsit-next').click();

    await expect(screen).toContainText(questions[3]!.label);
    await expect(screen.getByTestId('btn-previsit-next')).toBeEnabled();
    await screen.getByTestId('option-0').click();
    await screen.getByTestId('btn-previsit-next').click();

    await expect(screen).toContainText(questions[4]!.label);
    await screen.getByTestId('input-previsit-answer').fill('2026-10-15');
    await screen.getByTestId('btn-previsit-next').click();

    await expect(screen.getByTestId('previsit-review-chief_concern')).toContainText('Sore throat (QA)');
    await expect(screen.getByTestId('previsit-review-pain_level')).toContainText(/mild/i);
    expect.soft(await screen.getByTestId('previsit-review-pain_level').innerText(), 'MB-010: review shows the option label').toContain('Mild');
    expect.soft(await screen.getByTestId('previsit-review-symptoms').innerText(), 'MB-010: review shows the option label').toContain('Cough');
    expect.soft(await screen.getByTestId('previsit-review-has_fever').innerText(), 'MB-010: review shows a localized yes/no').toMatch(/\bNo\b|لا/);
    await commonScreenChecks(page, testInfo, screen, 'pre-visit-review');
    await screen.getByTestId('btn-previsit-complete').click();
    await expect(screen).toBeHidden({ timeout: 120_000 });
  });

  test('close asks before discarding answers', async ({ page }) => {
    await mockAssessment(page);
    const screen = await openScreen(page, `/pre-visit/${FAKE_ASSESSMENT_ID}`, 'screen-pre-visit');
    await screen.getByTestId('btn-previsit-start').click();
    await screen.getByTestId('input-previsit-answer').fill('QA');
    await screen.getByTestId('btn-previsit-close').click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog-btn-cancel').click();
    await expect(screen.getByTestId('input-previsit-answer')).toHaveValue('QA');
  });

  test('unknown assessment shows the not-found state', async ({ page }) => {
    const screen = await openScreen(page, '/pre-visit/00000000-0000-4000-8000-000000000000', 'screen-pre-visit');
    await expect(screen.getByTestId('state-empty-previsit')).toBeVisible({ timeout: 60_000 });
  });
});
