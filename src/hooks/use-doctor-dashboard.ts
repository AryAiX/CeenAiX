import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import { CLINIC_TIME_ZONE, clinicDayUtcBounds, isSameCalendarDayInTimeZone } from '../lib/i18n-ui';
import { getMessagePreviewText } from '../lib/messaging';
import type { AppointmentStatus, AppointmentType, LabOrderStatus, PreVisitAssessmentStatus } from '../types';
import { useQuery } from './use-query';

const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });

interface DoctorNextAppointment {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMinutes: number | null;
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint: string | null;
  patientAgeGender: string | null;
  bloodType: string | null;
  insuranceName: string | null;
  conditions: string[];
  allergies: string[];
  medications: string[];
  flags: string[];
  visitCount: number;
  lastVisitAt: string | null;
}

export interface DoctorDashboardMessagePreview {
  id: string;
  conversationId: string;
  patientId: string;
  patientName: string;
  subject: string | null;
  body: string;
  sentAt: string;
  readAt: string | null;
}

export interface DoctorCriticalResult {
  id: string;
  labOrderId: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  resultedAt: string;
  labOrderStatus: LabOrderStatus;
}

export interface DoctorQueueAppointment {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMinutes: number | null;
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint: string | null;
  preVisitStatus: PreVisitAssessmentStatus | null;
  insuranceName: string | null;
  flags: string[];
}

export interface DoctorDashboardData {
  totalPatients: number;
  todayAppointments: number;
  completedTodayAppointments: number;
  remainingTodayAppointments: number;
  inProgressAppointments: number;
  unreadMessages: number;
  pendingReviews: number;
  prescriptionsToday: number;
  labOrdersToday: number;
  estimatedRevenueToday: number | null;
  activeConsultation: DoctorNextAppointment | null;
  nextAppointment: DoctorNextAppointment | null;
  todaySchedule: DoctorQueueAppointment[];
  todayQueue: DoctorQueueAppointment[];
  criticalResults: DoctorCriticalResult[];
  recentLabResults: DoctorCriticalResult[];
  recentMessages: DoctorDashboardMessagePreview[];
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  type: AppointmentType;
  status: AppointmentStatus;
  chief_complaint: string | null;
}

interface PatientProfileRow {
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface PatientClinicalProfileRow {
  user_id: string;
  blood_type: string | null;
}

interface InsurancePlanRelation {
  name: string | null;
  provider_company: string | null;
  coverage_type: string | null;
}

interface PatientInsuranceRow {
  patient_id: string;
  is_primary: boolean | null;
  insurance_plans: InsurancePlanRelation | InsurancePlanRelation[] | null;
}

interface ConditionRow {
  patient_id: string;
  condition_name: string;
  status: string;
}

interface AllergyRow {
  patient_id: string;
  allergen: string;
  severity: string | null;
}

interface PrescriptionMedicationRow {
  medication_name: string;
  dosage: string | null;
}

interface PrescriptionRow {
  id: string;
  patient_id: string;
  status: string;
  prescribed_at: string;
  prescription_items?: PrescriptionMedicationRow[] | null;
}

interface DoctorProfileFeeRow {
  consultation_fee: number | null;
}

interface ConversationRow {
  id: string;
  subject: string | null;
  participant_ids: string[];
}

interface MessagePreviewRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

interface LabOrderRow {
  id: string;
  patient_id: string;
  status: LabOrderStatus;
}

interface LabOrderItemRow {
  id: string;
  lab_order_id: string;
  test_name: string;
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean | null;
  resulted_at: string | null;
}

const UPCOMING_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress']);
const TODAY_ACTIVE_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress', 'completed']);

const firstRelation = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const calculateAge = (dateOfBirth: string | null | undefined) => {
  if (!dateOfBirth) {
    return null;
  }

  const dateOnly = dateOfBirth.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) {
    return null;
  }

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayKey);
  if (!todayMatch) {
    return null;
  }

  let age = Number(todayMatch[1]) - birthYear;
  const monthDelta = Number(todayMatch[2]) - birthMonth;
  if (monthDelta < 0 || (monthDelta === 0 && Number(todayMatch[3]) < birthDay)) {
    age -= 1;
  }

  return age;
};

