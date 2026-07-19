import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type {
  AdminAiAnalyticsPayload,
  AdminAiDashboardPayload,
  AdminAuditEventRow,
  AdminDashboardPayload,
  AdminDoctorRow,
  AdminIncident,
  AdminInsurancePartnerRow,
  AdminMetricsPayload,
  AdminPatientRow,
  AdminSystemHealthPayload,
  AdminUserRow,
  FeatureFlag,
  InsurancePlan,
  Organization,
  PlatformSetting,
  UserRole,
} from '../types';
import type {
  AdminClinicDoctorRecord,
  AdminClinicRecord,
  AdminOnboardClinicInput,
  AdminOnboardClinicResult,
  AdminUnlinkedDoctorRecord,
} from '../types/admin-clinics';

/**
 * Admin platform metrics — aggregate counts powering /admin/dashboard.
 */
export function useAdminMetrics() {
  return useQuery<AdminMetricsPayload | null>(async () => {
    const { data, error } = await supabase.rpc('admin_get_metrics');
    if (error) {
      throw error;
    }
    return (data as AdminMetricsPayload | null) ?? null;
  }, []);
}

export interface UseAdminUsersArgs {
  search?: string;
  role?: string | null;
  limit?: number;
}

/**
 * Global users directory for /admin/users.
 */
export function useAdminUsers({ search = '', role = null, limit = 50 }: UseAdminUsersArgs = {}) {
  return useQuery<AdminUserRow[]>(async () => {
    const { data, error } = await supabase.rpc('admin_list_users', {
      search_text: search || null,
      filter_role: role,
      max_rows: limit,
    });
    if (error) {
      throw error;
    }
    return (data as AdminUserRow[]) ?? [];
  }, [search, role ?? '', limit]);
}

/**
 * Organizations registered on the platform (hospitals, clinics, labs, pharmacies).
 */
export function useAdminOrganizations() {
  return useQuery<Organization[]>(async () => {
    const { data, error } = await supabase.rpc('admin_list_organizations');
    if (error) {
      throw error;
    }
    return (data as Organization[]) ?? [];
  }, []);
}

export interface CreateOrganizationInput {
  name: string;
  kind: 'hospital' | 'clinic' | 'lab' | 'pharmacy' | 'insurance';
  city?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  notes?: string | null;
  slug?: string | null;
  status?: 'active' | 'suspended' | 'pending' | 'archived';
  seatsAllocated?: number;
}

/**
 * Insert a new organization via the admin_create_organization RPC.
 * Returns the created row so the caller can refresh local lists.
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  const { data, error } = await supabase.rpc('admin_create_organization', {
    in_name: input.name,
    in_kind: input.kind,
    in_city: input.city ?? null,
    in_primary_contact_name: input.primaryContactName ?? null,
    in_primary_contact_email: input.primaryContactEmail ?? null,
    in_notes: input.notes ?? null,
    in_slug: input.slug ?? null,
    in_status: input.status ?? 'pending',
    in_seats_allocated: input.seatsAllocated ?? 0,
  });
  if (error) {
    throw error;
  }
  return data as Organization;
}

export async function updateAdminUserAccountStatus(
  userId: string,
  accountStatus: 'active' | 'suspended'
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user_account_status', {
    p_user_id: userId,
    p_account_status: accountStatus,
  });
  if (error) {
    throw error;
  }
}

export async function updateAdminUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    throw error;
  }
}

export function useAdminInsurancePlans() {
  return useQuery<InsurancePlan[]>(async () => {
    const { data, error } = await supabase.rpc('admin_list_insurance_plans');
    if (error) {
      throw error;
    }
    return (data as InsurancePlan[]) ?? [];
  }, []);
}

export interface AdminInsurancePlanInput {
  planId?: string | null;
  name: string;
  providerCompany: string;
  coverageType?: string | null;
  annualLimit?: number | null;
  coPayPercentage?: number | null;
  networkType?: string | null;
  isActive: boolean;
}

export async function upsertAdminInsurancePlan(input: AdminInsurancePlanInput): Promise<InsurancePlan> {
  const { data, error } = await supabase.rpc('admin_upsert_insurance_plan', {
    p_plan_id: input.planId ?? null,
    p_name: input.name,
    p_provider_company: input.providerCompany,
    p_coverage_type: input.coverageType ?? null,
    p_annual_limit: input.annualLimit ?? null,
    p_co_pay_percentage: input.coPayPercentage ?? null,
    p_network_type: input.networkType ?? null,
    p_is_active: input.isActive,
  });
  if (error) {
    throw error;
  }
  return data as InsurancePlan;
}

export async function setAdminInsurancePlanActive(planId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_insurance_plan_active', {
    p_plan_id: planId,
    p_is_active: isActive,
  });
  if (error) {
    throw error;
  }
}

export interface AdminComplianceData {
  incidents: AdminIncident[];
  recentAuditEvents: AdminAuditEventRow[];
  auditEventCount30d: number;
  openIncidentCount: number;
}

/**
 * Incidents register + recent audit events for /admin/compliance.
 */
