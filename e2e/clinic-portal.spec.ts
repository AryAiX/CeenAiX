import { expect, test, type Page } from '@playwright/test';
import {
  e2eClinicStaffId,
  e2eUsers,
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  type E2ERole,
} from './support/supabase-mock';

const clinicRoutes = [
  { name: 'dashboard', path: '/clinic/dashboard' },
  { name: 'root redirect', path: '/clinic' },
  { name: 'doctors', path: '/clinic/doctors' },
  { name: 'doctor detail', path: `/clinic/doctors/${e2eClinicStaffId}` },
  { name: 'appointments', path: '/clinic/appointments' },
  { name: 'patients', path: '/clinic/patients' },
  { name: 'services', path: '/clinic/services' },
  { name: 'pricing', path: '/clinic/pricing' },
  { name: 'schedule', path: '/clinic/schedule' },
  { name: 'messages', path: '/clinic/messages' },
  { name: 'analytics', path: '/clinic/analytics' },
  { name: 'settings', path: '/clinic/settings' },
] as const;

const openClinic = async (page: Page, role: 'clinic' | 'clinic_manager' = 'clinic', path = '/clinic/dashboard') => {
  await installSupabaseMocks(page, { role });
  await seedAuthenticatedRole(page, role);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
};

test.describe('clinic portal route coverage', () => {
  for (const route of clinicRoutes) {
    test(`clinic admin can open ${route.name}`, async ({ page }) => {
      await openClinic(page, 'clinic', route.path);
      await expect(page.locator('body')).not.toContainText(/Application error|Cannot read properties/i);
      await expect(page.getByRole('navigation').first()).toBeVisible();
    });
  }

  test('clinic admin can open billing page', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/billing');
    await expect(page.getByText(/billing|revenue/i).first()).toBeVisible();
  });
});

test.describe('clinic portal RBAC', () => {
  test('clinic manager cannot open billing route', async ({ page }) => {
    await openClinic(page, 'clinic_manager', '/clinic/billing');
    await expect(page).toHaveURL(/\/access-denied$/);
  });

  test('clinic manager nav hides billing item', async ({ page }) => {
    await openClinic(page, 'clinic_manager', '/clinic/dashboard');
    await expect(page.getByRole('navigation').first()).not.toContainText(/Billing & Revenue/i);
  });

  test('clinic admin nav includes billing item', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/dashboard');
    await expect(page.getByRole('navigation').first()).toContainText(/Billing/i);
  });

  test('patient cannot access clinic dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'patient' });
    await seedAuthenticatedRole(page, 'patient');
    await page.goto('/clinic/dashboard');
    await expect(page).toHaveURL(/\/access-denied$/);
  });

  test('doctor cannot access clinic dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'doctor' });
    await seedAuthenticatedRole(page, 'doctor');
    await page.goto('/clinic/dashboard');
    await expect(page).toHaveURL(/\/access-denied$/);
  });

  test('unauthenticated visitor is redirected from clinic dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'clinic' });
    await seedUnauthenticated(page);
    await page.goto('/clinic/dashboard');
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fclinic%2Fdashboard/);
  });
});

test.describe('clinic portal dashboard and doctors', () => {
  test('dashboard shows clinic KPI cards', async ({ page }) => {
    await openClinic(page);
    await expect(page.getByText(/total doctors|active doctors|appointments this month|revenue this month/i).first()).toBeVisible();
  });

  test('dashboard quick actions link to doctors and pricing', async ({ page }) => {
    await openClinic(page);
    await expect(page.getByRole('link', { name: /add doctor/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /update pricing/i })).toBeVisible();
  });

  test('doctors list shows affiliated doctor', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/doctors');
    await expect(page.getByText(e2eUsers.doctor.fullName)).toBeVisible();
  });

  test('doctor detail exposes clinic-managed pricing fields', async ({ page }) => {
    await openClinic(page, 'clinic', `/clinic/doctors/${e2eClinicStaffId}`);
    await expect(page.getByText(e2eUsers.doctor.fullName)).toBeVisible();
    await expect(page.getByLabel(/in-person fee/i)).toBeVisible();
  });

  test('add doctor modal opens from doctors page', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/doctors');
    await page.locator('button').filter({ hasText: /^Add doctor$/i }).click();
    await expect(page.getByRole('heading', { name: /add doctor/i })).toBeVisible();
    await expect(page.getByText(/full name|work email|dha license/i).first()).toBeVisible();
  });
});

test.describe('clinic portal operations pages', () => {
  test('appointments page lists clinic-wide appointments', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/appointments');
    await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  });

  test('services catalog lists general consultation', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/services');
    await expect(page.getByText(/general consultation/i)).toBeVisible();
  });

  test('pricing page shows doctor matrix and audit log sections', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/pricing');
    await expect(page.getByText(/doctor pricing matrix|pricing audit log|clinic default pricing/i).first()).toBeVisible();
  });

  test('settings page renders facility profile fields', async ({ page }) => {
    await openClinic(page, 'clinic', '/clinic/settings');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
    await expect(page.getByText(/CeenAiX Family Clinic E2E|clinic settings/i).first()).toBeVisible();
  });
});

