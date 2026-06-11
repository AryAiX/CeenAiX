import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { ClinicPortalSnapshot } from '../types/clinic-portal';

const parseSnapshot = (raw: unknown): ClinicPortalSnapshot | null => {
  if (!raw || typeof raw !== 'object') return null;
  return raw as ClinicPortalSnapshot;
};

export const useClinicPortal = () => {
  const query = useQuery(async () => {
    const { data, error } = await supabase.rpc('get_clinic_portal_snapshot');
    if (error) throw error;
    const snapshot = parseSnapshot(data);
    if (!snapshot) throw new Error('Invalid clinic portal response');
    return snapshot;
  }, []);

  return {
    data: query.data,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useClinicPortalActions = () => {
  const inviteDoctor = useCallback(async (input: {
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
  }) => {
    const { data, error } = await supabase.rpc('clinic_invite_doctor', {
      p_full_name: input.full_name,
      p_email: input.email,
      p_phone: input.phone,
      p_license_number: input.license_number,
      p_specialization: input.specialization,
      p_consultation_fee: input.consultation_fee,
      p_telemedicine_fee: input.telemedicine_fee,
      p_follow_up_fee: input.follow_up_fee,
      p_service_ids: input.service_ids,
      p_schedule_json: input.schedule_json,
    });
    if (error) throw error;
    return data as { success: boolean; mode: string; invitation_id?: string; staff_id?: string };
  }, []);

  const updateFacility = useCallback(async (facilityId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('facilities').update(patch).eq('id', facilityId);
    if (error) throw error;
  }, []);

  const upsertService = useCallback(
    async (payload: {
      id?: string;
      facility_id: string;
      name_en: string;
      name_ar: string;
      default_duration_min: number;
      default_price: number;
      category: string;
      currency?: string;
    }) => {
      const { error } = await supabase.from('facility_services').upsert({
        ...payload,
        currency: payload.currency ?? 'AED',
        is_active: true,
      });
      if (error) throw error;
    },
    [],
  );

  const logPricingFieldChange = useCallback(
    async (
      facilityId: string,
      staffId: string,
      fieldName: string,
      oldValue: unknown,
      newValue: unknown,
    ) => {
      if (oldValue === newValue) return;
      const { error } = await supabase.rpc('log_clinic_pricing_change', {
        p_facility_id: facilityId,
        p_entity_type: 'facility_staff',
        p_entity_id: staffId,
        p_field_name: fieldName,
        p_old_value: oldValue ?? null,
        p_new_value: newValue ?? null,
      });
      if (error) throw error;
    },
    [],
  );

  const updateStaffPricing = useCallback(
    async (
      facilityId: string,
      staffId: string,
      patch: {
        consultation_fee?: number;
        telemedicine_fee?: number;
        follow_up_fee?: number;
        invitation_status?: string;
        is_available?: boolean;
      },
      previous?: {
        consultation_fee?: number | null;
        telemedicine_fee?: number | null;
        follow_up_fee?: number | null;
      },
    ) => {
      const { error } = await supabase.from('facility_staff').update(patch).eq('id', staffId);
      if (error) throw error;

      const pricingFields = ['consultation_fee', 'telemedicine_fee', 'follow_up_fee'] as const;
      await Promise.all(
        pricingFields
          .filter((field) => patch[field] !== undefined)
          .map((field) =>
            logPricingFieldChange(facilityId, staffId, field, previous?.[field] ?? null, patch[field] ?? null),
          ),
      );
    },
    [logPricingFieldChange],
  );

  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: string, notes?: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, notes: notes ?? null })
      .eq('id', appointmentId);
    if (error) throw error;
  }, []);

  return {
    inviteDoctor,
    updateFacility,
    upsertService,
    updateStaffPricing,
    updateAppointmentStatus,
  };
};

export interface DoctorClinicMembership {
  clinic_managed_pricing: boolean;
  consultation_fee: number | null;
  telemedicine_fee: number | null;
  follow_up_fee: number | null;
  invitation_status: string | null;
  facilities: {
    id: string;
    name: string;
    name_en: string | null;
    name_ar: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export const useDoctorClinicMembership = (userId: string | null | undefined) => {
  return useQuery<DoctorClinicMembership | null>(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('facility_staff')
      .select(
        'clinic_managed_pricing, consultation_fee, telemedicine_fee, follow_up_fee, invitation_status, facilities(id, name, name_en, name_ar, city, phone, email)',
      )
      .eq('doctor_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as DoctorClinicMembership | null;
  }, [userId]);
};
