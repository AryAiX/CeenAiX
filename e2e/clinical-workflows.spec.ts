import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  createE2EWorkflowState,
  e2eUsers,
  e2eScenarioTomorrow,
  e2eScenarioYesterday,
  installSupabaseMocks,
  seedAuthenticatedRole,
  workflowIds,
  type E2ERole,
  type E2EWorkflowState,
} from './support/supabase-mock';

const openRolePage = async (
  browser: Browser,
  state: E2EWorkflowState,
  role: E2ERole,
  path: string
) => {
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

const scenarioTomorrow = e2eScenarioTomorrow;
const scenarioYesterday = e2eScenarioYesterday;

// The mocked doctor exposes Monday availability only. Compute the very next
// Monday from the wall clock so date-driven assertions in the booking flow do
// not rot as the calendar advances past hardcoded fixtures.
const nextMondayDate = (() => {
  const today = new Date();
  const offset = ((1 - today.getDay() + 7) % 7) || 7;
  const result = new Date(today);
  result.setDate(today.getDate() + offset);
  return result;
})();
const nextMondayDay = String(nextMondayDate.getDate());
const nextMondayRescheduleIso = (() => {
  const slot = new Date(nextMondayDate);
  slot.setHours(9, 0, 0, 0);
  return slot.toISOString();
})();

const seedAppointment = (
  state: E2EWorkflowState,
  overrides: Record<string, unknown> = {}
) => {
  const appointment = {
    id: `appointment-scenario-${state.appointments.length + 1}`,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    type: 'in_person',
    status: 'scheduled',
    scheduled_at: scenarioTomorrow,
    duration_minutes: 30,
    chief_complaint: 'Scenario appointment',
    notes: null,
    is_deleted: false,
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
    ...overrides,
  };
  state.appointments.push(appointment);
  return appointment;
};

const seedPreVisit = (
  state: E2EWorkflowState,
  appointmentId: unknown,
  status = 'completed'
) => {
  const assessment = {
    id: `assessment-scenario-${state.preVisitAssessments.length + 1}`,
    appointment_id: appointmentId,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    template_id: 'template-scenario',
    template_title: 'Scenario pre-visit questionnaire',
    template_snapshot: { title: 'Scenario pre-visit questionnaire', questions: [] },
    status,
    due_at: scenarioTomorrow,
    started_at: scenarioYesterday,
    completed_at: status === 'completed' ? scenarioYesterday : null,
    reviewed_at: null,
    last_answered_at: scenarioYesterday,
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
  };
  state.preVisitAssessments.push(assessment);
  state.preVisitSummaries.push({
    assessment_id: assessment.id,
    appointment_id: appointmentId,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    summary_text: 'Scenario AI summary: patient reports worsening headaches before the visit.',
    key_points: ['Worsening headaches'],
    risk_flags: [],
    pending_questions: [],
    generated_by: 'ai',
    generated_at: scenarioYesterday,
  });
  return assessment;
};

const seedLabOrder = (
  state: E2EWorkflowState,
  overrides: Record<string, unknown> = {},
  itemOverrides: Record<string, unknown> = {}
) => {
  const labOrder = {
    id: `lab-order-scenario-${state.labOrders.length + 1}`,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    assigned_lab_id: '00000000-0000-4000-8000-000000000501',
    status: 'ordered',
    ordered_at: scenarioYesterday,
    updated_at: scenarioYesterday,
    due_by: scenarioTomorrow,
    urgency: 'routine',
    lab_order_code: `LAB-SCENARIO-${state.labOrders.length + 1}`,
    nabidh_reference: null,
    total_cost_aed: 120,
    insurance_coverage_aed: 90,
    patient_cost_aed: 30,
    is_deleted: false,
    ...overrides,
  };
  const item = {
    id: `lab-item-scenario-${state.labOrderItems.length + 1}`,
    lab_order_id: labOrder.id,
    lab_test_catalog_id: 'lab-test-catalog-e2e',
    lab_test_catalog_suggestion_id: null,
    parent_item_id: null,
    sort_order: 1,
    test_name: 'Complete Blood Count',
    test_name_ar: 'Complete Blood Count',
    test_code: 'CBC',
    loinc_code: '58410-2',
    display_name_long: 'Complete Blood Count',
    description: 'CBC panel',
    status: labOrder.status,
    status_category: 'pending',
    result_value: null,
    result_unit: null,
    numeric_value: null,
    reference_range: null,
    is_abnormal: null,
    resulted_at: null,
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
    ...itemOverrides,
  };
  state.labOrders.push(labOrder);
  state.labOrderItems.push(item);
  return { labOrder, item };
};

test('admin, patient, doctor, lab, and patient complete a clinical order journey', async ({ browser }) => {
  test.setTimeout(90_000);
  const state = createE2EWorkflowState();

  const adminOrgPage = await openRolePage(browser, state, 'super_admin', '/admin/organizations');
  await adminOrgPage.getByRole('button', { name: /onboard lab/i }).click();
  await expect(adminOrgPage.getByRole('heading', { name: /onboard organization/i })).toBeVisible();
  await adminOrgPage.getByLabel(/organization name/i).fill('Future Diagnostics Lab');
  await adminOrgPage.getByLabel(/^city$/i).fill('Abu Dhabi');
  await adminOrgPage.getByLabel(/seats allocated/i).fill('12');
  await adminOrgPage.getByLabel(/primary contact name/i).fill('Noura Ops');
  await adminOrgPage.getByLabel(/primary contact email/i).fill('noura.ops@example.ae');
  await adminOrgPage.getByLabel(/notes/i).fill('DHA-L-2026-099 · NABIDH onboarding pending');
  await adminOrgPage.getByRole('button', { name: /create organization/i }).click();
  await expect(adminOrgPage.getByText(/created future diagnostics lab/i)).toBeVisible();
  await expect(adminOrgPage.getByRole('heading', { name: 'Future Diagnostics Lab' })).toBeVisible();
  await closePage(adminOrgPage);

  expect(state.organizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Future Diagnostics Lab',
        kind: 'lab',
        city: 'Abu Dhabi',
        status: 'pending',
      }),
    ])
  );

  const adminPage = await openRolePage(browser, state, 'super_admin', '/admin/doctors');
  await adminPage.getByPlaceholder(/search by name/i).fill(e2eUsers.doctor.fullName);
  await expect(adminPage.getByRole('cell', { name: e2eUsers.doctor.fullName })).toBeVisible();
  await expect(adminPage.getByText('doctor').first()).toBeVisible();
  await closePage(adminPage);

  const patientBookingPage = await openRolePage(browser, state, 'patient', '/patient/appointments/book');
  await patientBookingPage.getByPlaceholder(/name, specialty, or city/i).fill('Omar');
  await patientBookingPage.getByRole('button', { name: /Dr\. Omar Doctor/i }).click();
  if (nextMondayDate.getMonth() !== new Date().getMonth()) {
    await patientBookingPage.getByRole('button', { name: /next month/i }).click();
  }
  await patientBookingPage
    .getByRole('button', { name: new RegExp(`^${nextMondayDay}$`) })
    .click();
  await patientBookingPage.getByRole('button', { name: /9:00/i }).first().click();
  await patientBookingPage.locator('textarea').first().fill('Workflow headache consult');
  await patientBookingPage.locator('textarea').nth(1).fill('Light sensitivity and nausea for the past week.');
  await patientBookingPage.getByRole('button', { name: /confirm appointment/i }).click();
  await expect(patientBookingPage).toHaveURL(new RegExp(`/patient/pre-visit/${workflowIds.preVisitAssessment}$`));
  await expect(patientBookingPage.getByRole('heading', { name: /pre-visit intake/i })).toBeVisible();
  await closePage(patientBookingPage);

  state.preVisitAssessments[0] = {
    ...state.preVisitAssessments[0],
    status: 'completed',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    last_answered_at: new Date().toISOString(),
  };
  state.preVisitAnswers.push(
    {
      assessment_id: workflowIds.preVisitAssessment,
      question_key: 'symptoms',
      question_label: 'What symptoms are you experiencing?',
      question_type: 'long_text',
      answer_text: 'Headaches with light sensitivity and nausea.',
      answer_json: null,
      autofill_value: null,
      autofill_source: null,
      autofilled: false,
      confirmed_by_patient: true,
      answered_at: new Date().toISOString(),
    },
    {
      assessment_id: workflowIds.preVisitAssessment,
      question_key: 'duration',
      question_label: 'How long has this been happening?',
      question_type: 'short_text',
      answer_text: 'About one week',
      answer_json: null,
      autofill_value: null,
      autofill_source: null,
      autofilled: false,
      confirmed_by_patient: true,
      answered_at: new Date().toISOString(),
    }
  );
  state.preVisitSummaries.push({
    assessment_id: workflowIds.preVisitAssessment,
    appointment_id: workflowIds.appointment,
    patient_id: e2eUsers.patient.id,
    doctor_id: e2eUsers.doctor.id,
    summary_text: 'AI-generated E2E pre-visit summary for recurrent headaches.',
    key_points: ['Patient reports headache symptoms before the visit.'],
    risk_flags: [],
    pending_questions: [],
    generated_by: 'ai',
    generated_at: new Date().toISOString(),
  });

  expect(state.appointments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: workflowIds.appointment,
        patient_id: e2eUsers.patient.id,
        doctor_id: e2eUsers.doctor.id,
        chief_complaint: 'Workflow headache consult',
        status: 'scheduled',
      }),
    ])
  );
  expect(state.preVisitAssessments[0]).toEqual(
    expect.objectContaining({
      id: workflowIds.preVisitAssessment,
      status: 'completed',
    })
  );
  expect(state.preVisitSummaries[0]).toEqual(
    expect.objectContaining({
      appointment_id: workflowIds.appointment,
      summary_text: expect.stringContaining('AI-generated E2E pre-visit summary'),
    })
  );

  const doctorAppointmentsPage = await openRolePage(browser, state, 'doctor', '/doctor/appointments');
  await doctorAppointmentsPage.getByRole('button', { name: /list view/i }).click();
  await expect(doctorAppointmentsPage.getByText('Workflow headache consult').first()).toBeVisible();
  await expect(doctorAppointmentsPage.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  await closePage(doctorAppointmentsPage);

  const doctorLabOrderPage = await openRolePage(
    browser,
    state,
    'doctor',
    `/doctor/lab-orders/new?patient=${e2eUsers.patient.id}&appointment=${workflowIds.appointment}`
  );
  await doctorLabOrderPage.getByLabel(/patient/i).selectOption(e2eUsers.patient.id);
  await doctorLabOrderPage.getByLabel(/appointment/i).selectOption(workflowIds.appointment);
  await doctorLabOrderPage.getByPlaceholder(/search by test name/i).fill('Complete');
  await doctorLabOrderPage.getByRole('button', { name: /Complete Blood Count/i }).first().click();
  await doctorLabOrderPage.getByRole('button', { name: /save lab order/i }).click();
  await expect(doctorLabOrderPage).toHaveURL(/\/doctor\/lab-orders$/);
  await closePage(doctorLabOrderPage);

  expect(state.labOrders).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: workflowIds.labOrder,
        patient_id: e2eUsers.patient.id,
        doctor_id: e2eUsers.doctor.id,
        appointment_id: workflowIds.appointment,
        status: 'ordered',
      }),
    ])
  );
  expect(state.labOrderItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: workflowIds.labOrderItem,
        lab_order_id: workflowIds.labOrder,
        test_name: 'Complete Blood Count',
      }),
    ])
  );

  const labDashboardPage = await openRolePage(browser, state, 'lab', '/lab/dashboard');
  await expect(labDashboardPage.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  await expect(labDashboardPage.getByText(/Complete Blood Count/).first()).toBeVisible();
  await expect(labDashboardPage.getByText(/received|ordered|pending/i).first()).toBeVisible();
  await closePage(labDashboardPage);

  const patientLabResultsPage = await openRolePage(browser, state, 'patient', '/patient/lab-results');
  await patientLabResultsPage.getByRole('button', { name: /upcoming/i }).click();
  await expect(patientLabResultsPage.getByText(/Complete Blood Count/).first()).toBeVisible();
  await expect(patientLabResultsPage.getByText(/ordered|pending|processing/i).first()).toBeVisible();
  await closePage(patientLabResultsPage);
});

