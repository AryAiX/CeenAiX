export type UserRole =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'pharmacy'
  | 'lab'
  | 'insurance'
  | 'clinic'
  | 'facility_admin'
  | 'super_admin';

export type AppointmentType = 'in_person' | 'virtual';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

export type MedicationCatalogSource = 'rxnorm' | 'custom';

export type MedicationCatalogEnrichmentStatus = 'pending' | 'enriched' | 'failed';

export type MedicationCatalogSuggestionType = 'translation' | 'new_medication';

export type MedicationCatalogSuggestionStatus = 'pending' | 'approved' | 'rejected';

export type LabTestCatalogSource = 'loinc' | 'custom';

export type LabTestCatalogSuggestionType = 'translation' | 'new_lab_test';

export type LabTestCatalogSuggestionStatus = 'pending' | 'approved' | 'rejected';

export type LabOrderStatus =
  | 'ordered'
  | 'collected'
  | 'processing'
  | 'resulted'
  | 'reviewed';

export type ConditionStatus = 'active' | 'resolved' | 'chronic';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export type NotificationType =
  | 'appointment'
  | 'medication'
  | 'lab_result'
  | 'system'
  | 'alert';

export type AiMessageRole = 'user' | 'assistant' | 'system';

export type AuditAction = 'create' | 'update' | 'delete' | 'access';

export type PreVisitTemplateStatus = 'draft' | 'published' | 'archived';

export type PreVisitQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'boolean'
  | 'number'
  | 'date';

export type PreVisitAssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'reviewed';

export type PatientMemorySourceKind = 'pre_visit_answer' | 'ai_chat_message';

export type PatientMemoryValueType = 'text' | 'text_list' | 'boolean' | 'number' | 'date' | 'json';

export type PatientMemoryStatus = 'suggested' | 'confirmed';

export type PatientCanonicalUpdateSourceKind = 'pre_visit_assessment' | 'ai_chat_message';

export type PatientCanonicalUpdateStatus = 'pending' | 'applied' | 'dismissed';

export type PatientCanonicalUpdateStrategy =
  | 'user_profile_scalar'
  | 'patient_profile_scalar'
  | 'patient_profile_emergency_contact'
  | 'medical_conditions_replace'
  | 'allergies_replace'
  | 'patient_reported_medications_replace';

export type PatientReportedMedicationReviewStatus = 'pending_review' | 'reviewed';
