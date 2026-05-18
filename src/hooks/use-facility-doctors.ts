import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import type { FacilityDoctor } from '../types/facility';
import { useQuery } from './use-query';

interface FacilityDoctorRpcRow {
  user_id: string;
  full_name: string | null;
  specialty: string | null;
  city: string | null;
  address: string | null;
  consultation_fee: number | null;
  is_available: boolean;
  consultation_days: string[] | null;
  consultation_hours: string | null;
  room_number: string | null;
  active_availability_count: number;
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

export function useFacilityDoctors(facilityId: string | null) {
  return useQuery<FacilityDoctor[]>(
    async () => {
      if (!facilityId) return [];

      const { data, error } = await supabase.rpc('get_facility_doctors', {
        p_facility_id: facilityId,
      });
      if (error) throw error;

      return ((data ?? []) as FacilityDoctorRpcRow[]).map((row) => ({
        userId: row.user_id,
        fullName: row.full_name ?? i18n.t('shared.doctor', { defaultValue: 'Doctor' }),
        specialty: row.specialty,
        city: row.city,
        address: row.address,
        consultationFee: row.consultation_fee,
        isAvailable: row.is_available,
        consultationDays: parseStringArray(row.consultation_days),
        consultationHours: row.consultation_hours,
        roomNumber: row.room_number,
        activeAvailabilityCount: Number(row.active_availability_count ?? 0),
      }));
    },
    [facilityId]
  );
}
