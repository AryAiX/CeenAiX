import type { Page, Route } from '@playwright/test';

export type E2ERole = 'patient' | 'doctor' | 'super_admin' | 'lab';

interface E2EUser {
  id: string;
  email: string;
  role: E2ERole;
  fullName: string;
  firstName: string;
  lastName: string;
}

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = 'https://placeholder.supabase.co';
const AUTH_STORAGE_KEY = 'sb-placeholder-auth-token';

const now = new Date('2026-05-10T12:00:00.000Z');
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

export const e2eUsers: Record<E2ERole, E2EUser> = {
  patient: {
    id: '00000000-0000-4000-8000-000000000101',
    email: 'patient.e2e@ceenaix.test',
    role: 'patient',
    fullName: 'Aisha Patient',
    firstName: 'Aisha',
    lastName: 'Patient',
  },
  doctor: {
    id: '00000000-0000-4000-8000-000000000201',
    email: 'doctor.e2e@ceenaix.test',
    role: 'doctor',
    fullName: 'Dr. Omar Doctor',
    firstName: 'Omar',
    lastName: 'Doctor',
  },
  super_admin: {
    id: '00000000-0000-4000-8000-000000000301',
    email: 'admin.e2e@ceenaix.test',
    role: 'super_admin',
    fullName: 'Maya Admin',
    firstName: 'Maya',
    lastName: 'Admin',
  },
  lab: {
    id: '00000000-0000-4000-8000-000000000401',
    email: 'lab.e2e@ceenaix.test',
    role: 'lab',
    fullName: 'Layla Lab',
    firstName: 'Layla',
    lastName: 'Lab',
  },
};

const patientId = e2eUsers.patient.id;
const doctorId = e2eUsers.doctor.id;
const adminId = e2eUsers.super_admin.id;
const labUserId = e2eUsers.lab.id;
const labId = '00000000-0000-4000-8000-000000000501';
const appointmentId = '00000000-0000-4000-8000-000000000601';
const conversationId = '00000000-0000-4000-8000-000000000701';
const prescriptionId = '00000000-0000-4000-8000-000000000801';
const labOrderId = '00000000-0000-4000-8000-000000000901';

const asSupabaseUser = (user: E2EUser): JsonRecord => ({
  id: user.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: user.email,
  phone: '+971500000000',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    role: user.role,
    full_name: user.fullName,
    first_name: user.firstName,
    last_name: user.lastName,
    terms_accepted: true,
  },
  created_at: yesterday,
  updated_at: yesterday,
});

const userProfile = (user: E2EUser, profileCompleted = true): JsonRecord => ({
  id: `profile-${user.id}`,
  user_id: user.id,
  role: user.role,
  full_name: user.fullName,
  first_name: user.firstName,
  last_name: user.lastName,
  email: user.email,
  phone: '+971500000000',
  city: 'Dubai',
  address: 'Dubai Healthcare City',
  gender: user.role === 'doctor' ? 'male' : 'female',
  date_of_birth: '1990-01-01',
  profile_completed: profileCompleted,
  notification_preferences: {},
  terms_accepted: true,
  is_active: true,
  created_at: yesterday,
  updated_at: yesterday,
});

const userProfiles = (profileCompleted = true): JsonRecord[] =>
  Object.values(e2eUsers).map((user) => userProfile(user, profileCompleted));

const sessionFor = (user: E2EUser): JsonRecord => ({
  access_token: `e2e-${user.role}`,
  refresh_token: `refresh-${user.role}`,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: asSupabaseUser(user),
});

const appointmentRows: JsonRecord[] = [
  {
    id: appointmentId,
    patient_id: patientId,
    doctor_id: doctorId,
    type: 'in_person',
    status: 'scheduled',
    scheduled_at: tomorrow,
    duration_minutes: 30,
    chief_complaint: 'Follow-up consultation',
    notes: 'E2E appointment fixture',
    is_deleted: false,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: '00000000-0000-4000-8000-000000000602',
    patient_id: patientId,
    doctor_id: doctorId,
    type: 'in_person',
    status: 'completed',
    scheduled_at: yesterday,
    duration_minutes: 30,
    chief_complaint: 'Annual review',
    notes: 'Completed appointment fixture',
    is_deleted: false,
    created_at: yesterday,
    updated_at: yesterday,
  },
];

