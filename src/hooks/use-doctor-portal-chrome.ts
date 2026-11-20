import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import { isCriticalLabItem } from '../lib/lab-severity';
import { CLINIC_TIME_ZONE, isSameCalendarDayInTimeZone } from '../lib/i18n-ui';
import type { AppointmentStatus } from '../types';
import { useQuery } from './use-query';

interface DoctorPortalChromeData {
  todayAppointmentsCount: number;
  completedTodayAppointmentsCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  criticalResultsCount: number;
  activeConsultationPatientId: string | null;
  activeConsultationPatientName: string | null;
  activeConsultationStartedAt: string | null;
}

interface AppointmentRow {
  patient_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
}

const TODAY_ACTIVE_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress', 'completed']);

export function useDoctorPortalChrome(userId: string | null | undefined) {
  return useQuery<DoctorPortalChromeData | null>(async () => {
    if (!userId) {
      return null;
    }

    const [
      { data: appointments, error: appointmentsError },
      { data: conversations, error: conversationsError },
      // QA-161: the bell shows unread notifications, not unread messages.
      { count: unreadNotificationsCount, error: unreadNotificationsError },
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('patient_id, scheduled_at, status')
        .eq('doctor_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true }),
      supabase.from('conversations').select('id'),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('is_read', false),
    ]);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (conversationsError) {
      throw conversationsError;
    }

    if (unreadNotificationsError) {
      throw unreadNotificationsError;
    }

    const now = new Date();
    const safeAppointments = (appointments ?? []) as AppointmentRow[];
    const todayAppointmentsCount = safeAppointments.filter(
      (appointment) =>
        TODAY_ACTIVE_STATUSES.has(appointment.status) &&
        isSameCalendarDayInTimeZone(appointment.scheduled_at, now, CLINIC_TIME_ZONE)
    ).length;
    const completedTodayAppointmentsCount = safeAppointments.filter(
      (appointment) => appointment.status === 'completed' && isSameCalendarDayInTimeZone(appointment.scheduled_at, now, CLINIC_TIME_ZONE)
    ).length;
    const activeConsultation = safeAppointments.find((appointment) => appointment.status === 'in_progress') ?? null;

    let activeConsultationPatientName: string | null = null;
    if (activeConsultation?.patient_id) {
      const { data: patientProfile, error: patientProfileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', activeConsultation.patient_id)
        .maybeSingle();

      if (patientProfileError) {
        throw patientProfileError;
      }

      activeConsultationPatientName =
        patientProfile?.full_name?.trim() ||
        i18n.t('shared.patient', { defaultValue: 'Patient' });
    }

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
    let unreadMessagesCount = 0;
    if (conversationIds.length > 0) {
      const { count, error: unreadMessagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_deleted', false)
        .is('read_at', null);

      if (unreadMessagesError) {
        throw unreadMessagesError;
      }

      unreadMessagesCount = count ?? 0;
    }

    // QA-186: the red "critical" count in the sidebar / top bar follows the same rule as Lab
    // Referrals and the Dashboard (QA-142 / QA-180): lab orders that are not reviewed yet and have at
    // least one critical result (HH / LL, or marked critical by the lab). It used to count every
    // abnormal item, including orders the doctor had already reviewed, so it was almost always red.
    const { data: openLabOrders, error: openLabOrdersError } = await supabase
      .from('lab_orders')
      .select('id, status')
      .eq('doctor_id', userId)
      .eq('is_deleted', false)
      .in('status', ['ordered', 'collected', 'processing', 'resulted']);

    if (openLabOrdersError) {
      throw openLabOrdersError;
    }

    const openLabOrderIds = (openLabOrders ?? []).map((labOrder) => labOrder.id);
    let criticalResultsCount = 0;

    if (openLabOrderIds.length > 0) {
      const { data: resultItems, error: criticalResultsError } = await supabase
        .from('lab_order_items')
        .select('lab_order_id, numeric_value, result_value, status_category, is_abnormal, flag')
        .in('lab_order_id', openLabOrderIds)
        .in('status', ['resulted', 'reviewed']);

      if (criticalResultsError) {
        throw criticalResultsError;
      }

      criticalResultsCount = new Set(
        ((resultItems ?? []) as Array<Parameters<typeof isCriticalLabItem>[0] & { lab_order_id: string }>)
          .filter((item) => isCriticalLabItem(item))
          .map((item) => item.lab_order_id)
      ).size;
    }

    return {
      todayAppointmentsCount,
      completedTodayAppointmentsCount,
      unreadMessagesCount,
      unreadNotificationsCount: unreadNotificationsCount ?? 0,
      criticalResultsCount,
      activeConsultationPatientId: activeConsultation?.patient_id ?? null,
      activeConsultationPatientName,
      activeConsultationStartedAt: activeConsultation?.scheduled_at ?? null,
    };
  }, [userId]);
}
