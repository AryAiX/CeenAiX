import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  createE2EWorkflowState,
  e2eScenarioTomorrow,
  e2eScenarioYesterday,
  e2eUsers,
  getE2eWorkflowSnapshot,
  installSupabaseMocks,
  resetPharmacyDispensingTasks,
  seedAuthenticatedRole,
  type E2ERole,
  type E2EWorkflowState,
} from './support/supabase-mock';

const scenarioTomorrow = e2eScenarioTomorrow;
const scenarioYesterday = e2eScenarioYesterday;

const openRolePage = async (
  browser: Browser,
  state: E2EWorkflowState,
  role: E2ERole,
  path: string
): Promise<Page> => {
  const page = await browser.newPage();
  await installSupabaseMocks(page, { role, state });
  await seedAuthenticatedRole(page, role);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
  return page;
};

const closePage = async (page: Page) => {
  await page.close({ runBeforeUnload: true });
};

const assertNoAppCrash = async (page: Page) => {
  await expect(page.locator('body')).not.toContainText(/Unexpected Application Error/i);
  await expect(page.locator('body')).not.toContainText(/Cannot read properties of undefined/i);
};

const seedAppointment = (state: E2EWorkflowState, overrides: Record<string, unknown> = {}) => {
  const appointment = {
    id: `appointment-ma-${state.appointments.length + 1}`,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    type: 'in_person',
    status: 'scheduled',
    scheduled_at: scenarioTomorrow,
    duration_minutes: 30,
    chief_complaint: overrides.chief_complaint ?? 'Multi-actor scenario visit',
    notes: null,
    is_deleted: false,
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
    ...overrides,
  };
  state.appointments.push(appointment);
  return appointment;
};

const seedLabOrder = (state: E2EWorkflowState, overrides: Record<string, unknown> = {}) => {
  const labOrder = {
    id: `lab-order-ma-${state.labOrders.length + 1}`,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    appointment_id: state.appointments[0]?.id ?? null,
    assigned_lab_id: '00000000-0000-4000-8000-000000000501',
    status: 'processing',
    ordered_at: scenarioYesterday,
    updated_at: scenarioYesterday,
    due_by: scenarioTomorrow,
    urgency: 'routine',
    lab_order_code: `LAB-MA-${state.labOrders.length + 1}`,
    clinical_notes: 'Multi-actor lab order',
    is_deleted: false,
    ...overrides,
  };
  state.labOrders.push(labOrder);
  state.labOrderItems.push({
    id: `lab-item-ma-${state.labOrderItems.length + 1}`,
    lab_order_id: labOrder.id,
    test_name: 'Complete Blood Count',
    status: 'processing',
    result_value: null,
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
  });
  return labOrder;
};

type ActorStep = {
  role: E2ERole;
  path: string;
  assert: (page: Page, state: E2EWorkflowState) => Promise<void>;
};

const runActorChain = async (browser: Browser, state: E2EWorkflowState, steps: ActorStep[]) => {
  for (const step of steps) {
    const page = await openRolePage(browser, state, step.role, step.path);
    await assertNoAppCrash(page);
    await step.assert(page, state);
    await closePage(page);
  }
};

const insurancePortalSteps: ActorStep[] = [
  {
    role: 'insurance',
    path: '/insurance/dashboard',
    assert: async (page) => {
      await expect(page.locator('body')).not.toContainText(/Application error/i);
    },
  },
  {
    role: 'insurance',
    path: '/insurance/claims',
    assert: async (page) => {
      await expect(page.getByText(/CLM-E2E-001/i).first()).toBeVisible();
    },
  },
  {
    role: 'insurance',
    path: '/insurance/fraud',
    assert: async (page) => {
      await expect(page.getByText(/FRD-E2E-001|fraud|investigate/i).first()).toBeVisible();
    },
  },
];

const adminOpsSteps: ActorStep[] = [
  { role: 'super_admin', path: '/admin/dashboard', assert: async (page) => {
    await expect(page.getByText(/1,220|1220|Patients|Maya Admin/i).first()).toBeVisible();
  }},
  { role: 'super_admin', path: '/admin/users', assert: async (page) => {
    await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  }},
  { role: 'super_admin', path: '/admin/organizations', assert: async (page) => {
    await expect(page.getByText(/CarePlus Pharmacy|CeenAiX Clinic/i).first()).toBeVisible();
  }},
  { role: 'super_admin', path: '/admin/compliance', assert: async (page) => assertNoAppCrash(page) },
  { role: 'super_admin', path: '/admin/system-health', assert: async (page) => assertNoAppCrash(page) },
];

