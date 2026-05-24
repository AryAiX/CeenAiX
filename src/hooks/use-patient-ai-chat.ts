import i18n from 'i18next';
import type { AiChatStoredAttachment } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

const doctorFallback = () => i18n.t('shared.doctor', { defaultValue: 'Doctor' });

export interface PatientAiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments: AiChatStoredAttachment[];
}

export interface PatientAiChatNextAppointment {
  id: string;
  scheduledAt: string;
  chiefComplaint: string | null;
  doctorName: string;
}

export interface PatientAiChatSessionSummary {
  id: string;
  startedAt: string;
  lastMessageAt: string;
  preview: string;
}

export interface PatientAiChatData {
  sessionId: string | null;
  sessions: PatientAiChatSessionSummary[];
  messages: PatientAiChatMessage[];
  contextSummary: {
    conditionsCount: number;
    allergiesCount: number;
    activeMedicationCount: number;
    recentAppointmentsCount: number;
    labResultCount: number;
  };
  nextAppointment: PatientAiChatNextAppointment | null;
}

const getMessagePreview = (message: { content: string; role: 'user' | 'assistant' | 'system' }) => {
  const normalized = message.content.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return message.role === 'user' ? 'Your message' : 'Ceen Agent reply';
  }

  return normalized.length > 72 ? `${normalized.slice(0, 72).trimEnd()}...` : normalized;
};

export function usePatientAiChat(userId: string | null | undefined, activeSessionId: string | null = null) {
  return useQuery<PatientAiChatData | null>(async () => {
    if (!userId) {
      return null;
    }

    const [
      { data: sessions, error: sessionsError },
      { data: conditions, error: conditionsError },
      { data: allergies, error: allergiesError },
      { data: prescriptions, error: prescriptionsError },
      { data: appointments, error: appointmentsError },
      { data: labOrders, error: labOrdersError },
      { data: nextAppointments, error: nextAppointmentError },
    ] = await Promise.all([
      supabase
        .from('ai_chat_sessions')
        .select('id, started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20),
      supabase
        .from('medical_conditions')
        .select('id')
        .eq('patient_id', userId)
        .eq('is_deleted', false),
      supabase
        .from('allergies')
        .select('id')
        .eq('patient_id', userId)
        .eq('is_deleted', false),
      supabase
        .from('prescriptions')
        .select('id, status')
        .eq('patient_id', userId)
        .eq('is_deleted', false),
      supabase
        .from('appointments')
        .select('id, status')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: false })
        .limit(5),
      supabase
        .from('lab_orders')
        .select('id')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('ordered_at', { ascending: false })
        .limit(5),
      supabase
        .from('appointments')
        .select('id, doctor_id, scheduled_at, chief_complaint')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1),
    ]);

    if (sessionsError) {
      throw sessionsError;
    }

    if (conditionsError) {
      throw conditionsError;
    }

    if (allergiesError) {
      throw allergiesError;
    }

    if (prescriptionsError) {
      throw prescriptionsError;
    }

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (labOrdersError) {
      throw labOrdersError;
    }

    if (nextAppointmentError) {
      throw nextAppointmentError;
    }

    const sessionId = activeSessionId;
    const sessionIds = (sessions ?? []).map((session) => session.id);
    let messages: PatientAiChatMessage[] = [];
    let sessionSummaries: PatientAiChatSessionSummary[] = [];
    let nextAppointment: PatientAiChatNextAppointment | null = null;

    if (sessionIds.length > 0) {
      const { data: storedMessages, error: messagesError } = await supabase
        .from('ai_chat_messages')
        .select('id, session_id, role, content, created_at, attachments')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(400);

      if (messagesError) {
        throw messagesError;
      }

      const messagesBySessionId = new Map<string, PatientAiChatMessage[]>();
      const latestMessageBySessionId = new Map<
        string,
        {
          content: string;
          role: 'user' | 'assistant' | 'system';
          createdAt: string;
        }
      >();

      for (const message of storedMessages ?? []) {
        if (!latestMessageBySessionId.has(message.session_id)) {
          latestMessageBySessionId.set(message.session_id, {
            content: message.content,
            role: message.role,
            createdAt: message.created_at,
          });
        }

        const currentMessages = messagesBySessionId.get(message.session_id) ?? [];
        currentMessages.push({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.created_at,
          attachments: Array.isArray(message.attachments) ? (message.attachments as AiChatStoredAttachment[]) : [],
        });
        messagesBySessionId.set(message.session_id, currentMessages);
      }

      sessionSummaries = (sessions ?? []).map((session) => {
        const latestMessage = latestMessageBySessionId.get(session.id);

        return {
          id: session.id,
          startedAt: session.started_at,
          lastMessageAt: latestMessage?.createdAt ?? session.started_at,
          preview: latestMessage ? getMessagePreview(latestMessage) : 'New conversation',
        };
      });

      messages = sessionId ? [...(messagesBySessionId.get(sessionId) ?? [])].reverse() : [];
    }

    const nextAppointmentRecord = nextAppointments?.[0] ?? null;

    if (nextAppointmentRecord) {
      const { data: doctorProfile, error: doctorProfileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('user_id', nextAppointmentRecord.doctor_id)
        .maybeSingle();

      if (doctorProfileError) {
        throw doctorProfileError;
      }

      nextAppointment = {
        id: nextAppointmentRecord.id,
        scheduledAt: nextAppointmentRecord.scheduled_at,
        chiefComplaint: nextAppointmentRecord.chief_complaint,
        doctorName: doctorProfile?.full_name ?? doctorFallback(),
      };
    }

    const labOrderIds = (labOrders ?? []).map((labOrder) => labOrder.id);
    let labResultCount = 0;

    if (labOrderIds.length > 0) {
      const { count, error: labItemsError } = await supabase
        .from('lab_order_items')
        .select('id', { count: 'exact', head: true })
        .in('lab_order_id', labOrderIds)
        .not('resulted_at', 'is', null);

      if (labItemsError) {
        throw labItemsError;
      }

      labResultCount = count ?? 0;
    }

    return {
      sessionId,
      sessions: sessionSummaries,
      messages,
      contextSummary: {
        conditionsCount: conditions?.length ?? 0,
        allergiesCount: allergies?.length ?? 0,
        activeMedicationCount: (prescriptions ?? []).filter((prescription) => prescription.status === 'active')
          .length,
        recentAppointmentsCount: appointments?.length ?? 0,
        labResultCount,
      },
      nextAppointment,
    };
  }, [activeSessionId ?? '', userId]);
}
