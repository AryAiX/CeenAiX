import { expect, test, type Page } from '@playwright/test';
import {
  e2eUsers,
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  type E2ERole,
} from './support/supabase-mock';

interface RouteCase {
  name: string;
  path: string;
}

const publicRoutes: RouteCase[] = [
  { name: 'landing page', path: '/' },
  { name: 'guest AI chat', path: '/ai-chat' },
  { name: 'doctor directory', path: '/find-doctor' },
  { name: 'clinic directory', path: '/find-clinic' },
  { name: 'insurance plans', path: '/insurance' },
  { name: 'health education', path: '/health-education' },
  { name: 'laboratories landing page', path: '/laboratories' },
  { name: 'pharmacy landing page', path: '/pharmacy' },
  { name: 'appointment showcase', path: '/appointment-showcase' },
];

const authRoutes: RouteCase[] = [
  { name: 'login', path: '/auth/login' },
  { name: 'register', path: '/auth/register' },
  { name: 'forgot password', path: '/auth/forgot-password' },
  { name: 'verify OTP', path: '/auth/verify-otp' },
  { name: 'portal access', path: '/auth/portal-access' },
  { name: 'access denied', path: '/access-denied' },
];

const patientRoutes: RouteCase[] = [
  { name: 'dashboard', path: '/patient/dashboard' },
  { name: 'appointments list', path: '/patient/appointments' },
  { name: 'appointment booking', path: '/patient/appointments/book' },
  { name: 'prescriptions', path: '/patient/prescriptions' },
  { name: 'records', path: '/patient/records' },
  { name: 'AI chat', path: '/patient/ai-chat' },
  { name: 'messages', path: '/patient/messages' },
  { name: 'message detail', path: '/patient/messages/00000000-0000-4000-8000-000000000701' },
  { name: 'profile', path: '/patient/profile' },
  { name: 'lab results', path: '/patient/lab-results' },
  { name: 'notifications', path: '/patient/notifications' },
  { name: 'telemedicine placeholder', path: '/patient/telemedicine/00000000-0000-4000-8000-000000000601' },
  { name: 'settings', path: '/patient/settings' },
  { name: 'imaging', path: '/patient/imaging' },
  { name: 'insurance', path: '/patient/insurance' },
  { name: 'documents', path: '/patient/documents' },
];

const doctorRoutes: RouteCase[] = [
  { name: 'dashboard', path: '/doctor/dashboard' },
  { name: 'today schedule', path: '/doctor/today' },
  { name: 'appointments', path: '/doctor/appointments' },
  { name: 'appointment detail', path: '/doctor/appointments/00000000-0000-4000-8000-000000000601' },
  { name: 'patients', path: '/doctor/patients' },
  { name: 'patient detail', path: '/doctor/patients/00000000-0000-4000-8000-000000000101' },
  { name: 'schedule', path: '/doctor/schedule' },
  { name: 'prescribe shortcut', path: '/doctor/prescribe' },
  { name: 'prescriptions', path: '/doctor/prescriptions' },
  { name: 'new prescription', path: '/doctor/prescriptions/new' },
  { name: 'labs shortcut', path: '/doctor/labs' },
  { name: 'lab orders', path: '/doctor/lab-orders' },
  { name: 'new lab order', path: '/doctor/lab-orders/new' },
  { name: 'messages', path: '/doctor/messages' },
  { name: 'message detail', path: '/doctor/messages/00000000-0000-4000-8000-000000000701' },
  { name: 'profile', path: '/doctor/profile' },
  { name: 'notifications', path: '/doctor/notifications' },
  { name: 'consultation workspace', path: '/doctor/consultations/00000000-0000-4000-8000-000000000601' },
  { name: 'settings', path: '/doctor/settings' },
  { name: 'imaging', path: '/doctor/imaging' },
  { name: 'earnings', path: '/doctor/earnings' },
  { name: 'portal', path: '/doctor/portal' },
];

