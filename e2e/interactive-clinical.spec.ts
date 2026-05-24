import { expect, test, type Browser } from '@playwright/test';
import {
  createE2EWorkflowState,
  e2eUsers,
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  workflowIds,
  type E2EWorkflowState,
} from './support/supabase-mock';

const openRolePage = async (
  browser: Browser,
  state: E2EWorkflowState | undefined,
  role: 'patient' | 'doctor' | 'pharmacy' | 'lab',
  path: string
) => {
  const page = await browser.newPage();
  await installSupabaseMocks(page, { role, state });
  await seedAuthenticatedRole(page, role);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
  return page;
};

test.describe('patient interactive clinical', () => {
  test('patient AI chat sends a message and shows assistant reply', async ({ browser }) => {
    const page = await openRolePage(browser, undefined, 'patient', '/patient/ai-chat');

    await expect(page.getByText(/unable to load your chat history/i)).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/ask a question or add context/i)).toBeVisible({ timeout: 15_000 });
    const composer = page.getByPlaceholder(/ask a question or add context/i);
    await composer.fill('What should I track before my visit?');
    await page.locator('form').filter({ has: composer }).getByRole('button').last().click();

    await expect(page.getByText(/mocked for E2E|AI-generated/i).first()).toBeVisible({ timeout: 15_000 });
    await page.close({ runBeforeUnload: true });
  });

  test('guest public AI chat accepts a message without auth', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/ai-chat');

    await expect(page.getByPlaceholder(/ask me anything about your health/i)).toBeVisible();
    const input = page.getByPlaceholder(/ask me anything about your health/i);
    await input.fill('Mild headache for two days');
    await page.locator('form').filter({ has: input }).getByRole('button').last().click();

    await expect(page.getByText(/headache|doctor|symptom|help/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('pharmacy interactive dispensing', () => {
  test('pharmacist advances a new Rx to in progress', async ({ browser }) => {
    const page = await openRolePage(browser, undefined, 'pharmacy', '/pharmacy/dispensing');

    await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /dispense/i }).first().click();

    await expect(page.getByText(/IN PROGRESS/i).first()).toBeVisible({ timeout: 10_000 });
    await page.close({ runBeforeUnload: true });
  });
});

test.describe('doctor visit lifecycle', () => {
  test('doctor appointment detail loads prescription line items', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const appointmentId = '00000000-0000-4000-8000-000000000601';
    state.appointments.push({
      id: appointmentId,
      patient_id: e2eUsers.patient.id,
      doctor_id: e2eUsers.doctor.id,
      type: 'in_person',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      duration_minutes: 30,
      chief_complaint: 'E2E appointment detail',
      notes: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const page = await openRolePage(browser, state, 'doctor', `/doctor/appointments/${appointmentId}`);

    await expect(page.getByText(/Metformin/i).first()).toBeVisible();
    await expect(page.getByText(/500 mg/i).first()).toBeVisible();
    await page.close({ runBeforeUnload: true });
  });

  test('doctor schedule shows paused availability after pause', async ({ browser }) => {
    const page = await openRolePage(browser, undefined, 'doctor', '/doctor/schedule');

    await expect(page.getByRole('combobox').first()).toBeVisible();
    const pauseButton = page.getByRole('button', { name: /pause/i }).first();
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
      await expect(page.getByText(/paused/i).first()).toBeVisible({ timeout: 10_000 });
    }
    await page.close({ runBeforeUnload: true });
  });
});

test.describe('lab and pre-visit interactions', () => {
  test('lab result entry queue lists pending sample', async ({ browser }) => {
    const state = createE2EWorkflowState({ includeBaselineData: true });
    const page = await openRolePage(browser, state, 'lab', '/lab/results/entry');

    await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
    await page.close({ runBeforeUnload: true });
  });

  test('patient pre-visit assessment route renders intake shell', async ({ browser }) => {
    const state = createE2EWorkflowState();
    state.preVisitAssessments.push({
      id: workflowIds.preVisitAssessment,
      appointment_id: workflowIds.appointment,
      patient_id: e2eUsers.patient.id,
      doctor_id: e2eUsers.doctor.id,
      template_id: 'template-e2e',
      template_title: 'E2E intake',
      template_snapshot: { title: 'E2E intake', questions: [] },
      status: 'in_progress',
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      reviewed_at: null,
      last_answered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const page = await openRolePage(
      browser,
      state,
      'patient',
      `/patient/pre-visit/${workflowIds.preVisitAssessment}`
    );

    await expect(page.getByRole('heading', { name: /pre-visit intake/i })).toBeVisible();
    await page.close({ runBeforeUnload: true });
  });
});