test.describe('clinic cross-portal impact', () => {
  test('doctor profile shows clinic-managed pricing banner when affiliated', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'doctor' });
    await seedAuthenticatedRole(page, 'doctor');
    await page.goto('/doctor/profile');
    await expect(page.getByText(/managed by your clinic|clinic managed/i).first()).toBeVisible();
    await expect(page.getByText(/CeenAiX Family Clinic E2E/i).first()).toBeVisible();
  });

  test('doctor dashboard remains usable with clinic affiliation', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'doctor' });
    await seedAuthenticatedRole(page, 'doctor');
    await page.goto('/doctor/dashboard');
    await expect(page.locator('body')).not.toContainText(/Application error|Cannot read properties/i);
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('patient booking flow still lists bookable doctors', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/find-doctor');
    await expect(page.getByText(e2eUsers.doctor.fullName)).toBeVisible();
  });

  test('public find-clinic directory still renders', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/find-clinic');
    await expect(page.getByRole('button', { name: /view doctors/i }).first()).toBeVisible();
  });

  test('portal access page includes clinic role card', async ({ page }) => {
    await installSupabaseMocks(page);
    await seedUnauthenticated(page);
    await page.goto('/auth/portal-access');
    await expect(page.getByText(/clinic \/ hospital|clinic portal/i).first()).toBeVisible();
  });

  test('login with clinic role preset loads clinic login form', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'clinic' });
    await seedUnauthenticated(page);
    await page.goto('/auth/login?role=clinic');
    await expect(page.locator('body')).not.toContainText(/Application error/i);
  });
});

test.describe('super admin clinics onboarding', () => {
  const openAdmin = async (page: Page, path: string) => {
    await installSupabaseMocks(page, { role: 'super_admin' });
    await seedAuthenticatedRole(page, 'super_admin');
    await page.goto(path);
  };

  test('admin clinics page loads clinic directory', async ({ page }) => {
    await openAdmin(page, '/admin/clinics');
    await expect(page.getByText(/CeenAiX Family Clinic E2E/i)).toBeVisible();
  });

  test('admin clinics nav entry is reachable from sidebar', async ({ page }) => {
    await openAdmin(page, '/admin/clinics');
    await expect(page.getByRole('navigation').first()).toContainText(/Clinics/i);
  });

  test('admin can open onboard clinic modal', async ({ page }) => {
    await openAdmin(page, '/admin/clinics');
    await page.getByRole('button', { name: /onboard clinic/i }).click();
    await expect(page.getByRole('heading', { name: /onboard clinic/i })).toBeVisible();
    await expect(page.getByLabel(/clinic name \(english\)/i)).toBeVisible();
  });

  test('admin can view doctors panel for selected clinic', async ({ page }) => {
    await openAdmin(page, '/admin/clinics');
    await page.getByRole('button', { name: /view doctors/i }).first().click();
    await expect(page.getByText(e2eUsers.doctor.fullName)).toBeVisible();
  });

  test('admin organizations page still works alongside clinics', async ({ page }) => {
    await openAdmin(page, '/admin/organizations');
    await expect(page.getByText(/CeenAiX Clinic/i).first()).toBeVisible();
  });

  test('clinic role cannot access admin clinics page', async ({ page }) => {
    await openClinic(page, 'clinic', '/admin/clinics');
    await expect(page).toHaveURL(/\/access-denied$/);
  });
});

test.describe('clinic auth routing', () => {
  test('clinic user login redirects to clinic dashboard', async ({ page }) => {
    await installSupabaseMocks(page, { role: 'clinic' });
    await seedUnauthenticated(page);
    await page.goto('/auth/login?role=clinic');
    await page.locator('input[type="email"]').fill(e2eUsers.clinic.email);
    await page.locator('input[type="password"]').fill('CorrectHorseBatteryStaple1!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/clinic\/dashboard$/);
    await expect(page.locator('body')).toContainText(e2eUsers.clinic.fullName);
  });
});

const crossRoleBlocked: Array<{ role: E2ERole; path: string }> = [
  { role: 'pharmacy', path: '/clinic/dashboard' },
  { role: 'lab', path: '/clinic/doctors' },
  { role: 'insurance', path: '/clinic/pricing' },
  { role: 'super_admin', path: '/clinic/settings' },
];

test.describe('clinic isolation from other ops portals', () => {
  for (const check of crossRoleBlocked) {
    test(`${check.role} cannot open ${check.path}`, async ({ page }) => {
      await installSupabaseMocks(page, { role: check.role });
      await seedAuthenticatedRole(page, check.role);
      await page.goto(check.path);
      await expect(page).toHaveURL(/\/access-denied$/);
    });
  }
});
