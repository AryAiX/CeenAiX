import i18n from 'i18next';
import type { Notification } from '../types';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';

const careTeamFallback = () => i18n.t('messaging.careTeamFallback', { defaultValue: 'Care team' });
const newMessageFrom = (name: string) =>
  i18n.t('pharmacy.notifications.newMessageFrom', {
    name,
    defaultValue: 'New message from {{name}}',
  });
const openThreadFallback = () =>
  i18n.t('pharmacy.notifications.openThreadFallback', {
    defaultValue: 'Open the thread to review the latest message.',
  });
const newPrescriptionTitle = (patientName: string) =>
  i18n.t('pharmacy.notifications.newPrescription', {
    name: patientName,
    defaultValue: 'New prescription received for {{name}}',
  });
const newPrescriptionBody = (medicationName: string) =>
  i18n.t('pharmacy.notifications.newPrescriptionBody', {
    medication: medicationName,
    defaultValue: 'Open Dispensing to review and process {{medication}}.',
  });

export interface PharmacyDerivedNotification {
  id: string;
  kind: 'message' | 'new_prescription';
  title: string;
  body: string;
  createdAt: string;
  actionUrl: string;
}

export interface PharmacyNotificationsData {
  notifications: Notification[];
  derivedNotifications: PharmacyDerivedNotification[];
}

export function usePharmacyNotifications(userId: string | null | undefined) {
  return useQuery<PharmacyNotificationsData | null>(async () => {
    if (!userId) {
      return null;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const organizationId = membership?.organization_id ?? null;

    const [
      { data: notifications, error: notificationsError },
      { data: conversations, error: conversationsError },
      { data: newTasks, error: newTasksError },
    ] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(25),
      supabase.from('conversations').select('id').filter('participant_ids', 'cs', `["${userId}"]`),
      organizationId
        ? supabase
            .from('pharmacy_dispensing_tasks')
            .select('id, patient_name, medication_name, received_at')
            .eq('organization_id', organizationId)
            .eq('workflow_status', 'new')
            .order('received_at', { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (notificationsError) throw notificationsError;
    if (conversationsError) throw conversationsError;
    if (newTasksError) throw newTasksError;

    const derivedNotifications: PharmacyDerivedNotification[] = [];

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

    if (conversationIds.length > 0) {
      const { data: unreadMessages, error: unreadMessagesError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, sent_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .is('read_at', null)
        .order('sent_at', { ascending: false })
        .limit(15);

      if (unreadMessagesError) {
        throw unreadMessagesError;
      }

      const senderIds = Array.from(
        new Set((unreadMessages ?? []).map((message) => message.sender_id).filter(Boolean))
      );
      const { data: senderProfiles, error: senderProfilesError } = senderIds.length
        ? await supabase.from('user_profiles').select('user_id, full_name').in('user_id', senderIds)
        : { data: [], error: null };

      if (senderProfilesError) {
        throw senderProfilesError;
      }

      const senderNameById = new Map(
        (senderProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? careTeamFallback()])
      );

      for (const message of unreadMessages ?? []) {
        derivedNotifications.push({
          id: `message-${message.id}`,
          kind: 'message',
          title: newMessageFrom(senderNameById.get(message.sender_id) ?? careTeamFallback()),
          body: message.body?.trim() || openThreadFallback(),
          createdAt: message.sent_at,
          actionUrl: `/pharmacy/messages/${message.conversation_id}`,
        });
      }
    }

    for (const task of newTasks ?? []) {
      derivedNotifications.push({
        id: `new-task-${task.id}`,
        kind: 'new_prescription',
        title: newPrescriptionTitle(task.patient_name ?? 'a patient'),
        body: newPrescriptionBody(task.medication_name ?? 'the prescription'),
        createdAt: task.received_at,
        actionUrl: `/pharmacy/dispensing`,
      });
    }

    derivedNotifications.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    return {
      notifications: (notifications ?? []) as Notification[],
      derivedNotifications: derivedNotifications.slice(0, 25),
    };
  }, [userId ?? '']);
}
