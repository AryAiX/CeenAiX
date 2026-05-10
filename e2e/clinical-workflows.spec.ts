import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  createE2EWorkflowState,
  e2eUsers,
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

test('admin, patient, doctor, lab, and patient complete a clinical order journey', async ({ browser }) => {
  const state = createE2EWorkflowState();

  const adminPage = await openRolePage(browser, state, 'super_admin', '/admin/doctors');
  await adminPage.getByPlaceholder(/search name/i).fill(e2eUsers.doctor.fullName);
  await expect(adminPage.getByRole('cell', { name: e2eUsers.doctor.fullName })).toBeVisible();
  await expect(adminPage.getByText('doctor').first()).toBeVisible();
  await closePage(adminPage);

  const patientBookingPage = await openRolePage(browser, state, 'patient', '/patient/appointments/book');
  await patientBookingPage.getByPlaceholder(/doctor name/i).fill('Omar');
  await patientBookingPage.getByRole('button', { name: /Dr\. Omar Doctor/i }).click();
  await patientBookingPage.getByRole('button', { name: /^11$/ }).click();
  await patientBookingPage.getByRole('button', { name: /9:00/i }).first().click();
  await patientBookingPage.locator('textarea').first().fill('Workflow headache consult');
  await patientBookingPage.locator('textarea').nth(1).fill('Light sensitivity and nausea for the past week.');
  await patientBookingPage.getByRole('button', { name: /confirm appointment/i }).click();
  await expect(patientBookingPage).toHaveURL(new RegExp(`/patient/pre-visit/${workflowIds.preVisitAssessment}$`));
  await expect(patientBookingPage.getByRole('heading', { name: /pre-visit intake/i })).toBeVisible();

  await patientBookingPage.locator('textarea').first().fill('Headaches with light sensitivity and nausea.');
  await patientBookingPage.locator('input[placeholder="Type your answer"]').first().fill('About one week');
  await patientBookingPage.getByRole('button', { name: /complete intake/i }).click();
  await expect(patientBookingPage).toHaveURL(/\/patient\/appointments\?previsit=completed$/);
  await closePage(patientBookingPage);

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
      status: 'in_progress',
    })
  );
  expect(state.preVisitSummaries[0]).toEqual(
    expect.objectContaining({
      appointment_id: workflowIds.appointment,
      summary_text: expect.stringContaining('AI-generated E2E pre-visit summary'),
    })
  );

  const doctorAppointmentsPage = await openRolePage(browser, state, 'doctor', '/doctor/appointments');
  await expect(doctorAppointmentsPage.getByText('Workflow headache consult')).toBeVisible();
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
  await expect(labDashboardPage.getByText(/ordered/i).first()).toBeVisible();
  await closePage(labDashboardPage);

  const patientLabResultsPage = await openRolePage(browser, state, 'patient', '/patient/lab-results');
  await expect(patientLabResultsPage.getByText(/Complete Blood Count/).first()).toBeVisible();
  await expect(patientLabResultsPage.getByText(/ordered|pending|processing/i).first()).toBeVisible();
  await closePage(patientLabResultsPage);
});

test('lab processing actions move an order from ordered to resulted for downstream patient visibility', async ({ browser }) => {
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
