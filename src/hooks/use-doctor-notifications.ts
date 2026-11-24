import i18n from 'i18next';
import type { Notification } from '../types';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';
import { formatLocaleDigits } from '../lib/i18n-ui';

const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });
const newMessageFrom = (name: string) =>
  i18n.t('doctor.notifications.newMessageFrom', {
    name,
    defaultValue: 'New message from {{name}}',
  });
const newMessagesFrom = (name: string, count: number) =>
  i18n.t('doctor.notifications.newMessagesFrom', {
    name,
    count,
    value: formatLocaleDigits(count, i18n.language ?? 'en'),
  });
const openThreadFallback = () =>
  i18n.t('doctor.notifications.openThreadFallback', {
    defaultValue: 'Open the thread to review the latest care message.',
  });
const preVisitTitle = (name: string) =>
  i18n.t('doctor.notifications.preVisitCompleted', {
    name,
    defaultValue: '{{name}} completed pre-visit intake',
  });
const preVisitBody = () =>
  i18n.t('doctor.notifications.preVisitBody', {
    defaultValue: 'Review the appointment detail to see the patient summary and intake answers.',
  });
const chartUpdateTitle = (name: string) =>
  i18n.t('doctor.notifications.chartUpdated', {
    name,
    defaultValue: '{{name}} updated chart information',
  });
const recordFallback = () => i18n.t('doctor.notifications.recordFallback');
// QA-164: display_label is stored in English; lower-case it only inside the English sentence.
const chartLabel = (label: string | null | undefined) => {
  const trimmed = label?.trim();
  if (!trimmed) return recordFallback();
  return (i18n.language ?? 'en').startsWith('en') ? trimmed.toLowerCase() : trimmed;
};
const chartUpdateBody = (label: string) =>
  i18n.t('doctor.notifications.chartUpdateBody', {
    label,
    defaultValue: 'Review {{label}} in the patient detail workspace.',
  });

export interface DoctorDerivedNotification {
  id: string;
  kind: 'message' | 'pre_visit' | 'patient_update';
  title: string;
  body: string;
  createdAt: string;
  actionUrl: string;
}

// QA-162: the log shows the newest NOTIFICATION_LOG_LIMIT rows; the counts come from the database.
export const NOTIFICATION_LOG_LIMIT = 25;

export interface DoctorNotificationsData {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  derivedNotifications: DoctorDerivedNotification[];
}

// QA-160: how many unread messages to scan before grouping them into one card per conversation.
const UNREAD_MESSAGE_SCAN_LIMIT = 100;