const adminRoutes: RouteCase[] = [
  { name: 'dashboard', path: '/admin/dashboard' },
  { name: 'compliance', path: '/admin/compliance' },
  { name: 'patients', path: '/admin/patients' },
  { name: 'doctors', path: '/admin/doctors' },
  { name: 'insurance', path: '/admin/insurance' },
  { name: 'integrations', path: '/admin/integrations' },
  { name: 'revenue', path: '/admin/revenue' },
  { name: 'NABIDH', path: '/admin/nabidh' },
  { name: 'audit', path: '/admin/audit' },
  { name: 'security', path: '/admin/security' },
  { name: 'platform settings', path: '/admin/platform-settings' },
  { name: 'system health', path: '/admin/system-health' },
  { name: 'clinics', path: '/admin/clinics' },
  { name: 'organizations', path: '/admin/organizations' },
  { name: 'users', path: '/admin/users' },
  { name: 'diagnostics', path: '/admin/diagnostics' },
  { name: 'AI analytics', path: '/admin/ai-analytics' },
];

const clinicRoutes: RouteCase[] = [
  { name: 'dashboard', path: '/clinic/dashboard' },
  { name: 'doctors', path: '/clinic/doctors' },
  { name: 'appointments', path: '/clinic/appointments' },
  { name: 'patients', path: '/clinic/patients' },
  { name: 'services', path: '/clinic/services' },
  { name: 'pricing', path: '/clinic/pricing' },
  { name: 'schedule', path: '/clinic/schedule' },
  { name: 'analytics', path: '/clinic/analytics' },
  { name: 'billing', path: '/clinic/billing' },
  { name: 'settings', path: '/clinic/settings' },
];

const labRoutes: RouteCase[] = [
  { name: 'dashboard', path: '/lab/dashboard' },
  { name: 'referrals', path: '/lab/referrals' },
  { name: 'queue', path: '/lab/queue' },
  { name: 'orders', path: '/lab/orders' },
  { name: 'results', path: '/lab/results' },
  { name: 'result entry', path: '/lab/results/entry' },
  { name: 'quality control', path: '/lab/qc' },
  { name: 'radiology', path: '/lab/radiology' },
  { name: 'imaging queue', path: '/lab/imaging/queue' },
  { name: 'imaging orders', path: '/lab/imaging/orders' },
  { name: 'imaging reports', path: '/lab/imaging/reports' },
  { name: 'imaging equipment', path: '/lab/imaging/equipment' },
  { name: 'equipment', path: '/lab/equipment' },
  { name: 'NABIDH sync', path: '/lab/nabidh' },
  { name: 'analytics', path: '/lab/analytics' },
  { name: 'profile', path: '/lab/profile' },
  { name: 'settings', path: '/lab/settings' },
];

const protectedEntryRoutes: Array<{ role: E2ERole; path: string }> = [
  { role: 'patient', path: '/patient/dashboard' },
  { role: 'doctor', path: '/doctor/dashboard' },
  { role: 'super_admin', path: '/admin/dashboard' },
  { role: 'lab', path: '/lab/dashboard' },
  { role: 'clinic', path: '/clinic/dashboard' },
];

const wrongRoleChecks: Array<{ role: E2ERole; path: string }> = [
  { role: 'patient', path: '/doctor/dashboard' },
  { role: 'patient', path: '/admin/dashboard' },
  { role: 'patient', path: '/lab/dashboard' },
  { role: 'patient', path: '/clinic/dashboard' },
  { role: 'doctor', path: '/patient/dashboard' },
  { role: 'doctor', path: '/admin/dashboard' },
  { role: 'doctor', path: '/lab/dashboard' },
  { role: 'doctor', path: '/clinic/dashboard' },
  { role: 'super_admin', path: '/patient/dashboard' },
  { role: 'super_admin', path: '/clinic/dashboard' },
  { role: 'lab', path: '/doctor/dashboard' },
  { role: 'lab', path: '/admin/dashboard' },
  { role: 'lab', path: '/clinic/dashboard' },
  { role: 'clinic', path: '/patient/dashboard' },
  { role: 'clinic', path: '/doctor/dashboard' },
  { role: 'clinic', path: '/admin/dashboard' },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function expectUsablePage(page: Page, expectedPath: string) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}(?:[?#].*)?$`));
  await expect(page.locator('body')).toBeVisible();

  const bodyText = (await page.locator('body').textContent()) ?? '';
  expect(bodyText.trim().length).toBeGreaterThan(20);
  expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error|Cannot read properties/i);
}

