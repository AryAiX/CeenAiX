import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { Appointment, AppointmentStatus } from '../types';

interface UseAppointmentsOptions {
  role: 'patient' | 'doctor';
  userId: string;
  status?: AppointmentStatus;
}

/**
 * Fetches appointments for the given user, scoped by role.
 */
export function useAppointments({ role, userId, status }: UseAppointmentsOptions) {
  return useQuery<Appointment[]>(async () => {
    if (!userId) {
      return [];
    }

    const column = role === 'patient' ? 'patient_id' : 'doctor_id';

    let query = supabase
      .from('appointments')
      .select('*')
      .eq(column, userId)
      .eq('is_deleted', false)
      .order('scheduled_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, [role, userId, status]);
}
