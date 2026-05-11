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

export const workflowIds = {
  appointment: '00000000-0000-4000-8000-00000000f601',
  preVisitAssessment: '00000000-0000-4000-8000-00000000f701',
  labOrder: '00000000-0000-4000-8000-00000000f901',
  labOrderItem: '00000000-0000-4000-8000-00000000f911',
};

export interface E2EWorkflowState {
  organizations: JsonRecord[];
  appointments: JsonRecord[];
  preVisitAssessments: JsonRecord[];
  preVisitAnswers: JsonRecord[];
  preVisitSummaries: JsonRecord[];
  labOrders: JsonRecord[];
  labOrderItems: JsonRecord[];
  notifications: JsonRecord[];
  labActionLog: string[];
}

const cloneRows = (rows: JsonRecord[]) => rows.map((row) => ({ ...row }));

const normalizeLabItemRows = (rows: JsonRecord[]) =>
  rows.map((row, index) => ({
    lab_test_catalog_id: null,
    lab_test_catalog_suggestion_id: null,
    parent_item_id: null,
    sort_order: index + 1,
    test_code: null,
    loinc_code: null,
    display_name_long: row.test_name ?? null,
    description: null,
    status_category: row.result_value == null ? 'pending' : 'normal',
    flag: row.result_value == null ? null : 'N',
    numeric_value: row.result_value == null ? null : Number(row.result_value),
    reference_text: null,
    doctor_comment: null,
    patient_explanation: null,
    retest_due_date: null,
    fasting_required: false,
    unit_cost_aed: null,
    insurance_coverage_aed: null,
    patient_cost_aed: null,
    status_label: row.result_value == null ? 'Pending' : 'Normal',
    category_color: '#10b981',
    trend_direction: null,
    reference_zones: null,
    updated_at: row.created_at ?? now.toISOString(),
    ...row,
  }));

export const createE2EWorkflowState = (
  options: { includeBaselineData?: boolean } = {}
): E2EWorkflowState => ({
  organizations: [],
  appointments: options.includeBaselineData ? cloneRows(appointmentRows) : [],
  preVisitAssessments: [],
  preVisitAnswers: [],
  preVisitSummaries: [],
  labOrders: options.includeBaselineData ? cloneRows(labOrderRows) : [],
  labOrderItems: options.includeBaselineData ? cloneRows(labOrderItemRows) : [],
  notifications: [],
  labActionLog: [],
});

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
    category: 'Hematology',
    status: 'processing',
    status_category: 'pending',
    flag: null,
    result_value: null,
    result_unit: '10^9/L',
    numeric_value: null,
    reference_range: '4.0-11.0',
    reference_text: null,
    reference_min: 4,
    reference_max: 11,
    is_abnormal: false,
    doctor_comment: null,
    patient_explanation: null,
    retest_due_date: null,
    fasting_required: false,
    unit_cost_aed: 90,
    insurance_coverage_aed: 70,
    patient_cost_aed: 20,
    resulted_at: null,
    status_label: 'Pending',
    category_color: '#10b981',
    trend_direction: null,
    reference_zones: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
  {
    id: '00000000-0000-4000-8000-000000000912',
    lab_order_id: labOrderId,
    lab_test_catalog_id: null,
    lab_test_catalog_suggestion_id: null,
    parent_item_id: null,
    sort_order: 2,
    test_name: 'Fasting Glucose',
    test_name_ar: 'Fasting Glucose',
    test_code: 'GLU',
    loinc_code: null,
    display_name_long: 'Fasting Glucose',
    description: 'Fasting blood glucose',
    category: 'Chemistry',
    status: 'resulted',
    status_category: 'normal',
    flag: 'N',
    result_value: '5.1',
    result_unit: 'mmol/L',
    numeric_value: 5.1,
    reference_range: '3.9-5.5',
    reference_text: null,
    reference_min: 3.9,
    reference_max: 5.5,
    is_abnormal: false,
    doctor_comment: null,
    patient_explanation: 'Within the reference range.',
    retest_due_date: null,
    fasting_required: true,
    unit_cost_aed: 50,
    insurance_coverage_aed: 40,
    patient_cost_aed: 10,
    resulted_at: yesterday,
    status_label: 'Normal',
    category_color: '#10b981',
    trend_direction: 'stable',
    reference_zones: null,
    created_at: yesterday,
    updated_at: yesterday,
  },
];

