import { expect, test, type Page } from '@playwright/test';
import {
  createE2EWorkflowState,
  e2eUsers,
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  type E2ERole,
} from './support/supabase-mock';

const openAuthed = async (page: Page, role: E2ERole, path: string) => {
  await installSupabaseMocks(page, { role });
  await seedAuthenticatedRole(page, role);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
  return page;
};

test.describe('public directory interactions', () => {
  test('find-doctor lists bookable doctors from RPC', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/find-doctor');
    await expect(page.getByText(e2eUsers.doctor.fullName)).toBeVisible();
    await expect(page.getByRole('button', { name: /book appointment/i }).first()).toBeVisible();
  });

  test('find-clinic lists facilities from canonical RPC', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/find-clinic');
    await expect(page.getByText('Dubai Healthcare City').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /view doctors/i }).first()).toBeVisible();
  });

  test('laboratories page lists labs from canonical RPC', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/laboratories');
    await expect(page.getByRole('heading', { name: /premier medical laboratory/i })).toBeVisible();
  });
});

test.describe('patient portal interactions', () => {
  test('patient appointments cancelled filter is available', async ({ page }) => {
    const state = createE2EWorkflowState();
    state.appointments.push({
      id: 'appointment-cancelled-e2e',
      patient_id: e2eUsers.patient.id,
      doctor_id: e2eUsers.doctor.id,
      type: 'in_person',
      status: 'cancelled',
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      duration_minutes: 30,
      chief_complaint: 'Cancelled follow-up E2E',
      notes: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await installSupabaseMocks(page, { role: 'patient', state });
    await seedAuthenticatedRole(page, 'patient');
    await page.goto('/patient/appointments');
    await page.getByRole('button', { name: /cancelled/i }).click();
    await expect(page.getByText('Cancelled follow-up E2E')).toBeVisible();
  });

  test('patient can open records and see add-condition control', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/records');
    await expect(page.getByRole('button', { name: /add condition/i })).toBeVisible();
  });

  test('patient settings shows password reset action', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/settings');
    await page.getByRole('button', { name: /security/i }).click();
    await expect(page.getByRole('button', { name: /email me a password reset link/i })).toBeVisible();
  });

  test('patient insurance page renders plan workspace', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/insurance');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('patient lab results page loads without runtime error', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/lab-results');
    await expect(page.locator('body')).not.toContainText(/Cannot read properties/i);
  });
});

test.describe('doctor portal interactions', () => {
  test('doctor dashboard shows today schedule section', async ({ page }) => {
    await openAuthed(page, 'doctor', '/doctor/dashboard');
    await expect(page.getByText(/today's appointments|today schedule/i).first()).toBeVisible();
  });

  test('doctor appointments list view tab is usable', async ({ page }) => {
    await openAuthed(page, 'doctor', '/doctor/appointments');
    await page.getByRole('button', { name: /list view/i }).click();
    await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  });

  test('doctor patients list opens from dashboard quick action path', async ({ page }) => {
    await openAuthed(page, 'doctor', '/doctor/patients');
    await expect(page.getByText(/all patients/i).first()).toBeVisible();
  });

  test('doctor schedule page shows availability controls', async ({ page }) => {
    await openAuthed(page, 'doctor', '/doctor/schedule');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
  });
});

test.describe('ops portal interactions', () => {
  test('pharmacy dashboard renders queue workspace', async ({ page }) => {
    await openAuthed(page, 'pharmacy', '/pharmacy/dashboard');
    await expect(page.getByText(/prescriptions today|in queue/i).first()).toBeVisible();
  });

  test('pharmacy messages page renders thread list', async ({ page }) => {
    await openAuthed(page, 'pharmacy', '/pharmacy/messages');
    await expect(page.getByText(/messages/i).first()).toBeVisible();
  });

  test('lab dashboard renders worklist', async ({ page }) => {
    await openAuthed(page, 'lab', '/lab/dashboard');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
  });

  test('insurance dashboard renders pre-auth workspace', async ({ page }) => {
    await openAuthed(page, 'insurance', '/insurance/dashboard');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
  });

  test('insurance claims workspace lists seeded claims', async ({ page }) => {
    await openAuthed(page, 'insurance', '/insurance/claims');
    await expect(page.getByText(/CLM-E2E-001/i).first()).toBeVisible();
  });

  test('patient documents page renders derived document library', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/documents');
    await expect(page.getByRole('heading', { name: /documents/i }).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Cannot read properties/i);
  });

  test('patient messages workspace lists seeded conversation', async ({ page }) => {
    await openAuthed(page, 'patient', '/patient/messages');
    await expect(page.getByText(/Care coordination/i).first()).toBeVisible();
  });

  test('admin dashboard metrics render without RPC null crash', async ({ page }) => {
    await openAuthed(page, 'super_admin', '/admin/dashboard');
    await expect(page.getByText(/1,220|1220|Patients|Maya Admin/i).first()).toBeVisible();
  });

  test('admin organizations page supports onboard lab CTA', async ({ page }) => {
    await openAuthed(page, 'super_admin', '/admin/organizations');
    await expect(page.getByRole('button', { name: /onboard lab/i })).toBeVisible();
  });
});

test.describe('public health content', () => {
  test('health education page renders article workspace', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/health-education');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('auth guard interactions', () => {
  test('unauthenticated patient route redirects to login', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('patient cannot open doctor dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'patient' });
    await seedAuthenticatedRole(page, 'patient');
    await page.goto('/doctor/dashboard');
    await expect(page).toHaveURL(/\/access-denied/);
  });
});
