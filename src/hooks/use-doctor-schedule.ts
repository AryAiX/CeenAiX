import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { BlockedSlot, DoctorAvailability } from '../types';

export interface DoctorScheduleData {
  availabilities: DoctorAvailability[];
  blockedSlots: BlockedSlot[];
}

const compareAvailability = (a: DoctorAvailability, b: DoctorAvailability) => {
  if (a.day_of_week !== b.day_of_week) {
    return a.day_of_week - b.day_of_week;
  }

  return a.start_time.localeCompare(b.start_time);
};

const compareBlockedSlots = (a: BlockedSlot, b: BlockedSlot) => {
  const dateCompare = a.blocked_date.localeCompare(b.blocked_date);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.start_time.localeCompare(b.start_time);
};

export function useDoctorSchedule(userId: string | null | undefined) {
  return useQuery<DoctorScheduleData>(
    async () => {
      if (!userId) {
        return {
          availabilities: [],
          blockedSlots: [],
        };
      }

      const now = new Date();
      const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;

      const [
        { data: availabilities, error: availabilityError },
        { data: blockedSlots, error: blockedSlotsError },
      ] = await Promise.all([
        supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_id', userId)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('blocked_slots')
          .select('*')
          .eq('doctor_id', userId)
          .gte('blocked_date', today)
          .order('blocked_date', { ascending: true })
          .order('start_time', { ascending: true }),
      ]);

      if (availabilityError) {
        throw availabilityError;
      }

      if (blockedSlotsError) {
        throw blockedSlotsError;
      }

      return {
        availabilities: [...(availabilities ?? [])].sort(compareAvailability),
        blockedSlots: [...(blockedSlots ?? [])].sort(compareBlockedSlots),
      };
    },
    [userId]
  );
}
