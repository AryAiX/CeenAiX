import type { Notification } from '../types';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';

export interface InsuranceNotificationsData {
  notifications: Notification[];
}

export function useInsuranceNotifications(userId: string | null | undefined) {
  return useQuery<InsuranceNotificationsData | null>(async () => {
    if (!userId) {
      return null;
    }

    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (notificationsError) throw notificationsError;

    return {
      notifications: (notifications ?? []) as Notification[],
    };
  }, [userId ?? '']);
}