const labOrderRows: JsonRecord[] = [
  {
    id: labOrderId,
    patient_id: patientId,
    doctor_id: doctorId,
    assigned_lab_id: labId,
    status: 'processing',
    ordered_at: yesterday,
    updated_at: yesterday,
    due_by: tomorrow,
    urgency: 'routine',
    lab_order_code: 'LAB-E2E-001',
    nabidh_reference: 'NABIDH-E2E-001',
    clinical_notes: 'Routine metabolic panel',
    specimen_summary: 'Blood sample',
    fasting_instructions: 'Fasting required',
    total_cost_aed: 240,
    insurance_plan: 'CeenAiX Gold',
    blood_type: 'O+',
    doctor_dha_license: 'DHA-E2E-DOCTOR',
    doctor_specialty: 'Family Medicine',
    clinic_name: 'CeenAiX Clinic',
    preauth_status: 'approved',
    technician_name: 'Layla Lab',
    technician_initials: 'LL',
    source_label: 'Doctor order',
    patient_display_name: e2eUsers.patient.fullName,
    patient_age: 36,
    patient_gender: 'Female',
    is_deleted: false,
  },
];

const labOrderItemRows: JsonRecord[] = [
  {
    id: '00000000-0000-4000-8000-000000000911',
    lab_order_id: labOrderId,
    test_name: 'Complete Blood Count',
    test_name_ar: 'Complete Blood Count',
    category: 'Hematology',
    status: 'processing',
    result_value: null,
    result_unit: '10^9/L',
    reference_range: '4.0-11.0',
    reference_min: 4,
    reference_max: 11,
    is_abnormal: false,
    resulted_at: null,
    created_at: yesterday,
  },
  {
    id: '00000000-0000-4000-8000-000000000912',
    lab_order_id: labOrderId,
    test_name: 'Fasting Glucose',
    test_name_ar: 'Fasting Glucose',
    category: 'Chemistry',
    status: 'resulted',
    result_value: '5.1',
    result_unit: 'mmol/L',
    reference_range: '3.9-5.5',
    reference_min: 3.9,
    reference_max: 5.5,
    is_abnormal: false,
    resulted_at: yesterday,
    created_at: yesterday,
  },
];

