import type {
  UserRole,
  AppointmentType,
  AppointmentStatus,
  PrescriptionStatus,
  MedicationCatalogEnrichmentStatus,
  MedicationCatalogSource,
  MedicationCatalogSuggestionType,
  MedicationCatalogSuggestionStatus,
  LabTestCatalogSource,
  LabTestCatalogSuggestionType,
  LabTestCatalogSuggestionStatus,
  LabOrderStatus,
  ConditionStatus,
  AllergySeverity,
  NotificationType,
  AiMessageRole,
  AuditAction,
  PreVisitTemplateStatus,
  PreVisitQuestionType,
  PreVisitAssessmentStatus,
  PatientMemorySourceKind,
  PatientMemoryValueType,
  PatientMemoryStatus,
  PatientCanonicalUpdateSourceKind,
  PatientCanonicalUpdateStatus,
  PatientCanonicalUpdateStrategy,
  PatientReportedMedicationReviewStatus,
} from './enums';

/** Base fields present on most tables */
interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

/** Soft-deletable clinical records */
interface SoftDeletable {
  is_deleted: boolean;
  deleted_at: string | null;
}

// ---------------------------------------------------------------------------
// Identity & Profiles
// ---------------------------------------------------------------------------

export interface UserProfile extends BaseRecord {
  user_id: string;
  role: UserRole;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  emirates_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  avatar_url: string | null;
  notification_preferences: Record<string, unknown>;
  profile_completed: boolean;
  terms_accepted: boolean;
}