const formatAgeGender = (profile: PatientProfileRow | undefined) => {
  const age = calculateAge(profile?.date_of_birth);
  const gender = profile?.gender?.trim().charAt(0).toUpperCase() ?? '';
  if (age !== null && gender) return `${age}${gender}`;
  if (age !== null) return `${age}`;
  return profile?.gender?.trim() || null;
};

const pushMapValue = <T,>(map: Map<string, T[]>, key: string, value: T) => {
  const existing = map.get(key) ?? [];
  existing.push(value);
  map.set(key, existing);
};

export function useDoctorDashboard(userId: string | null | undefined) {
  return useQuery<DoctorDashboardData | null>(async () => {
    if (!userId) {
      return null;
    }

    const [
      { data: appointments, error: appointmentsError },
      { count: pendingNotesCount, error: pendingNotesError },
      { data: conversations, error: conversationsError },
      { count: patientUpdateReviewCount, error: patientUpdateReviewError },
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, patient_id, scheduled_at, duration_minutes, type, status, chief_complaint')
        .eq('doctor_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('consultation_notes')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', userId)
        .eq('doctor_approved', false)
        .eq('is_deleted', false),
      // RLS limits visible conversations to ones the current doctor participates in.
      supabase.from('conversations').select('id, subject, participant_ids'),
      supabase
        .from('patient_canonical_update_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requires_doctor_review', true)
        .eq('status', 'pending'),
    ]);

    if (appointmentsError) throw appointmentsError;
    if (pendingNotesError) throw pendingNotesError;
    if (conversationsError) throw conversationsError;
    if (patientUpdateReviewError) throw patientUpdateReviewError;

    const safeAppointments = (appointments ?? []) as AppointmentRow[];
    const safeConversations = (conversations ?? []) as ConversationRow[];
    // "Total patients" should reflect patients with at least one non-cancelled
    // visit — counting cancelled-only patients overstates the panel.
    const patientIds = Array.from(
      new Set(
        safeAppointments
          .filter(
            (appointment) =>
              appointment.status !== 'cancelled' && appointment.status !== 'no_show'
          )
          .map((appointment) => appointment.patient_id)
      )
    );
    const appointmentIds = safeAppointments.map((appointment) => appointment.id);

    const now = new Date();
    const { startIso: startOfTodayIso, endIso: endOfTodayIso } = clinicDayUtcBounds(now);

    const [
      { data: patientProfiles, error: patientProfilesError },
      { data: patientClinicalProfiles, error: patientClinicalProfilesError },
      { data: patientInsuranceRows, error: patientInsuranceError },
      { data: conditionRows, error: conditionsError },
      { data: allergyRows, error: allergiesError },
      { data: prescriptionRows, error: prescriptionsError },
      { data: doctorProfileRows, error: doctorProfileError },
      { count: prescriptionsTodayCount, error: prescriptionsTodayError },
      { count: labOrdersTodayCount, error: labOrdersTodayError },
      { data: preVisitAssessments, error: preVisitAssessmentsError },
    ] = await Promise.all([
      patientIds.length > 0
        ? supabase.from('user_profiles').select('user_id, full_name, date_of_birth, gender').in('user_id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase.from('patient_profiles').select('user_id, blood_type').in('user_id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('patient_insurance')
            .select('patient_id, is_primary, insurance_plans (name, provider_company, coverage_type)')
            .in('patient_id', patientIds)
            .order('is_primary', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('medical_conditions')
            .select('patient_id, condition_name, status')
            .in('patient_id', patientIds)
            .eq('is_deleted', false)
            .in('status', ['active', 'chronic'])
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('allergies')
            .select('patient_id, allergen, severity')
            .in('patient_id', patientIds)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
      patientIds.length > 0
        ? supabase
            .from('prescriptions')
            .select('id, patient_id, status, prescribed_at, prescription_items (medication_name, dosage)')
            .in('patient_id', patientIds)
            .eq('doctor_id', userId)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('doctor_profiles').select('consultation_fee').eq('user_id', userId).maybeSingle(),
      supabase
        .from('prescriptions')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', userId)
        .eq('is_deleted', false)
        .gte('prescribed_at', startOfTodayIso)
        .lte('prescribed_at', endOfTodayIso),
      supabase
        .from('lab_orders')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', userId)
        .eq('is_deleted', false)
        .gte('ordered_at', startOfTodayIso)
        .lte('ordered_at', endOfTodayIso),
      appointmentIds.length > 0
        ? supabase
            .from('appointment_pre_visit_assessments')
            .select('appointment_id, status, reviewed_at')
            .in('appointment_id', appointmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (patientProfilesError) throw patientProfilesError;
    if (patientClinicalProfilesError) throw patientClinicalProfilesError;
    if (patientInsuranceError) throw patientInsuranceError;
    if (conditionsError) throw conditionsError;
    if (allergiesError) throw allergiesError;
    if (prescriptionsError) throw prescriptionsError;
    if (doctorProfileError) throw doctorProfileError;
    if (prescriptionsTodayError) throw prescriptionsTodayError;
    if (labOrdersTodayError) throw labOrdersTodayError;
    if (preVisitAssessmentsError) throw preVisitAssessmentsError;

    const patientNameById = new Map(
      ((patientProfiles ?? []) as PatientProfileRow[]).map((profile) => [profile.user_id, profile.full_name ?? patientFallback()])
    );
    const patientProfileById = new Map(
      ((patientProfiles ?? []) as PatientProfileRow[]).map((profile) => [profile.user_id, profile])
    );
    const patientClinicalProfileById = new Map(
      ((patientClinicalProfiles ?? []) as PatientClinicalProfileRow[]).map((profile) => [profile.user_id, profile])
    );
    const preVisitStatusByAppointmentId = new Map(
      (preVisitAssessments ?? []).map((assessment) => [assessment.appointment_id, assessment.status])
    );

    const insuranceNameByPatientId = new Map<string, string>();
    ((patientInsuranceRows ?? []) as PatientInsuranceRow[]).forEach((row) => {
      if (insuranceNameByPatientId.has(row.patient_id)) {
        return;
      }
      const plan = firstRelation(row.insurance_plans);
      insuranceNameByPatientId.set(
        row.patient_id,
        plan ? [plan.provider_company, plan.name].filter(Boolean).join(' ') || plan.coverage_type || 'Insurance on file' : 'Insurance on file'
      );
    });

    const conditionsByPatientId = new Map<string, string[]>();
    ((conditionRows ?? []) as ConditionRow[]).forEach((condition) => {
      pushMapValue(conditionsByPatientId, condition.patient_id, condition.condition_name);
    });

    const allergiesByPatientId = new Map<string, string[]>();
    ((allergyRows ?? []) as AllergyRow[]).forEach((allergy) => {
      pushMapValue(
        allergiesByPatientId,
        allergy.patient_id,
        allergy.severity ? `${allergy.allergen} (${allergy.severity})` : allergy.allergen
      );
    });

    const medicationsByPatientId = new Map<string, string[]>();
    ((prescriptionRows ?? []) as PrescriptionRow[])
      .filter((prescription) => prescription.status === 'active')
      .forEach((prescription) => {
        (prescription.prescription_items ?? []).forEach((item) => {
          pushMapValue(
            medicationsByPatientId,
            prescription.patient_id,
            [item.medication_name, item.dosage].filter(Boolean).join(' ')
          );
        });
      });

    const appointmentsByPatientId = new Map<string, AppointmentRow[]>();
    safeAppointments.forEach((appointment) => {
      pushMapValue(appointmentsByPatientId, appointment.patient_id, appointment);
    });

    const consultationFee = ((doctorProfileRows as DoctorProfileFeeRow | null) ?? null)?.consultation_fee ?? null;

    const buildAppointment = (appointment: AppointmentRow): DoctorNextAppointment => {
      const patientProfile = patientProfileById.get(appointment.patient_id);
      const patientAppointments = appointmentsByPatientId.get(appointment.patient_id) ?? [];
      const previousAppointments = patientAppointments
        .filter((candidate) => new Date(candidate.scheduled_at).getTime() < new Date(appointment.scheduled_at).getTime())
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      const allergies = allergiesByPatientId.get(appointment.patient_id) ?? [];
      const medications = medicationsByPatientId.get(appointment.patient_id) ?? [];

      return {
        id: appointment.id,
        patientId: appointment.patient_id,
        patientName: patientNameById.get(appointment.patient_id) ?? patientFallback(),
        scheduledAt: appointment.scheduled_at,
        durationMinutes: appointment.duration_minutes,
        type: appointment.type,
        status: appointment.status,
        chiefComplaint: appointment.chief_complaint,
        patientAgeGender: formatAgeGender(patientProfile),
        bloodType: patientClinicalProfileById.get(appointment.patient_id)?.blood_type ?? null,
        insuranceName: insuranceNameByPatientId.get(appointment.patient_id) ?? null,
        conditions: (conditionsByPatientId.get(appointment.patient_id) ?? []).slice(0, 3),
        allergies: allergies.slice(0, 3),
        medications: medications.slice(0, 3),
        flags: [
          ...allergies.slice(0, 1).map((allergy) => `ALLERGY: ${allergy}`),
          ...(medications.length > 0 ? [`${medications.length} active medications`] : []),
        ],
        // Honour clinical intent: visit counts should only include visits
        // that actually occurred. Cancelled/no-show rows are noise here.
        visitCount: patientAppointments.filter(
          (appointment) =>
            appointment.status !== 'cancelled' && appointment.status !== 'no_show'
        ).length,
        lastVisitAt:
          previousAppointments.find(
            (appointment) =>
              appointment.status !== 'cancelled' && appointment.status !== 'no_show'
          )?.scheduled_at ?? null,
      };
    };

    const todayAppointmentRows = safeAppointments.filter(
      (appointment) =>
        TODAY_ACTIVE_STATUSES.has(appointment.status) &&
        isSameCalendarDayInTimeZone(appointment.scheduled_at, now, CLINIC_TIME_ZONE)
    );

    const todayAppointments = todayAppointmentRows.length;
    const completedTodayAppointments = todayAppointmentRows.filter((appointment) => appointment.status === 'completed').length;
    const inProgressAppointmentRows = safeAppointments.filter((appointment) => appointment.status === 'in_progress');
    const inProgressAppointments = inProgressAppointmentRows.length;
    const activeConsultationSource = inProgressAppointmentRows[0] ?? null;
    const remainingTodayAppointments = todayAppointmentRows.filter((appointment) =>
      ['scheduled', 'confirmed', 'in_progress'].includes(appointment.status)
    ).length;

    const nextAppointmentSource =
      safeAppointments.find(
        (appointment) =>
          UPCOMING_STATUSES.has(appointment.status) &&
          new Date(appointment.scheduled_at).getTime() >= now.getTime()
      ) ?? null;

    const todayQueue = safeAppointments
      .filter(
        (appointment) =>
          UPCOMING_STATUSES.has(appointment.status) &&
          isSameCalendarDayInTimeZone(appointment.scheduled_at, now, CLINIC_TIME_ZONE)
      )
      .map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patient_id,
        patientName: patientNameById.get(appointment.patient_id) ?? patientFallback(),
        scheduledAt: appointment.scheduled_at,
        durationMinutes: appointment.duration_minutes,
        type: appointment.type,
        status: appointment.status,
        chiefComplaint: appointment.chief_complaint,
        preVisitStatus: preVisitStatusByAppointmentId.get(appointment.id) ?? null,
        insuranceName: insuranceNameByPatientId.get(appointment.patient_id) ?? null,
        flags: [
          ...((allergiesByPatientId.get(appointment.patient_id) ?? []).slice(0, 1).map((allergy) => `ALLERGY: ${allergy}`)),
          ...((medicationsByPatientId.get(appointment.patient_id) ?? []).length > 0
            ? [`${(medicationsByPatientId.get(appointment.patient_id) ?? []).length} active medications`]
            : []),
        ],
      }));
    const todaySchedule = safeAppointments
      .filter(
        (appointment) =>
          TODAY_ACTIVE_STATUSES.has(appointment.status) &&
          isSameCalendarDayInTimeZone(appointment.scheduled_at, now, CLINIC_TIME_ZONE)
      )
      .map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patient_id,
        patientName: patientNameById.get(appointment.patient_id) ?? patientFallback(),
        scheduledAt: appointment.scheduled_at,
        durationMinutes: appointment.duration_minutes,
        type: appointment.type,
        status: appointment.status,
        chiefComplaint: appointment.chief_complaint,
        preVisitStatus: preVisitStatusByAppointmentId.get(appointment.id) ?? null,
        insuranceName: insuranceNameByPatientId.get(appointment.patient_id) ?? null,
        flags: [
          ...((allergiesByPatientId.get(appointment.patient_id) ?? []).slice(0, 1).map((allergy) => `ALLERGY: ${allergy}`)),
          ...((medicationsByPatientId.get(appointment.patient_id) ?? []).length > 0
            ? [`${(medicationsByPatientId.get(appointment.patient_id) ?? []).length} active medications`]
            : []),
        ],
      }));

    const preVisitReviewCount = (preVisitAssessments ?? []).filter(
      (assessment) => assessment.status === 'completed' && assessment.reviewed_at == null
    ).length;

    let unreadMessages = 0;
    let recentMessages: DoctorDashboardMessagePreview[] = [];
    let criticalResults: DoctorCriticalResult[] = [];
    let recentLabResults: DoctorCriticalResult[] = [];
    const conversationIds = safeConversations.map((conversation) => conversation.id);

    if (conversationIds.length > 0) {
      const [
        { count, error: unreadMessagesError },
        { data: recentMessageRows, error: recentMessagesError },
      ] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .is('read_at', null)
          .neq('sender_id', userId),
        supabase
          .from('messages')
          .select('id, conversation_id, sender_id, body, sent_at, read_at')
          .in('conversation_id', conversationIds)
          .neq('sender_id', userId)
          .eq('is_deleted', false)
          .gte('sent_at', startOfTodayIso)
          .lte('sent_at', endOfTodayIso)
          .order('sent_at', { ascending: false })
          .limit(4),
      ]);

      if (unreadMessagesError) throw unreadMessagesError;
      if (recentMessagesError) throw recentMessagesError;

      unreadMessages = count ?? 0;

      const conversationById = new Map(safeConversations.map((conversation) => [conversation.id, conversation]));
      recentMessages = ((recentMessageRows ?? []) as MessagePreviewRow[])
        .map((message) => {
          const conversation = conversationById.get(message.conversation_id);
          const patientId =
            conversation?.participant_ids.find((participantId) => participantId !== userId) ?? message.sender_id;

          return {
            id: message.id,
            conversationId: message.conversation_id,
            patientId,
            patientName: patientNameById.get(patientId) ?? patientFallback(),
            subject: conversation?.subject ?? null,
            body: getMessagePreviewText(message.body).trim() || message.body,
            sentAt: message.sent_at,
            readAt: message.read_at,
          };
        })
        .filter((message) => Boolean(message.patientId));
    }

    const { data: labOrders, error: labOrdersError } = await supabase
      .from('lab_orders')
      .select('id, patient_id, status')
      .eq('doctor_id', userId)
      .eq('is_deleted', false)
      .in('status', ['resulted', 'reviewed'])
      .order('ordered_at', { ascending: false })
      .limit(20);

    if (labOrdersError) throw labOrdersError;

    const safeLabOrders = (labOrders ?? []) as LabOrderRow[];
    const labOrderIds = safeLabOrders.map((labOrder) => labOrder.id);

    if (labOrderIds.length > 0) {
      const { data: labOrderItems, error: labOrderItemsError } = await supabase
        .from('lab_order_items')
        .select('id, lab_order_id, test_name, result_value, result_unit, reference_range, is_abnormal, resulted_at')
        .in('lab_order_id', labOrderIds)
        .in('status', ['resulted', 'reviewed'])
        .not('resulted_at', 'is', null)
        .order('resulted_at', { ascending: false })
        .limit(20);

      if (labOrderItemsError) throw labOrderItemsError;

      const labOrderById = new Map(safeLabOrders.map((labOrder) => [labOrder.id, labOrder]));

      const normalizedLabResults = ((labOrderItems ?? []) as LabOrderItemRow[])
        .filter((item) => item.resulted_at)
        .map((item) => {
          const labOrder = labOrderById.get(item.lab_order_id);
          const patientId = labOrder?.patient_id ?? '';

          return {
            id: item.id,
            labOrderId: item.lab_order_id,
            patientId,
            patientName: patientNameById.get(patientId) ?? patientFallback(),
            testName: item.test_name,
            resultValue: item.result_value,
            resultUnit: item.result_unit,
            referenceRange: item.reference_range,
            resultedAt: item.resulted_at as string,
            labOrderStatus: labOrder?.status ?? 'reviewed',
            isAbnormal: item.is_abnormal === true,
          };
        });

      criticalResults = normalizedLabResults
        .filter(
          (item) =>
            item.isAbnormal && (item.labOrderStatus === 'resulted' || item.labOrderStatus === 'reviewed')
        )
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          labOrderId: item.labOrderId,
          patientId: item.patientId,
          patientName: item.patientName,
          testName: item.testName,
          resultValue: item.resultValue,
          resultUnit: item.resultUnit,
          referenceRange: item.referenceRange,
          resultedAt: item.resultedAt,
          labOrderStatus: item.labOrderStatus,
        }));

      recentLabResults = normalizedLabResults
        .filter((item) => item.isAbnormal)
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          labOrderId: item.labOrderId,
          patientId: item.patientId,
          patientName: item.patientName,
          testName: item.testName,
          resultValue: item.resultValue,
          resultUnit: item.resultUnit,
          referenceRange: item.referenceRange,
          resultedAt: item.resultedAt,
          labOrderStatus: item.labOrderStatus,
        }));
    }

    return {
      totalPatients: patientIds.length,
      todayAppointments,
      completedTodayAppointments,
      remainingTodayAppointments,
      inProgressAppointments,
      unreadMessages,
      pendingReviews: (pendingNotesCount ?? 0) + preVisitReviewCount + (patientUpdateReviewCount ?? 0),
      prescriptionsToday: prescriptionsTodayCount ?? 0,
      labOrdersToday: labOrdersTodayCount ?? 0,
      estimatedRevenueToday:
        consultationFee !== null && todayAppointments > 0 ? consultationFee * todayAppointments : null,
      activeConsultation: activeConsultationSource ? buildAppointment(activeConsultationSource) : null,
      nextAppointment: nextAppointmentSource ? buildAppointment(nextAppointmentSource) : null,
      todaySchedule,
      todayQueue,
      criticalResults,
      recentLabResults,
      recentMessages,
    };
  }, [userId]);
}
