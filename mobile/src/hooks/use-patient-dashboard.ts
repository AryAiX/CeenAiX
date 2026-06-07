import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

// Mobile patient dashboard data. This replicates the canonical query logic
// from the web `src/hooks/use-patient-dashboard.ts` against the same tables
// (appointments, prescriptions, prescription_items, messages, patient_insurance,
// insurance_plans, patient_vitals, lab_orders, lab_order_items) with the same
// RLS scoping and `is_deleted`/status filters. It is intentionally a focused
// subset for the vertical slice; the full parity surface is tracked in
// docs/mobile/checklist.md and will collapse into a shared package later.

export interface DashboardNextAppointment {
  id: string;
  doctorName: string;
  specialty: string | null;
  doctorCity: string | null;
  scheduledAt: string;
  type: 'in_person' | 'virtual';
}

export interface DashboardMedication {
  id: string;
  medicationName: string;
  medicationNameAr: string | null;
  detail: string;
  isDispensed: boolean;
}

export interface DashboardInsuranceSummary {
  providerCompany: string;
  planName: string;
  annualLimit: number | null;
  annualLimitUsed: number;
  remainingAmount: number | null;
  isActive: boolean;
}

export interface DashboardVitalsSummary {
  latestSystolic: number | null;
  latestDiastolic: number | null;
  latestHba1c: number | null;
}

export interface PatientDashboardData {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  unreadMessagesCount: number;
  nextAppointment: DashboardNextAppointment | null;
  medications: DashboardMedication[];
  insurance: DashboardInsuranceSummary | null;
  vitals: DashboardVitalsSummary;
  adherencePercentage: number | null;
}

const UPCOMING_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);
const HBA1C_LABELS = ['hba1c', 'hb a1c', 'a1c', 'hemoglobin a1c'];

const parseNumeric = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const isHba1cItem = (testName: string | null, testCode: string | null): boolean => {
  const code = (testCode ?? '').trim().toLowerCase();
  const name = (testName ?? '').trim().toLowerCase();
  return code === 'hba1c' || HBA1C_LABELS.some((label) => name.includes(label));
};

