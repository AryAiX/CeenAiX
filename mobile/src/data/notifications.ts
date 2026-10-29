import { supabase } from '@/lib/supabase';

// Mirrors the inline updates in web `src/pages/patient/Notifications.tsx`.
// The web "dismiss" action writes `is_deleted`, which the `notifications`
// table does not have, so it is intentionally not carried over.

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  if (error) throw error;
}
