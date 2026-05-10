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
  arabicName: string | null;
  regulatorName: string;
  activeMembers: number;
  membersGold: number | null;
  membersSilver: number | null;
  membersBasic: number | null;
  officerName: string;
  officerTitle: string;
  aiAutoApprovalPercent: number | null;
  aiAutoApprovalChangePercent: number | null;
  avgProcessingHours: number | null;
  slaTargetStandardHours: number | null;
  slaTargetUrgentHours: number | null;
  claimsTodayTotalAed: number | null;
  claimsTodayCount: number | null;
  claimsTodayApprovedCount: number | null;
  claimsTodayApprovedAed: number | null;
  claimsTodayPendingCount: number | null;
  claimsTodayPendingAed: number | null;
  claimsTodayDeniedCount: number | null;
  claimsTodayDeniedAed: number | null;
  claimsTodayAppealedCount: number | null;
  claimsTodayAppealedAed: number | null;
  damanExposureTodayAed: number | null;
  claimsMtdAed: number | null;
  claimsBudgetAed: number | null;
  claimsBudgetPct: number | null;
  priorMonthGrowthPercent: number | null;
}

export interface InsurancePreAuthorization {
  id: string;
  externalRef: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  planTier: string | null;
  planLabel: string | null;
  clinicianName: string;
  providerName: string;
  procedureName: string;
  procedureIcdCode: string | null;
  priority: 'urgent' | 'high' | 'routine';
  status: 'overdue' | 'review' | 'approved' | 'denied';
  requestedAmountAed: number;
  approvedAmountAed: number | null;
  coverageLabel: string | null;
  coveragePercent: number | null;
  isCeenaixEprescribed: boolean;
  aiRecommendation: 'approve' | 'review' | 'deny' | null;
  aiConfidencePercent: number | null;
  requestedAt: string;
  slaDueAt: string;
}

