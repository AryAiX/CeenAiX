import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import { CLINIC_TIME_ZONE, isSameCalendarDayInTimeZone } from '../lib/i18n-ui';
import type { AppointmentStatus } from '../types';
import { useQuery } from './use-query';

interface DoctorPortalChromeData {
  todayAppointmentsCount: number;
  completedTodayAppointmentsCount: number;
  unreadMessagesCount: number;
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

    const [{ data: appointments, error: appointmentsError }, { data: conversations, error: conversationsError }] =
      await Promise.all([
        supabase
          .from('appointments')
          .select('patient_id, scheduled_at, status')
          .eq('doctor_id', userId)
          .eq('is_deleted', false)
          .order('scheduled_at', { ascending: true }),
        supabase.from('conversations').select('id'),
      ]);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (conversationsError) {
      throw conversationsError;
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
        .is('read_at', null);

      if (unreadMessagesError) {
        throw unreadMessagesError;
      }

      unreadMessagesCount = count ?? 0;
    }

    const { data: resultedLabOrders, error: resultedLabOrdersError } = await supabase
      .from('lab_orders')
      .select('id')
      .eq('doctor_id', userId)
      .eq('is_deleted', false)
      .eq('status', 'resulted');

    if (resultedLabOrdersError) {
      throw resultedLabOrdersError;
    }

    const resultedLabOrderIds = (resultedLabOrders ?? []).map((labOrder) => labOrder.id);
    let criticalResultsCount = 0;

    if (resultedLabOrderIds.length > 0) {
      const { count, error: criticalResultsError } = await supabase
        .from('lab_order_items')
        .select('id', { count: 'exact', head: true })
        .in('lab_order_id', resultedLabOrderIds)
        .eq('status', 'resulted')
        .eq('is_abnormal', true);

      if (criticalResultsError) {
        throw criticalResultsError;
      }

      criticalResultsCount = count ?? 0;
    }

    return {
      todayAppointmentsCount,
      completedTodayAppointmentsCount,
      unreadMessagesCount,
      criticalResultsCount,
      activeConsultationPatientId: activeConsultation?.patient_id ?? null,
      activeConsultationPatientName,
      activeConsultationStartedAt: activeConsultation?.scheduled_at ?? null,
    };
  }, [userId]);
}
