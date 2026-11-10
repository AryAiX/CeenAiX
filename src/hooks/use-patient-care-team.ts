import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

/**
 * The doctors a patient can message from the Messages page (QA-014): every doctor they have an
 * appointment with, the same list the Dashboard shows as "My Care Team". Most recent first.
 */
export interface PatientCareTeamMember {
  doctorId: string;
  name: string | null;
  specialty: string | null;
  lastAppointmentAt: string;
}

export async function fetchPatientCareTeam(patientId: string): Promise<PatientCareTeamMember[]> {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('doctor_id, scheduled_at')
    .eq('patient_id', patientId)
    .eq('is_deleted', false)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;

  const latestByDoctor = new Map<string, string>();
  for (const row of (appointments ?? []) as Array<{ doctor_id: string | null; scheduled_at: string }>) {
    if (row.doctor_id && !latestByDoctor.has(row.doctor_id)) latestByDoctor.set(row.doctor_id, row.scheduled_at);
  }
  const doctorIds = [...latestByDoctor.keys()];
  if (doctorIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, { data: doctorProfiles, error: doctorProfilesError }] =
    await Promise.all([
      supabase.from('user_profiles').select('user_id, full_name').in('user_id', doctorIds),
      supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
    ]);
  if (profilesError) throw profilesError;
  if (doctorProfilesError) throw doctorProfilesError;

  const nameById = new Map(
    ((profiles ?? []) as Array<{ user_id: string; full_name: string | null }>).map((row) => [row.user_id, row.full_name?.trim() || null])
  );
  const specialtyById = new Map(
    ((doctorProfiles ?? []) as Array<{ user_id: string; specialization: string | null }>).map((row) => [
      row.user_id,
      row.specialization?.trim() || null,
    ])
  );

  return doctorIds.map((doctorId) => ({
    doctorId,
    name: nameById.get(doctorId) ?? null,
    specialty: specialtyById.get(doctorId) ?? null,
    lastAppointmentAt: latestByDoctor.get(doctorId) as string,
  }));
}

/** Pass null to skip loading (for example on the doctor or pharmacy Messages page). */
export function usePatientCareTeam(patientId: string | null | undefined) {
  return useQuery<PatientCareTeamMember[]>(
    () => (patientId ? fetchPatientCareTeam(patientId) : Promise.resolve([])),
    [patientId]
  );
}
