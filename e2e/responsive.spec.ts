import { expect, test, type Page } from '@playwright/test';
import {
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  type E2ERole,
} from './support/supabase-mock';

interface RouteCase {
  name: string;
  path: string;
}

interface ProtectedRouteCase extends RouteCase {
  role: E2ERole;
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

const protectedRoutes: ProtectedRouteCase[] = [
  { role: 'patient', name: 'patient dashboard', path: '/patient/dashboard' },
  { role: 'patient', name: 'patient appointments', path: '/patient/appointments' },
  { role: 'patient', name: 'patient booking', path: '/patient/appointments/book' },
  { role: 'patient', name: 'patient prescriptions', path: '/patient/prescriptions' },
  { role: 'patient', name: 'patient records', path: '/patient/records' },
  { role: 'patient', name: 'patient AI chat', path: '/patient/ai-chat' },
  { role: 'patient', name: 'patient messages', path: '/patient/messages' },
  { role: 'patient', name: 'patient message detail', path: '/patient/messages/00000000-0000-4000-8000-000000000701' },
  { role: 'patient', name: 'patient profile', path: '/patient/profile' },
  { role: 'patient', name: 'patient lab results', path: '/patient/lab-results' },
  { role: 'patient', name: 'patient notifications', path: '/patient/notifications' },
  { role: 'patient', name: 'patient telemedicine', path: '/patient/telemedicine/00000000-0000-4000-8000-000000000601' },
  { role: 'patient', name: 'patient settings', path: '/patient/settings' },
  { role: 'patient', name: 'patient imaging', path: '/patient/imaging' },
  { role: 'patient', name: 'patient insurance', path: '/patient/insurance' },
  { role: 'patient', name: 'patient documents', path: '/patient/documents' },
  { role: 'doctor', name: 'doctor dashboard', path: '/doctor/dashboard' },
  { role: 'doctor', name: 'doctor today', path: '/doctor/today' },
  { role: 'doctor', name: 'doctor appointments', path: '/doctor/appointments' },
  { role: 'doctor', name: 'doctor appointment detail', path: '/doctor/appointments/00000000-0000-4000-8000-000000000601' },
  { role: 'doctor', name: 'doctor patients', path: '/doctor/patients' },
  { role: 'doctor', name: 'doctor patient detail', path: '/doctor/patients/00000000-0000-4000-8000-000000000101' },
  { role: 'doctor', name: 'doctor schedule', path: '/doctor/schedule' },
  { role: 'doctor', name: 'doctor prescribe shortcut', path: '/doctor/prescribe' },
  { role: 'doctor', name: 'doctor prescriptions', path: '/doctor/prescriptions' },
  { role: 'doctor', name: 'doctor new prescription', path: '/doctor/prescriptions/new' },
  { role: 'doctor', name: 'doctor labs shortcut', path: '/doctor/labs' },
  { role: 'doctor', name: 'doctor lab orders', path: '/doctor/lab-orders' },
  { role: 'doctor', name: 'doctor new lab order', path: '/doctor/lab-orders/new' },
  { role: 'doctor', name: 'doctor messages', path: '/doctor/messages' },
  { role: 'doctor', name: 'doctor message detail', path: '/doctor/messages/00000000-0000-4000-8000-000000000701' },
  { role: 'doctor', name: 'doctor profile', path: '/doctor/profile' },
  { role: 'doctor', name: 'doctor notifications', path: '/doctor/notifications' },
  { role: 'doctor', name: 'doctor consultation workspace', path: '/doctor/consultations/00000000-0000-4000-8000-000000000601' },
  { role: 'doctor', name: 'doctor telemedicine', path: '/doctor/telemedicine/00000000-0000-4000-8000-000000000601' },
  { role: 'doctor', name: 'doctor settings', path: '/doctor/settings' },
  { role: 'doctor', name: 'doctor imaging', path: '/doctor/imaging' },
  { role: 'doctor', name: 'doctor earnings', path: '/doctor/earnings' },
  { role: 'doctor', name: 'doctor portal', path: '/doctor/portal' },
  { role: 'super_admin', name: 'admin dashboard', path: '/admin/dashboard' },
  { role: 'super_admin', name: 'admin compliance', path: '/admin/compliance' },
  { role: 'super_admin', name: 'admin patients', path: '/admin/patients' },
  { role: 'super_admin', name: 'admin doctors', path: '/admin/doctors' },
  { role: 'super_admin', name: 'admin insurance', path: '/admin/insurance' },
  { role: 'super_admin', name: 'admin integrations', path: '/admin/integrations' },
  { role: 'super_admin', name: 'admin revenue', path: '/admin/revenue' },
  { role: 'super_admin', name: 'admin NABIDH', path: '/admin/nabidh' },
  { role: 'super_admin', name: 'admin audit', path: '/admin/audit' },
  { role: 'super_admin', name: 'admin security', path: '/admin/security' },
  { role: 'super_admin', name: 'admin platform settings', path: '/admin/platform-settings' },
  { role: 'super_admin', name: 'admin system health', path: '/admin/system-health' },
  { role: 'super_admin', name: 'admin clinics', path: '/admin/clinics' },
  { role: 'super_admin', name: 'admin organizations', path: '/admin/organizations' },
  { role: 'super_admin', name: 'admin users', path: '/admin/users' },
  { role: 'super_admin', name: 'admin diagnostics', path: '/admin/diagnostics' },
  { role: 'super_admin', name: 'admin AI analytics', path: '/admin/ai-analytics' },
  { role: 'lab', name: 'lab dashboard', path: '/lab/dashboard' },
  { role: 'lab', name: 'lab referrals', path: '/lab/referrals' },
  { role: 'lab', name: 'lab queue', path: '/lab/queue' },
  { role: 'lab', name: 'lab orders', path: '/lab/orders' },
  { role: 'lab', name: 'lab results', path: '/lab/results' },
  { role: 'lab', name: 'lab result entry', path: '/lab/results/entry' },
  { role: 'lab', name: 'lab quality control', path: '/lab/qc' },
  { role: 'lab', name: 'lab radiology', path: '/lab/radiology' },
  { role: 'lab', name: 'lab imaging queue', path: '/lab/imaging/queue' },
  { role: 'lab', name: 'lab imaging orders', path: '/lab/imaging/orders' },
  { role: 'lab', name: 'lab imaging reports', path: '/lab/imaging/reports' },
  { role: 'lab', name: 'lab imaging equipment', path: '/lab/imaging/equipment' },
  { role: 'lab', name: 'lab equipment', path: '/lab/equipment' },
  { role: 'lab', name: 'lab NABIDH', path: '/lab/nabidh' },
  { role: 'lab', name: 'lab analytics', path: '/lab/analytics' },
  { role: 'lab', name: 'lab profile', path: '/lab/profile' },
  { role: 'lab', name: 'lab settings', path: '/lab/settings' },
  { role: 'pharmacy', name: 'pharmacy dashboard', path: '/pharmacy/dashboard' },
  { role: 'pharmacy', name: 'pharmacy dispensing', path: '/pharmacy/dispensing' },
  { role: 'pharmacy', name: 'pharmacy inventory', path: '/pharmacy/inventory' },
  { role: 'pharmacy', name: 'pharmacy messages', path: '/pharmacy/messages' },
  { role: 'pharmacy', name: 'pharmacy reports', path: '/pharmacy/reports' },
  { role: 'pharmacy', name: 'pharmacy revenue', path: '/pharmacy/revenue' },
  { role: 'pharmacy', name: 'pharmacy profile', path: '/pharmacy/profile' },
  { role: 'pharmacy', name: 'pharmacy settings', path: '/pharmacy/settings' },
  { role: 'insurance', name: 'insurance dashboard', path: '/insurance/dashboard' },
  { role: 'insurance', name: 'insurance pre-authorizations', path: '/insurance/pre-authorizations' },
  { role: 'insurance', name: 'insurance claims', path: '/insurance/claims' },
  { role: 'insurance', name: 'insurance members', path: '/insurance/members' },
  { role: 'insurance', name: 'insurance fraud', path: '/insurance/fraud' },
  { role: 'insurance', name: 'insurance analytics', path: '/insurance/analytics' },
  { role: 'insurance', name: 'insurance network', path: '/insurance/network' },
  { role: 'insurance', name: 'insurance reports', path: '/insurance/reports' },
  { role: 'insurance', name: 'insurance settings', path: '/insurance/settings' },
  { role: 'clinic', name: 'clinic dashboard', path: '/clinic/dashboard' },
  { role: 'clinic', name: 'clinic doctors', path: '/clinic/doctors' },
  { role: 'clinic', name: 'clinic appointments', path: '/clinic/appointments' },
  { role: 'clinic', name: 'clinic patients', path: '/clinic/patients' },
  { role: 'clinic', name: 'clinic pricing', path: '/clinic/pricing' },
  { role: 'clinic', name: 'clinic messages', path: '/clinic/messages' },
  { role: 'clinic', name: 'clinic analytics', path: '/clinic/analytics' },
  { role: 'clinic', name: 'clinic settings', path: '/clinic/settings' },
  { role: 'clinic', name: 'clinic notifications', path: '/clinic/notifications' },
];

const mobileViewports = [
  { name: 'mobile 390', width: 390, height: 844 },
  { name: 'mobile 360', width: 360, height: 740 },
];

const routeLabel = (route: RouteCase) => `${route.name} (${route.path})`;

async function preparePublicRoute(page: Page) {
  await installSupabaseMocks(page);
  await seedUnauthenticated(page);
}

async function prepareProtectedRoute(page: Page, role: E2ERole) {
  await installSupabaseMocks(page, { role });
  await seedAuthenticatedRole(page, role);
}

async function expectResponsivePage(page: Page, route: RouteCase) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error|Cannot read properties/i);

  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const main = document.querySelector('main');
    const mainRect = main?.getBoundingClientRect() ?? null;
    const visibleMainWidth = mainRect
      ? Math.max(0, Math.min(mainRect.right, viewportWidth) - Math.max(mainRect.left, 0))
      : viewportWidth;

    return {
      viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      pageScrollWidth: scrollingElement.scrollWidth,
      visibleMainWidth,
    };
  });

  const maxScrollWidth = Math.max(result.documentScrollWidth, result.bodyScrollWidth, result.pageScrollWidth);
  const minimumUsableMainWidth = Math.min(320, result.viewportWidth - 32);

  expect(
    maxScrollWidth,
    `${routeLabel(route)} should not create page-level horizontal scrolling`
  ).toBeLessThanOrEqual(result.viewportWidth + 2);

  expect(
    result.visibleMainWidth,
    `${routeLabel(route)} should leave a usable main content width on mobile`
  ).toBeGreaterThanOrEqual(minimumUsableMainWidth);
}

test.describe('responsive route audit', () => {
  for (const viewport of mobileViewports) {
    test(`public and auth routes stay usable at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of [...publicRoutes, ...authRoutes]) {
        await preparePublicRoute(page);
        await page.goto(route.path);
        await expectResponsivePage(page, route);
      }
    });

    for (const role of ['patient', 'doctor', 'super_admin', 'lab', 'pharmacy', 'insurance', 'clinic'] as const) {
      test(`${role} routes stay usable at ${viewport.name}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        for (const route of protectedRoutes.filter((candidate) => candidate.role === role)) {
          await prepareProtectedRoute(page, role);
          await page.goto(route.path);
          await expectResponsivePage(page, route);
        }
      });
    }
  }
});
