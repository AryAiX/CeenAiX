import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import { resolveClinicalVocabLabel, type PrescriptionClinicalVocabRow } from '../lib/prescription-vocab';
import {
  hydratePrescriptionItemsWithCatalog,
  loadMedicationCatalogRowsForPrescriptionItems,
} from '../lib/medication-catalog';
import { calendarDayKeyInTimeZone, CLINIC_TIME_ZONE } from '../lib/i18n-ui';
import { useQuery } from './use-query';
import type { NotificationType, PrescriptionItem } from '../types';

const careTeamClinicianFallback = () =>
  i18n.t('patient.dashboard.careTeamClinicianFallback', { defaultValue: 'Care team clinician' });
const careTeamFallback = () =>
  i18n.t('messaging.careTeamFallback', { defaultValue: 'Care team' });
const activeRxFallback = () =>
  i18n.t('patient.dashboard.activePrescriptionFallback', { defaultValue: 'Active prescription' });
const insuranceProviderFallback = () =>
  i18n.t('patient.dashboard.insuranceProviderFallback', { defaultValue: 'Insurance provider' });
const patientPlanFallback = () =>
  i18n.t('patient.dashboard.patientPlanFallback', { defaultValue: 'Patient plan' });
const upcomingAppointmentTitle = () =>
  i18n.t('patient.dashboard.upcomingAppointmentScheduled', {
    defaultValue: 'Upcoming appointment scheduled',
  });
const nextWithDetail = (name: string) =>
  i18n.t('patient.dashboard.nextWith', {
    name,
    defaultValue: 'Next with {{name}}',
  });

interface DashboardAppointment {
  id: string;
  doctorName: string;
  specialty: string | null;
  doctorCity: string | null;
  scheduledAt: string;
  type: 'in_person' | 'virtual';
}

export interface DashboardCareTeamMember {
  doctorId: string;
  doctorName: string;
  specialty: string | null;
  doctorCity: string | null;
  nextAppointmentAt: string | null;
  lastAppointmentAt: string | null;
}

export interface DashboardMedication {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  /** Joined English fallback when parts are missing */
  detail: string;
  /** Resolved from `prescription_clinical_vocab` for current UI language */
  frequencyFromVocab: string | null;
  durationFromVocab: string | null;
  medicationNameAr: string | null;
  isDispensed: boolean;
}

interface DashboardActivity {
  id: string;
  type: NotificationType | 'appointment';
  title: string;
  detail: string | null;
  createdAt: string;
  actionUrl: string | null;
}

export interface DashboardAllergyAlert {
  id: string;
  allergen: string;
  severity: string;
  reaction: string | null;
}

export interface DashboardBloodPressurePoint {
  id: string;
  systolic: number;
  diastolic: number;
  recordedAt: string;
}

export interface DashboardHba1cPoint {
  id: string;
  value: number;
  unit: string | null;
  recordedAt: string;
}

export interface DashboardInsuranceSummary {
  providerCompany: string;
  planName: string;
  coverageType: string | null;
  networkType: string | null;
  policyNumber: string | null;
  memberId: string | null;
  annualLimit: number | null;
  annualLimitUsed: number;
  remainingAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

export interface DashboardMessagePreview {
  id: string;
  conversationId: string;
  senderName: string;
  body: string;
  sentAt: string;
  subject: string | null;
  isRead: boolean;
}

export interface DashboardLabsSummary {
  latestResultCount: number;
  latestStatus: 'normal' | 'attention' | 'none';
  latestRecordedAt: string | null;
}

export interface PatientDashboardData {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  unreadMessagesCount: number;
  nextAppointment: DashboardAppointment | null;
  careTeam: DashboardCareTeamMember[];
  medications: DashboardMedication[];
  recentActivity: DashboardActivity[];
  allergyAlerts: DashboardAllergyAlert[];
  bloodPressureHistory: DashboardBloodPressurePoint[];
  latestBloodPressure: DashboardBloodPressurePoint | null;
  hba1cHistory: DashboardHba1cPoint[];
  latestHba1c: DashboardHba1cPoint | null;
  previousHba1c: DashboardHba1cPoint | null;
  labsSummary: DashboardLabsSummary;
  insurance: DashboardInsuranceSummary | null;
  recentMessages: DashboardMessagePreview[];
  healthScore: number;
  adherencePercentage: number | null;
}

const UPCOMING_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);
const HBA1C_LABELS = ['hba1c', 'hb a1c', 'a1c', 'hemoglobin a1c'];

const parseNumeric = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const sameCalendarDay = (left: string, right: string) => left.slice(0, 10) === right.slice(0, 10);