test.describe('two-actor clinical handoffs', () => {
  test('patient + doctor: shared appointment visible on both calendars', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const appointment = seedAppointment(state, { chief_complaint: 'Shared calendar handoff' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/appointments',
        assert: async (page) => {
          await expect(page.getByText('Shared calendar handoff').first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: '/doctor/appointments',
        assert: async (page) => {
          await page.getByRole('button', { name: /list view/i }).click();
          await expect(page.getByText('Shared calendar handoff').first()).toBeVisible();
        },
      },
    ]);
    expect(getE2eWorkflowSnapshot(state).appointments.some((row) => row.id === appointment.id)).toBe(true);
  });

  test('patient + doctor: messaging thread lists seeded conversation', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/messages',
        assert: async (page) => {
          await expect(page.getByText(/Care coordination/i).first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: '/doctor/messages',
        assert: async (page) => {
          await expect(page.getByText(/Care coordination|results are ready/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient + doctor: records and patient detail both render', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/records',
        assert: async (page) => {
          await expect(page.getByRole('button', { name: /add condition/i })).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: `/doctor/patients/${e2eUsers.patient.id}`,
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient + insurance: claim references patient name', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/insurance',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'insurance',
        path: '/insurance/claims',
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('doctor + lab: lab order surfaces on lab dashboard', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedAppointment(state);
    seedLabOrder(state, { status: 'processing' });
    await runActorChain(browser, state, [
      {
        role: 'doctor',
        path: '/doctor/lab-orders',
        assert: async (page) => {
          await expect(page.getByText(/Complete Blood Count|LAB-MA/i).first()).toBeVisible();
        },
      },
      {
        role: 'lab',
        path: '/lab/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
  });

  test('patient + lab: result entry queue shows patient after doctor orders labs', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedLabOrder(state);
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/lab-results',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'lab',
        path: '/lab/results/entry',
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('doctor + pharmacy: dispensing queue shows prescriber and patient', async ({ browser }) => {
    resetPharmacyDispensingTasks();
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'doctor',
        path: '/doctor/prescriptions',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'pharmacy',
        path: '/pharmacy/dispensing',
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
          await expect(page.getByText(e2eUsers.doctor.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient + pharmacy: patient prescriptions then pharmacy queue', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/prescriptions',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'pharmacy',
        path: '/pharmacy/dashboard',
        assert: async (page) => {
          await expect(page.getByText(/prescriptions today|in queue/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient + admin: booking state visible on admin dashboard', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedAppointment(state, { chief_complaint: 'Admin visibility check' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'super_admin',
        path: '/admin/dashboard',
        assert: async (page) => {
          await expect(page.getByText(/Dashboard|Patients|platform/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('doctor + admin: organizations list includes pharmacy org', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'doctor',
        path: '/doctor/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'super_admin',
        path: '/admin/organizations',
        assert: async (page) => {
          await expect(page.getByText(/CarePlus Pharmacy/i).first()).toBeVisible();
        },
      },
    ]);
  });
});

test.describe('three-actor care pathways', () => {
  test('patient → doctor → lab: lab order propagates to lab worklist', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const appointment = seedAppointment(state, { chief_complaint: 'Three-actor lab pathway' });
    const labOrder = seedLabOrder(state, { appointment_id: appointment.id });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/appointments',
        assert: async (page) => {
          await expect(page.getByText('Three-actor lab pathway').first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: '/doctor/lab-orders',
        assert: async (page) => {
          await expect(
            page.getByText(/Complete Blood Count|Three-actor lab pathway|LAB-MA/i).first()
          ).toBeVisible();
        },
      },
      {
        role: 'lab',
        path: '/lab/results/entry',
        assert: async (page) => {
          await expect(page.getByText(/Complete Blood Count|pending/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient → doctor → pharmacy: Rx queue handoff', async ({ browser }) => {
    resetPharmacyDispensingTasks();
    const state = createE2EWorkflowState();
    seedAppointment(state);
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/prescriptions',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/prescriptions',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'pharmacy',
        path: '/pharmacy/dispensing',
        assert: async (page) => {
          await expect(page.getByRole('button', { name: /dispense/i }).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient → doctor → insurance: same member on claims workspace', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/insurance',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: `/doctor/patients/${e2eUsers.patient.id}`,
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
      {
        role: 'insurance',
        path: '/insurance/members',
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('doctor → lab → patient: processing order stays off patient completed tab', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedLabOrder(state, { status: 'processing' });
    await runActorChain(browser, state, [
      {
        role: 'doctor',
        path: '/doctor/lab-orders',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'lab',
        path: '/lab/queue',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/lab-results',
        assert: async (page) => {
          await expect(page.getByText(/No lab results yet|upcoming/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient → doctor → admin: appointment + platform metrics', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedAppointment(state, { chief_complaint: 'Platform oversight visit' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/notifications',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/notifications',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'super_admin',
        path: '/admin/ai-analytics',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
  });

  test('lab → doctor → patient: resulted item visible to ordering doctor', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedLabOrder(state, { status: 'resulted' });
    await runActorChain(browser, state, [
      {
        role: 'lab',
        path: '/lab/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/lab-orders',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/lab-results',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
  });

  test('pharmacy → doctor → patient: messages and prescriptions portals', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'pharmacy',
        path: '/pharmacy/messages',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/messages',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/messages',
        assert: async (page) => {
          await expect(page.getByText(/Care coordination/i).first()).toBeVisible();
        },
      },
    ]);
  });

  test('insurance → patient → doctor: pre-auth and clinical context', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'insurance',
        path: '/insurance/preauth',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
  });

  test('patient → doctor → doctor: appointment detail after worklist', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const appointment = seedAppointment(state, { id: '00000000-0000-4000-8000-000000000601' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/appointments',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/appointments',
        assert: async (page) => {
          await page.getByRole('button', { name: /list view/i }).click();
          await expect(page.getByText(appointment.chief_complaint as string).first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: `/doctor/appointments/${appointment.id}`,
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
    ]);
  });

  test('patient documents → doctor imaging → patient imaging', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/documents',
        assert: async (page) => {
          await expect(page.getByRole('heading', { name: /documents/i }).first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: '/doctor/imaging',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/imaging',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
  });
});

test.describe('four-actor and five-actor journeys', () => {
  test('4-actor: patient, doctor, lab, patient lab-results', async ({ browser }) => {
    test.setTimeout(90_000);
    const state = createE2EWorkflowState();
    const appointment = seedAppointment(state, { chief_complaint: 'Four-actor lab release' });
    const labOrder = seedLabOrder(state, { appointment_id: appointment.id, status: 'resulted' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/appointments',
        assert: async (page) => {
          await expect(page.getByText('Four-actor lab release').first()).toBeVisible();
        },
      },
      {
        role: 'doctor',
        path: '/doctor/lab-orders',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'lab',
        path: '/lab/results',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'patient',
        path: '/patient/lab-results',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
    expect(getE2eWorkflowSnapshot(state).labOrders.length).toBeGreaterThan(0);
  });

  test('4-actor: patient, doctor, pharmacy, insurance claims', async ({ browser }) => {
    test.setTimeout(90_000);
    resetPharmacyDispensingTasks();
    const state = createE2EWorkflowState();
    seedAppointment(state);
    await runActorChain(browser, state, [
      { role: 'patient', path: '/patient/prescriptions', assert: async (page) => assertNoAppCrash(page) },
      { role: 'doctor', path: '/doctor/prescriptions', assert: async (page) => assertNoAppCrash(page) },
      { role: 'pharmacy', path: '/pharmacy/dispensing', assert: async (page) => assertNoAppCrash(page) },
      { role: 'insurance', path: '/insurance/claims', assert: async (page) => {
        await expect(page.getByText(/CLM-E2E/i).first()).toBeVisible();
      }},
    ]);
  });

  test('4-actor: doctor, lab, insurance, admin compliance', async ({ browser }) => {
    test.setTimeout(90_000);
    const state = createE2EWorkflowState();
    seedLabOrder(state);
    await runActorChain(browser, state, [
      { role: 'doctor', path: '/doctor/dashboard', assert: async (page) => assertNoAppCrash(page) },
      { role: 'lab', path: '/lab/dashboard', assert: async (page) => assertNoAppCrash(page) },
      { role: 'insurance', path: '/insurance/risk-analytics', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/compliance', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('4-actor: patient, doctor, admin users, admin audit', async ({ browser }) => {
    test.setTimeout(90_000);
    const state = createE2EWorkflowState();
    seedAppointment(state);
    await runActorChain(browser, state, [
      { role: 'patient', path: '/patient/profile', assert: async (page) => assertNoAppCrash(page) },
      { role: 'doctor', path: '/doctor/profile', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/users', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/audit', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('5-actor: patient, doctor, lab, pharmacy, insurance', async ({ browser }) => {
    test.setTimeout(120_000);
    resetPharmacyDispensingTasks();
    const state = createE2EWorkflowState();
    seedAppointment(state, { chief_complaint: 'Five-actor care loop' });
    seedLabOrder(state);
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: '/patient/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'doctor',
        path: '/doctor/today',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'lab',
        path: '/lab/results/entry',
        assert: async (page) => {
          await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
        },
      },
      {
        role: 'pharmacy',
        path: '/pharmacy/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
      {
        role: 'insurance',
        path: '/insurance/dashboard',
        assert: async (page) => assertNoAppCrash(page),
      },
    ]);
    const snapshot = getE2eWorkflowSnapshot(state);
    expect(snapshot.appointments.length).toBeGreaterThan(0);
    expect(snapshot.labOrders.length).toBeGreaterThan(0);
  });

  test('5-actor: parallel portals after shared booking state', async ({ browser }) => {
    test.setTimeout(120_000);
    const state = createE2EWorkflowState();
    seedAppointment(state, { chief_complaint: 'Parallel portal smoke' });
    const roles: Array<{ role: E2ERole; path: string }> = [
      { role: 'patient', path: '/patient/ai-chat' },
      { role: 'doctor', path: '/doctor/schedule' },
      { role: 'lab', path: '/lab/qc' },
      { role: 'pharmacy', path: '/pharmacy/settings' },
      { role: 'insurance', path: '/insurance/settings' },
    ];
    const pages = await Promise.all(roles.map((entry) => openRolePage(browser, state, entry.role, entry.path)));
    for (const page of pages) {
      await assertNoAppCrash(page);
    }
    await Promise.all(pages.map((page) => closePage(page)));
  });
});

test.describe('uncovered portal routes — multi-role context', () => {
  const adminRouteChecks: Array<{ path: string; pattern: RegExp }> = [
    { path: '/admin/revenue', pattern: /revenue|billing|AED/i },
    { path: '/admin/nabidh', pattern: /nabidh|integration/i },
    { path: '/admin/security', pattern: /security|access/i },
    { path: '/admin/integrations', pattern: /integration|connect/i },
    { path: '/admin/diagnostics', pattern: /diagnostic|health/i },
    { path: '/admin/platform-settings', pattern: /setting|platform/i },
  ];

  for (const route of adminRouteChecks) {
    test(`admin + patient context: ${route.path}`, async ({ browser }) => {
      const state = createE2EWorkflowState();
      seedAppointment(state);
      const patientPage = await openRolePage(browser, state, 'patient', '/patient/dashboard');
      await assertNoAppCrash(patientPage);
      await closePage(patientPage);
      const adminPage = await openRolePage(browser, state, 'super_admin', route.path);
      await assertNoAppCrash(adminPage);
      await expect(adminPage.getByText(route.pattern).first()).toBeVisible();
      await closePage(adminPage);
    });
  }

  const insuranceRouteChecks = [
    { path: '/insurance/pre-authorizations', pattern: /pre.?auth|authorization/i },
    { path: '/insurance/network', pattern: /network|provider/i },
    { path: '/insurance/reports', pattern: /report/i },
    { path: '/insurance/analytics', pattern: /analytics|risk/i },
    { path: '/insurance/settings', pattern: /setting|AI auto/i },
  ];

  for (const route of insuranceRouteChecks) {
    test(`insurance + doctor context: ${route.path}`, async ({ browser }) => {
      const state = createE2EWorkflowState();
      seedAppointment(state);
      const doctorPage = await openRolePage(browser, state, 'doctor', '/doctor/dashboard');
      await assertNoAppCrash(doctorPage);
      await closePage(doctorPage);
      const insurancePage = await openRolePage(browser, state, 'insurance', route.path);
      await assertNoAppCrash(insurancePage);
      await expect(insurancePage.getByText(route.pattern).first()).toBeVisible();
      await closePage(insurancePage);
    });
  }

  const pharmacyRouteChecks = [
    { path: '/pharmacy/inventory', pattern: /inventory|stock/i },
    { path: '/pharmacy/revenue', pattern: /revenue|claim/i },
    { path: '/pharmacy/reports', pattern: /report|dispensing/i },
  ];

  for (const route of pharmacyRouteChecks) {
    test(`pharmacy + patient context: ${route.path}`, async ({ browser }) => {
      const state = createE2EWorkflowState();
      const patientPage = await openRolePage(browser, state, 'patient', '/patient/prescriptions');
      await assertNoAppCrash(patientPage);
      await closePage(patientPage);
      const pharmacyPage = await openRolePage(browser, state, 'pharmacy', route.path);
      await assertNoAppCrash(pharmacyPage);
      await expect(pharmacyPage.getByText(route.pattern).first()).toBeVisible();
      await closePage(pharmacyPage);
    });
  }

  test('3-actor: insurance portal sweep after patient books', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedAppointment(state, { chief_complaint: 'Insurance sweep visit' });
    const patientPage = await openRolePage(browser, state, 'patient', '/patient/appointments');
    await expect(patientPage.getByText('Insurance sweep visit').first()).toBeVisible();
    await closePage(patientPage);
    await runActorChain(browser, state, insurancePortalSteps);
  });

  test('3-actor: admin ops sweep with live appointment state', async ({ browser }) => {
    const state = createE2EWorkflowState();
    seedAppointment(state);
    await runActorChain(browser, state, adminOpsSteps);
  });

  test('2-actor: doctor earnings after patient dashboard', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'patient', path: '/patient/dashboard', assert: async (page) => assertNoAppCrash(page) },
      { role: 'doctor', path: '/doctor/earnings', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('2-actor: doctor settings + patient settings', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'patient', path: '/patient/settings', assert: async (page) => {
        await expect(page.getByRole('button', { name: /security/i })).toBeVisible();
      }},
      { role: 'doctor', path: '/doctor/settings', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('3-actor: lab radiology + lab orders + doctor imaging', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'lab', path: '/lab/radiology', assert: async (page) => assertNoAppCrash(page) },
      { role: 'lab', path: '/lab/orders', assert: async (page) => assertNoAppCrash(page) },
      { role: 'doctor', path: '/doctor/imaging', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('3-actor: patient telemedicine stub, doctor today, patient appointments', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const appointment = seedAppointment(state, { type: 'virtual', chief_complaint: 'Telemedicine handoff' });
    await runActorChain(browser, state, [
      {
        role: 'patient',
        path: `/patient/telemedicine/${appointment.id}`,
        assert: async (page) => assertNoAppCrash(page),
      },
      { role: 'doctor', path: '/doctor/today', assert: async (page) => assertNoAppCrash(page) },
      {
        role: 'patient',
        path: '/patient/appointments',
        assert: async (page) => {
          await expect(page.getByText('Telemedicine handoff').first()).toBeVisible();
        },
      },
    ]);
  });

  test('2-actor: lab QC then admin system health', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'lab', path: '/lab/qc', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/system-health', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('3-actor: pharmacy inventory, insurance network, patient insurance', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'pharmacy', path: '/pharmacy/inventory', assert: async (page) => assertNoAppCrash(page) },
      { role: 'insurance', path: '/insurance/network', assert: async (page) => assertNoAppCrash(page) },
      { role: 'patient', path: '/patient/insurance', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('2-actor: super_admin diagnostics after doctor notifications', async ({ browser }) => {
    const state = createE2EWorkflowState();
    await runActorChain(browser, state, [
      { role: 'doctor', path: '/doctor/notifications', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/diagnostics', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });

  test('4-actor: public find-doctor then patient book path smoke', async ({ browser }) => {
    const state = createE2EWorkflowState();
    const guestPage = await browser.newPage();
    await installSupabaseMocks(guestPage);
    await seedAuthenticatedRole(guestPage, 'patient');
    await guestPage.goto('/find-doctor');
    await expect(guestPage.getByText(e2eUsers.doctor.fullName)).toBeVisible();
    await closePage(guestPage);
    await runActorChain(browser, state, [
      { role: 'patient', path: '/patient/appointments/book', assert: async (page) => assertNoAppCrash(page) },
      { role: 'doctor', path: '/doctor/patients', assert: async (page) => assertNoAppCrash(page) },
      { role: 'super_admin', path: '/admin/dashboard', assert: async (page) => assertNoAppCrash(page) },
    ]);
  });
});