export function usePatientDashboard(userId: string | null | undefined) {
  return useQuery<PatientDashboardData | null>(async () => {
    if (!userId) {
      return null;
    }

    const now = new Date();

    const [
      { data: appointments, error: appointmentsError },
      { data: prescriptions, error: prescriptionsError },
      { data: conversations, error: conversationsError },
      { data: insuranceRows, error: insuranceError },
      { data: vitalRows, error: vitalsError },
      { data: labOrders, error: labOrdersError },
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, doctor_id, type, status, scheduled_at')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('prescriptions')
        .select('id, status')
        .eq('patient_id', userId)
        .eq('is_deleted', false),
      supabase.from('conversations').select('id'),
      supabase
        .from('patient_insurance')
        .select('insurance_plan_id, valid_until, is_primary, annual_limit_used')
        .eq('patient_id', userId)
        .order('is_primary', { ascending: false })
        .limit(1),
      supabase
        .from('patient_vitals')
        .select('systolic_bp, diastolic_bp, recorded_at')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .not('systolic_bp', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase.from('lab_orders').select('id').eq('patient_id', userId).eq('is_deleted', false),
    ]);

    if (appointmentsError) throw appointmentsError;
    if (prescriptionsError) throw prescriptionsError;
    if (conversationsError) throw conversationsError;
    if (insuranceError) throw insuranceError;
    if (vitalsError) throw vitalsError;
    if (labOrdersError) throw labOrdersError;

    const safeAppointments = appointments ?? [];
    const safePrescriptions = prescriptions ?? [];

    const upcoming = safeAppointments.filter(
      (appt) => UPCOMING_STATUSES.has(appt.status) && new Date(appt.scheduled_at) >= now
    );
    const nextBase = upcoming[0] ?? null;

    let nextAppointment: DashboardNextAppointment | null = null;
    if (nextBase) {
      const [{ data: docProfile }, { data: docExt }] = await Promise.all([
        supabase.from('user_profiles').select('full_name, city').eq('user_id', nextBase.doctor_id).maybeSingle(),
        supabase.from('doctor_profiles').select('specialization').eq('user_id', nextBase.doctor_id).maybeSingle(),
      ]);
      nextAppointment = {
        id: nextBase.id,
        doctorName: docProfile?.full_name?.trim() || 'Care team clinician',
        specialty: docExt?.specialization ?? null,
        doctorCity: docProfile?.city?.trim() || null,
        scheduledAt: nextBase.scheduled_at,
        type: nextBase.type,
      };
    }

    const activePrescriptions = safePrescriptions.filter((rx) => rx.status === 'active');
    const activeIds = activePrescriptions.map((rx) => rx.id);

    let medications: DashboardMedication[] = [];
    if (activeIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('prescription_items')
        .select('id, medication_name, medication_name_ar, dosage, frequency, duration, is_dispensed')
        .in('prescription_id', activeIds)
        .order('created_at', { ascending: false })
        .limit(5);
      if (itemsError) throw itemsError;

      medications = (items ?? []).map((item) => {
        const joined = [item.dosage, item.frequency, item.duration]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' • ');
        return {
          id: item.id,
          medicationName: item.medication_name,
          medicationNameAr: item.medication_name_ar?.trim() || null,
          detail: joined || 'Active prescription',
          isDispensed: item.is_dispensed,
        };
      });
    }

    let unreadMessagesCount = 0;
    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
    if (conversationIds.length > 0) {
      const { count, error: unreadError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .is('read_at', null)
        .neq('sender_id', userId);
      if (unreadError) throw unreadError;
      unreadMessagesCount = count ?? 0;
    }

    let insurance: DashboardInsuranceSummary | null = null;
    const primaryInsurance = (insuranceRows ?? [])[0];
    if (primaryInsurance) {
      const { data: plan, error: planError } = await supabase
        .from('insurance_plans')
        .select('name, provider_company, annual_limit')
        .eq('id', primaryInsurance.insurance_plan_id)
        .maybeSingle();
      if (planError) throw planError;

      const annualLimit = plan?.annual_limit ?? null;
      const annualLimitUsed = Number(primaryInsurance.annual_limit_used ?? 0);
      const validUntil = primaryInsurance.valid_until ? String(primaryInsurance.valid_until).slice(0, 10) : null;
      insurance = {
        providerCompany: plan?.provider_company ?? 'Insurance provider',
        planName: plan?.name ?? 'Patient plan',
        annualLimit,
        annualLimitUsed,
        remainingAmount: annualLimit !== null ? Math.max(annualLimit - annualLimitUsed, 0) : null,
        isActive: validUntil ? validUntil >= now.toISOString().slice(0, 10) : true,
      };
    }

    const latestVital = (vitalRows ?? [])[0];
    let latestHba1c: number | null = null;
    const labOrderIds = (labOrders ?? []).map((row) => row.id);
    if (labOrderIds.length > 0) {
      const { data: labItems, error: labItemsError } = await supabase
        .from('lab_order_items')
        .select('test_name, test_code, result_value, resulted_at')
        .in('lab_order_id', labOrderIds)
        .in('status', ['resulted', 'reviewed'])
        .not('resulted_at', 'is', null)
        .order('resulted_at', { ascending: false })
        .limit(20);
      if (labItemsError) throw labItemsError;
      const hba1cItem = (labItems ?? []).find((row) => isHba1cItem(row.test_name, row.test_code));
      latestHba1c = hba1cItem ? parseNumeric(hba1cItem.result_value) : null;
    }

    const adherencePercentage =
      medications.length > 0
        ? Math.round((medications.filter((med) => med.isDispensed).length / medications.length) * 100)
        : null;

    return {
      upcomingAppointmentsCount: upcoming.length,
      activePrescriptionsCount: activePrescriptions.length,
      unreadMessagesCount,
      nextAppointment,
      medications,
      insurance,
      vitals: {
        latestSystolic: latestVital?.systolic_bp ?? null,
        latestDiastolic: latestVital?.diastolic_bp ?? null,
        latestHba1c,
      },
      adherencePercentage,
    };
  }, [userId]);
}