test('lab processing actions move an order from ordered to resulted for downstream patient visibility', async ({ browser }) => {
  test.setTimeout(60_000);
  const state = createE2EWorkflowState({ includeBaselineData: true });

  const labPage = await openRolePage(browser, state, 'lab', '/lab/dashboard');
  await expect(labPage.getByText(e2eUsers.patient.fullName).first()).toBeVisible();

  await labPage.evaluate(
    async ({ orderId, itemId }) => {
      const invokeRpc = (name: string, body: Record<string, unknown>) =>
        fetch(`https://placeholder.supabase.co/rest/v1/rpc/${name}`, {
          method: 'POST',
          headers: {
            apikey: 'placeholder',
            authorization: 'Bearer e2e-lab',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });

      await invokeRpc('lab_start_processing', { target_order_id: orderId });
      await invokeRpc('lab_save_item_result', {
        target_item_id: itemId,
        result_value: '5.2',
        result_unit: 'mmol/L',
        reference_range: '3.9-5.5',
        is_abnormal: false,
      });
      await invokeRpc('lab_release_order', { target_order_id: orderId });
    },
    {
      orderId: '00000000-0000-4000-8000-000000000901',
      itemId: '00000000-0000-4000-8000-000000000911',
    }
  );
  await closePage(labPage);

  expect(state.labActionLog).toEqual(
    expect.arrayContaining([
      'start:00000000-0000-4000-8000-000000000901',
      'save:00000000-0000-4000-8000-000000000911',
      'release:00000000-0000-4000-8000-000000000901',
    ])
  );
  expect(state.labOrders[0]).toEqual(expect.objectContaining({ status: 'resulted' }));
  expect(state.labOrderItems[0]).toEqual(
    expect.objectContaining({
      status: 'resulted',
      result_value: '5.2',
      result_unit: 'mmol/L',
    })
  );

  const patientPage = await openRolePage(browser, state, 'patient', '/patient/lab-results');
  await expect(patientPage.getByText(/Complete Blood Count/).first()).toBeVisible();
  await expect(patientPage.getByText(/5\.2|resulted|available/i).first()).toBeVisible();
  await closePage(patientPage);
});

test('admin cannot onboard an organization without a required name', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'super_admin', '/admin/organizations');

  await page.getByRole('button', { name: /\+ add organization/i }).click();
  await page.getByRole('button', { name: /create organization/i }).click();

  const isOrgNameValid = await page
    .locator('#org-name')
    .evaluate((element) => (element as HTMLInputElement).validity.valid);
  expect(isOrgNameValid).toBe(false);
  expect(state.organizations).toHaveLength(0);
  await closePage(page);
});