export interface PatientProfile extends BaseRecord {
  user_id: string;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface DoctorProfile extends BaseRecord {
  user_id: string;
  license_number: string | null;
  specialization: string | null;
  sub_specialization: string | null;
  years_of_experience: number | null;
  consultation_fee: number | null;
  bio: string | null;
  languages_spoken: string[];
  dha_license_verified: boolean;
  dha_verified_at: string | null;
}

export interface Specialization extends BaseRecord {
  slug: string;
  name: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface DoctorSpecialization extends BaseRecord {
  doctor_user_id: string;
  specialization_id: string;
}

// ---------------------------------------------------------------------------
// Clinical
// ---------------------------------------------------------------------------

export interface Appointment extends BaseRecord, SoftDeletable {
  patient_id: string;
  doctor_id: string;
  facility_id: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  duration_minutes: number;
  chief_complaint: string | null;
  notes: string | null;
}

export interface ConsultationNote extends BaseRecord, SoftDeletable {
  appointment_id: string;
  doctor_id: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  ai_generated_draft: string | null;
  doctor_approved: boolean;
}

export interface Prescription extends BaseRecord, SoftDeletable {
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  pharmacy_organization_id?: string | null;
  status: PrescriptionStatus;
  prescribed_at: string;
}

export interface PrescriptionItem extends BaseRecord {
  prescription_id: string;
  medication_catalog_id?: string | null;
  medication_catalog_suggestion_id?: string | null;
  medication_name: string;
  /** Arabic display label; optional — UI pairs with medication_name when locale is non-English */
  medication_name_ar: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  frequency_code?: string | null;
  duration_code?: string | null;
  quantity: number | null;
  instructions: string | null;
  is_dispensed: boolean;
}

export interface MedicationCatalog extends BaseRecord {
  source: MedicationCatalogSource;
  source_code: string | null;
  generic_name_en: string;
  brand_name_en: string | null;
  display_name_ar: string | null;
  strength: string | null;
  dosage_form: string | null;
  manufacturer: string | null;
  rxnorm_tty: string | null;
  ingredient_name_en: string | null;
  enrichment_status: MedicationCatalogEnrichmentStatus;
  enrichment_error: string | null;
  last_enriched_at: string | null;
  is_active: boolean;
  is_custom: boolean;
  source_updated_at: string | null;
  last_synced_at: string | null;
}

export interface MedicationCatalogSuggestion extends BaseRecord {
  medication_catalog_id: string | null;
  approved_medication_catalog_id: string | null;
  suggestion_type: MedicationCatalogSuggestionType;
  status: MedicationCatalogSuggestionStatus;
  proposed_generic_name_en: string | null;
  proposed_brand_name_en: string | null;
  proposed_display_name_ar: string | null;
  proposed_strength: string | null;
  proposed_dosage_form: string | null;
  proposed_manufacturer: string | null;
  review_notes: string | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface LabTestCatalog extends BaseRecord {
  source: LabTestCatalogSource;
  source_code: string | null;
  loinc_class: string | null;
  category: string | null;
  display_name_en: string;
  display_name_ar: string | null;
  short_name_en: string | null;
  specimen: string | null;
  property: string | null;
  is_panel: boolean;
  is_active: boolean;
  is_custom: boolean;
  source_updated_at: string | null;
  last_synced_at: string | null;
}

export interface LabTestCatalogSuggestion extends BaseRecord {
  lab_test_catalog_id: string | null;
  approved_lab_test_catalog_id: string | null;
  suggestion_type: LabTestCatalogSuggestionType;
  status: LabTestCatalogSuggestionStatus;
  proposed_source_code: string | null;
  proposed_display_name_en: string | null;
  proposed_display_name_ar: string | null;
  proposed_short_name_en: string | null;
  proposed_specimen: string | null;
  proposed_property: string | null;
  proposed_category: string | null;
  proposed_loinc_class: string | null;
  proposed_is_panel: boolean;
  review_notes: string | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export type LabOrderUrgency = 'routine' | 'stat' | 'urgent';

export interface LabOrder extends BaseRecord, SoftDeletable {
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  status: LabOrderStatus;
  ordered_at: string;
  assigned_lab_id: string | null;
  lab_order_code: string | null;
  nabidh_reference: string | null;
  ordered_by_specialty: string | null;
  sample_collection_at: string | null;
  results_released_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  overall_comment: string | null;
  due_by: string | null;
  urgency: LabOrderUrgency;
  fasting_required: boolean;
  total_cost_aed: number | null;
  insurance_coverage_aed: number | null;
  patient_cost_aed: number | null;
  report_pdf_url: string | null;
}

export type LabItemStatusCategory = 'normal' | 'borderline' | 'high' | 'low' | 'critical' | 'pending';
export type LabItemFlag = 'N' | 'H' | 'HH' | 'L' | 'LL';

export interface LabOrderItem extends BaseRecord {
  lab_order_id: string;
  lab_test_catalog_id?: string | null;
  lab_test_catalog_suggestion_id?: string | null;
  parent_item_id: string | null;
  sort_order: number;
  test_name: string;
  test_name_ar?: string | null;
  test_code: string | null;
  loinc_code: string | null;
  display_name_long: string | null;
  description: string | null;
  status: LabOrderStatus;
  status_category: LabItemStatusCategory;
  flag: LabItemFlag | null;
  result_value: string | null;
  result_unit: string | null;
  numeric_value: number | null;
  reference_range: string | null;
  reference_text: string | null;
  reference_min: number | null;
  reference_max: number | null;
  is_abnormal: boolean | null;
  doctor_comment: string | null;
  patient_explanation: string | null;
  retest_due_date: string | null;
  fasting_required: boolean;
  unit_cost_aed: number | null;
  insurance_coverage_aed: number | null;
  patient_cost_aed: number | null;
  resulted_at: string | null;
  status_label: string | null;
  category_color: string | null;
  trend_direction: LabTrendDirection | null;
  reference_zones: LabReferenceZone[] | null;
}

export type LabTrendDirection = 'improving' | 'worsening' | 'stable';

export interface LabReferenceZone {
  label: string;
  min?: number;
  max?: number;
  color: string;
}

export interface PatientVital extends BaseRecord, SoftDeletable {
  patient_id: string;
  appointment_id: string | null;
  recorded_by: string | null;
  recorded_at: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2_percent: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  source: string;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Medical Records
// ---------------------------------------------------------------------------

export interface MedicalCondition extends BaseRecord, SoftDeletable {
  patient_id: string;
  condition_name: string;
  icd_code: string | null;
  diagnosed_date: string | null;
  status: ConditionStatus;
  notes: string | null;
}

export interface Allergy extends BaseRecord, SoftDeletable {
  patient_id: string;
  allergen: string;
  severity: AllergySeverity;
  reaction: string | null;
  confirmed_by_doctor: boolean;
}

export interface Vaccination extends BaseRecord, SoftDeletable {
  patient_id: string;
  vaccine_name: string;
  dose_number: number | null;
  administered_date: string | null;
  administered_by: string | null;
  next_dose_due: string | null;
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export interface Conversation extends BaseRecord {
  created_by: string;
  participant_ids: string[];
  subject: string | null;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export interface AiChatSession {
  id: string;
  user_id: string | null;
  session_token: string;
  started_at: string;
  ended_at: string | null;
  context_patient_id: string | null;
  created_at: string;
}

export interface AiChatMessage {
  id: string;
  session_id: string;
  role: AiMessageRole;
  content: string;
  attachments: unknown[];
  created_at: string;
}

export interface PreVisitTemplate extends BaseRecord, SoftDeletable {
  doctor_user_id: string;
  specialization_id: string | null;
  title: string;
  description: string | null;
  status: PreVisitTemplateStatus;
  is_active: boolean;
  source_bucket: string | null;
  source_path: string | null;
  source_file_name: string | null;
  extraction_metadata: Record<string, unknown>;
  published_at: string | null;
}

export interface PreVisitTemplateQuestion extends BaseRecord {
  template_id: string;
  question_key: string;
  label: string;
  help_text: string | null;
  question_type: PreVisitQuestionType;
  display_order: number;
  is_required: boolean;
  options: unknown[];
  autofill_source: string | null;
  memory_key: string | null;
  ai_instructions: string | null;
}

export interface AppointmentPreVisitAssessment extends BaseRecord {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  template_id: string | null;
  template_title: string;
  template_snapshot: Record<string, unknown>;
  status: PreVisitAssessmentStatus;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  last_answered_at: string | null;
}

export interface AppointmentPreVisitAnswer extends BaseRecord {
  assessment_id: string;
  question_key: string;
  question_label: string;
  question_type: PreVisitQuestionType;
  answer_text: string | null;
  answer_json: unknown;
  autofill_value: unknown;
  autofill_source: string | null;
  autofilled: boolean;
  confirmed_by_patient: boolean;
  answered_at: string | null;
}

export interface AppointmentPreVisitSummary {
  id: string;
  assessment_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  summary_text: string;
  key_points: unknown[];
  risk_flags: unknown[];
  pending_questions: unknown[];
  generated_by: string;
  generated_at: string;
  updated_at: string;
}

export interface PatientMemoryFact extends BaseRecord {
  patient_id: string;
  source_kind: PatientMemorySourceKind;
  source_record_id: string;
  memory_key: string;
  label: string;
  value_type: PatientMemoryValueType;
  value_text: string | null;
  value_json: unknown;
  status: PatientMemoryStatus;
  confidence: number;
  usable_in_chat: boolean;
  usable_in_forms: boolean;
  confirmed_at: string | null;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
}

export interface PatientCanonicalUpdateRequest extends BaseRecord {
  patient_id: string;
  source_kind: PatientCanonicalUpdateSourceKind;
  source_record_id: string;
  target_field: string;
  display_label: string;
  apply_strategy: PatientCanonicalUpdateStrategy;
  current_value: unknown;
  proposed_value: unknown;
  status: PatientCanonicalUpdateStatus;
  requires_doctor_review: boolean;
  metadata: Record<string, unknown>;
  confirmed_at: string | null;
  applied_at: string | null;
  dismissed_at: string | null;
}

export interface PatientReportedMedication extends BaseRecord, SoftDeletable {
  patient_id: string;
  source_update_request_id: string | null;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  review_status: PatientReportedMedicationReviewStatus;
  is_current: boolean;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export interface HealthArticle extends BaseRecord {
  title: string;
  slug: string;
  body: string;
  category: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export interface InsurancePlan extends BaseRecord {
  name: string;
  provider_company: string;
  coverage_type: string | null;
  annual_limit: number | null;
  co_pay_percentage: number | null;
  network_type: string | null;
  is_active: boolean;
}

export interface PatientInsurance extends BaseRecord {
  patient_id: string;
  insurance_plan_id: string;
  policy_number: string | null;
  member_id: string | null;
  card_photo_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_primary: boolean;
  annual_limit_used: number;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export interface DoctorAvailability extends BaseRecord {
  doctor_id: string;
  facility_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface BlockedSlot extends BaseRecord {
  doctor_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Lab (backend: Phase 3 / MVP lab portal)
// ---------------------------------------------------------------------------

export interface LabProfile extends BaseRecord {
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  short_code: string | null;
  dha_accreditation_code: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
}

export interface LabStaffMember extends BaseRecord {
  user_id: string;
  lab_id: string;
  role_label: string;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Admin (organizations, incidents, feature flags, service health snapshots)
// ---------------------------------------------------------------------------

export type OrganizationKind = 'hospital' | 'clinic' | 'lab' | 'pharmacy' | 'insurance';
export type OrganizationStatus = 'active' | 'suspended' | 'pending' | 'archived';

export interface Organization extends BaseRecord {
  slug: string;
  name: string;
  kind: OrganizationKind;
  city: string | null;
  country: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  baa_signed_at: string | null;
  contract_started_at: string | null;
  contract_ends_at: string | null;
  seats_allocated: number;
  seats_used: number;
  status: OrganizationStatus;
  notes: string | null;
}

export type AdminIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AdminIncidentStatus = 'open' | 'investigating' | 'mitigated' | 'closed';

export interface AdminIncident extends BaseRecord {
  title: string;
  summary: string;
  severity: AdminIncidentSeverity;
  status: AdminIncidentStatus;
  detected_at: string;
  resolved_at: string | null;
  owner_user_id: string | null;
  affected_records: number;
  regulator_reported: boolean;
  metadata: Record<string, unknown>;
}

export type FeatureFlagEnvironment = 'development' | 'staging' | 'production';

export interface FeatureFlag extends BaseRecord {
  key: string;
  name: string;
  description: string | null;
  environment: FeatureFlagEnvironment;
  is_enabled: boolean;
  rollout_percent: number;
  updated_by: string | null;
}

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
export type ServiceHealthCategory = 'core' | 'integration' | 'ai';

export interface ServiceHealthSnapshot {
  id: string;
  service_key: string;
  service_name: string;
  category: ServiceHealthCategory;
  status: ServiceHealthStatus;
  latency_ms: number | null;
  region: string | null;
  message: string | null;
  observed_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Admin RPC return shapes
// ---------------------------------------------------------------------------

export interface AdminMetricsPayload {
  generatedAt: string;
  totals: {
    users: number;
    appointmentsToday: number;
    completedConsultsThisMonth: number;
    pendingApprovals: number;
    activeIncidents: number;
  };
  usersByRole: Partial<Record<UserRole, number>>;
  ai: {
    sessions30d: number;
    flaggedOutputs30d: number;
  };
  compliance: {
    auditEvents30d: number;
    activeIncidents: number;
  };
}

export interface AdminSystemHealthPayload {
  generatedAt: string;
  services: ServiceHealthSnapshot[];
  integrations: ServiceHealthSnapshot[];
  aiServices: ServiceHealthSnapshot[];
}

export interface AdminAiAnalyticsPayload {
  generatedAt: string;
  sessions: {
    last7Days: number;
    last30Days: number;
    guestLast30Days: number;
  };
  messages: {
    last30Days: number;
  };
  safety: {
    flaggedLast30Days: number;
  };
}

export interface AdminUserRow {
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  profile_completed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  is_dha_verified: boolean;
}

export interface AdminAuditEventRow {
  id: string;
  user_id: string | null;
  actor_name: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Admin parity (rich seeded directories + dashboard context)
// ---------------------------------------------------------------------------

export interface AdminPortalContext {
  total_patients: number;
  patients_30d_active: number;
  patients_new_month: number;
  patients_flagged: number;
  patients_suspended: number;
  patient_change_pct: number;
  verified_doctors: number;
  pending_doctors: number;
  doctors_added_this_month: number;
  doctors_active_now: number;
  doctor_license_alerts: number;
  doctor_avg_rating: number;
  doctor_fees_mtd_aed: number;
  connected_orgs: number;
  orgs_clinics: number;
  orgs_hospitals: number;
  orgs_pharmacies: number;
  orgs_labs: number;
  orgs_added_this_month: number;
  ai_sessions_today: number;
  ai_sessions_month: number;
  ai_sessions_alltime: number;
  ai_active_now: number;
  ai_avg_response_sec: number;
  ai_uptime_pct: number;
  ai_satisfaction: number;
  ai_satisfaction_count: number;
  ai_to_booking_pct: number;
  ai_to_booking_count: number;
  ai_safety_flags_today: number;
  ai_safety_escalated: number;
  ai_safety_resolved: number;
  ai_revenue_today_aed: number;
  ai_revenue_net_aed: number;
  ai_revenue_margin_pct: number;
  revenue_today_aed: number;
  revenue_target_aed: number;
  revenue_change_pct: number;
  uptime_pct: number;
  uptime_incidents_month: number;
  dha_score: number;
  dha_license: string | null;
  dha_license_expires: string | null;
  active_sessions: number;
  open_issues: number;
  super_admin_name: string | null;
  super_admin_role_label: string | null;
  super_admin_organization: string | null;
  platform_version: string;
  environment_label: string;
  updated_at: string;
}

export interface AdminDashboardIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  detail: string | null;
  cta_label: string | null;
  cta_kind: string | null;
}

export interface AdminPortalStatus {
  id: string;
  portal_key: string;
  portal_name: string;
  active_users: number;
  latency_ms: number;
  status: 'online' | 'degraded' | 'offline';
  observed_at: string;
}

export interface AdminLiveActivityEvent {
  id: string;
  category: string;
  title: string;
  detail: string | null;
  occurred_at: string;
  ago_label: string | null;
}

export interface AdminComplianceChecklistItem {
  id: string;
  label: string;
  detail: string | null;
  is_compliant: boolean;
}

export interface AdminLicenseAlert {
  id: string;
  doctor_name: string;
  doctor_initials: string | null;
  days_remaining: number;
  severity: 'high' | 'medium' | 'low';
}

export interface AdminRevenueDay {
  id: string;
  day_label: string;
  day_index: number;
  total_aed: number;
  consults_aed: number;
  ai_aed: number;
  lab_aed: number;
  target_aed: number;
}

export interface AdminOrgsSummary {
  total: number;
  hospitals: number;
  clinics: number;
  pharmacies: number;
  labs: number;
  insurance: number;
}

export interface AdminDashboardPayload {
  generatedAt: string;
  context: AdminPortalContext | null;
  issues: AdminDashboardIssue[];
  portals: AdminPortalStatus[];
  liveActivity: AdminLiveActivityEvent[];
  complianceChecklist: AdminComplianceChecklistItem[];
  licenseAlerts: AdminLicenseAlert[];
  revenueDaily: AdminRevenueDay[];
  orgsSummary: AdminOrgsSummary;
}

export interface AdminDoctorRow {
  id: string;
  initials: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  dha_license: string | null;
  dha_verified: boolean;
  specialty: string | null;
  specialty_sub: string | null;
  clinic_name: string | null;
  city: string | null;
  consults_lifetime: number;
  consults_recent_label: string | null;
  rating: number | null;
  rating_count: number;
  license_expires_at: string | null;
  license_expires_label: string | null;
  reminder_status: string | null;
  status_label: 'verified' | 'expiring' | 'flagged' | 'suspended' | 'pending' | string;
  status_flag: string | null;
  badge_emoji: string | null;
  badge_label: string | null;
  sort_order: number;
}

export interface AdminPatientRow {
  id: string;
  initials: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  blood_type: string | null;
  patient_code: string;
  emirates_id_masked: string | null;
  insurance_plan: string | null;
  insurance_member_id_masked: string | null;
  city: string | null;
  joined_label: string | null;
  last_active_label: string | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | string;
  status_label: 'active' | 'inactive' | 'flagged' | 'suspended' | string;
  status_flag: string | null;
  badge_emoji: string | null;
  badge_label: string | null;
  sort_order: number;
}

export interface AdminInsurancePartnerRow {
  id: string;
  initials: string;
  insurer_name: string;
  cbuae_license: string;
  partner_tier: 'premium' | 'standard' | string;
  is_government: boolean;
  is_new_partner: boolean;
  api_status: 'healthy' | 'degraded' | 'down' | string;
  api_latency_ms: number | null;
  members: number;
  claims_today: number;
  claim_value_today_aed: number;
  auto_approval_pct: number;
  plan_pills: string[];
  partner_since: string | null;
  platform_revenue_label: string | null;
  sla_status: string | null;
  breach_label: string | null;
  fraud_alert_count: number;
  fraud_alert_severity: string | null;
  api_warning_label: string | null;
  sla_breach_label: string | null;
  notes: string | null;
  sort_order: number;
}

export interface AdminAiBreakdownRow {
  id: string;
  bucket: 'language' | 'topic' | 'portal';
  label: string;
  sub_label: string | null;
  sessions: number;
  percent: number;
  metric_1_label: string | null;
  metric_1_value: string | null;
  metric_2_label: string | null;
  metric_2_value: string | null;
  metric_3_label: string | null;
  metric_3_value: string | null;
  metric_4_label: string | null;
  metric_4_value: string | null;
  sort_order: number;
}

export interface AdminAiDashboardPayload {
  generatedAt: string;
  context: AdminPortalContext | null;
  languages: AdminAiBreakdownRow[];
  topics: AdminAiBreakdownRow[];
  portals: AdminAiBreakdownRow[];
}
