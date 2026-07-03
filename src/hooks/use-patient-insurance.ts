import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export interface PatientInsurancePlan {
  id: string;
  planName: string;
  providerCompany: string;
  coverageType: string | null;
  networkType: string | null;
  coPayPercent: number | null;
  annualLimit: number | null;
  annualLimitUsed: number;
  policyNumber: string | null;
  memberId: string | null;
  cardPhotoUrl: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface PatientInsuranceActivity {
  id: string;
  date: string;
  provider: string;
  doctor: string | null;
  service: string;
  serviceType: 'Consultation' | 'Laboratory' | 'Pharmacy';
  referenceCode: string;
  totalEstimate: number;
  patientShareEstimate: number;
  coveredEstimate: number;
  status: 'approved' | 'pending' | 'review' | 'denied';
  source: 'appointments' | 'lab_orders' | 'prescriptions';
}

export interface PatientRealPreAuth {
  id: string;
  externalRef: string;
  procedureName: string;
  providerName: string;
  clinicianName: string;
  status: string;
  requestedAmountAed: number;
  requestedAt: string;
  slaDueAt: string;
  planLabel: string | null;
}

export interface PatientRealClaim {
  id: string;
  externalRef: string;
  patientName: string;
  planName: string;
  providerName: string;
  doctorName: string | null;
  claimType: string | null;
  amountAed: number;
  status: string;
  submittedAt: string;
}

export interface PatientInsuranceData {
  patientName: string | null;
  email: string | null;
  plans: PatientInsurancePlan[];
  primaryPlan: PatientInsurancePlan | null;
  activity: PatientInsuranceActivity[];
  realPreAuths: PatientRealPreAuth[];
  realClaims: PatientRealClaim[];
}

type PlanJoin =
  | {
      id: string;
      name: string;
      provider_company: string;
      coverage_type: string | null;
      annual_limit: number | null;
      co_pay_percentage: number | null;
      network_type: string | null;
      is_active: boolean;
    }
  | null;

function asFirstPlan(value: PlanJoin | PlanJoin[] | null): PlanJoin {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function titleCase(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function estimateSplit(total: number, coPayPercent: number | null | undefined) {
  const patientPercent = coPayPercent ?? 100;
  const patientShare = Math.round((total * patientPercent) / 100);
  return {
    patientShare,
    covered: Math.max(0, total - patientShare),
  };
}

export function usePatientInsurance(userId: string | null | undefined) {
  return useQuery<PatientInsuranceData>(async () => {
    if (!userId) {
      return {
        patientName: null,
        email: null,
        plans: [],
        primaryPlan: null,
        activity: [],
        realPreAuths: [],
        realClaims: [],
      };
    }

    const [profileResult, insuranceResult, appointmentsResult, labOrdersResult, prescriptionsResult, preAuthResult, claimsResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('full_name, first_name, last_name, email')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('patient_insurance')
        .select(
          'id, is_primary, annual_limit_used, policy_number, member_id, card_photo_url, valid_from, valid_until, insurance_plans (id, name, provider_company, coverage_type, annual_limit, co_pay_percentage, network_type, is_active)'
        )
        .eq('patient_id', userId),
      supabase
        .from('appointments')
        .select('id, type, status, scheduled_at, chief_complaint')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: false })
        .limit(6),
      supabase
        .from('lab_orders')
        .select('id, status, ordered_at, lab_order_items (test_name)')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('ordered_at', { ascending: false })
        .limit(6),
      supabase
        .from('prescriptions')
        .select('id, status, prescribed_at, prescription_items (medication_name)')
        .eq('patient_id', userId)
        .eq('is_deleted', false)
        .order('prescribed_at', { ascending: false })
        .limit(6),
      supabase
        .from('insurance_pre_authorizations')
        .select('id, external_ref, procedure_name, provider_name, clinician_name, status, requested_amount_aed, requested_at, sla_due_at, plan_label')
        .eq('patient_id', userId)
        .order('requested_at', { ascending: false })
        .limit(20),
      supabase
        .from('insurance_claims')
        .select('id, external_ref, patient_name, plan_name, provider_name, doctor_name, claim_type, amount_aed, status, submitted_at')
        .eq('patient_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(20),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (insuranceResult.error) throw insuranceResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (labOrdersResult.error) throw labOrdersResult.error;
    if (prescriptionsResult.error) throw prescriptionsResult.error;
    if (preAuthResult.error) throw preAuthResult.error;
    if (claimsResult.error) throw claimsResult.error;

    const plans = ((insuranceResult.data ?? []) as Array<{
      id: string;
      is_primary: boolean;
      annual_limit_used: number | null;
      policy_number: string | null;
      member_id: string | null;
      card_photo_url: string | null;
      valid_from: string | null;
      valid_until: string | null;
      insurance_plans: PlanJoin | PlanJoin[] | null;
    }>)
      .map((row): PatientInsurancePlan | null => {
        const plan = asFirstPlan(row.insurance_plans);
        if (!plan) return null;

        return {
          id: row.id,
          planName: plan.name,
          providerCompany: plan.provider_company,
          coverageType: plan.coverage_type,
          networkType: plan.network_type,
          coPayPercent: plan.co_pay_percentage,
          annualLimit: plan.annual_limit,
          annualLimitUsed: row.annual_limit_used ?? 0,
          policyNumber: row.policy_number,
          memberId: row.member_id,
          cardPhotoUrl: row.card_photo_url,
          validFrom: row.valid_from,
          validUntil: row.valid_until,
          isPrimary: row.is_primary,
          isActive: plan.is_active,
        };
      })
      .filter((plan): plan is PatientInsurancePlan => plan !== null);

    const primaryPlan = [...plans].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0] ?? null;
    const coPayPercent = primaryPlan?.coPayPercent ?? null;

    const appointmentRows = ((appointmentsResult.data ?? []) as Array<{
      id: string;
      type: string | null;
      status: string | null;
      scheduled_at: string;
      chief_complaint: string | null;
    }>).map((row): PatientInsuranceActivity => {
      const total = row.type === 'virtual' ? 300 : 400;
      const split = estimateSplit(total, coPayPercent);
      return {
        id: `appointment-${row.id}`,
        date: row.scheduled_at,
        provider: 'CeenAiX Clinic',
        doctor: null,
        service: row.chief_complaint || `${titleCase(row.type, 'Clinical')} consultation`,
        serviceType: 'Consultation',
        referenceCode: `APT-${row.id.slice(0, 8).toUpperCase()}`,
        totalEstimate: total,
        patientShareEstimate: split.patientShare,
        coveredEstimate: split.covered,
        status:
          row.status === 'completed'
            ? 'approved'
            : row.status === 'cancelled' || row.status === 'no_show'
              ? 'denied'
              : 'pending',
        source: 'appointments',
      };
    });

    const labRows = ((labOrdersResult.data ?? []) as Array<{
      id: string;
      status: string | null;
      ordered_at: string;
      lab_order_items: Array<{ test_name: string | null }> | null;
    }>).map((row): PatientInsuranceActivity => {
      const tests = (row.lab_order_items ?? []).map((item) => item.test_name).filter(Boolean);
      const total = Math.max(1, tests.length) * 160;
      const split = estimateSplit(total, coPayPercent);
      return {
        id: `lab-${row.id}`,
        date: row.ordered_at,
        provider: 'CeenAiX Lab Network',
        doctor: null,
        service: tests.length > 0 ? tests.slice(0, 2).join(', ') : 'Laboratory order',
        serviceType: 'Laboratory',
        referenceCode: `LAB-${row.id.slice(0, 8).toUpperCase()}`,
        totalEstimate: total,
        patientShareEstimate: split.patientShare,
        coveredEstimate: split.covered,
        status: row.status === 'reviewed' || row.status === 'resulted' ? 'approved' : 'pending',
        source: 'lab_orders',
      };
    });

    const prescriptionRows = ((prescriptionsResult.data ?? []) as Array<{
      id: string;
      status: string | null;
      prescribed_at: string;
      prescription_items: Array<{ medication_name: string | null }> | null;
    }>).map((row): PatientInsuranceActivity => {
      const meds = (row.prescription_items ?? []).map((item) => item.medication_name).filter(Boolean);
      const total = Math.max(1, meds.length) * 120;
      const split = estimateSplit(total, coPayPercent);
      return {
        id: `rx-${row.id}`,
        date: row.prescribed_at,
        provider: 'CeenAiX Pharmacy Network',
        doctor: null,
        service: meds.length > 0 ? meds.slice(0, 2).join(', ') : 'Prescription medication',
        serviceType: 'Pharmacy',
        referenceCode: `RX-${row.id.slice(0, 8).toUpperCase()}`,
        totalEstimate: total,
        patientShareEstimate: split.patientShare,
        coveredEstimate: split.covered,
        status: row.status === 'active' || row.status === 'completed' ? 'approved' : 'review',
        source: 'prescriptions',
      };
    });

    const profile = profileResult.data as
      | { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }
      | null;
    const patientName =
      profile?.full_name ??
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ??
      null;

    const realPreAuths: PatientRealPreAuth[] = ((preAuthResult.data ?? []) as Array<{
      id: string;
      external_ref: string;
      procedure_name: string;
      provider_name: string;
      clinician_name: string;
      status: string;
      requested_amount_aed: number;
      requested_at: string;
      sla_due_at: string;
      plan_label: string | null;
    }>).map(row => ({
      id: row.id,
      externalRef: row.external_ref,
      procedureName: row.procedure_name,
      providerName: row.provider_name,
      clinicianName: row.clinician_name,
      status: row.status,
      requestedAmountAed: row.requested_amount_aed,
      requestedAt: row.requested_at,
      slaDueAt: row.sla_due_at,
      planLabel: row.plan_label,
    }));

    const realClaims: PatientRealClaim[] = ((claimsResult.data ?? []) as Array<{
      id: string;
      external_ref: string;
      patient_name: string;
      plan_name: string;
      provider_name: string;
      doctor_name: string | null;
      claim_type: string | null;
      amount_aed: number;
      status: string;
      submitted_at: string;
    }>).map(row => ({
      id: row.id,
      externalRef: row.external_ref,
      patientName: row.patient_name,
      planName: row.plan_name,
      providerName: row.provider_name,
      doctorName: row.doctor_name,
      claimType: row.claim_type,
      amountAed: row.amount_aed,
      status: row.status,
      submittedAt: row.submitted_at,
    }));

    return {
      patientName: patientName || null,
      email: profile?.email ?? null,
      plans,
      primaryPlan,
      activity: [...appointmentRows, ...labRows, ...prescriptionRows]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10),
      realPreAuths,
      realClaims,
    };
  }, [userId]);
}