test('admin cannot onboard an organization with an invalid contact email', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'super_admin', '/admin/organizations');

  await page.getByRole('button', { name: /onboard lab/i }).click();
  await page.getByLabel(/organization name/i).fill('Invalid Email Lab');
  await page.getByLabel(/primary contact email/i).fill('not-an-email');
  await page.getByRole('button', { name: /create organization/i }).click();

  const isContactEmailValid = await page
    .locator('#org-contact-email')
    .evaluate((element) => (element as HTMLInputElement).validity.valid);
  expect(isContactEmailValid).toBe(false);
  expect(state.organizations).toHaveLength(0);
  await closePage(page);
});

test('admin can onboard and filter a pharmacy organization', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'super_admin', '/admin/organizations');

  await page.getByRole('button', { name: /onboard pharmacy/i }).click();
  await page.getByLabel(/organization name/i).fill('Future Pharmacy Chain');
  await page.getByLabel(/^city$/i).fill('Sharjah');
  await page.getByRole('button', { name: /create organization/i }).click();
  await expect(page.getByRole('heading', { name: 'Future Pharmacy Chain' })).toBeVisible();
  await page.getByRole('button', { name: /^pharmacy$/i }).click();

  await expect(page.getByRole('heading', { name: 'Future Pharmacy Chain' })).toBeVisible();
  expect(state.organizations).toEqual([
    expect.objectContaining({ name: 'Future Pharmacy Chain', kind: 'pharmacy', status: 'pending' }),
  ]);
  await closePage(page);
});