const tableRows = (
  table: string,
  role: E2ERole,
  profileCompleted: boolean,
  state?: E2EWorkflowState
): JsonRecord[] => {
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
      return state ? state.appointments : appointmentRows;
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
      return state ? state.labOrders : labOrderRows;
    case 'lab_order_items':
      return normalizeLabItemRows(state ? state.labOrderItems : labOrderItemRows);
    case 'lab_test_catalog':
      return [
        {
          id: 'lab-test-catalog-e2e',
          source: 'loinc',
          source_code: '58410-2',
          loinc_class: 'HEM/BC',
          category: 'Hematology',
          display_name_en: 'Complete Blood Count',
          display_name_ar: 'Complete Blood Count',
          short_name_en: 'CBC',
          specimen: 'Blood',
          property: 'Panel',
          is_panel: true,
          is_active: true,
          is_custom: false,
          source_updated_at: null,
          last_synced_at: yesterday,
          created_at: yesterday,
          updated_at: yesterday,
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
      return state?.notifications.length
        ? state.notifications
        : [
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
      return state ? state.preVisitAssessments : [];
    case 'appointment_pre_visit_answers':
      return state ? state.preVisitAnswers : [];
    case 'appointment_pre_visit_summaries':
      return state ? state.preVisitSummaries : [];
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

const createPreVisitAssessment = (appointment: JsonRecord): JsonRecord => ({
  id: workflowIds.preVisitAssessment,
  appointment_id: appointment.id,
  patient_id: appointment.patient_id,
  doctor_id: appointment.doctor_id,
  template_id: 'template-workflow-e2e',
  template_title: 'Headache pre-visit questionnaire',
  template_snapshot: {
    title: 'Headache pre-visit questionnaire',
    description: 'Clinical intake generated for the E2E appointment workflow.',
    questions: [
      {
        key: 'symptoms',
        label: 'What symptoms are you experiencing?',
        type: 'long_text',
        required: true,
        options: [],
        helpText: 'Include severity, location, and associated symptoms.',
        memoryKey: 'presenting_symptoms',
      },
      {
        key: 'duration',
        label: 'How long has this been happening?',
        type: 'short_text',
        required: true,
        options: [],
        helpText: null,
        memoryKey: 'symptom_duration',
      },
    ],
  },
  status: 'not_started',
  due_at: tomorrow,
  started_at: null,
  completed_at: null,
  reviewed_at: null,
  last_answered_at: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
});

const baselineOrganizations = (): JsonRecord[] => [
  {
    id: 'org-e2e',
    slug: 'ceenaix-clinic',
    name: 'CeenAiX Clinic',
    kind: 'clinic',
    city: 'Dubai',
    country: 'UAE',
    primary_contact_name: 'Maya Admin',
    primary_contact_email: e2eUsers.super_admin.email,
    baa_signed_at: yesterday,
    contract_started_at: yesterday,
    contract_ends_at: null,
    seats_allocated: 100,
    seats_used: 42,
    status: 'active',
    notes: 'DHA-C-2026-001 · NABIDH connected · E2E organization fixture',
    created_at: yesterday,
    updated_at: yesterday,
  },
];

const organizationsForState = (state?: E2EWorkflowState): JsonRecord[] => [
  ...baselineOrganizations(),
  ...(state?.organizations ?? []),
];

const adminContextPayload = (state?: E2EWorkflowState): JsonRecord => {
  const organizations = organizationsForState(state);
  const orgCount = (kind: string) => organizations.filter((org) => org.kind === kind).length;
  return {
    total_patients: 1220,
    patients_30d_active: 346,
    patients_new_month: 38,
    patients_flagged: 3,
    patients_suspended: 1,
    patient_change_pct: 8.4,
    verified_doctors: 214,
    pending_doctors: 1,
    doctors_added_this_month: 7,
    doctors_active_now: 18,
    doctor_license_alerts: 1,
    doctor_avg_rating: 4.8,
    doctor_fees_mtd_aed: 812450,
    connected_orgs: organizations.length,
    orgs_clinics: orgCount('clinic'),
    orgs_hospitals: orgCount('hospital'),
    orgs_pharmacies: orgCount('pharmacy'),
    orgs_labs: orgCount('lab'),
    orgs_added_this_month: state?.organizations.length ?? 0,
    ai_sessions_today: 184,
    ai_sessions_month: 3200,
    ai_sessions_alltime: 45000,
    ai_active_now: 24,
    ai_avg_response_sec: 1.2,
    ai_uptime_pct: 99.9,
    ai_satisfaction: 4.7,
    ai_satisfaction_count: 642,
    ai_to_booking_pct: 12.5,
    ai_to_booking_count: 33,
    ai_safety_flags_today: 1,
    ai_safety_escalated: 0,
    ai_safety_resolved: 1,
    ai_revenue_today_aed: 5200,
    ai_revenue_net_aed: 4380,
    ai_revenue_margin_pct: 84,
    revenue_today_aed: 42800,
    revenue_target_aed: 50000,
    revenue_change_pct: 6.2,
    uptime_pct: 99.95,
    uptime_incidents_month: 0,
    dha_score: 97.4,
    dha_license: 'DHA-CEENAIX-E2E',
    dha_license_expires: '2027-12-31',
    active_sessions: 346,
    open_issues: 1,
    super_admin_name: e2eUsers.super_admin.fullName,
    super_admin_role_label: 'Super Admin · E2E',
    super_admin_organization: 'AryAiX LLC',
    platform_version: 'v2.4.1',
    environment_label: 'E2E',
    updated_at: now.toISOString(),
  };
};

const orgsSummaryPayload = (state?: E2EWorkflowState) => {
  const organizations = organizationsForState(state);
  const count = (kind: string) => organizations.filter((org) => org.kind === kind).length;
  return {
    total: organizations.length,
    hospitals: count('hospital'),
    clinics: count('clinic'),
    pharmacies: count('pharmacy'),
    labs: count('lab'),
    insurance: count('insurance'),
  };
};

const asArray = (payload: unknown): JsonRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object'));
  }

  if (payload && typeof payload === 'object') {
    return [payload as JsonRecord];
  }

  return [];
};

const parsePostData = (route: Route): unknown => {
  try {
    return route.request().postDataJSON();
  } catch {
    return null;
  }
};

const updateAppointment = (
  state: E2EWorkflowState | undefined,
  appointmentIdValue: unknown,
  changes: JsonRecord
) => {
  if (!state || typeof appointmentIdValue !== 'string') {
    return;
  }

  state.appointments.forEach((appointment) => {
    if (appointment.id === appointmentIdValue) {
      Object.assign(appointment, changes, { updated_at: now.toISOString() });
    }
  });
};

const rpcPayload = (
  rpcName: string,
  state?: E2EWorkflowState,
  payload?: unknown
): JsonRecord | JsonRecord[] | null => {
  switch (rpcName) {
    case 'admin_get_metrics':
      return {
        generatedAt: now.toISOString(),
        totals: {
          users: 1842,
          appointmentsToday: 42,
          completedConsultsThisMonth: 316,
          pendingApprovals: 7,
          activeIncidents: 2,
        },
        usersByRole: {
          patient: 1220,
          doctor: 214,
          lab: 18,
          super_admin: 4,
        },
        ai: {
          sessions30d: 3200,
          flaggedOutputs30d: 2,
        },
        compliance: {
          auditEvents30d: 128,
          activeIncidents: 2,
        },
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
      return organizationsForState(state);
    case 'admin_create_organization': {
      const input = (payload && typeof payload === 'object' ? payload : {}) as JsonRecord;
      const name = typeof input.in_name === 'string' ? input.in_name : 'E2E Organization';
      const kind = typeof input.in_kind === 'string' ? input.in_kind : 'clinic';
      const created = {
        id: `org-created-${(state?.organizations.length ?? 0) + 1}`,
        slug:
          typeof input.in_slug === 'string' && input.in_slug.trim()
            ? input.in_slug.trim()
            : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        name,
        kind,
        city: typeof input.in_city === 'string' ? input.in_city : null,
        country: 'UAE',
        primary_contact_name:
          typeof input.in_primary_contact_name === 'string' ? input.in_primary_contact_name : null,
        primary_contact_email:
          typeof input.in_primary_contact_email === 'string' ? input.in_primary_contact_email : null,
        baa_signed_at: null,
        contract_started_at: null,
        contract_ends_at: null,
        seats_allocated: typeof input.in_seats_allocated === 'number' ? input.in_seats_allocated : 0,
        seats_used: 0,
        status: typeof input.in_status === 'string' ? input.in_status : 'pending',
        notes: typeof input.in_notes === 'string' ? input.in_notes : null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      state?.organizations.push(created);
      return created;
    }
    case 'admin_list_incidents':
      return [
        {
          id: 'incident-e2e',
          title: 'RLS audit review',
          summary: 'Reviewing access policy telemetry from the E2E fixture.',
          severity: 'medium',
          status: 'investigating',
          detected_at: yesterday,
          resolved_at: null,
          owner_user_id: adminId,
          affected_records: 0,
          regulator_reported: false,
          metadata: {},
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'admin_list_audit_events':
      return [
        {
          id: 'audit-event-e2e',
          user_id: adminId,
          actor_name: e2eUsers.super_admin.fullName,
          action: 'viewed_dashboard',
          table_name: 'admin_dashboard',
          record_id: 'dashboard',
          created_at: yesterday,
        },
      ];
    case 'admin_get_system_health':
      return {
        generatedAt: now.toISOString(),
        services: [
          {
            id: 'service-supabase',
            service_key: 'supabase',
            service_name: 'Supabase',
            category: 'core',
            status: 'healthy',
            latency_ms: 42,
            region: 'me-central-1',
            message: 'Operational',
            observed_at: yesterday,
            created_at: yesterday,
          },
        ],
        integrations: [
          {
            id: 'service-nabidh',
            service_key: 'nabidh',
            service_name: 'NABIDH Gateway',
            category: 'integration',
            status: 'healthy',
            latency_ms: 71,
            region: 'Dubai',
            message: 'Mocked E2E integration check',
            observed_at: yesterday,
            created_at: yesterday,
          },
        ],
        aiServices: [
          {
            id: 'service-ai-chat',
            service_key: 'ai-chat',
            service_name: 'AI Chat Edge Function',
            category: 'ai',
            status: 'healthy',
            latency_ms: 88,
            region: 'global',
            message: 'Operational',
            observed_at: yesterday,
            created_at: yesterday,
          },
        ],
      };
    case 'admin_get_ai_analytics':
      return {
        generatedAt: now.toISOString(),
        sessions: {
          last7Days: 820,
          last30Days: 3200,
          guestLast30Days: 410,
        },
        messages: {
          last30Days: 12800,
        },
        safety: {
          flaggedLast30Days: 2,
        },
      };
    case 'admin_get_dashboard':
      return {
        generatedAt: now.toISOString(),
        context: adminContextPayload(state),
        issues: [
          {
            id: 'issue-e2e',
            severity: 'medium',
            category: 'license',
            title: '1 doctor awaiting DHA verification',
            detail: 'E2E pending doctor review.',
            cta_label: 'Review',
            cta_kind: 'doctor',
          },
        ],
        portals: [
          {
            id: 'portal-patient',
            portal_key: 'patient',
            portal_name: 'Patient Portal',
            active_users: 180,
            latency_ms: 42,
            status: 'online',
            observed_at: now.toISOString(),
          },
          {
            id: 'portal-lab',
            portal_key: 'lab',
            portal_name: 'Lab Portal',
            active_users: 12,
            latency_ms: 51,
            status: 'online',
            observed_at: now.toISOString(),
          },
        ],
        liveActivity: [
          {
            id: 'activity-e2e',
            category: 'appointment',
            title: 'Workflow appointment booked',
            detail: 'Aisha Patient booked with Dr. Omar Doctor.',
            occurred_at: now.toISOString(),
            ago_label: 'now',
          },
        ],
        complianceChecklist: [
          {
            id: 'compliance-e2e',
            label: 'RLS enabled',
            detail: 'All clinical tables guarded.',
            is_compliant: true,
          },
        ],
        licenseAlerts: [
          {
            id: 'license-alert-e2e',
            doctor_name: e2eUsers.doctor.fullName,
            doctor_initials: 'OD',
            days_remaining: 28,
            severity: 'medium',
          },
        ],
        revenueDaily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
          id: `revenue-${day}`,
          day_label: day,
          day_index: index,
          total_aed: 10000 + index * 500,
          consults_aed: 7000 + index * 400,
          ai_aed: 1200 + index * 100,
          lab_aed: 1800 + index * 50,
          target_aed: 12000,
        })),
        orgsSummary: orgsSummaryPayload(state),
      };
    case 'admin_get_doctor_directory':
      return [
        {
          id: doctorId,
          initials: 'OD',
          full_name: e2eUsers.doctor.fullName,
          age: 42,
          gender: 'male',
          nationality: 'UAE',
          dha_license: 'DHA-E2E-DOCTOR',
          dha_verified: true,
          specialty: 'Family Medicine',
          specialty_sub: 'Primary care',
          clinic_name: 'CeenAiX Clinic',
          city: 'Dubai',
          consults_lifetime: 326,
          consults_recent_label: '18 this month',
          rating: 4.8,
          rating_count: 94,
          license_expires_at: '2027-12-31',
          license_expires_label: 'Expires Dec 31, 2027',
          reminder_status: null,
          status_label: 'verified',
          status_flag: null,
          badge_emoji: null,
          badge_label: null,
          sort_order: 1,
        },
      ];
    case 'admin_get_patient_directory':
      return [
        {
          id: patientId,
          initials: 'AP',
          full_name: e2eUsers.patient.fullName,
          age: 36,
          gender: 'female',
          blood_type: 'O+',
          patient_code: 'PAT-E2E-001',
          emirates_id_masked: '784-****-0001',
          insurance_plan: 'CeenAiX Gold',
          insurance_member_id_masked: 'MEM-****-001',
          city: 'Dubai',
          joined_label: 'Mar 2026',
          last_active_label: 'Today',
          risk_level: 'low',
          status_label: 'active',
          status_flag: null,
          badge_emoji: null,
          badge_label: null,
          sort_order: 1,
        },
      ];
    case 'admin_get_insurance_partners':
      return [
        {
          id: 'insurance-partner-e2e',
          initials: 'CG',
          insurer_name: 'CeenAiX Gold',
          cbuae_license: 'CBUAE-E2E',
          partner_tier: 'premium',
          is_government: false,
          is_new_partner: true,
          api_status: 'healthy',
          api_latency_ms: 74,
          members: 1240,
          claims_today: 18,
          claim_value_today_aed: 42000,
          auto_approval_pct: 91,
          plan_pills: ['Gold', 'Family'],
          partner_since: '2026',
          platform_revenue_label: 'AED 42,000',
          sla_status: 'Met',
          breach_label: null,
          fraud_alert_count: 0,
          fraud_alert_severity: null,
          api_warning_label: null,
          sla_breach_label: null,
          notes: 'E2E insurance partner',
          sort_order: 1,
        },
      ];
    case 'admin_get_ai_dashboard':
      return {
        generatedAt: now.toISOString(),
        context: adminContextPayload(state),
        languages: [
          {
            id: 'ai-lang-en',
            bucket: 'language',
            label: 'English',
            sub_label: 'Default',
            sessions: 2400,
            percent: 75,
            metric_1_label: 'CSAT',
            metric_1_value: '4.7',
            metric_2_label: 'Escalations',
            metric_2_value: '12',
            metric_3_label: null,
            metric_3_value: null,
            metric_4_label: null,
            metric_4_value: null,
            sort_order: 1,
          },
        ],
        topics: [],
        portals: [],
      };
    case 'admin_list_feature_flags':
      return [
        {
          id: 'flag-e2e',
          key: 'patient_ai_chat',
          name: 'Patient AI Chat',
          description: 'Patient AI chat',
          environment: 'production',
          is_enabled: true,
          rollout_percent: 100,
          updated_by: adminId,
          created_at: yesterday,
          updated_at: yesterday,
        },
      ];
    case 'get_bookable_doctors':
      return [
        {
          user_id: doctorId,
          full_name: e2eUsers.doctor.fullName,
          specialty: 'Family Medicine',
          specialization_ids: ['specialization-e2e'],
          city: 'Dubai',
          address: 'Dubai Healthcare City',
          bio: 'Board-certified family medicine doctor.',
          consultation_fee: 350,
          active_availability_count: 1,
        },
      ];
    case 'cancel_patient_appointment':
      updateAppointment(state, (payload as JsonRecord | null)?.p_appointment_id, {
        status: 'cancelled',
        cancelled_at: now.toISOString(),
      });
      return { ok: true };
    case 'cancel_doctor_appointment':
      updateAppointment(state, (payload as JsonRecord | null)?.p_appointment_id, {
        status: 'cancelled',
        cancelled_at: now.toISOString(),
      });
      return { ok: true };
    case 'reschedule_patient_appointment':
      updateAppointment(state, (payload as JsonRecord | null)?.p_appointment_id, {
        status: 'scheduled',
        scheduled_at: (payload as JsonRecord | null)?.p_scheduled_at,
        duration_minutes: (payload as JsonRecord | null)?.p_duration_minutes,
        chief_complaint: (payload as JsonRecord | null)?.p_chief_complaint,
        notes: (payload as JsonRecord | null)?.p_notes,
      });
      return { id: (payload as JsonRecord | null)?.p_appointment_id ?? null };
    case 'lab_claim_order':
      state?.labActionLog.push(`claim:${(payload as JsonRecord | null)?.target_order_id ?? ''}`);
      return { ok: true };
    case 'lab_start_processing':
      state?.labActionLog.push(`start:${(payload as JsonRecord | null)?.target_order_id ?? ''}`);
      state?.labOrders.forEach((order) => {
        if (order.id === (payload as JsonRecord | null)?.target_order_id) {
          order.status = 'processing';
        }
      });
      return { ok: true };
    case 'lab_save_item_result':
      state?.labActionLog.push(`save:${(payload as JsonRecord | null)?.target_item_id ?? ''}`);
      state?.labOrderItems.forEach((item) => {
        if (item.id === (payload as JsonRecord | null)?.target_item_id) {
          item.status = 'resulted';
          item.status_category = 'normal';
          item.status_label = 'Normal';
          item.result_value = (payload as JsonRecord | null)?.result_value ?? null;
          item.result_unit = (payload as JsonRecord | null)?.result_unit ?? null;
          item.numeric_value = Number((payload as JsonRecord | null)?.result_value ?? null);
          item.reference_range = (payload as JsonRecord | null)?.reference_range ?? null;
          item.is_abnormal = Boolean((payload as JsonRecord | null)?.is_abnormal);
          item.resulted_at = now.toISOString();
        }
      });
      return { ok: true };
    case 'lab_release_order':
      state?.labActionLog.push(`release:${(payload as JsonRecord | null)?.target_order_id ?? ''}`);
      state?.labOrders.forEach((order) => {
        if (order.id === (payload as JsonRecord | null)?.target_order_id) {
          const items = state.labOrderItems.filter((item) => item.lab_order_id === order.id);
          const allItemsResulted = items.length > 0 && items.every((item) => item.result_value != null);
          if (allItemsResulted) {
            order.status = 'resulted';
          } else {
            state.labActionLog.push(`release_blocked:${order.id}`);
          }
        }
      });
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
  profileCompleted: boolean,
  url?: URL
): JsonRecord | null => {
  if (table === 'user_profiles') {
    return userProfile(currentUser, profileCompleted);
  }

  if (table === 'appointments') {
    const idFilter = url?.searchParams.get('id');
    const id = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null;
    if (id) {
      return rows.find((row) => row.id === id) ?? null;
    }
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
  profileCompleted: boolean,
  state?: E2EWorkflowState
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
    await json(route, rpcPayload(table, state, parsePostData(route)));
    return;
  }

  const currentUser = userForRequest(route, fallbackRole);
  const rows = tableRows(table, currentUser.role, profileCompleted, state);

  if (method !== 'GET' && method !== 'HEAD') {
    const payload = parsePostData(route);

    if (state && method === 'POST' && table === 'appointments') {
      const [appointmentPayload] = asArray(payload);
      const appointment = {
        ...appointmentPayload,
        id: workflowIds.appointment,
        is_deleted: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      state.appointments.push(appointment);
      state.preVisitAssessments.push(createPreVisitAssessment(appointment));
      await json(route, isObjectResponse(route) ? { id: appointment.id } : [appointment]);
      return;
    }

    if (state && method === 'POST' && table === 'lab_orders') {
      const [labOrderPayload] = asArray(payload);
      const labOrder = {
        ...labOrderPayload,
        id: workflowIds.labOrder,
        assigned_lab_id: labId,
        ordered_at: now.toISOString(),
        updated_at: now.toISOString(),
        is_deleted: false,
      };
      state.labOrders.push(labOrder);
      await json(route, isObjectResponse(route) ? { id: labOrder.id } : [labOrder]);
      return;
    }

    if (state && method === 'POST' && table === 'lab_order_items') {
      const insertedItems = asArray(payload).map((item, index) => ({
        ...item,
        id: index === 0 ? workflowIds.labOrderItem : `${workflowIds.labOrderItem}-${index + 1}`,
        parent_item_id: null,
        sort_order: index + 1,
        loinc_code: item.test_code ?? null,
        display_name_long: item.test_name ?? null,
        description: null,
        status_category: 'pending',
        flag: null,
        result_value: null,
        result_unit: null,
        numeric_value: null,
        reference_range: null,
        reference_text: null,
        reference_min: null,
        reference_max: null,
        is_abnormal: null,
        doctor_comment: null,
        patient_explanation: null,
        retest_due_date: null,
        fasting_required: false,
        unit_cost_aed: null,
        insurance_coverage_aed: null,
        patient_cost_aed: null,
        status_label: 'Pending',
        category_color: '#10b981',
        trend_direction: null,
        reference_zones: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        resulted_at: null,
      }));
      state.labOrderItems.push(...insertedItems);
      await json(route, isObjectResponse(route) ? insertedItems[0] ?? {} : insertedItems);
      return;
    }

    if (state && method === 'POST' && table === 'notifications') {
      const insertedNotifications = asArray(payload).map((notification, index) => ({
        ...notification,
        id: `notification-workflow-${state.notifications.length + index + 1}`,
        created_at: now.toISOString(),
        read_at: null,
      }));
      state.notifications.push(...insertedNotifications);
      await json(route, isObjectResponse(route) ? insertedNotifications[0] ?? {} : insertedNotifications);
      return;
    }

    if (state && (method === 'POST' || method === 'PATCH') && table === 'appointment_pre_visit_answers') {
      const incomingAnswers = asArray(payload);
      incomingAnswers.forEach((answer) => {
        const index = state.preVisitAnswers.findIndex(
          (current) =>
            current.assessment_id === answer.assessment_id &&
            current.question_key === answer.question_key
        );
        const nextAnswer = { ...answer, created_at: now.toISOString(), updated_at: now.toISOString() };
        if (index >= 0) {
          state.preVisitAnswers[index] = { ...state.preVisitAnswers[index], ...nextAnswer };
        } else {
          state.preVisitAnswers.push(nextAnswer);
        }
      });
      await json(route, isObjectResponse(route) ? incomingAnswers[0] ?? {} : incomingAnswers);
      return;
    }

    if (state && method === 'PATCH' && table === 'appointment_pre_visit_assessments') {
      const [assessmentPatch] = asArray(payload);
      state.preVisitAssessments.forEach((assessment) => {
        Object.assign(assessment, assessmentPatch, { updated_at: now.toISOString() });
      });
      await json(route, isObjectResponse(route) ? state.preVisitAssessments[0] ?? {} : state.preVisitAssessments);
      return;
    }

    if (state && (method === 'POST' || method === 'PATCH') && table === 'appointment_pre_visit_summaries') {
      const [summaryPayload] = asArray(payload);
      const summary = {
        ...summaryPayload,
        id: 'summary-workflow-e2e',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      state.preVisitSummaries.splice(0, state.preVisitSummaries.length, summary);
      await json(route, isObjectResponse(route) ? summary : [summary]);
      return;
    }

    const body = isObjectResponse(route) ? currentTableRow(table, rows, currentUser, profileCompleted, url) ?? {} : rows;
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
    await json(route, currentTableRow(table, rows, currentUser, profileCompleted, url));
    return;
  }

  await json(route, rows);
};

export async function installSupabaseMocks(
  page: Page,
  options: { role?: E2ERole; profileCompleted?: boolean; state?: E2EWorkflowState } = {}
) {
  const fallbackRole = options.role ?? 'patient';
  const profileCompleted = options.profileCompleted ?? true;
  const state = options.state;

  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => handleAuthRoute(route, fallbackRole));
  await page.route(`${SUPABASE_URL}/rest/v1/**`, (route) =>
    handleRestRoute(route, fallbackRole, profileCompleted, state)
  );
  await page.route(`${SUPABASE_URL}/functions/v1/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/functions/v1/ai-document-analyze')) {
      return json(route, {
        summaryText: 'AI-generated E2E pre-visit summary for recurrent headaches.',
        keyPoints: ['Patient reports headache symptoms before the visit.'],
        riskFlags: [],
        pendingQuestions: [],
      });
    }

    return json(route, {
      response: 'AI-generated E2E guidance based on the mocked patient context.',
      message: 'AI-generated E2E guidance based on the mocked patient context.',
      evidence: [],
      actions: [],
    });
  });
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
