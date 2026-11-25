import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchByIdChunks } from './supabase-batches';

/**
 * QA-208: clinics read their patients only through clinic_patient_profiles (name, phone, email,
 * date of birth) and clinic_search_patients (name, phone). Direct reads of user_profiles for
 * patients are switched off for clinic members (no identity, insurance or address data).
 */
export interface ClinicPatientProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
}

export const fetchClinicPatientProfiles = (client: SupabaseClient, patientIds: string[]) =>
  fetchByIdChunks<ClinicPatientProfile>(patientIds, (ids) =>
    client
      .rpc('clinic_patient_profiles', { p_patient_ids: ids })
      .then(({ data, error }) => ({ data: (Array.isArray(data) ? data : []) as ClinicPatientProfile[], error }))
  );

export const searchClinicPatients = async (client: SupabaseClient, query: string) => {
  const { data, error } = await client.rpc('clinic_search_patients', { p_query: query });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as { user_id: string; full_name: string | null; phone: string | null }[];
};