test('admin add-doctor action routes into doctor registration', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'super_admin', '/admin/doctors');

  await page.getByRole('button', { name: /add doctor/i }).click();

  await expect(page).toHaveURL(/\/auth\/register\?role=doctor$/);
  await expect(page.locator('body')).toContainText(/doctor|register|account/i);
  await closePage(page);
});

test('patient cannot confirm appointment until a reason is entered', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'patient', '/patient/appointments/book');

  await page.getByRole('button', { name: /Dr\. Omar Doctor/i }).click();
  if (nextMondayDate.getMonth() !== new Date().getMonth()) {
    await page.getByRole('button', { name: /next month/i }).click();
  }
  await page
    .getByRole('button', { name: new RegExp(`^${nextMondayDay}$`) })
    .click();
  await page.getByRole('button', { name: /9:00/i }).first().click();

  await expect(page.getByRole('button', { name: /confirm appointment/i })).toBeDisabled();
  expect(state.appointments).toHaveLength(0);
  await closePage(page);
});

test('patient can cancel a future appointment', async ({ browser }) => {
  const state = createE2EWorkflowState({ includeBaselineData: true });
  const page = await openRolePage(browser, state, 'patient', '/patient/appointments');

  await page.getByRole('button', { name: /cancel appointment/i }).first().click();

  await expect(page.getByText(/appointment cancelled successfully/i)).toBeVisible();
  expect(state.appointments[0]).toEqual(expect.objectContaining({ status: 'cancelled' }));
  await closePage(page);
});