export function useAdminCompliance() {
  return useQuery<AdminComplianceData>(async () => {
    const [
      { data: incidents, error: incidentsError },
      { data: auditEvents, error: auditError },
      { data: metricsPayload, error: metricsError },
    ] = await Promise.all([
      supabase.rpc('admin_list_incidents'),
      supabase.rpc('admin_list_audit_events', { max_rows: 25 }),
      supabase.rpc('admin_get_metrics'),
    ]);
    if (incidentsError) throw incidentsError;
    if (auditError) throw auditError;
    if (metricsError) throw metricsError;

    const metrics = (metricsPayload as AdminMetricsPayload | null) ?? null;
    const openIncidentCount = (incidents as AdminIncident[] | null)?.filter(
      (incident) => incident.status === 'open' || incident.status === 'investigating'
    ).length ?? 0;

    return {
      incidents: (incidents as AdminIncident[]) ?? [],
      recentAuditEvents: (auditEvents as AdminAuditEventRow[]) ?? [],
      auditEventCount30d: metrics?.compliance.auditEvents30d ?? 0,
      openIncidentCount,
    };
  }, []);
}

/**
 * Latest per-service health snapshot, grouped by category.
 */
export function useAdminSystemHealth() {
  return useQuery<AdminSystemHealthPayload | null>(async () => {
    const { data, error } = await supabase.rpc('admin_get_system_health');
    if (error) {
      throw error;
    }
    return (data as AdminSystemHealthPayload | null) ?? null;
  }, []);
}

/**
 * AI usage / safety analytics for /admin/ai-analytics.
 */
export function useAdminAiAnalytics() {
  return useQuery<AdminAiAnalyticsPayload | null>(async () => {
    const { data, error } = await supabase.rpc('admin_get_ai_analytics');
    if (error) {
      throw error;
    }
    return (data as AdminAiAnalyticsPayload | null) ?? null;
  }, []);
}

export interface AdminDiagnosticsData {
  featureFlags: FeatureFlag[];
  platformSettings: PlatformSetting[];
  metrics: AdminMetricsPayload | null;
}

/**
 * Feature flags + platform settings + system metrics for /admin/diagnostics.
 */
export function useAdminDiagnostics() {
  return useQuery<AdminDiagnosticsData>(async () => {
    const [
      { data: flags, error: flagsError },
      { data: settings, error: settingsError },
      { data: metrics, error: metricsError },
    ] = await Promise.all([
      supabase.rpc('admin_list_feature_flags'),
      supabase.from('platform_settings').select('id, key, value, updated_by, updated_at').order('key'),
      supabase.rpc('admin_get_metrics'),
    ]);
    if (flagsError) throw flagsError;
    if (settingsError) throw settingsError;
    if (metricsError) throw metricsError;

    return {
      featureFlags: (flags as FeatureFlag[]) ?? [],
      platformSettings: (settings as PlatformSetting[]) ?? [],
      metrics: (metrics as AdminMetricsPayload | null) ?? null,
    };
  }, []);
}

/**
 * Comprehensive admin dashboard payload — issues banner, KPIs, portals,
 * live activity, compliance checklist, license alerts, revenue series.
 * Powers /admin/dashboard.
 */
