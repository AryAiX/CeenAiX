import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export interface InsuranceOrganization {
  id: string;
  name: string;
  slug: string;
  city: string | null;
}

export interface InsurancePayerProfile {
  displayName: string;
  regulatorName: string;
  activeMembers: number;
  officerName: string;
  officerTitle: string;
}

export interface InsurancePreAuthorization {
  id: string;
  externalRef: string;
  patientName: string;
  clinicianName: string;
  providerName: string;
  procedureName: string;
  priority: 'urgent' | 'high' | 'routine';
  status: 'overdue' | 'review' | 'approved' | 'denied';
  requestedAmountAed: number;
  approvedAmountAed: number | null;
  requestedAt: string;
  slaDueAt: string;
}

export interface InsuranceClaim {
  id: string;
  externalRef: string;
  patientName: string;
  planName: string;
  providerName: string;
  amountAed: number;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'appealed';
  submittedAt: string;
}

export interface InsuranceMember {
  id: string;
  externalMemberId: string;
  patientName: string;
  planName: string;
  utilizationPercent: number;
  claimCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  isActive: boolean;
}

export interface InsuranceFraudAlert {
  id: string;
  externalRef: string;
  subjectName: string;
  subjectType: string;
  reason: string;
  score: number;
  exposureAmountAed: number;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved';
}

export interface InsuranceNetworkProvider {
  id: string;
  providerName: string;
  specialty: string;
  claimsCount: number;
  approvalRatePercent: number;
  averageCostAed: number;
  performanceFlag: string;
}

export interface InsuranceRiskSegment {
  id: string;
  segmentName: string;
  utilizationPercent: number;
  lossRatioPercent: number;
  forecastNote: string;
}

export interface InsuranceReportRun {
  id: string;
  reportName: string;
  periodLabel: string;
  status: 'ready' | 'running' | 'failed';
  storageUrl: string | null;
}

export interface InsuranceSetting {
  id: string;
  settingKey: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface InsurancePortalData {
  organization: InsuranceOrganization | null;
  profile: InsurancePayerProfile | null;
  preAuthorizations: InsurancePreAuthorization[];
  claims: InsuranceClaim[];
  members: InsuranceMember[];
  fraudAlerts: InsuranceFraudAlert[];
  networkProviders: InsuranceNetworkProvider[];
  riskSegments: InsuranceRiskSegment[];
  reportRuns: InsuranceReportRun[];
  settings: InsuranceSetting[];
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
}

interface OrganizationMemberRow {
  organization_id: string;
}

interface PayerProfileRow {
  display_name: string;
  regulator_name: string;
  active_members: number;
  officer_name: string;
  officer_title: string;
}

interface PreAuthRow {
  id: string;
  external_ref: string;
  patient_name: string;
  clinician_name: string;
  provider_name: string;
  procedure_name: string;
  priority: InsurancePreAuthorization['priority'];
  status: InsurancePreAuthorization['status'];
  requested_amount_aed: number | string | null;
  approved_amount_aed: number | string | null;
  requested_at: string;
  sla_due_at: string;
}

interface ClaimRow {
  id: string;
  external_ref: string;
  patient_name: string;
  plan_name: string;
  provider_name: string;
  amount_aed: number | string | null;
  status: InsuranceClaim['status'];
  submitted_at: string;
}

interface MemberRow {
  id: string;
  external_member_id: string;
  patient_name: string;
  plan_name: string;
  utilization_percent: number;
  claim_count: number;
  risk_level: InsuranceMember['riskLevel'];
  is_active: boolean;
}

interface FraudRow {
  id: string;
  external_ref: string;
  subject_name: string;
  subject_type: string;
  reason: string;
  score: number;
  exposure_amount_aed: number | string | null;
  severity: InsuranceFraudAlert['severity'];
  status: InsuranceFraudAlert['status'];
}

interface NetworkProviderRow {
  id: string;
  provider_name: string;
  specialty: string;
  claims_count: number;
  approval_rate_percent: number;
  average_cost_aed: number | string | null;
  performance_flag: string;
}

interface RiskSegmentRow {
  id: string;
  segment_name: string;
  utilization_percent: number;
  loss_ratio_percent: number;
  forecast_note: string;
}

interface ReportRunRow {
  id: string;
  report_name: string;
  period_label: string;
  status: InsuranceReportRun['status'];
  storage_url: string | null;
}

interface SettingRow {
  id: string;
  setting_key: string;
  title: string;
  description: string;
  enabled: boolean;
}

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
};

const emptyData = (): InsurancePortalData => ({
  organization: null,
  profile: null,
  preAuthorizations: [],
  claims: [],
  members: [],
  fraudAlerts: [],
  networkProviders: [],
  riskSegments: [],
  reportRuns: [],
  settings: [],
});