const isHba1cLabItem = (testName: string | null | undefined, testCode: string | null | undefined) => {
  const normalizedCode = (testCode ?? '').trim().toLowerCase();
  const normalizedName = (testName ?? '').trim().toLowerCase();

  return normalizedCode === 'hba1c' || HBA1C_LABELS.some((label) => normalizedName.includes(label));
};

const computeHealthScore = ({
  latestHba1c,
  latestBloodPressure,
  adherencePercentage,
  labsStatus,
}: {
  latestHba1c: DashboardHba1cPoint | null;
  latestBloodPressure: DashboardBloodPressurePoint | null;
  adherencePercentage: number | null;
  labsStatus: DashboardLabsSummary['latestStatus'];
}) => {
  let score = 78;

  if (latestHba1c) {
    if (latestHba1c.value <= 5.6) {
      score += 8;
    } else if (latestHba1c.value <= 6.4) {
      score += 3;
    } else if (latestHba1c.value <= 7.0) {
      score -= 2;
    } else if (latestHba1c.value <= 8.0) {
      score -= 8;
    } else {
      score -= 14;
    }
  }

  if (latestBloodPressure) {
    if (latestBloodPressure.systolic <= 120 && latestBloodPressure.diastolic <= 80) {
      score += 6;
    } else if (latestBloodPressure.systolic <= 130 && latestBloodPressure.diastolic <= 85) {
      score += 2;
    } else if (latestBloodPressure.systolic <= 140 && latestBloodPressure.diastolic <= 90) {
      score -= 4;
    } else {
      score -= 10;
    }
  }

  if (adherencePercentage !== null) {
    score += Math.round((adherencePercentage - 70) / 5);
  }

  if (labsStatus === 'attention') {
    score -= 4;
  }

  return Math.min(100, Math.max(0, score));
};