export function useAdminDashboard() {
  return useQuery<AdminDashboardPayload | null>(async () => {
    const { data, error } = await supabase.rpc('admin_get_dashboard');
    if (error) {
      throw error;
    }
    return (data as AdminDashboardPayload | null) ?? null;
  }, []);
}

/**
 * Rich seeded doctor directory — DHA license states, ratings, expiry, flags.
 * Powers /admin/doctors.
 */
export function useAdminDoctorDirectory() {
  return useQuery<AdminDoctorRow[]>(async () => {
    const { data, error } = await supabase.rpc('admin_get_doctor_directory');
    if (error) {
      throw error;
    }
    return (data as AdminDoctorRow[]) ?? [];
  }, []);
}

/**
 * Rich seeded patient directory — insurance, location, risk, flags.
 * Powers /admin/patients.
 */
export function useAdminPatientDirectory() {
  return useQuery<AdminPatientRow[]>(async () => {
    const { data, error } = await supabase.rpc('admin_get_patient_directory');
    if (error) {
      throw error;
    }
    return (data as AdminPatientRow[]) ?? [];
  }, []);
}

/**
 * Insurance partner cards — API health, members, claims, fraud alerts.
 * Powers /admin/insurance.
 */
export function useAdminInsurancePartners() {
  return useQuery<AdminInsurancePartnerRow[]>(async () => {
    const { data, error } = await supabase.rpc('admin_get_insurance_partners');
    if (error) {
      throw error;
    }
    return (data as AdminInsurancePartnerRow[]) ?? [];
  }, []);
}

/**
 * Rich AI analytics payload — usage by language, topic, portal.
 * Powers /admin/ai.
 */
export function useAdminAiDashboard() {
  return useQuery<AdminAiDashboardPayload | null>(async () => {
    const { data, error } = await supabase.rpc('admin_get_ai_dashboard');
    if (error) {
      throw error;
    }
    return (data as AdminAiDashboardPayload | null) ?? null;
  }, []);
}

/**
 * Clinic facilities directory for /admin/clinics.
 */
export function useAdminClinics() {
  return useQuery<AdminClinicRecord[]>(async () => {
    const { data, error } = await supabase.rpc('admin_list_clinics');
    if (error) {
      throw error;
    }
    return (data as AdminClinicRecord[]) ?? [];
  }, []);
}

export function useAdminUnlinkedDoctors() {
  return useQuery<AdminUnlinkedDoctorRecord[]>(async () => {
    const { data, error } = await supabase.rpc('admin_list_unlinked_doctors');
    if (error) {
      throw error;
    }
    return (data as AdminUnlinkedDoctorRecord[]) ?? [];
  }, []);
}

export async function fetchAdminClinicDoctors(facilityId: string): Promise<AdminClinicDoctorRecord[]> {
  const { data, error } = await supabase.rpc('admin_get_clinic_doctors', {
    p_facility_id: facilityId,
  });
  if (error) {
    throw error;
  }
  return (data as AdminClinicDoctorRecord[]) ?? [];
}

export async function onboardClinic(input: AdminOnboardClinicInput): Promise<AdminOnboardClinicResult> {
  const { data, error } = await supabase.rpc('admin_onboard_clinic', {
    p_name_en: input.name_en,
    p_name_ar: input.name_ar ?? null,
    p_address: input.address ?? null,
    p_city: input.city ?? 'Dubai',
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_license_number: input.license_number ?? null,
    p_admin_email: input.admin_email ?? null,
    p_admin_name: input.admin_name ?? null,
    p_organization_name: input.organization_name ?? null,
  });
  if (error) {
    throw error;
  }
  return data as AdminOnboardClinicResult;
}

export async function setClinicStatus(facilityId: string, isActive: boolean) {
  const { data, error } = await supabase.rpc('admin_set_clinic_status', {
    p_facility_id: facilityId,
    p_is_active: isActive,
  });
  if (error) {
    throw error;
  }
  return data as { success: boolean; is_active: boolean };
}

export async function linkDoctorToClinic(facilityId: string, doctorUserId: string) {
  const { data, error } = await supabase.rpc('admin_link_doctor_to_clinic', {
    p_facility_id: facilityId,
    p_doctor_user_id: doctorUserId,
  });
  if (error) {
    throw error;
  }
  return data as { success: boolean; staff_id: string };
}
