import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth-provider';

// Same unread queries + realtime channels as the web `PortalShell` header:
// notification bell count and the messages badge.
interface BadgeContextValue {
  unreadNotifications: number;
  unreadMessages: number;
  refresh: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextValue | null>(null);

export function BadgeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user, isPatient } = useAuth();
  const userId = isPatient ? (user?.id ?? null) : null;
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
    setUnreadNotifications(count ?? 0);
  }, [userId]);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    const { data: conversations } = await supabase.from('conversations').select('id');
    const ids = (conversations ?? []).map((row) => row.id as string);
    if (ids.length === 0) {
      setUnreadMessages(0);
      return;
    }
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .is('read_at', null)
      .neq('sender_id', userId);
    setUnreadMessages(count ?? 0);
  }, [userId]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchMessages()]);
  }, [fetchMessages, fetchNotifications]);

  useEffect(() => {
    if (!userId) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }
    void refresh();

    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        void fetchNotifications();
        if (payload.eventType !== 'INSERT') return;
        const row = payload.new as { title?: string; body?: string | null; action_url?: string | null; type?: string };
        if (row.type === 'message' || AppState.currentState !== 'active') return;
        // Foreground banner for realtime inserts until remote push (APNs/FCM) is configured.
        void Notifications.scheduleNotificationAsync({
          content: { title: row.title ?? 'CeenAiX', body: row.body ?? undefined, data: { url: row.action_url ?? null } },
          trigger: null,
        });
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`messages:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void fetchMessages();
      })
      .subscribe();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      appState.remove();
      void supabase.removeChannel(notificationsChannel);
      void supabase.removeChannel(messagesChannel);
    };
  }, [fetchMessages, fetchNotifications, refresh, userId]);

  useEffect(() => {
    void Notifications.setBadgeCountAsync(unreadNotifications + unreadMessages).catch(() => undefined);
  }, [unreadMessages, unreadNotifications]);

  const value = useMemo(() => ({ unreadNotifications, unreadMessages, refresh }), [refresh, unreadMessages, unreadNotifications]);

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges(): BadgeContextValue {
  const context = useContext(BadgeContext);
  if (!context) throw new Error('useBadges must be used within BadgeProvider');
  return context;
}
