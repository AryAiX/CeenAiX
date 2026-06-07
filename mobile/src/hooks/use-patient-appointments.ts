import type { Appointment } from '@ceenaix/types';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

// Mirrors the canonical query in the web `src/hooks/use-appointments.ts`
// (patient-scoped, `is_deleted = false`, ordered by `scheduled_at`) and
// augments each row with the resolved doctor name + specialty for display,
// matching how the web Appointments page hydrates doctor profiles.

export interface PatientAppointment extends Appointment {
  doctorName: string;
  doctorSpecialty: string | null;
}

export function usePatientAppointments(userId: string | null | undefined) {
  return useQuery<PatientAppointment[]>(async () => {
    if (!userId) {
      return [];
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', userId)
      .eq('is_deleted', false)
      .order('scheduled_at', { ascending: false });

    if (error) {
      throw error;
    }

    const safeAppointments = (appointments ?? []) as Appointment[];
    if (safeAppointments.length === 0) {
      return [];
    }

    const doctorIds = Array.from(new Set(safeAppointments.map((appt) => appt.doctor_id)));
    const [{ data: userProfiles, error: profilesError }, { data: doctorProfiles, error: doctorError }] =
      await Promise.all([
        supabase.from('user_profiles').select('user_id, full_name').in('user_id', doctorIds),
        supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
      ]);

    if (profilesError) throw profilesError;
    if (doctorError) throw doctorError;

    const nameById = new Map((userProfiles ?? []).map((row) => [row.user_id, row.full_name?.trim() || 'Doctor']));
    const specialtyById = new Map((doctorProfiles ?? []).map((row) => [row.user_id, row.specialization ?? null]));

    return safeAppointments.map((appt) => ({
      ...appt,
      doctorName: nameById.get(appt.doctor_id) ?? 'Doctor',
      doctorSpecialty: specialtyById.get(appt.doctor_id) ?? null,
    }));
  }, [userId]);
}
