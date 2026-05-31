export interface AdminClinicRecord {
  facility_id: string;
  name: string;
  name_en: string | null;
  name_ar: string | null;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  is_active: boolean;
  organization_id: string | null;
  organization_name: string | null;
  organization_status: string | null;
  doctor_count: number;
  admin_count: number;
  pending_invitations: number;
  created_at: string;
}

export interface AdminUnlinkedDoctorRecord {
  doctor_user_id: string;
  full_name: string;
  email: string | null;
  specialization: string | null;
  license_number: string | null;
}

export interface AdminClinicDoctorRecord {
  staff_id: string;
  doctor_user_id: string;
  full_name: string;
  email: string | null;
  specialization: string | null;
  invitation_status: string;
  consultation_fee: number | null;
  is_available: boolean;
}

export interface AdminOnboardClinicInput {
  name_en: string;
  name_ar?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  admin_email?: string;
  admin_name?: string;
  organization_name?: string;
}

export interface AdminOnboardClinicResult {
  success: boolean;
  facility_id: string;
  organization_id: string;
  organization_slug: string;
  admin_linked: boolean;
}
