import i18n from 'i18next';
import type { Notification } from '../types';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';

const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });
const newMessageFrom = (name: string) =>
  i18n.t('doctor.notifications.newMessageFrom', {
    name,
    defaultValue: 'New message from {{name}}',
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

export interface DoctorNotificationsData {
  notifications: Notification[];
  derivedNotifications: DoctorDerivedNotification[];
}

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
    ] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(25),
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
    ]);

    if (notificationsError) throw notificationsError;
    if (conversationsError) throw conversationsError;
    if (completedAssessmentsError) throw completedAssessmentsError;
    if (doctorReviewUpdatesError) throw doctorReviewUpdatesError;

    const derivedNotifications: DoctorDerivedNotification[] = [];

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
        (senderProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? patientFallback()])
      );

      for (const message of unreadMessages ?? []) {
        derivedNotifications.push({
          id: `message-${message.id}`,
          kind: 'message',
          title: newMessageFrom(senderNameById.get(message.sender_id) ?? patientFallback()),
          body: message.body?.trim() || openThreadFallback(),
          createdAt: message.sent_at,
          actionUrl: `/doctor/messages/${message.conversation_id}`,
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
            .select('id, chief_complaint')
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
      derivedNotifications.push({
        id: `previsit-${assessment.id}`,
        kind: 'pre_visit',
        title: preVisitTitle(assessmentPatientNameById.get(assessment.patient_id) ?? patientFallback()),
        body: appointment?.chief_complaint?.trim() || preVisitBody(),
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
        // display_label is nullable in the canonical schema; coalesce so a
        // stray null row doesn't crash the entire notifications hook.
        body: chartUpdateBody((update.display_label ?? 'record').toLowerCase()),
        createdAt: update.updated_at ?? update.created_at,
        actionUrl: `/doctor/patients/${update.patient_id}`,
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