async function expectProtectedPage(page: Page, expectedPath: string) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}(?:[?#].*)?$`));
  await expect(page.locator('main').first()).toBeVisible();
  await expect(page.getByRole('navigation').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Sign in|Access denied/i);
}

test.describe('public and auth journeys', () => {
  for (const route of publicRoutes) {
    test(`public visitor can open ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page);
      await seedUnauthenticated(page);

      await page.goto(route.path);

      await expectUsablePage(page, route.path);
    });
  }

  for (const route of authRoutes) {
    test(`visitor can open ${route.name} route`, async ({ page }) => {
      await installSupabaseMocks(page);
      await seedUnauthenticated(page);

      await page.goto(route.path);

      await expectUsablePage(page, route.path);
    });
  }

  test('login redirects a valid patient to the patient dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'patient' });
    await seedUnauthenticated(page);

    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(e2eUsers.patient.email);
    await page.locator('input[type="password"]').fill('CorrectHorseBatteryStaple1!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/patient\/dashboard$/);
    await expect(page.locator('body')).toContainText(e2eUsers.patient.fullName);
  });
});

test.describe('role guard journeys', () => {
  for (const route of protectedEntryRoutes) {
    test(`unauthenticated visitor is redirected away from ${route.path}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: route.role });
      await seedUnauthenticated(page);

      await page.goto(route.path);

      await expect(page).toHaveURL(new RegExp(`/auth/login\\?redirect=${encodeURIComponent(route.path)}`));
    });
  }

  for (const check of wrongRoleChecks) {
    test(`${check.role} cannot open ${check.path}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: check.role });
      await seedAuthenticatedRole(page, check.role);

      await page.goto(check.path);

      await expect(page).toHaveURL(/\/access-denied$/);
      await expect(page.locator('body')).toContainText(/access denied/i);
    });
  }

  test('incomplete patient profile is sent to onboarding before portal use', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'patient', profileCompleted: false });
    await seedAuthenticatedRole(page, 'patient', { profileCompleted: false });

    await page.goto('/patient/dashboard');

    await expect(page).toHaveURL(/\/auth\/onboarding$/);
    await expect(page.locator('body')).toContainText(/profile|onboarding|complete/i);
  });
});

test.describe('patient end-to-end portal coverage', () => {
  for (const route of patientRoutes) {
    test(`patient can use ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: 'patient' });
      await seedAuthenticatedRole(page, 'patient');

      await page.goto(route.path);

      await expectProtectedPage(page, route.path);
    });
  }
});

test.describe('doctor end-to-end portal coverage', () => {
  for (const route of doctorRoutes) {
    test(`doctor can use ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: 'doctor' });
      await seedAuthenticatedRole(page, 'doctor');

      await page.goto(route.path);

      await expectProtectedPage(page, route.path);
    });
  }
});

test.describe('admin end-to-end portal coverage', () => {
  for (const route of adminRoutes) {
    test(`admin can use ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: 'super_admin' });
      await seedAuthenticatedRole(page, 'super_admin');

      await page.goto(route.path);

      await expectProtectedPage(page, route.path);
    });
  }
});

test.describe('lab end-to-end portal coverage', () => {
  for (const route of labRoutes) {
    test(`lab staff can use ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: 'lab' });
      await seedAuthenticatedRole(page, 'lab');

      await page.goto(route.path);

      await expectProtectedPage(page, route.path);
    });
  }
});

test.describe('clinic end-to-end portal coverage', () => {
  for (const route of clinicRoutes) {
    test(`clinic admin can use ${route.name}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: 'clinic' });
      await seedAuthenticatedRole(page, 'clinic');

      await page.goto(route.path);

      await expectProtectedPage(page, route.path);
    });
  }
});