const tableRows = (table: string, role: E2ERole, profileCompleted: boolean): JsonRecord[] => {
  switch (table) {
    case 'user_profiles':
      return userProfiles(profileCompleted);
    case 'patient_profiles':
      return [
        {
          id: 'patient-profile-e2e',
          user_id: patientId,
          emirates_id: '784-1990-0000000-1',
          emergency_contact_name: 'Sara Patient',
          emergency_contact_phone: '+971500000001',
          blood_type: 'O+',
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'doctor_profiles':
      return [
        {
          id: 'doctor-profile-e2e',
          user_id: doctorId,
          specialization: 'Family Medicine',
          license_number: 'DHA-E2E-DOCTOR',
          bio: 'Board-certified family medicine doctor.',
          consultation_fee: 350,
          years_experience: 12,
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'lab_staff':
      return [{ id: 'lab-staff-e2e', user_id: labUserId, lab_id: labId, is_active: true }];
    case 'lab_profiles':
      return [
        {
          id: labId,
          name: 'CeenAiX Diagnostics',
          slug: 'ceenaix-diagnostics',
          short_code: 'CXD',
          accreditation_number: 'DHA-LAB-E2E',
          city: 'Dubai',
          is_active: true,
        },
      ];
    case 'appointments':
      return appointmentRows;
    case 'doctor_availability':
      return [
        {
          id: 'availability-e2e',
          doctor_id: doctorId,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          slot_minutes: 30,
          is_active: true,
        },
      ];
    case 'blocked_slots':
      return [];
    case 'prescriptions':
      return [
        {
          id: prescriptionId,
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: doctorId,
          status: 'active',
          prescribed_at: yesterday,
          start_date: yesterday.slice(0, 10),
          end_date: null,
          notes: 'Take with food',
          is_deleted: false,
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'prescription_items':
      return [
        {
          id: 'prescription-item-e2e',
          prescription_id: prescriptionId,
          medication_name: 'Metformin',
          medication_name_ar: 'Metformin',
          dosage: '500 mg',
          frequency: 'Once daily',
          frequency_code: 'QD',
          duration: '30 days',
          instructions: 'Take after breakfast',
          dispense_status: 'pending',
          created_at: yesterday,
        },
      ];
    case 'prescription_clinical_vocab':
      return [
        { id: 'freq-qdb', category: 'frequency', code: 'QD', label: 'Once daily', is_active: true },
      ];
    case 'medication_catalog':
      return [
        {
          id: 'medication-catalog-e2e',
          display_name: 'Metformin 500 mg tablet',
          generic_name: 'Metformin',
          strength: '500 mg',
          route: 'oral',
          is_active: true,
        },
      ];
    case 'medication_catalog_suggestions':
      return [];
    case 'lab_orders':
      return labOrderRows;
    case 'lab_order_items':
      return labOrderItemRows;
    case 'lab_test_catalog':
      return [
        {
          id: 'lab-test-catalog-e2e',
          test_name: 'Complete Blood Count',
          test_name_ar: 'Complete Blood Count',
          category: 'Hematology',
          loinc_code: '58410-2',
          is_active: true,
        },
      ];
    case 'lab_test_catalog_suggestions':
      return [];
    case 'conversations':
      return [
        {
          id: conversationId,
          subject: 'Care coordination',
          participant_ids: [patientId, doctorId],
          created_by: patientId,
          last_message_at: yesterday,
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'messages':
      return [
        {
          id: 'message-e2e',
          conversation_id: conversationId,
          sender_id: doctorId,
          body: 'Your results are ready for review.',
          sent_at: yesterday,
          read_at: role === 'patient' ? null : yesterday,
          created_at: yesterday,
        },
      ];
    case 'notifications':
      return [
        {
          id: 'notification-e2e',
          user_id: role === 'doctor' ? doctorId : patientId,
          title: 'E2E notification',
          body: 'A test notification for the browser suite.',
          type: 'appointment',
          read_at: null,
          created_at: yesterday,
        },
      ];
    case 'medical_conditions':
      return [
        {
          id: 'condition-e2e',
          patient_id: patientId,
          name: 'Type 2 Diabetes',
          status: 'active',
          diagnosed_at: '2024-01-15',
          is_deleted: false,
          created_at: yesterday,
        },
      ];
    case 'allergies':
      return [
        {
          id: 'allergy-e2e',
          patient_id: patientId,
          allergen: 'Penicillin',
          reaction: 'Rash',
          severity: 'moderate',
          is_active: true,
          is_deleted: false,
          created_at: yesterday,
        },
      ];
    case 'vaccinations':
      return [
        {
          id: 'vaccination-e2e',
          patient_id: patientId,
          vaccine_name: 'Influenza',
          administered_date: '2025-10-01',
          is_deleted: false,
          created_at: yesterday,
        },
      ];
    case 'patient_reported_medications':
    case 'patient_memory_facts':
    case 'patient_canonical_update_requests':
    case 'appointment_pre_visit_assessments':
    case 'appointment_pre_visit_answers':
    case 'appointment_pre_visit_summaries':
    case 'pre_visit_templates':
    case 'pre_visit_template_questions':
      return [];
    case 'patient_insurance':
      return [
        {
          id: 'patient-insurance-e2e',
          patient_id: patientId,
          insurance_plan_id: 'insurance-plan-e2e',
          member_id: 'MEM-E2E-001',
          status: 'active',
        },
      ];
    case 'insurance_plans':
      return [
        {
          id: 'insurance-plan-e2e',
          name: 'CeenAiX Gold',
          provider: 'CeenAiX Insurance',
          premium_amount: 750,
          coverage_summary: 'Comprehensive outpatient coverage',
          is_active: true,
        },
      ];
    case 'patient_vitals':
      return [
        {
          id: 'vitals-e2e',
          patient_id: patientId,
          recorded_at: yesterday,
          blood_pressure_systolic: 118,
          blood_pressure_diastolic: 76,
          heart_rate: 72,
        },
      ];
    case 'specializations':
      return [{ id: 'specialization-e2e', name: 'Family Medicine', is_active: true }];
    case 'doctor_specializations':
      return [{ doctor_id: doctorId, specialization_id: 'specialization-e2e' }];
    case 'ai_chat_sessions':
      return [
        {
          id: 'ai-session-e2e',
          patient_id: patientId,
          title: 'E2E health chat',
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'ai_chat_messages':
      return [
        {
          id: 'ai-message-e2e',
          session_id: 'ai-session-e2e',
          role: 'assistant',
          content: 'AI-generated guidance appears here.',
          metadata: { aiGenerated: true },
          created_at: yesterday,
        },
      ];
    case 'platform_settings':
      return [{ id: 'platform-setting-e2e', key: 'maintenance_mode', value: false, updated_at: yesterday }];
    case 'lab_portal_facility_meta':
      return [{ lab_id: labId, facility_name: 'CeenAiX Diagnostics', emirate: 'Dubai' }];
    case 'lab_portal_imaging_studies':
      return [];
    case 'lab_portal_equipment':
      return [{ id: 'equipment-e2e', lab_id: labId, name: 'Analyzer A', status: 'online' }];
    case 'lab_portal_qc_runs':
    case 'lab_portal_nabidh_events':
    case 'lab_portal_settings':
    case 'lab_portal_setting_options':
    case 'lab_portal_critical_values':
    case 'lab_portal_top_metrics':
    case 'lab_portal_volume_trends':
      return [];
    default:
      return [];
  }
};

const rpcPayload = (rpcName: string): JsonRecord | JsonRecord[] | null => {
  switch (rpcName) {
    case 'admin_get_metrics':
      return {
        users: { total: 1842, patients: 1220, doctors: 214, labs: 18, activeToday: 346 },
        appointments: { total: 482, today: 42, completed: 316, cancelled: 8 },
        revenue: { monthToDateAed: 812450, outstandingAed: 42400, claimApprovalRate: 0.92 },
        compliance: { auditEvents30d: 128, openIncidents: 2, highRiskEvents: 1 },
        ai: { conversations30d: 3200, escalations30d: 17, safeCompletionRate: 0.997 },
      };
    case 'admin_list_users':
      return Object.values(e2eUsers).map((user) => ({
        user_id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        is_active: true,
        created_at: yesterday,
        last_sign_in_at: yesterday,
      }));
    case 'admin_list_organizations':
      return [
        {
          id: 'org-e2e',
          name: 'CeenAiX Clinic',
          type: 'clinic',
          emirate: 'Dubai',
          status: 'active',
          created_at: yesterday,
        },
      ];
    case 'admin_list_incidents':
      return [
        {
          id: 'incident-e2e',
          severity: 'medium',
          status: 'investigating',
          title: 'RLS audit review',
          created_at: yesterday,
        },
      ];
    case 'admin_list_audit_events':
      return [
        {
          id: 'audit-event-e2e',
          actor_id: adminId,
          actor_name: e2eUsers.super_admin.fullName,
          action: 'viewed_dashboard',
          resource_type: 'admin_dashboard',
          created_at: yesterday,
        },
      ];
    case 'admin_get_system_health':
      return {
        services: [
          { name: 'Supabase', category: 'database', status: 'operational', latencyMs: 42 },
          { name: 'Edge Functions', category: 'ai', status: 'operational', latencyMs: 88 },
        ],
        incidents: [],
      };
    case 'admin_get_ai_analytics':
      return {
        usage: { conversations30d: 3200, documents30d: 84, averageLatencyMs: 920 },
        safety: { escalations30d: 17, blockedOutputs30d: 2, safeCompletionRate: 0.997 },
        trends: [{ date: yesterday.slice(0, 10), conversations: 120, escalations: 1 }],
      };
    case 'admin_list_feature_flags':
      return [
        { id: 'flag-e2e', key: 'patient_ai_chat', enabled: true, description: 'Patient AI chat' },
      ];
    case 'get_bookable_doctors':
      return [
        {
          doctor_id: doctorId,
          full_name: e2eUsers.doctor.fullName,
          specialization: 'Family Medicine',
          city: 'Dubai',
          next_available_at: tomorrow,
          consultation_fee: 350,
        },
      ];
    case 'lab_claim_order':
    case 'lab_start_processing':
    case 'lab_save_item_result':
    case 'lab_release_order':
      return { ok: true };
    default:
      return null;
  }
};

const roleFromAuthHeader = (authorization: string | undefined): E2ERole | null => {
  const token = authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (token === 'e2e-patient') return 'patient';
  if (token === 'e2e-doctor') return 'doctor';
  if (token === 'e2e-super_admin') return 'super_admin';
  if (token === 'e2e-lab') return 'lab';
  return null;
};

const userForRequest = (route: Route, fallbackRole: E2ERole): E2EUser => {
  const headerRole = roleFromAuthHeader(route.request().headers().authorization);
  return e2eUsers[headerRole ?? fallbackRole];
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const isObjectResponse = (route: Route) =>
  route.request().headers().accept?.includes('application/vnd.pgrst.object') ?? false;

const currentTableRow = (
  table: string,
  rows: JsonRecord[],
  currentUser: E2EUser,
  profileCompleted: boolean
): JsonRecord | null => {
  if (table === 'user_profiles') {
    return userProfile(currentUser, profileCompleted);
  }

  if (table === 'patient_profiles') {
    return rows.find((row) => row.user_id === currentUser.id || row.user_id === patientId) ?? null;
  }

  if (table === 'doctor_profiles') {
    return rows.find((row) => row.user_id === currentUser.id || row.user_id === doctorId) ?? null;
  }

  return rows[0] ?? null;
};

const handleAuthRoute = async (route: Route, fallbackRole: E2ERole) => {
  const url = new URL(route.request().url());
  const method = route.request().method();

  if (method === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    return;
  }

  if (url.pathname.endsWith('/auth/v1/token')) {
    let email: string | undefined;
    try {
      const payload = route.request().postDataJSON() as { email?: string };
      email = payload.email;
    } catch {
      email = undefined;
    }
    const user = Object.values(e2eUsers).find((entry) => entry.email === email) ?? e2eUsers[fallbackRole];
    await json(route, sessionFor(user));
    return;
  }

  if (url.pathname.endsWith('/auth/v1/user')) {
    await json(route, asSupabaseUser(userForRequest(route, fallbackRole)));
    return;
  }

  if (url.pathname.endsWith('/auth/v1/logout')) {
    await json(route, {});
    return;
  }

  await json(route, {});
};

const handleRestRoute = async (
  route: Route,
  fallbackRole: E2ERole,
  profileCompleted: boolean
) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const pathParts = url.pathname.split('/').filter(Boolean);
  const table = decodeURIComponent(pathParts[pathParts.length - 1] ?? '');

  if (method === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    return;
  }

  if (url.pathname.includes('/rest/v1/rpc/')) {
    await json(route, rpcPayload(table));
    return;
  }

  const currentUser = userForRequest(route, fallbackRole);
  const rows = tableRows(table, currentUser.role, profileCompleted);

  if (method !== 'GET' && method !== 'HEAD') {
    const body = isObjectResponse(route) ? currentTableRow(table, rows, currentUser, profileCompleted) ?? {} : rows;
    await json(route, body);
    return;
  }

  if (method === 'HEAD') {
    await route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'content-range': `0-0/${rows.length}`,
      },
    });
    return;
  }

  if (isObjectResponse(route)) {
    await json(route, currentTableRow(table, rows, currentUser, profileCompleted));
    return;
  }

  await json(route, rows);
};

export async function installSupabaseMocks(
  page: Page,
  options: { role?: E2ERole; profileCompleted?: boolean } = {}
) {
  const fallbackRole = options.role ?? 'patient';
  const profileCompleted = options.profileCompleted ?? true;

  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => handleAuthRoute(route, fallbackRole));
  await page.route(`${SUPABASE_URL}/rest/v1/**`, (route) =>
    handleRestRoute(route, fallbackRole, profileCompleted)
  );
  await page.route(`${SUPABASE_URL}/functions/v1/**`, (route) =>
    json(route, {
      response: 'AI-generated E2E guidance based on the mocked patient context.',
      message: 'AI-generated E2E guidance based on the mocked patient context.',
      evidence: [],
      actions: [],
    })
  );
  await page.route(`${SUPABASE_URL}/storage/v1/**`, (route) =>
    json(route, { Key: 'e2e-upload', signedURL: `${SUPABASE_URL}/storage/v1/object/sign/e2e-upload` })
  );
}

export async function seedAuthenticatedRole(
  page: Page,
  role: E2ERole,
  options: { profileCompleted?: boolean } = {}
) {
  const session = sessionFor(e2eUsers[role]);
  await page.addInitScript(
    ({ authStorageKey, seededSession }) => {
      window.localStorage.setItem(authStorageKey, JSON.stringify(seededSession));
      window.localStorage.setItem('i18nextLng', 'en');
      window.sessionStorage.setItem('ceenaix_preview_access_v1', '1');
    },
    {
      authStorageKey: AUTH_STORAGE_KEY,
      seededSession: session,
      profileCompleted: options.profileCompleted ?? true,
    }
  );
}

export async function seedUnauthenticated(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem('sb-placeholder-auth-token');
    window.localStorage.setItem('i18nextLng', 'en');
    window.sessionStorage.setItem('ceenaix_preview_access_v1', '1');
  });
}