export function useDoctorNotifications(userId: string | null | undefined) {
  return useQuery<DoctorNotificationsData | null>(async () => {
    if (!userId) {
      return null;
    }

    const { data: rosterRows, error: rosterError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', userId)
      .eq('is_deleted', false);

    if (rosterError) throw rosterError;

    const allowedPatientIds = new Set(
      (rosterRows ?? []).map((row) => row.patient_id).filter((id): id is string => Boolean(id))
    );

    const [
      { data: notifications, error: notificationsError },
      { data: conversations, error: conversationsError },
      { data: completedAssessments, error: completedAssessmentsError },
      { data: doctorReviewUpdates, error: doctorReviewUpdatesError },
      { count: totalCount, error: totalCountError },
      { count: unreadCount, error: unreadCountError },
    ] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LOG_LIMIT),
      supabase.from('conversations').select('id').filter('participant_ids', 'cs', `["${userId}"]`),
      supabase
        .from('appointment_pre_visit_assessments')
        .select('id, appointment_id, patient_id, completed_at, updated_at')
        .eq('doctor_id', userId)
        .eq('status', 'completed')
        .is('reviewed_at', null)
        .order('completed_at', { ascending: false })
        .limit(12),
      supabase
        .from('patient_canonical_update_requests')
        .select('id, patient_id, display_label, created_at, updated_at')
        .eq('requires_doctor_review', true)
        .eq('status', 'pending')
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('is_read', false),
    ]);

    if (notificationsError) throw notificationsError;
    if (conversationsError) throw conversationsError;
    if (completedAssessmentsError) throw completedAssessmentsError;
    if (doctorReviewUpdatesError) throw doctorReviewUpdatesError;
    if (totalCountError) throw totalCountError;
    if (unreadCountError) throw unreadCountError;

    const derivedNotifications: DoctorDerivedNotification[] = [];

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

    if (conversationIds.length > 0) {
      const { data: unreadMessages, error: unreadMessagesError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, sent_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_deleted', false)
        .is('read_at', null)
        .order('sent_at', { ascending: false })
        .limit(UNREAD_MESSAGE_SCAN_LIMIT);

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
        (senderProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? patientFallback()])
      );

      // QA-160: one card per conversation (newest message first), not one per message.
      const unreadByConversation = new Map<
        string,
        { latest: NonNullable<typeof unreadMessages>[number]; count: number }
      >();
      for (const message of unreadMessages ?? []) {
        const entry = unreadByConversation.get(message.conversation_id);
        if (entry) {
          entry.count += 1;
        } else {
          unreadByConversation.set(message.conversation_id, { latest: message, count: 1 });
        }
      }

      for (const { latest, count } of unreadByConversation.values()) {
        const senderName = senderNameById.get(latest.sender_id) ?? patientFallback();
        derivedNotifications.push({
          id: `message-${latest.conversation_id}`,
          kind: 'message',
          title: count === 1 ? newMessageFrom(senderName) : newMessagesFrom(senderName, count),
          body: latest.body?.trim() || openThreadFallback(),
          createdAt: latest.sent_at,
          actionUrl: `/doctor/messages/${latest.conversation_id}`,
        });
      }
    }

    const assessmentPatientIds = Array.from(
      new Set((completedAssessments ?? []).map((assessment) => assessment.patient_id))
    );
    const assessmentAppointmentIds = (completedAssessments ?? []).map((assessment) => assessment.appointment_id);

    const [
      { data: assessmentPatientProfiles, error: assessmentPatientProfilesError },
      { data: assessmentAppointments, error: assessmentAppointmentsError },
    ] = await Promise.all([
      assessmentPatientIds.length > 0
        ? supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', assessmentPatientIds)
        : Promise.resolve({ data: [], error: null }),
      assessmentAppointmentIds.length > 0
        ? supabase
            .from('appointments')
            .select('id, chief_complaint, status')
            .in('id', assessmentAppointmentIds)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (assessmentPatientProfilesError) throw assessmentPatientProfilesError;
    if (assessmentAppointmentsError) throw assessmentAppointmentsError;

    const assessmentPatientNameById = new Map(
      (assessmentPatientProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? patientFallback()])
    );
    const assessmentAppointmentById = new Map(
      (assessmentAppointments ?? []).map((appointment) => [appointment.id, appointment])
    );

    for (const assessment of completedAssessments ?? []) {
      const appointment = assessmentAppointmentById.get(assessment.appointment_id);
      // QA-160: skip intake for appointments that were deleted or cancelled.
      if (!appointment || appointment.status === 'cancelled') {
        continue;
      }
      derivedNotifications.push({
        id: `previsit-${assessment.id}`,
        kind: 'pre_visit',
        title: preVisitTitle(assessmentPatientNameById.get(assessment.patient_id) ?? patientFallback()),
        body: appointment.chief_complaint?.trim() || preVisitBody(),
        createdAt: assessment.completed_at ?? assessment.updated_at,
        actionUrl: `/doctor/appointments/${assessment.appointment_id}`,
      });
    }

    const reviewPatientIds = Array.from(
      new Set(
        (doctorReviewUpdates ?? [])
          .map((update) => update.patient_id)
          .filter((patientId) => allowedPatientIds.has(patientId))
      )
    );
    const { data: reviewPatientProfiles, error: reviewPatientProfilesError } = reviewPatientIds.length
      ? await supabase.from('user_profiles').select('user_id, full_name').in('user_id', reviewPatientIds)
      : { data: [], error: null };

    if (reviewPatientProfilesError) {
      throw reviewPatientProfilesError;
    }

    const reviewPatientNameById = new Map(
      (reviewPatientProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? patientFallback()])
    );

    for (const update of doctorReviewUpdates ?? []) {
      if (!allowedPatientIds.has(update.patient_id)) {
        continue;
      }
      derivedNotifications.push({
        id: `patient-update-${update.id}`,
        kind: 'patient_update',
        title: chartUpdateTitle(reviewPatientNameById.get(update.patient_id) ?? patientFallback()),
        // display_label is nullable in the canonical schema; chartLabel() falls back to a
        // translated word so a stray null row doesn't crash the entire notifications hook.
        body: chartUpdateBody(chartLabel(update.display_label)),
        createdAt: update.updated_at ?? update.created_at,
        actionUrl: `/doctor/patients/${update.patient_id}`,
      });
    }

    derivedNotifications.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    const loadedNotifications = (notifications ?? []) as Notification[];

    return {
      notifications: loadedNotifications,
      totalCount: totalCount ?? loadedNotifications.length,
      unreadCount: unreadCount ?? loadedNotifications.filter((notification) => !notification.is_read).length,
      derivedNotifications: derivedNotifications.slice(0, 25),
    };
  }, [userId ?? '']);
}
