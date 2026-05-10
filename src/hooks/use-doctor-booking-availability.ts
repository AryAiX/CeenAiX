import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { BlockedSlot, DoctorAvailability } from '../types';
import type { OccupiedAppointmentSlot } from '../lib/appointment-booking';

export interface DoctorBookingAvailabilityData {
  availabilities: DoctorAvailability[];
  blockedSlots: BlockedSlot[];
  upcomingAppointments: OccupiedAppointmentSlot[];
}

export function useDoctorBookingAvailability(doctorId: string | null | undefined) {
  return useQuery<DoctorBookingAvailabilityData>(
    async () => {
      if (!doctorId) {
        return {
          availabilities: [],
          blockedSlots: [],
          upcomingAppointments: [],
        };
      }

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 90);
      const formatLocalDate = (date: Date) =>
        `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

      const [
        { data: availabilities, error: availabilitiesError },
        { data: blockedSlots, error: blockedSlotsError },
        { data: appointments, error: appointmentsError },
      ] = await Promise.all([
        supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('is_active', true)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('blocked_slots')
          .select('*')
          .eq('doctor_id', doctorId)
          .gte('blocked_date', formatLocalDate(startDate))
          .lte('blocked_date', formatLocalDate(endDate))
          .order('blocked_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.rpc('get_doctor_booked_appointments', {
          p_doctor_id: doctorId,
          p_start_at: startDate.toISOString(),
          p_end_at: endDate.toISOString(),
        }),
      ]);

      if (availabilitiesError) {
        throw availabilitiesError;
      }

      if (blockedSlotsError) {
        throw blockedSlotsError;
      }

      if (appointmentsError) {
        throw appointmentsError;
      }

      return {
        availabilities: availabilities ?? [],
        blockedSlots: blockedSlots ?? [],
        upcomingAppointments: appointments ?? [],
      };
    },
    [doctorId]
  );
}
