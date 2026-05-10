import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export interface BookableDoctor {
  userId: string;
  fullName: string;
  specialty: string | null;
  specializationIds: string[];
  city: string | null;
  address: string | null;
  bio: string | null;
  consultationFee: number | null;
  activeAvailabilityCount: number;
}

interface BookableDoctorRpcRow {
  user_id: string;
  full_name: string | null;
  specialty: string | null;
  specialization_ids: string[] | null;
  city: string | null;
  address: string | null;
  bio: string | null;
  consultation_fee: number | null;
  active_availability_count: number;
}

export function useBookableDoctors() {
  return useQuery<BookableDoctor[]>(async () => {
    const { data, error } = await supabase.rpc('get_bookable_doctors');

    if (error) {
      throw error;
    }

    return ((data ?? []) as BookableDoctorRpcRow[]).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name ?? i18n.t('shared.doctor', { defaultValue: 'Doctor' }),
      specialty: row.specialty,
      specializationIds: row.specialization_ids ?? [],
      city: row.city,
      address: row.address,
      bio: row.bio,
      consultationFee: row.consultation_fee,
      activeAvailabilityCount: Number(row.active_availability_count ?? 0),
    }));
  }, []);
}