export interface InsuranceClaim {
  id: string;
  externalRef: string;
  patientName: string;
  planName: string;
  planTier: string | null;
  claimType: string | null;
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
  denialRatePercent: number | null;
  fraudScore: 'low' | 'medium' | 'high' | null;
  networkNote: string | null;
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

export interface InsuranceAiInsight {
  id: string;
  insightType: 'preventive' | 'cluster' | 'high_quality_provider' | string;
  title: string;
  description: string;
  savingsLabel: string | null;
  savingsAedMin: number | null;
  savingsAedMax: number | null;
  subjectRef: string | null;
  primaryActionLabel: string | null;
  primaryActionUrl: string | null;
  secondaryActionLabel: string | null;
  secondaryActionUrl: string | null;
  displayOrder: number;
}

export interface InsuranceMonthlyClaimsVolumePoint {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  claimsCount: number;
  claimsValueAed: number;
  growthPct: number | null;
  isCurrentMonth: boolean;
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
  aiInsights: InsuranceAiInsight[];
  monthlyClaimsVolume: InsuranceMonthlyClaimsVolumePoint[];
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
  arabic_name: string | null;
  regulator_name: string;
  active_members: number;
  members_gold: number | null;
  members_silver: number | null;
  members_basic: number | null;
  officer_name: string;
  officer_title: string;
  ai_auto_approval_percent: number | string | null;
  ai_auto_approval_change_percent: number | string | null;
  avg_processing_hours: number | string | null;
  sla_target_standard_hours: number | string | null;
  sla_target_urgent_hours: number | string | null;
  claims_today_total_aed: number | string | null;
  claims_today_count: number | null;
  claims_today_approved_count: number | null;
  claims_today_approved_aed: number | string | null;
  claims_today_pending_count: number | null;
  claims_today_pending_aed: number | string | null;
  claims_today_denied_count: number | null;
  claims_today_denied_aed: number | string | null;
  claims_today_appealed_count: number | null;
  claims_today_appealed_aed: number | string | null;
  daman_exposure_today_aed: number | string | null;
  claims_mtd_aed: number | string | null;
  claims_budget_aed: number | string | null;
  claims_budget_pct: number | string | null;
  prior_month_growth_percent: number | string | null;
}

interface PreAuthRow {
  id: string;
  external_ref: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  plan_tier: string | null;
  plan_label: string | null;
  clinician_name: string;
  provider_name: string;
  procedure_name: string;
  procedure_icd_code: string | null;
  priority: InsurancePreAuthorization['priority'];
  status: InsurancePreAuthorization['status'];
  requested_amount_aed: number | string | null;
  approved_amount_aed: number | string | null;
  coverage_label: string | null;
  coverage_percent: number | null;
  is_ceenaix_eprescribed: boolean | null;
  ai_recommendation: InsurancePreAuthorization['aiRecommendation'];
  ai_confidence_percent: number | null;
  requested_at: string;
  sla_due_at: string;
}

interface ClaimRow {
  id: string;
  external_ref: string;
  patient_name: string;
  plan_name: string;
  plan_tier: string | null;
  claim_type: string | null;
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
  denial_rate_percent: number | string | null;
  fraud_score: InsuranceNetworkProvider['fraudScore'];
  network_note: string | null;
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

interface AiInsightRow {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  savings_label: string | null;
  savings_aed_min: number | string | null;
  savings_aed_max: number | string | null;
  subject_ref: string | null;
  primary_action_label: string | null;
  primary_action_url: string | null;
  secondary_action_label: string | null;
  secondary_action_url: string | null;
  display_order: number | null;
}

interface MonthlyVolumeRow {
  id: string;
  year: number;
  month: number;
  month_label: string;
  claims_count: number;
  claims_value_aed: number | string | null;
  growth_pct: number | string | null;
  is_current_month: boolean;
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  aiInsights: [],
  monthlyClaimsVolume: [],
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
      aiInsightResult,
      monthlyVolumeResult,
    ] = await Promise.all([
      supabase
        .from('insurance_payer_profiles')
        .select(
          'display_name, arabic_name, regulator_name, active_members, members_gold, members_silver, members_basic, officer_name, officer_title, ai_auto_approval_percent, ai_auto_approval_change_percent, avg_processing_hours, sla_target_standard_hours, sla_target_urgent_hours, claims_today_total_aed, claims_today_count, claims_today_approved_count, claims_today_approved_aed, claims_today_pending_count, claims_today_pending_aed, claims_today_denied_count, claims_today_denied_aed, claims_today_appealed_count, claims_today_appealed_aed, daman_exposure_today_aed, claims_mtd_aed, claims_budget_aed, claims_budget_pct, prior_month_growth_percent'
        )
        .eq('organization_id', org.id)
        .maybeSingle(),
      supabase
        .from('insurance_pre_authorizations')
        .select(
          'id, external_ref, patient_name, patient_age, patient_gender, plan_tier, plan_label, clinician_name, provider_name, procedure_name, procedure_icd_code, priority, status, requested_amount_aed, approved_amount_aed, coverage_label, coverage_percent, is_ceenaix_eprescribed, ai_recommendation, ai_confidence_percent, requested_at, sla_due_at'
        )
        .eq('organization_id', org.id)
        .order('sla_due_at', { ascending: true }),
      supabase
        .from('insurance_claims')
        .select('id, external_ref, patient_name, plan_name, plan_tier, claim_type, provider_name, amount_aed, status, submitted_at')
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
        .select('id, provider_name, specialty, claims_count, approval_rate_percent, average_cost_aed, performance_flag, denial_rate_percent, fraud_score, network_note')
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
      supabase
        .from('insurance_ai_insights')
        .select(
          'id, insight_type, title, description, savings_label, savings_aed_min, savings_aed_max, subject_ref, primary_action_label, primary_action_url, secondary_action_label, secondary_action_url, display_order'
        )
        .eq('organization_id', org.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('insurance_monthly_claims_volume')
        .select('id, year, month, month_label, claims_count, claims_value_aed, growth_pct, is_current_month')
        .eq('organization_id', org.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
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
    if (aiInsightResult.error) throw aiInsightResult.error;
    if (monthlyVolumeResult.error) throw monthlyVolumeResult.error;

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
            arabicName: profile.arabic_name,
            regulatorName: profile.regulator_name,
            activeMembers: profile.active_members,
            membersGold: profile.members_gold,
            membersSilver: profile.members_silver,
            membersBasic: profile.members_basic,
            officerName: profile.officer_name,
            officerTitle: profile.officer_title,
            aiAutoApprovalPercent: toNullableNumber(profile.ai_auto_approval_percent),
            aiAutoApprovalChangePercent: toNullableNumber(profile.ai_auto_approval_change_percent),
            avgProcessingHours: toNullableNumber(profile.avg_processing_hours),
            slaTargetStandardHours: toNullableNumber(profile.sla_target_standard_hours),
            slaTargetUrgentHours: toNullableNumber(profile.sla_target_urgent_hours),
            claimsTodayTotalAed: toNullableNumber(profile.claims_today_total_aed),
            claimsTodayCount: profile.claims_today_count,
            claimsTodayApprovedCount: profile.claims_today_approved_count,
            claimsTodayApprovedAed: toNullableNumber(profile.claims_today_approved_aed),
            claimsTodayPendingCount: profile.claims_today_pending_count,
            claimsTodayPendingAed: toNullableNumber(profile.claims_today_pending_aed),
            claimsTodayDeniedCount: profile.claims_today_denied_count,
            claimsTodayDeniedAed: toNullableNumber(profile.claims_today_denied_aed),
            claimsTodayAppealedCount: profile.claims_today_appealed_count,
            claimsTodayAppealedAed: toNullableNumber(profile.claims_today_appealed_aed),
            damanExposureTodayAed: toNullableNumber(profile.daman_exposure_today_aed),
            claimsMtdAed: toNullableNumber(profile.claims_mtd_aed),
            claimsBudgetAed: toNullableNumber(profile.claims_budget_aed),
            claimsBudgetPct: toNullableNumber(profile.claims_budget_pct),
            priorMonthGrowthPercent: toNullableNumber(profile.prior_month_growth_percent),
          }
        : null,
      preAuthorizations: ((preAuthResult.data ?? []) as PreAuthRow[]).map((row) => ({
        id: row.id,
        externalRef: row.external_ref,
        patientName: row.patient_name,
        patientAge: row.patient_age,
        patientGender: row.patient_gender,
        planTier: row.plan_tier,
        planLabel: row.plan_label,
        clinicianName: row.clinician_name,
        providerName: row.provider_name,
        procedureName: row.procedure_name,
        procedureIcdCode: row.procedure_icd_code,
        priority: row.priority,
        status: row.status,
        requestedAmountAed: toNumber(row.requested_amount_aed),
        approvedAmountAed: row.approved_amount_aed == null ? null : toNumber(row.approved_amount_aed),
        coverageLabel: row.coverage_label,
        coveragePercent: row.coverage_percent,
        isCeenaixEprescribed: row.is_ceenaix_eprescribed ?? false,
        aiRecommendation: row.ai_recommendation,
        aiConfidencePercent: row.ai_confidence_percent,
        requestedAt: row.requested_at,
        slaDueAt: row.sla_due_at,
      })),
      claims: ((claimResult.data ?? []) as ClaimRow[]).map((row) => ({
        id: row.id,
        externalRef: row.external_ref,
        patientName: row.patient_name,
        planName: row.plan_name,
        planTier: row.plan_tier,
        claimType: row.claim_type,
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
        denialRatePercent: toNullableNumber(row.denial_rate_percent),
        fraudScore: row.fraud_score,
        networkNote: row.network_note,
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
      aiInsights: ((aiInsightResult.data ?? []) as AiInsightRow[]).map((row) => ({
        id: row.id,
        insightType: row.insight_type,
        title: row.title,
        description: row.description,
        savingsLabel: row.savings_label,
        savingsAedMin: toNullableNumber(row.savings_aed_min),
        savingsAedMax: toNullableNumber(row.savings_aed_max),
        subjectRef: row.subject_ref,
        primaryActionLabel: row.primary_action_label,
        primaryActionUrl: row.primary_action_url,
        secondaryActionLabel: row.secondary_action_label,
        secondaryActionUrl: row.secondary_action_url,
        displayOrder: row.display_order ?? 0,
      })),
      monthlyClaimsVolume: ((monthlyVolumeResult.data ?? []) as MonthlyVolumeRow[]).map((row) => ({
        id: row.id,
        year: row.year,
        month: row.month,
        monthLabel: row.month_label,
        claimsCount: row.claims_count,
        claimsValueAed: toNumber(row.claims_value_aed),
        growthPct: toNullableNumber(row.growth_pct),
        isCurrentMonth: row.is_current_month,
      })),
    };
  }, []);
}