export function useInsurancePortal() {
  return useQuery<InsurancePortalData>(async () => {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    let memberOrganizationId: string | null = null;
    if (userResult.user) {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userResult.user.id)
        .eq('is_active', true)
        .limit(1);
      if (membershipError) throw membershipError;
      memberOrganizationId = ((membershipRows ?? []) as OrganizationMemberRow[])[0]?.organization_id ?? null;
    }

    const organizationQuery = supabase
      .from('organizations')
      .select('id, name, slug, city')
      .eq('kind', 'insurance')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    const { data: organization, error: orgError } = memberOrganizationId
      ? await organizationQuery.eq('id', memberOrganizationId).maybeSingle()
      : await organizationQuery.limit(1).maybeSingle();

    if (orgError) throw orgError;
    if (!organization) return emptyData();

    const org = organization as OrganizationRow;

    const [
      profileResult,
      preAuthResult,
      claimResult,
      memberResult,
      fraudResult,
      providerResult,
      segmentResult,
      reportResult,
      settingResult,
    ] = await Promise.all([
      supabase
        .from('insurance_payer_profiles')
        .select('display_name, regulator_name, active_members, officer_name, officer_title')
        .eq('organization_id', org.id)
        .maybeSingle(),
      supabase
        .from('insurance_pre_authorizations')
        .select('id, external_ref, patient_name, clinician_name, provider_name, procedure_name, priority, status, requested_amount_aed, approved_amount_aed, requested_at, sla_due_at')
        .eq('organization_id', org.id)
        .order('sla_due_at', { ascending: true }),
      supabase
        .from('insurance_claims')
        .select('id, external_ref, patient_name, plan_name, provider_name, amount_aed, status, submitted_at')
        .eq('organization_id', org.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('insurance_members')
        .select('id, external_member_id, patient_name, plan_name, utilization_percent, claim_count, risk_level, is_active')
        .eq('organization_id', org.id)
        .order('patient_name', { ascending: true }),
      supabase
        .from('insurance_fraud_alerts')
        .select('id, external_ref, subject_name, subject_type, reason, score, exposure_amount_aed, severity, status')
        .eq('organization_id', org.id)
        .order('score', { ascending: false }),
      supabase
        .from('insurance_network_providers')
        .select('id, provider_name, specialty, claims_count, approval_rate_percent, average_cost_aed, performance_flag')
        .eq('organization_id', org.id)
        .order('claims_count', { ascending: false }),
      supabase
        .from('insurance_risk_segments')
        .select('id, segment_name, utilization_percent, loss_ratio_percent, forecast_note')
        .eq('organization_id', org.id)
        .order('utilization_percent', { ascending: false }),
      supabase
        .from('insurance_report_runs')
        .select('id, report_name, period_label, status, storage_url')
        .eq('organization_id', org.id)
        .order('report_name', { ascending: true }),
      supabase
        .from('insurance_settings')
        .select('id, setting_key, title, description, enabled')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (preAuthResult.error) throw preAuthResult.error;
    if (claimResult.error) throw claimResult.error;
    if (memberResult.error) throw memberResult.error;
    if (fraudResult.error) throw fraudResult.error;
    if (providerResult.error) throw providerResult.error;
    if (segmentResult.error) throw segmentResult.error;
    if (reportResult.error) throw reportResult.error;
    if (settingResult.error) throw settingResult.error;

    const profile = profileResult.data as PayerProfileRow | null;

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city,
      },
      profile: profile
        ? {
            displayName: profile.display_name,
            regulatorName: profile.regulator_name,
            activeMembers: profile.active_members,
            officerName: profile.officer_name,
            officerTitle: profile.officer_title,
          }
        : null,
      preAuthorizations: ((preAuthResult.data ?? []) as PreAuthRow[]).map((row) => ({
        id: row.id,
        externalRef: row.external_ref,
        patientName: row.patient_name,
        clinicianName: row.clinician_name,
        providerName: row.provider_name,
        procedureName: row.procedure_name,
        priority: row.priority,
        status: row.status,
        requestedAmountAed: toNumber(row.requested_amount_aed),
        approvedAmountAed: row.approved_amount_aed == null ? null : toNumber(row.approved_amount_aed),
        requestedAt: row.requested_at,
        slaDueAt: row.sla_due_at,
      })),
      claims: ((claimResult.data ?? []) as ClaimRow[]).map((row) => ({
        id: row.id,
        externalRef: row.external_ref,
        patientName: row.patient_name,
        planName: row.plan_name,
        providerName: row.provider_name,
        amountAed: toNumber(row.amount_aed),
        status: row.status,
        submittedAt: row.submitted_at,
      })),
      members: ((memberResult.data ?? []) as MemberRow[]).map((row) => ({
        id: row.id,
        externalMemberId: row.external_member_id,
        patientName: row.patient_name,
        planName: row.plan_name,
        utilizationPercent: row.utilization_percent,
        claimCount: row.claim_count,
        riskLevel: row.risk_level,
        isActive: row.is_active,
      })),
      fraudAlerts: ((fraudResult.data ?? []) as FraudRow[]).map((row) => ({
        id: row.id,
        externalRef: row.external_ref,
        subjectName: row.subject_name,
        subjectType: row.subject_type,
        reason: row.reason,
        score: row.score,
        exposureAmountAed: toNumber(row.exposure_amount_aed),
        severity: row.severity,
        status: row.status,
      })),
      networkProviders: ((providerResult.data ?? []) as NetworkProviderRow[]).map((row) => ({
        id: row.id,
        providerName: row.provider_name,
        specialty: row.specialty,
        claimsCount: row.claims_count,
        approvalRatePercent: row.approval_rate_percent,
        averageCostAed: toNumber(row.average_cost_aed),
        performanceFlag: row.performance_flag,
      })),
      riskSegments: ((segmentResult.data ?? []) as RiskSegmentRow[]).map((row) => ({
        id: row.id,
        segmentName: row.segment_name,
        utilizationPercent: row.utilization_percent,
        lossRatioPercent: row.loss_ratio_percent,
        forecastNote: row.forecast_note,
      })),
      reportRuns: ((reportResult.data ?? []) as ReportRunRow[]).map((row) => ({
        id: row.id,
        reportName: row.report_name,
        periodLabel: row.period_label,
        status: row.status,
        storageUrl: row.storage_url,
      })),
      settings: ((settingResult.data ?? []) as SettingRow[]).map((row) => ({
        id: row.id,
        settingKey: row.setting_key,
        title: row.title,
        description: row.description,
        enabled: row.enabled,
      })),
    };
  }, []);
}