test('patient can reschedule a future appointment', async ({ browser }) => {
  const state = createE2EWorkflowState({ includeBaselineData: true });
  const page = await openRolePage(browser, state, 'patient', '/patient/appointments');

  await page.evaluate(async (scheduledAt) => {
    await fetch('https://placeholder.supabase.co/rest/v1/rpc/reschedule_patient_appointment', {
      method: 'POST',
      headers: {
        apikey: 'placeholder',
        authorization: 'Bearer e2e-patient',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        p_appointment_id: '00000000-0000-4000-8000-000000000601',
        p_scheduled_at: scheduledAt,
        p_duration_minutes: 30,
        p_chief_complaint: 'Rescheduled follow-up consultation',
        p_notes: 'Rescheduled from patient portal.',
      }),
    });
  }, nextMondayRescheduleIso);
  await page.reload();

  await expect(page.getByText('Rescheduled follow-up consultation')).toBeVisible();
  expect(state.appointments[0]).toEqual(
    expect.objectContaining({
      status: 'scheduled',
      chief_complaint: 'Rescheduled follow-up consultation',
      scheduled_at: nextMondayRescheduleIso,
    })
  );
  await closePage(page);
});

test('patient no-show appears in cancelled appointments', async ({ browser }) => {
  const state = createE2EWorkflowState();
  seedAppointment(state, {
    id: 'appointment-no-show-patient',
    status: 'no_show',
    scheduled_at: scenarioTomorrow,
    chief_complaint: 'Missed monthly no-show',
  });
  const page = await openRolePage(browser, state, 'patient', '/patient/appointments');

  await page.getByRole('button', { name: /cancelled/i }).click();

  await expect(page.getByText('Missed monthly no-show')).toBeVisible();
  await expect(page.getByText(/no show/i).first()).toBeVisible();
  await closePage(page);
});

test('doctor no-show analytics include missed appointments', async ({ browser }) => {
  const state = createE2EWorkflowState();
  seedAppointment(state, {
    id: 'appointment-no-show-doctor',
    status: 'no_show',
    scheduled_at: scenarioTomorrow,
    chief_complaint: 'Doctor sees no-show',
  });
  const page = await openRolePage(browser, state, 'doctor', '/doctor/appointments');

  await expect(page.getByText(/No-Shows This Month/i)).toBeVisible();
  await page.getByRole('button', { name: /list view/i }).click();
  await expect(page.getByText('Doctor sees no-show').first()).toBeVisible();
  await closePage(page);
});