export function usePatientDashboard(userId: string | null | undefined, uiLanguage: string) {
  return useQuery<PatientDashboardData | null>(async () => {
    if (!userId) {
      return null;
    }

    const now = new Date();

    const [
      { data: vocabData, error: vocabError },
      { data: appointments, error: appointmentsError },
      { data: prescriptions, error: prescriptionsError },
      { data: notifications, error: notificationsError },
      { data: conversations, error: conversationsError },
      { data: allergies, error: allergiesError },
      { data: patientInsuranceRows, error: patientInsuranceError },
      { data: vitalRows, error: vitalsError },
      { data: labOrders, error: labOrdersError },
    ] = await Promise.all([
      supabase
        .from('prescription_clinical_vocab')
        .select('category, code, label_en, label_ar, legacy_match')
        .eq('is_active', true),
      supabase
        .from('appointments')
        .select('id, doctor_id, type, status, scheduled_at')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('prescriptions')
        .select('id, status, prescribed_at')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('prescribed_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('id, type, title, body, action_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      // RLS already limits visible conversations to ones the user participates in.
      supabase.from('conversations').select('id, subject'),
      supabase
        .from('allergies')
        .select('id, allergen, severity, reaction')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(2),
      supabase
        .from('patient_insurance')
        .select('insurance_plan_id, policy_number, member_id, valid_from, valid_until, is_primary, annual_limit_used')
        .eq('patient_id', userId)
        .order('is_primary', { ascending: false })
        .limit(1),
      supabase
        .from('patient_vitals')
        .select('id, recorded_at, systolic_bp, diastolic_bp')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .not('systolic_bp', 'is', null)
        .not('diastolic_bp', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(7),
      supabase
        .from('lab_orders')
        .select('id')
        .eq('patient_id', userId)
        .eq('is_deleted', false),
    ]);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (prescriptionsError) {
      throw prescriptionsError;
    }

    if (notificationsError) {
      throw notificationsError;
    }

    if (conversationsError) {
      throw conversationsError;
    }

    if (allergiesError) {
      throw allergiesError;
    }

    if (patientInsuranceError) {
      throw patientInsuranceError;
    }

    if (vitalsError) {
      throw vitalsError;
    }

    if (labOrdersError) {
      throw labOrdersError;
    }

    let vocabRows: PrescriptionClinicalVocabRow[] = [];
    if (vocabError) {
      console.warn('[usePatientDashboard] prescription_clinical_vocab unavailable:', vocabError.message);
    } else {
      vocabRows = (vocabData ?? []) as PrescriptionClinicalVocabRow[];
    }

    const safeAppointments = appointments ?? [];
    const safePrescriptions = prescriptions ?? [];
    const safeNotifications = notifications ?? [];
    const safeAllergies = allergies ?? [];
    const safeConversationRows = conversations ?? [];
    const safeInsuranceRows = patientInsuranceRows ?? [];
    const safeVitalRows = vitalRows ?? [];
    const labOrderIds = (labOrders ?? []).map((row) => row.id);

    const upcomingAppointments = safeAppointments.filter((appointment) => {
      if (!UPCOMING_STATUSES.has(appointment.status)) {
        return false;
      }

      return new Date(appointment.scheduled_at) >= now;
    });

    const doctorIds = [...new Set(safeAppointments.map((appointment) => appointment.doctor_id))];
    const doctorProfilesById = new Map<
      string,
      {
        fullName: string;
        city: string | null;
        specialty: string | null;
      }
    >();

    if (doctorIds.length > 0) {
      const [
        { data: doctorUserProfiles, error: doctorUserProfilesError },
        { data: doctorProfiles, error: doctorProfilesError },
      ] = await Promise.all([
        supabase.from('user_profiles').select('user_id, full_name, city').in('user_id', doctorIds),
        supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
      ]);

      if (doctorUserProfilesError) {
        throw doctorUserProfilesError;
      }

      if (doctorProfilesError) {
        throw doctorProfilesError;
      }

      const specialtyByDoctorId = new Map(
        (doctorProfiles ?? []).map((profile) => [profile.user_id, profile.specialization ?? null])
      );

      (doctorUserProfiles ?? []).forEach((profile) => {
        doctorProfilesById.set(profile.user_id, {
          fullName: profile.full_name?.trim() || careTeamClinicianFallback(),
          city: profile.city?.trim() || null,
          specialty: specialtyByDoctorId.get(profile.user_id) ?? null,
        });
      });
    }

    const nextAppointmentBase = upcomingAppointments[0] ?? null;

    let nextAppointment: DashboardAppointment | null = null;

    if (nextAppointmentBase) {
      const doctorProfile = doctorProfilesById.get(nextAppointmentBase.doctor_id);

      nextAppointment = {
        id: nextAppointmentBase.id,
        doctorName: doctorProfile?.fullName ?? careTeamClinicianFallback(),
        specialty: doctorProfile?.specialty ?? null,
        doctorCity: doctorProfile?.city ?? null,
        scheduledAt: nextAppointmentBase.scheduled_at,
        type: nextAppointmentBase.type,
      };
    }

    const careTeam: DashboardCareTeamMember[] = doctorIds
      .map((doctorId) => {
        const appointmentsForDoctor = safeAppointments
          .filter((appointment) => appointment.doctor_id === doctorId)
          .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
        const nextDoctorAppointment = appointmentsForDoctor.find(
          (appointment) =>
            UPCOMING_STATUSES.has(appointment.status) && new Date(appointment.scheduled_at).getTime() >= now.getTime()
        );
        // "Last visit" must be a visit that actually happened — exclude
        // cancelled and no-show rows so they don't masquerade as the most
        // recent encounter on the care-team timeline.
        const lastDoctorAppointment =
          [...appointmentsForDoctor]
            .reverse()
            .find(
              (appointment) =>
                appointment.status !== 'cancelled' && appointment.status !== 'no_show'
            ) ?? null;
        const doctorProfile = doctorProfilesById.get(doctorId);

        return {
          doctorId,
          doctorName: doctorProfile?.fullName ?? careTeamClinicianFallback(),
          specialty: doctorProfile?.specialty ?? null,
          doctorCity: doctorProfile?.city ?? null,
          nextAppointmentAt: nextDoctorAppointment?.scheduled_at ?? null,
          lastAppointmentAt: lastDoctorAppointment?.scheduled_at ?? null,
        };
      })
      .sort((left, right) => {
        if (left.nextAppointmentAt && right.nextAppointmentAt) {
          return new Date(left.nextAppointmentAt).getTime() - new Date(right.nextAppointmentAt).getTime();
        }

        if (left.nextAppointmentAt) {
          return -1;
        }

        if (right.nextAppointmentAt) {
          return 1;
        }

        if (!left.lastAppointmentAt && !right.lastAppointmentAt) {
          return 0;
        }
        if (!left.lastAppointmentAt) {
          return 1;
        }
        if (!right.lastAppointmentAt) {
          return -1;
        }
        return new Date(right.lastAppointmentAt).getTime() - new Date(left.lastAppointmentAt).getTime();
      })
      .slice(0, 3);

    const activePrescriptions = safePrescriptions.filter((prescription) => prescription.status === 'active');
    const activePrescriptionIds = activePrescriptions.map((prescription) => prescription.id);

    let medications: DashboardMedication[] = [];

    if (activePrescriptionIds.length > 0) {
      const { data: prescriptionItems, error: prescriptionItemsError } = await supabase
        .from('prescription_items')
        .select(
          'id, prescription_id, medication_catalog_id, medication_name, medication_name_ar, dosage, frequency, duration, frequency_code, duration_code, is_dispensed'
        )
        .in('prescription_id', activePrescriptionIds)
        .order('created_at', { ascending: false });

      if (prescriptionItemsError) {
        throw prescriptionItemsError;
      }

      const hydratedPrescriptionItems = hydratePrescriptionItemsWithCatalog(
        (prescriptionItems ?? []) as PrescriptionItem[],
        await loadMedicationCatalogRowsForPrescriptionItems((prescriptionItems ?? []) as PrescriptionItem[])
      );

      medications =
        hydratedPrescriptionItems.map((item) => {
          const dosage = item.dosage?.trim() || null;
          const frequency = item.frequency?.trim() || null;
          const duration = item.duration?.trim() || null;
          const joined = [dosage, frequency, duration].filter(Boolean).join(' • ');
          const frequencyFromVocab = resolveClinicalVocabLabel(
            vocabRows,
            'frequency',
            item.frequency_code,
            frequency,
            uiLanguage
          );
          const durationFromVocab = resolveClinicalVocabLabel(
            vocabRows,
            'duration',
            item.duration_code,
            duration,
            uiLanguage
          );
          return {
            id: item.id,
            medicationName: item.medication_name,
            medicationNameAr: item.medication_name_ar?.trim() || null,
            dosage,
            frequency,
            duration,
            detail: joined || activeRxFallback(),
            frequencyFromVocab,
            durationFromVocab,
            isDispensed: item.is_dispensed,
          };
        }) ?? [];
    }

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
    const conversationSubjectById = new Map(
      safeConversationRows.map((conversation) => [conversation.id, conversation.subject ?? null])
    );

    let unreadMessagesCount = 0;
    let recentMessages: DashboardMessagePreview[] = [];

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
          .or(`read_at.is.null,sent_at.gte.${new Date(new Date().setHours(0,0,0,0)).toISOString()}`)
          .order('sent_at', { ascending: false })
          .limit(3),
      ]);

      if (unreadMessagesError) {
        throw unreadMessagesError;
      }

      if (recentMessagesError) {
        throw recentMessagesError;
      }

      unreadMessagesCount = count ?? 0;

      const senderIds = [...new Set((recentMessageRows ?? []).map((message) => message.sender_id))];
      let senderNameById = new Map<string, string>();

      if (senderIds.length > 0) {
        const { data: senderProfiles, error: senderProfilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', senderIds);

        if (senderProfilesError) {
          throw senderProfilesError;
        }

        senderNameById = new Map(
          (senderProfiles ?? []).map((profile) => [
            profile.user_id,
            profile.full_name?.trim() || careTeamFallback(),
          ])
        );
      }

      recentMessages = (recentMessageRows ?? []).map((message) => ({
        id: message.id,
        conversationId: message.conversation_id,
        senderName: senderNameById.get(message.sender_id) ?? careTeamFallback(),
        body: message.body,
        sentAt: message.sent_at,
        subject: conversationSubjectById.get(message.conversation_id) ?? null,
        isRead: message.read_at !== null,
      }));
    }

    let insurance: DashboardInsuranceSummary | null = null;

    if (safeInsuranceRows.length > 0) {
      const primaryInsurance = safeInsuranceRows[0];
      const { data: planRow, error: insurancePlanError } = await supabase
        .from('insurance_plans')
        .select('name, provider_company, annual_limit, coverage_type, network_type')
        .eq('id', primaryInsurance.insurance_plan_id)
        .maybeSingle();

      if (insurancePlanError) {
        throw insurancePlanError;
      }

      const annualLimit = planRow?.annual_limit ?? null;
      const annualLimitUsed = Number(primaryInsurance.annual_limit_used ?? 0);
      const remainingAmount = annualLimit !== null ? Math.max(annualLimit - annualLimitUsed, 0) : null;
      const nowDateKey = calendarDayKeyInTimeZone(now, CLINIC_TIME_ZONE);
      const validUntilRaw = primaryInsurance.valid_until;
      const validUntilDateKey = validUntilRaw ? validUntilRaw.slice(0, 10) : null;

      insurance = {
        providerCompany: planRow?.provider_company ?? insuranceProviderFallback(),
        planName: planRow?.name ?? patientPlanFallback(),
        coverageType: planRow?.coverage_type ?? null,
        networkType: planRow?.network_type ?? null,
        policyNumber: primaryInsurance.policy_number ?? null,
        memberId: primaryInsurance.member_id ?? null,
        annualLimit,
        annualLimitUsed,
        remainingAmount,
        validFrom: primaryInsurance.valid_from ?? null,
        validUntil: validUntilRaw,
        isActive: validUntilDateKey ? validUntilDateKey >= nowDateKey : true,
      };
    }

    const bloodPressureHistory = safeVitalRows
      .filter((row) => row.systolic_bp !== null && row.diastolic_bp !== null)
      .map((row) => ({
        id: row.id,
        systolic: row.systolic_bp as number,
        diastolic: row.diastolic_bp as number,
        recordedAt: row.recorded_at,
      }))
      .sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
    const latestBloodPressure =
      bloodPressureHistory.length > 0 ? bloodPressureHistory[bloodPressureHistory.length - 1] : null;

    let hba1cHistory: DashboardHba1cPoint[] = [];
    let labsSummary: DashboardLabsSummary = {
      latestResultCount: 0,
      latestStatus: 'none',
      latestRecordedAt: null,
    };

    if (labOrderIds.length > 0) {
      const { data: labItemRows, error: labItemsError } = await supabase
        .from('lab_order_items')
        .select('id, test_name, test_code, result_value, result_unit, is_abnormal, resulted_at')
        .in('lab_order_id', labOrderIds)
        .in('status', ['resulted', 'reviewed'])
        .not('resulted_at', 'is', null)
        .order('resulted_at', { ascending: false })
        .limit(20);

      if (labItemsError) {
        throw labItemsError;
      }

      const safeLabItemRows = labItemRows ?? [];
      const latestRecordedAt = safeLabItemRows[0]?.resulted_at ?? null;
      const sameDayItems = latestRecordedAt
        ? safeLabItemRows.filter((row) => row.resulted_at && sameCalendarDay(row.resulted_at, latestRecordedAt))
        : [];

      labsSummary = {
        latestResultCount: sameDayItems.length,
        latestStatus: latestRecordedAt
          ? sameDayItems.some((row) => row.is_abnormal)
            ? 'attention'
            : 'normal'
          : 'none',
        latestRecordedAt,
      };

      hba1cHistory = safeLabItemRows
        .filter((row) => isHba1cLabItem(row.test_name, row.test_code))
        .map((row) => {
          const numericValue = parseNumeric(row.result_value);

          if (numericValue === null || !row.resulted_at) {
            return null;
          }

          return {
            id: row.id,
            value: numericValue,
            unit: row.result_unit ?? null,
            recordedAt: row.resulted_at,
          };
        })
        .filter((row): row is DashboardHba1cPoint => row !== null)
        .sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
    }

    const latestHba1c = hba1cHistory.length > 0 ? hba1cHistory[hba1cHistory.length - 1] : null;
    const previousHba1c = hba1cHistory.length > 1 ? hba1cHistory[hba1cHistory.length - 2] : null;
    const adherencePercentage =
      medications.length > 0
        ? Math.round((medications.filter((medication) => medication.isDispensed).length / medications.length) * 100)
        : null;
    const allergyAlerts: DashboardAllergyAlert[] = safeAllergies.map((allergy) => ({
      id: allergy.id,
      allergen: allergy.allergen,
      severity: allergy.severity,
      reaction: allergy.reaction ?? null,
    }));
    const healthScore = computeHealthScore({
      latestHba1c,
      latestBloodPressure,
      adherencePercentage,
      labsStatus: labsSummary.latestStatus,
    });

    const recentActivity: DashboardActivity[] = safeNotifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      detail: notification.body,
      createdAt: notification.created_at,
      actionUrl: notification.action_url,
    }));

    if (recentActivity.length === 0 && nextAppointment) {
      recentActivity.push({
        id: `appointment-${nextAppointment.id}`,
        type: 'appointment',
        title: upcomingAppointmentTitle(),
        detail: nextWithDetail(nextAppointment.doctorName),
        createdAt: nextAppointment.scheduledAt,
        actionUrl: '/patient/appointments',
      });
    }

    return {
      upcomingAppointmentsCount: upcomingAppointments.length,
      activePrescriptionsCount: activePrescriptions.length,
      unreadMessagesCount,
      nextAppointment,
      careTeam,
      medications,
      recentActivity,
      allergyAlerts,
      bloodPressureHistory,
      latestBloodPressure,
      hba1cHistory,
      latestHba1c,
      previousHba1c,
      labsSummary,
      insurance,
      recentMessages,
      healthScore,
      adherencePercentage,
    };
  }, [userId, uiLanguage]);
}
