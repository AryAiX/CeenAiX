export type ClinicPortalRole = 'clinic_admin' | 'clinic_manager' | 'clinic_receptionist';

export type ClinicDoctorInvitationStatus = 'pending' | 'accepted' | 'active' | 'suspended';

export interface ClinicFacilityRecord {
  id: string;
  name: string;
  name_en: string | null;
  name_ar: string | null;
  facility_type: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  tax_registration_number: string | null;
  logo_url: string | null;
  website: string | null;
  branding: Record<string, unknown> | null;
  operating_hours: Record<string, string> | null;
}

export interface ClinicDoctorRecord {
  staff_id: string;
  doctor_user_id: string;
  invitation_status: ClinicDoctorInvitationStatus;
  consultation_fee: number | null;
  telemedicine_fee: number | null;
  follow_up_fee: number | null;
  slot_duration_min: number;
  schedule_json: Record<string, unknown>;
  service_ids: string[];
  clinic_managed_pricing: boolean;
  is_available: boolean;
  is_active: boolean;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  license_number: string | null;
  specialization: string | null;
  years_of_experience: number | null;
  profile_consultation_fee: number | null;
  appointments_this_month: number;
}

export interface ClinicServiceRecord {
  id: string;
  facility_id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  default_duration_min: number;
  default_price: number;
  currency: string;
  category: string;
  required_specialization_id: string | null;
  is_active: boolean;
}

export interface ClinicAppointmentRecord {
  id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  type: string;
  scheduled_at: string;
  duration_minutes: number;
  chief_complaint: string | null;
  doctor_name: string | null;
  patient_name: string | null;
  patient_phone: string | null;
}

export interface ClinicPortalKpis {
  total_doctors: number;
  active_doctors: number;
  appointments_this_month: number;
  revenue_this_month: number;
  pending_invitations: number;
}

export interface ClinicPricingAuditRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
}

export interface ClinicPortalSnapshot {
  facility_id: string;
  portal_role: ClinicPortalRole;
  facility: ClinicFacilityRecord;
  doctors: ClinicDoctorRecord[];
  services: ClinicServiceRecord[];
  appointments: ClinicAppointmentRecord[];
  kpis: ClinicPortalKpis;
  pricing_audit: ClinicPricingAuditRecord[];
}

export interface ClinicInviteDoctorInput {
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  specialization: string;
  consultation_fee: number;
  telemedicine_fee: number;
  follow_up_fee: number;
  service_ids: string[];
  schedule_json: Record<string, unknown>;
}