test('doctor cannot create lab order without selecting a patient', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await openRolePage(browser, state, 'doctor', '/doctor/lab-orders/new');

  await page.getByRole('button', { name: /save lab order/i }).click();

  await expect(page.getByText(/select a patient/i)).toBeVisible();
  expect(state.labOrders).toHaveLength(0);
  await closePage(page);
});

test('doctor cannot create lab order without at least one test', async ({ browser }) => {
  const state = createE2EWorkflowState({ includeBaselineData: true });
  const page = await openRolePage(browser, state, 'doctor', `/doctor/lab-orders/new?patient=${e2eUsers.patient.id}`);

  await page.getByLabel(/patient/i).selectOption(e2eUsers.patient.id);
  await page.getByRole('button', { name: /save lab order/i }).click();

  await expect(page.getByText(/add at least one test/i)).toBeVisible();
  expect(state.labOrders).toHaveLength(1);
  await closePage(page);
});

test('doctor can cancel a future appointment from the worklist', async ({ browser }) => {
  const state = createE2EWorkflowState({ includeBaselineData: true });
  const page = await openRolePage(browser, state, 'doctor', '/doctor/appointments');

  await page.getByRole('button', { name: /list view/i }).click();
  await page.getByRole('button', { name: /cancel appointment/i }).first().click();

  await expect(page.getByText(/appointment cancelled/i)).toBeVisible();
  expect(state.appointments[0]).toEqual(expect.objectContaining({ status: 'cancelled' }));
  await closePage(page);
});

test('doctor sees completed pre-visit AI summary before the visit', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const appointment = seedAppointment(state, {
    id: 'appointment-previsit-summary',
    chief_complaint: 'Pre-visit summary concern',
  });
  seedPreVisit(state, appointment.id, 'completed');
  const page = await openRolePage(browser, state, 'doctor', '/doctor/appointments');

  await page.getByRole('button', { name: /list view/i }).click();
  await expect(page.getByText('Pre-visit summary concern').first()).toBeVisible();
  await expect(page.getByText(/Scenario AI summary/i).first()).toBeVisible();
  await closePage(page);
});

test('patient sees incomplete lab order as upcoming, not as a completed result', async ({ browser }) => {
  const state = createE2EWorkflowState();
  seedLabOrder(state, { id: 'lab-order-incomplete', status: 'processing' });
  const page = await openRolePage(browser, state, 'patient', '/patient/lab-results');

  await expect(page.getByText(/No lab results yet/i)).toBeVisible();
  await page.getByRole('button', { name: /upcoming/i }).click();
  await expect(page.getByText(/Complete Blood Count/i).first()).toBeVisible();
  await expect(page.getByText(/No lab results yet/i)).not.toBeVisible();
  await closePage(page);
});

test('lab result-entry queue keeps incomplete samples pending', async ({ browser }) => {
  const state = createE2EWorkflowState();
  seedLabOrder(state, { id: 'lab-order-entry-pending', status: 'processing' });
  const page = await openRolePage(browser, state, 'lab', '/lab/results/entry');

  await expect(page.getByText(e2eUsers.patient.fullName).first()).toBeVisible();
  await expect(page.getByText(/Complete Blood Count/i).first()).toBeVisible();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
  await closePage(page);
});

test('lab cannot release an order before all results are completed', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const { labOrder } = seedLabOrder(state, { id: 'lab-order-release-blocked', status: 'processing' });
  const page = await openRolePage(browser, state, 'lab', '/lab/dashboard');

  await page.evaluate(async ({ orderId }) => {
    await fetch('https://placeholder.supabase.co/rest/v1/rpc/lab_release_order', {
      method: 'POST',
      headers: {
        apikey: 'placeholder',
        authorization: 'Bearer e2e-lab',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ target_order_id: orderId }),
    });
  }, { orderId: labOrder.id });

  expect(state.labOrders[0]).toEqual(expect.objectContaining({ status: 'processing' }));
  expect(state.labActionLog).toContain(`release_blocked:${labOrder.id}`);
  await closePage(page);
});

