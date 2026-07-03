import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  installSupabaseMocks,
  seedAuthenticatedRole,
  seedUnauthenticated,
  type E2ERole,
} from './support/supabase-mock';

interface ViewportCase {
  name: string;
  width: number;
  height: number;
}

const auditViewports: ViewportCase[] = [
  { name: 'mobile 390', width: 390, height: 844 },
  { name: 'mobile 360', width: 360, height: 740 },
  { name: 'tablet 768', width: 768, height: 1024 },
];

const runtimeErrorPattern = /Application error|Unhandled Runtime Error|Cannot read properties|is not a function/i;

const routePattern = (path: string) =>
  new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`);

async function preparePublicPage(page: Page, path: string) {
  await installSupabaseMocks(page);
  await seedUnauthenticated(page);
  await page.goto(path);
}

async function prepareRolePage(page: Page, role: E2ERole, path: string) {
  await installSupabaseMocks(page, { role });
  await seedAuthenticatedRole(page, role);
  await page.goto(path);
  await expect(page).toHaveURL(routePattern(path));
}

async function expectResponsiveState(page: Page, label: string) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body'), `${label} should not render runtime errors`).not.toContainText(runtimeErrorPattern);

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

  expect(maxScrollWidth, `${label} should not create page-level horizontal scrolling`).toBeLessThanOrEqual(
    result.viewportWidth + 2
  );
  expect(result.visibleMainWidth, `${label} should keep usable main content visible`).toBeGreaterThanOrEqual(
    minimumUsableMainWidth
  );
}

async function firstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }
  return null;
}

async function clickIfVisible(locator: Locator): Promise<boolean> {
  const candidate = await firstVisible(locator);
  if (!candidate) {
    return false;
  }
  await candidate.click();
  return true;
}

async function fillIfVisible(locator: Locator, value: string): Promise<boolean> {
  const candidate = await firstVisible(locator);
  if (!candidate) {
    return false;
  }
  await candidate.fill(value);
  return true;
}

async function selectIfVisible(locator: Locator, options: { label?: RegExp | string; value?: string }): Promise<boolean> {
  const candidate = await firstVisible(locator);
  if (!candidate) {
    return false;
  }

  if (options.value) {
    await candidate.selectOption(options.value);
    return true;
  }

  if (options.label) {
    const values = await candidate.locator('option').evaluateAll((optionsList, labelSource) => {
      const label =
        typeof labelSource === 'string'
          ? new RegExp(labelSource, 'i')
          : new RegExp((labelSource as { source: string }).source, 'i');
      const match = optionsList.find((option) => label.test(option.textContent ?? ''));
      return match instanceof HTMLOptionElement ? [match.value] : [];
    }, typeof options.label === 'string' ? options.label : { source: options.label.source });

    if (values[0]) {
      await candidate.selectOption(values[0]);
      return true;
    }
  }

  return false;
}

async function checkAfter(page: Page, label: string, action: () => Promise<void>) {
  await action();
  await page.waitForTimeout(100);
  await expectResponsiveState(page, label);
}

async function closeTransientSurface(page: Page) {
  if (await clickIfVisible(page.getByRole('button', { name: /^close$/i }).first())) {
    return;
  }
  if (await clickIfVisible(page.getByRole('button', { name: /cancel|keep appointment/i }).first())) {
    return;
  }
  await page.keyboard.press('Escape').catch(() => undefined);
}

test.describe('responsive interaction audit', () => {
  for (const viewport of auditViewports) {
    test.describe(`${viewport.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('public and auth interactions stay usable', async ({ page }) => {
        test.setTimeout(90_000);

        await preparePublicPage(page, '/find-doctor');
        await expectResponsiveState(page, 'find-doctor initial');
        await checkAfter(page, 'find-doctor search', async () => {
          await fillIfVisible(page.getByPlaceholder(/name, specialty, or city|specialty|doctor/i), 'Omar');
        });

        await preparePublicPage(page, '/find-clinic');
        await checkAfter(page, 'find-clinic cards', async () => {
          await clickIfVisible(page.getByRole('button', { name: /view doctors/i }).first());
        });

        await preparePublicPage(page, '/ai-chat');
        await checkAfter(page, 'public AI composer filled', async () => {
          await fillIfVisible(page.getByPlaceholder(/ask me anything about your health/i), 'Mild headache for two days');
        });

        await preparePublicPage(page, '/auth/login');
        await checkAfter(page, 'login role preset', async () => {
          await fillIfVisible(page.locator('input[type="email"]').first(), 'patient.e2e@ceenaix.test');
          await fillIfVisible(page.locator('input[type="password"]').first(), 'CorrectHorseBatteryStaple1!');
        });

        await preparePublicPage(page, '/auth/register');
        await checkAfter(page, 'register role controls', async () => {
          await clickIfVisible(page.getByRole('button', { name: /patient/i }).first());
        });
      });

      test('patient portal interactions stay usable', async ({ page }) => {
        test.setTimeout(120_000);

        await prepareRolePage(page, 'patient', '/patient/appointments');
        await checkAfter(page, 'patient appointment tabs', async () => {
          await clickIfVisible(page.getByRole('button', { name: /cancelled|past|upcoming/i }).first());
        });

        await prepareRolePage(page, 'patient', '/patient/records');
        await checkAfter(page, 'patient records add form', async () => {
          await clickIfVisible(page.getByRole('button', { name: /add condition/i }).first());
          await fillIfVisible(page.locator('input[type="text"]').first(), 'Responsive audit condition');
        });

        await prepareRolePage(page, 'patient', '/patient/lab-results');
        await checkAfter(page, 'patient lab result tabs', async () => {
          await clickIfVisible(page.getByRole('button', { name: /upcoming/i }).first());
        });
        await checkAfter(page, 'patient lab reports share modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /reports/i }).first());
          await clickIfVisible(page.getByRole('button', { name: /share/i }).first());
          await clickIfVisible(page.getByRole('button', { name: /whatsapp/i }).first());
        });
        await closeTransientSurface(page);

        await prepareRolePage(page, 'patient', '/patient/messages');
        await checkAfter(page, 'patient message composer', async () => {
          await clickIfVisible(page.getByText(/care coordination/i).first());
          await fillIfVisible(page.getByPlaceholder(/type|message|write/i).first(), 'Responsive audit note');
        });

        await prepareRolePage(page, 'patient', '/patient/settings');
        await checkAfter(page, 'patient settings tabs', async () => {
          await clickIfVisible(page.getByRole('button', { name: /security/i }).first());
        });
      });

      test('doctor portal interactions stay usable', async ({ page }) => {
        test.setTimeout(120_000);

        await prepareRolePage(page, 'doctor', '/doctor/appointments');
        await checkAfter(page, 'doctor appointments list tab', async () => {
          await clickIfVisible(page.getByRole('button', { name: /list/i }).first());
          await fillIfVisible(page.getByPlaceholder(/search/i).first(), 'Aisha');
        });
        await checkAfter(page, 'doctor appointments pending tab', async () => {
          await clickIfVisible(page.getByRole('button', { name: /pending|requests/i }).first());
        });

        await prepareRolePage(page, 'doctor', '/doctor/appointments/00000000-0000-4000-8000-000000000601');
        await checkAfter(page, 'doctor appointment scribe tab', async () => {
          await clickIfVisible(page.getByRole('button', { name: /scribe/i }).first());
        });
        await checkAfter(page, 'doctor appointment cancel modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /^cancel appointment$/i }).first());
        });
        await closeTransientSurface(page);

        await prepareRolePage(page, 'doctor', '/doctor/prescriptions/new');
        await checkAfter(page, 'doctor prescription medication search', async () => {
          await fillIfVisible(page.getByPlaceholder(/search medications|search by medication|search/i).first(), 'met');
        });

        await prepareRolePage(page, 'doctor', '/doctor/lab-orders/new');
        await checkAfter(page, 'doctor lab order test search', async () => {
          await fillIfVisible(page.getByPlaceholder(/search by test name/i).first(), 'Complete');
          await clickIfVisible(page.getByRole('button', { name: /complete blood count/i }).first());
        });
      });

      test('admin interactions stay usable', async ({ page }) => {
        test.setTimeout(120_000);

        await prepareRolePage(page, 'super_admin', '/admin/patients');
        await checkAfter(page, 'admin patient filters', async () => {
          await fillIfVisible(page.getByPlaceholder(/search by name|search/i).first(), 'Aisha');
          await clickIfVisible(page.getByRole('button', { name: /flagged|active/i }).first());
        });

        await prepareRolePage(page, 'super_admin', '/admin/doctors');
        await checkAfter(page, 'admin doctor filters', async () => {
          await fillIfVisible(page.getByPlaceholder(/dha license|specialty|search/i).first(), 'Omar');
          await clickIfVisible(page.getByRole('button', { name: /pending|flagged/i }).first());
        });

        await prepareRolePage(page, 'super_admin', '/admin/organizations');
        await checkAfter(page, 'admin organization modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /onboard lab/i }).first());
        });
        await closeTransientSurface(page);

        await prepareRolePage(page, 'super_admin', '/admin/insurance');
        await checkAfter(page, 'admin insurance tabs', async () => {
          await clickIfVisible(page.getByRole('button', { name: /premium|api issues|fraud/i }).first());
        });
      });

      test('lab interactions stay usable', async ({ page }) => {
        test.setTimeout(90_000);

        await prepareRolePage(page, 'lab', '/lab/dashboard');
        await checkAfter(page, 'lab mobile navigation', async () => {
          await clickIfVisible(page.getByRole('button', { name: /queue|orders|results/i }).first());
        });

        await prepareRolePage(page, 'lab', '/lab/results/entry');
        await checkAfter(page, 'lab result entry queue link', async () => {
          await clickIfVisible(page.getByRole('link', { name: /queue|worklist|dashboard/i }).first());
        });

        await prepareRolePage(page, 'lab', '/lab/radiology');
        await expectResponsiveState(page, 'lab radiology responsive cards');
      });

      test('pharmacy interactions stay usable', async ({ page }) => {
        test.setTimeout(90_000);

        await prepareRolePage(page, 'pharmacy', '/pharmacy/dispensing');
        await checkAfter(page, 'pharmacy queue search', async () => {
          await fillIfVisible(page.getByPlaceholder(/patient name|rx number|doctor/i), 'Aisha');
        });
        await checkAfter(page, 'pharmacy sort menu', async () => {
          await clickIfVisible(page.getByRole('button', { name: /sort:/i }).first());
        });
        await checkAfter(page, 'pharmacy hold modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /hold/i }).first());
        });
        await closeTransientSurface(page);
      });

      test('insurance interactions stay usable', async ({ page }) => {
        test.setTimeout(90_000);

        await prepareRolePage(page, 'insurance', '/insurance/dashboard');
        await checkAfter(page, 'insurance dashboard alert CTA', async () => {
          await clickIfVisible(page.getByRole('button', { name: /review urgent case|review now|pending pre-authorizations/i }).first());
        });

        await prepareRolePage(page, 'insurance', '/insurance/preauth');
        await checkAfter(page, 'insurance preauth filters', async () => {
          await clickIfVisible(page.getByRole('button', { name: /urgent/i }).first());
          await clickIfVisible(page.getByRole('button', { name: /ai: review|review/i }).first());
        });

        await prepareRolePage(page, 'insurance', '/insurance/reports');
        await checkAfter(page, 'insurance report chart mode', async () => {
          await clickIfVisible(page.getByRole('button', { name: /volume|value|both/i }).first());
        });
      });

      test('clinic interactions stay usable', async ({ page }) => {
        test.setTimeout(120_000);

        await prepareRolePage(page, 'clinic', '/clinic/doctors');
        await checkAfter(page, 'clinic invite doctor modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /add doctor/i }).first());
          await fillIfVisible(page.getByPlaceholder(/search doctor by name/i), 'Omar');
        });
        await closeTransientSurface(page);

        await prepareRolePage(page, 'clinic', '/clinic/appointments');
        await checkAfter(page, 'clinic appointment filters', async () => {
          await fillIfVisible(page.getByPlaceholder(/search patient, doctor, type/i), 'Aisha');
          await clickIfVisible(page.getByRole('button', { name: /^all$/i }).first());
          await selectIfVisible(page.locator('select').first(), { label: /scheduled|confirmed|all/i });
        });
        await checkAfter(page, 'clinic book appointment modal', async () => {
          await clickIfVisible(page.getByRole('button', { name: /book appointment/i }).first());
        });
        await closeTransientSurface(page);

        await prepareRolePage(page, 'clinic', '/clinic/pricing');
        await checkAfter(page, 'clinic pricing controls', async () => {
          await clickIfVisible(page.getByRole('button', { name: /add service|all|consultation/i }).first());
        });
      });
    });
  }
});