test('lab saved draft result stays unreleased for patient until release occurs', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const { labOrder, item } = seedLabOrder(state, { id: 'lab-order-draft-result', status: 'processing' });
  const page = await openRolePage(browser, state, 'lab', '/lab/dashboard');

  await page.evaluate(async ({ itemId }) => {
    await fetch('https://placeholder.supabase.co/rest/v1/rpc/lab_save_item_result', {
      method: 'POST',
      headers: {
        apikey: 'placeholder',
        authorization: 'Bearer e2e-lab',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        target_item_id: itemId,
        result_value: '4.9',
        result_unit: 'mmol/L',
        reference_range: '3.9-5.5',
        is_abnormal: false,
      }),
    });
  }, { itemId: item.id });
  await closePage(page);

  expect(state.labOrders[0]).toEqual(expect.objectContaining({ id: labOrder.id, status: 'processing' }));
  const patientPage = await openRolePage(browser, state, 'patient', '/patient/lab-results');
  await patientPage.getByRole('button', { name: /upcoming/i }).click();
  await expect(patientPage.getByText(/Complete Blood Count/i).first()).toBeVisible();
  await closePage(patientPage);
});

test('doctor-created lab order creates a patient notification handoff', async ({ browser }) => {
  const state = createE2EWorkflowState({ includeBaselineData: true });
  const page = await openRolePage(browser, state, 'doctor', `/doctor/lab-orders/new?patient=${e2eUsers.patient.id}`);

  await page.getByLabel(/patient/i).selectOption(e2eUsers.patient.id);
  await page.getByPlaceholder(/search by test name/i).fill('Complete');
  await page.getByRole('button', { name: /Complete Blood Count/i }).first().click();
  await page.getByRole('button', { name: /save lab order/i }).click();
  await expect(page).toHaveURL(/\/doctor\/lab-orders$/);

  expect(state.notifications).toEqual([
    expect.objectContaining({
      user_id: e2eUsers.patient.id,
      title: 'New lab order created',
    }),
  ]);
  await closePage(page);
});

test('patient cannot access lab result-entry workspace', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await browser.newPage();
  await installSupabaseMocks(page, { role: 'patient', state });
  await seedAuthenticatedRole(page, 'patient');
  await page.goto('/lab/results/entry');

  await expect(page).toHaveURL(/\/access-denied$/);
  await expect(page.locator('body')).toContainText(/access denied/i);
  await closePage(page);
});

test('doctor cannot access admin organization onboarding', async ({ browser }) => {
  const state = createE2EWorkflowState();
  const page = await browser.newPage();
  await installSupabaseMocks(page, { role: 'doctor', state });
  await seedAuthenticatedRole(page, 'doctor');
  await page.goto('/admin/organizations');

  await expect(page).toHaveURL(/\/access-denied$/);
  await expect(page.locator('body')).toContainText(/access denied/i);
  await closePage(page);
});

test('admin can filter newly onboarded lab organization by pending status', async ({ browser }) => {
  const state = createE2EWorkflowState();
  state.organizations.push({
    id: 'org-pending-lab-filter',
    slug: 'pending-lab-filter',
    name: 'Pending Lab Filter',
    kind: 'lab',
    city: 'Dubai',
    country: 'UAE',
    primary_contact_name: null,
    primary_contact_email: null,
    baa_signed_at: null,
    contract_started_at: null,
    contract_ends_at: null,
    seats_allocated: 8,
    seats_used: 0,
    status: 'pending',
    notes: 'DHA-L-2026-777',
    created_at: scenarioYesterday,
    updated_at: scenarioYesterday,
  });
  const page = await openRolePage(browser, state, 'super_admin', '/admin/organizations');

  await page.getByRole('button', { name: /^laboratory$/i }).click();
  await page.getByRole('button', { name: /^pending$/i }).click();

  await expect(page.getByRole('heading', { name: 'Pending Lab Filter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CeenAiX Clinic' })).not.toBeVisible();
  await closePage(page);
});
