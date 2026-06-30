import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  Mail,
  Search,
  ShieldAlert,
  Shield,
  TrendingUp,
  User,
  Users,
  Zap,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { bulkApprovePreAuthorizations } from '../../hooks';
import InsuranceShell, {
  PreAuthAlert,
  PreAuthHostedTable,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';
import type {
  InsuranceClaim,
  InsuranceFraudAlert,
  InsuranceAiInsight,
  InsuranceNetworkProvider,
  InsuranceMonthlyClaimsVolumePoint,
  InsurancePreAuthorization,
  InsurancePayerProfile,
} from '../../hooks';

// ─── Static mock data (shown when Supabase returns empty) ────────────────────

const _sla = (offsetHours: number) =>
  new Date(Date.now() + offsetHours * 3_600_000).toISOString();

const MOCK_PROFILE: InsurancePayerProfile = {
  displayName: 'Daman National Health',
  arabicName: 'الضمان للتأمين الصحي الوطني',
  regulatorName: 'DHA — Dubai Health Authority',
  activeMembers: 8247,
  membersGold: 2847,
  membersSilver: 3104,
  membersBasic: 1892,
  officerName: 'Sarah Al Mansouri',
  officerTitle: 'Senior Claims Officer',
  aiAutoApprovalPercent: 78.2,
  aiAutoApprovalChangePercent: 3.1,
  avgProcessingHours: 4.2,
  slaTargetStandardHours: 8,
  slaTargetUrgentHours: 4,
  claimsTodayTotalAed: 1_247_840,
  claimsTodayCount: 312,
  claimsTodayApprovedCount: 244,
  claimsTodayApprovedAed: 981_200,
  claimsTodayPendingCount: 48,
  claimsTodayPendingAed: 196_400,
  claimsTodayDeniedCount: 20,
  claimsTodayDeniedAed: 70_240,
  claimsTodayAppealedCount: 0,
  claimsTodayAppealedAed: 0,
  damanExposureTodayAed: 151,
  claimsMtdAed: 4_800_000,
  claimsBudgetAed: 4_000_000,
  claimsBudgetPct: 120,
  priorMonthGrowthPercent: 8.4,
};

const MOCK_PRE_AUTHS: InsurancePreAuthorization[] = [
  { id: 'mpa-1',  externalRef: 'PA-20260407-00912', patientName: 'Ahmed Al Rashidi',    patientAge: 54, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Fatima Al Zaabi',   providerName: 'Cleveland Clinic Abu Dhabi',  procedureName: 'Coronary Angiography',         procedureIcdCode: 'I25.10', priority: 'urgent',  status: 'overdue', requestedAmountAed: 18_500, approvedAmountAed: null,   coverageLabel: 'Covered 100%', coveragePercent: 100, isCeenaixEprescribed: true,  aiRecommendation: 'approve', aiConfidencePercent: 94, requestedAt: '2026-04-07T06:00:00.000Z', slaDueAt: _sla(-2) },
  { id: 'mpa-2',  externalRef: 'PA-20260407-00891', patientName: 'Noura Al Hammadi',    patientAge: 38, patientGender: 'female', planTier: 'silver', planLabel: 'Silver', clinicianName: 'Dr. Khalid Al Nuaimi',  providerName: 'Mediclinic City Hospital',    procedureName: 'MRI Brain with Contrast',      procedureIcdCode: 'G35',    priority: 'urgent',  status: 'overdue', requestedAmountAed: 4_200,  approvedAmountAed: null,   coverageLabel: 'Covered 80%',  coveragePercent: 80,  isCeenaixEprescribed: false, aiRecommendation: 'review',  aiConfidencePercent: 61, requestedAt: '2026-04-07T04:30:00.000Z', slaDueAt: _sla(-1) },
  { id: 'mpa-3',  externalRef: 'PA-20260407-00876', patientName: 'Mohammed Al Kaabi',   patientAge: 67, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Sara Al Blooshi',   providerName: 'Burjeel Hospital',            procedureName: 'CABG Surgery',                 procedureIcdCode: 'I25.5',  priority: 'urgent',  status: 'review',  requestedAmountAed: 85_000, approvedAmountAed: null,   coverageLabel: 'Covered 90%',  coveragePercent: 90,  isCeenaixEprescribed: true,  aiRecommendation: 'approve', aiConfidencePercent: 97, requestedAt: '2026-04-07T07:00:00.000Z', slaDueAt: _sla(1.5) },
  { id: 'mpa-4',  externalRef: 'PA-20260407-00862', patientName: 'Aisha Al Marzouqi',   patientAge: 29, patientGender: 'female', planTier: 'basic',  planLabel: 'Basic',  clinicianName: 'Dr. Omar Al Suwaidi',   providerName: 'NMC Healthcare',              procedureName: 'Laparoscopic Cholecystectomy', procedureIcdCode: 'K80.20', priority: 'routine', status: 'review',  requestedAmountAed: 12_300, approvedAmountAed: null,   coverageLabel: 'Covered 70%',  coveragePercent: 70,  isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 88, requestedAt: '2026-04-07T07:30:00.000Z', slaDueAt: _sla(4) },
  { id: 'mpa-5',  externalRef: 'PA-20260407-00849', patientName: 'Saeed Al Falasi',     patientAge: 72, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Layla Al Khatri',   providerName: 'Aster Hospital Mankhool',     procedureName: 'Total Knee Replacement',       procedureIcdCode: 'M17.11', priority: 'urgent',  status: 'review',  requestedAmountAed: 42_000, approvedAmountAed: null,   coverageLabel: 'Covered 100%', coveragePercent: 100, isCeenaixEprescribed: false, aiRecommendation: 'review',  aiConfidencePercent: 72, requestedAt: '2026-04-07T08:00:00.000Z', slaDueAt: _sla(2) },
  { id: 'mpa-6',  externalRef: 'PA-20260407-00834', patientName: 'Mariam Al Qubaisi',   patientAge: 45, patientGender: 'female', planTier: 'silver', planLabel: 'Silver', clinicianName: 'Dr. Hamad Al Mazrouei', providerName: 'Prime Hospital',              procedureName: 'Hysterectomy',                 procedureIcdCode: 'N81.1',  priority: 'routine', status: 'review',  requestedAmountAed: 22_500, approvedAmountAed: null,   coverageLabel: 'Covered 80%',  coveragePercent: 80,  isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 91, requestedAt: '2026-04-07T08:30:00.000Z', slaDueAt: _sla(6) },
  { id: 'mpa-7',  externalRef: 'PA-20260407-00821', patientName: 'Khalid Al Rashidi',   patientAge: 55, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Hessa Al Dhaheri',  providerName: 'Mediclinic Al Noor',          procedureName: 'Spinal Fusion L4-L5',          procedureIcdCode: 'M51.16', priority: 'routine', status: 'review',  requestedAmountAed: 56_000, approvedAmountAed: null,   coverageLabel: 'Covered 90%',  coveragePercent: 90,  isCeenaixEprescribed: true,  aiRecommendation: 'deny',    aiConfidencePercent: 78, requestedAt: '2026-04-07T09:00:00.000Z', slaDueAt: _sla(5) },
  { id: 'mpa-8',  externalRef: 'PA-20260407-00809', patientName: 'Fatima Al Neyadi',    patientAge: 34, patientGender: 'female', planTier: 'basic',  planLabel: 'Basic',  clinicianName: 'Dr. Jassim Al Awadhi',  providerName: 'Saudi German Hospital',       procedureName: 'Appendectomy',                 procedureIcdCode: 'K35.2',  priority: 'urgent',  status: 'review',  requestedAmountAed: 9_800,  approvedAmountAed: null,   coverageLabel: 'Covered 70%',  coveragePercent: 70,  isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 96, requestedAt: '2026-04-07T09:30:00.000Z', slaDueAt: _sla(3) },
  { id: 'mpa-9',  externalRef: 'PA-20260407-00796', patientName: 'Ibrahim Al Mansoori', patientAge: 61, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Maryam Al Shehhi',  providerName: 'Corniche Hospital',           procedureName: 'Cataract Surgery',             procedureIcdCode: 'H26.9',  priority: 'routine', status: 'review',  requestedAmountAed: 7_200,  approvedAmountAed: null,   coverageLabel: 'Covered 100%', coveragePercent: 100, isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 99, requestedAt: '2026-04-07T10:00:00.000Z', slaDueAt: _sla(7) },
  { id: 'mpa-10', externalRef: 'PA-20260407-00783', patientName: 'Latifa Al Muhairi',   patientAge: 42, patientGender: 'female', planTier: 'silver', planLabel: 'Silver', clinicianName: 'Dr. Tariq Al Mazrouei', providerName: 'Emirates Hospital',           procedureName: 'Thyroidectomy',                procedureIcdCode: 'E06.3',  priority: 'routine', status: 'review',  requestedAmountAed: 18_900, approvedAmountAed: null,   coverageLabel: 'Covered 80%',  coveragePercent: 80,  isCeenaixEprescribed: false, aiRecommendation: 'review',  aiConfidencePercent: 55, requestedAt: '2026-04-07T10:30:00.000Z', slaDueAt: _sla(8) },
  { id: 'mpa-11', externalRef: 'PA-20260407-00771', patientName: 'Ali Al Shamsi',       patientAge: 48, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Reem Al Khoori',    providerName: 'Thumbay Hospital',            procedureName: 'Prostatectomy',                procedureIcdCode: 'C61',    priority: 'routine', status: 'approved',requestedAmountAed: 31_500, approvedAmountAed: 31_500, coverageLabel: 'Covered 100%', coveragePercent: 100, isCeenaixEprescribed: true,  aiRecommendation: 'approve', aiConfidencePercent: 93, requestedAt: '2026-04-06T08:00:00.000Z', slaDueAt: _sla(-4) },
  { id: 'mpa-12', externalRef: 'PA-20260407-00758', patientName: 'Hana Al Zarouni',     patientAge: 31, patientGender: 'female', planTier: 'silver', planLabel: 'Silver', clinicianName: 'Dr. Faisal Al Hammadi', providerName: 'Mediclinic Parkview',         procedureName: 'Laparoscopic Myomectomy',      procedureIcdCode: 'D25.1',  priority: 'routine', status: 'approved',requestedAmountAed: 15_800, approvedAmountAed: 15_800, coverageLabel: 'Covered 80%',  coveragePercent: 80,  isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 87, requestedAt: '2026-04-06T09:00:00.000Z', slaDueAt: _sla(-3) },
  { id: 'mpa-13', externalRef: 'PA-20260407-00745', patientName: 'Yousef Al Dhaheri',   patientAge: 58, patientGender: 'male',   planTier: 'gold',   planLabel: 'Gold',   clinicianName: 'Dr. Amna Al Blooshi',   providerName: 'Burjeel Day Surgery Centre',  procedureName: 'Hip Replacement',              procedureIcdCode: 'M16.11', priority: 'routine', status: 'approved',requestedAmountAed: 48_000, approvedAmountAed: 48_000, coverageLabel: 'Covered 90%',  coveragePercent: 90,  isCeenaixEprescribed: true,  aiRecommendation: 'approve', aiConfidencePercent: 96, requestedAt: '2026-04-06T10:00:00.000Z', slaDueAt: _sla(-6) },
  { id: 'mpa-14', externalRef: 'PA-20260407-00732', patientName: 'Shaikha Al Mualla',   patientAge: 27, patientGender: 'female', planTier: 'basic',  planLabel: 'Basic',  clinicianName: 'Dr. Nasser Al Khoury',  providerName: 'Al Zahra Hospital',           procedureName: 'Tonsillectomy',                procedureIcdCode: 'J35.01', priority: 'routine', status: 'approved',requestedAmountAed: 6_400,  approvedAmountAed: 6_400,  coverageLabel: 'Covered 70%',  coveragePercent: 70,  isCeenaixEprescribed: false, aiRecommendation: 'approve', aiConfidencePercent: 98, requestedAt: '2026-04-05T11:00:00.000Z', slaDueAt: _sla(-8) },
  { id: 'mpa-15', externalRef: 'PA-20260407-00219', patientName: 'Rashid Al Nuaimi',    patientAge: 63, patientGender: 'male',   planTier: 'silver', planLabel: 'Silver', clinicianName: 'Dr. Badria Al Hashimi', providerName: 'Sheikh Khalifa Medical City', procedureName: 'Colonoscopy & Polypectomy',    procedureIcdCode: 'K57.30', priority: 'routine', status: 'denied',  requestedAmountAed: 3_900,  approvedAmountAed: null,   coverageLabel: 'Not covered',  coveragePercent: 0,   isCeenaixEprescribed: false, aiRecommendation: 'deny',    aiConfidencePercent: 82, requestedAt: '2026-04-05T12:00:00.000Z', slaDueAt: _sla(-10) },
  { id: 'mpa-16', externalRef: 'PA-20260407-00121', patientName: 'Moza Al Reyami',      patientAge: 44, patientGender: 'female', planTier: 'basic',  planLabel: 'Basic',  clinicianName: 'Dr. Waleed Al Suwaidi', providerName: 'Canadian Specialist Hospital', procedureName: 'Knee Arthroscopy',             procedureIcdCode: 'M23.20', priority: 'routine', status: 'denied',  requestedAmountAed: 8_750,  approvedAmountAed: null,   coverageLabel: 'Excluded',     coveragePercent: 0,   isCeenaixEprescribed: false, aiRecommendation: 'deny',    aiConfidencePercent: 76, requestedAt: '2026-04-04T14:00:00.000Z', slaDueAt: _sla(-12) },
];

const MOCK_CLAIMS: InsuranceClaim[] = [
  { id: 'mc-1',  externalRef: 'CLM-20260407-9001', patientName: 'Ahmed Al Rashidi',    planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Inpatient',  providerName: 'Cleveland Clinic Abu Dhabi', amountAed: 18_500, status: 'approved',     submittedAt: '2026-04-07T08:00:00.000Z' },
  { id: 'mc-2',  externalRef: 'CLM-20260407-9002', patientName: 'Noura Al Hammadi',    planName: 'Silver Standard', planTier: 'silver', claimType: 'Outpatient', providerName: 'Mediclinic City Hospital',   amountAed: 4_200,  status: 'under_review', submittedAt: '2026-04-07T08:30:00.000Z' },
  { id: 'mc-3',  externalRef: 'CLM-20260407-9003', patientName: 'Mohammed Al Kaabi',   planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Inpatient',  providerName: 'Burjeel Hospital',           amountAed: 85_000, status: 'submitted',    submittedAt: '2026-04-07T09:00:00.000Z' },
  { id: 'mc-4',  externalRef: 'CLM-20260407-9004', patientName: 'Aisha Al Marzouqi',   planName: 'Basic Essential', planTier: 'basic',  claimType: 'Inpatient',  providerName: 'NMC Healthcare',             amountAed: 12_300, status: 'approved',     submittedAt: '2026-04-07T09:30:00.000Z' },
  { id: 'mc-5',  externalRef: 'CLM-20260407-9005', patientName: 'Saeed Al Falasi',     planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Inpatient',  providerName: 'Aster Hospital Mankhool',    amountAed: 42_000, status: 'under_review', submittedAt: '2026-04-07T10:00:00.000Z' },
  { id: 'mc-6',  externalRef: 'CLM-20260407-9006', patientName: 'Mariam Al Qubaisi',   planName: 'Silver Standard', planTier: 'silver', claimType: 'Inpatient',  providerName: 'Prime Hospital',             amountAed: 22_500, status: 'submitted',    submittedAt: '2026-04-07T10:30:00.000Z' },
  { id: 'mc-7',  externalRef: 'CLM-20260407-9007', patientName: 'Khalid Al Rashidi',   planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Inpatient',  providerName: 'Mediclinic Al Noor',         amountAed: 56_000, status: 'denied',       submittedAt: '2026-04-07T11:00:00.000Z' },
  { id: 'mc-8',  externalRef: 'CLM-20260407-9008', patientName: 'Fatima Al Neyadi',    planName: 'Basic Essential', planTier: 'basic',  claimType: 'Inpatient',  providerName: 'Saudi German Hospital',      amountAed: 9_800,  status: 'approved',     submittedAt: '2026-04-07T11:30:00.000Z' },
  { id: 'mc-9',  externalRef: 'CLM-20260407-9009', patientName: 'Ibrahim Al Mansoori', planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Outpatient', providerName: 'Corniche Hospital',          amountAed: 7_200,  status: 'approved',     submittedAt: '2026-04-07T12:00:00.000Z' },
  { id: 'mc-10', externalRef: 'CLM-20260407-9010', patientName: 'Latifa Al Muhairi',   planName: 'Silver Standard', planTier: 'silver', claimType: 'Inpatient',  providerName: 'Emirates Hospital',          amountAed: 18_900, status: 'appealed',     submittedAt: '2026-04-07T12:30:00.000Z' },
  { id: 'mc-11', externalRef: 'CLM-20260407-9011', patientName: 'Ali Al Shamsi',       planName: 'Gold Enhanced',   planTier: 'gold',   claimType: 'Inpatient',  providerName: 'Thumbay Hospital',           amountAed: 31_500, status: 'approved',     submittedAt: '2026-04-07T13:00:00.000Z' },
  { id: 'mc-12', externalRef: 'CLM-20260407-9012', patientName: 'Hana Al Zarouni',     planName: 'Silver Standard', planTier: 'silver', claimType: 'Inpatient',  providerName: 'Mediclinic Parkview',        amountAed: 15_800, status: 'denied',       submittedAt: '2026-04-07T13:30:00.000Z' },
];

const MOCK_FRAUD_ALERTS: InsuranceFraudAlert[] = [
  { id: 'mfa-1', externalRef: 'FRAUD-2026-0041', subjectName: 'Dr. Sami Al Aryan — NMC Deira',        subjectType: 'provider', reason: 'Ghost consultations: 38 claims submitted for patients with no matching appointment record in CeenAiX within the billing period.',                                       score: 91, exposureAmountAed: 148_200, severity: 'high',   status: 'open'         },
  { id: 'mfa-2', externalRef: 'FRAUD-2026-0038', subjectName: 'City Pharmacy — Al Quoz Branch',       subjectType: 'provider', reason: 'Phantom pharmacy dispensing: High-value medication claims with no matching DHA prescription record. Pattern observed across 12 patient accounts in 9 days.',        score: 87, exposureAmountAed: 94_600,  severity: 'high',   status: 'investigating' },
  { id: 'mfa-3', externalRef: 'FRAUD-2026-0035', subjectName: 'Al Manara Clinic — Sharjah',           subjectType: 'provider', reason: 'Upcoding pattern detected: Routine consultations consistently billed as complex specialist reviews. Average upcoding margin 340% above peer benchmark.',             score: 74, exposureAmountAed: 62_400,  severity: 'medium', status: 'open'         },
  { id: 'mfa-4', externalRef: 'FRAUD-2026-0033', subjectName: 'Spine & Joint Centre — Abu Dhabi',     subjectType: 'provider', reason: 'Duplicate billing: 14 procedures billed twice within 72-hour windows under different claim references.',                                                             score: 68, exposureAmountAed: 41_750,  severity: 'medium', status: 'investigating' },
  { id: 'mfa-5', externalRef: 'FRAUD-2026-0029', subjectName: 'Member: Hassan Al Suwaidi (MBR-8841)', subjectType: 'member',   reason: "Out-of-hours consultation pattern: 22 specialist visits billed between 23:00–02:00 from the same provider, whose licence does not cover overnight services.",         score: 63, exposureAmountAed: 28_900,  severity: 'medium', status: 'open'         },
];

const MOCK_AI_INSIGHTS: InsuranceAiInsight[] = [
  { id: 'mai-1', insightType: 'cluster_risk',          title: 'Musculoskeletal Cluster Cost Spike',           description: 'AI detected a 31% increase in musculoskeletal claims from Deira catchment area. 3 providers account for 78% of volume. Recommend targeted utilization review before end of quarter.', savingsLabel: 'Est. savings: AED 240K–380K', savingsAedMin: 240_000, savingsAedMax: 380_000, subjectRef: null, primaryActionLabel: 'View Cluster Analysis', primaryActionUrl: '/insurance/analytics', secondaryActionLabel: 'Export CSV',      secondaryActionUrl: null,                  displayOrder: 1 },
  { id: 'mai-2', insightType: 'preventive',            title: 'Diabetes HbA1c Monitoring Gap — 847 Members', description: '847 members with ICD-coded Type 2 Diabetes have not had an HbA1c test in 6 months. Proactive outreach could reduce downstream hospitalisation risk and cost by up to AED 1.8M.',      savingsLabel: 'Projected: AED 1.2M–1.8M',   savingsAedMin: 1_200_000, savingsAedMax: 1_800_000, subjectRef: null, primaryActionLabel: 'Launch Outreach',       primaryActionUrl: null,                   secondaryActionLabel: 'View Members',    secondaryActionUrl: '/insurance/members',  displayOrder: 2 },
  { id: 'mai-3', insightType: 'high_quality_provider', title: 'Cleveland Clinic ADH: Top AI Efficiency Score', description: 'Cleveland Clinic Abu Dhabi achieved 98.2% AI pre-auth accuracy this month with zero SLA breaches and the lowest readmission rate in network.',                                          savingsLabel: null,                          savingsAedMin: null,      savingsAedMax: null,      subjectRef: null, primaryActionLabel: 'View Provider Profile', primaryActionUrl: '/insurance/network',   secondaryActionLabel: null,              secondaryActionUrl: null,                  displayOrder: 3 },
];

const MOCK_MONTHLY_VOLUME: InsuranceMonthlyClaimsVolumePoint[] = [
  { id: 'mv-1', year: 2026, month: 3, monthLabel: 'Mar 2026', claimsCount: 4_210, claimsValueAed: 3_940_000, growthPct: -2.4, isCurrentMonth: false },
  { id: 'mv-2', year: 2026, month: 4, monthLabel: 'Apr 2026', claimsCount: 4_840, claimsValueAed: 4_420_000, growthPct: 12.2, isCurrentMonth: false },
  { id: 'mv-3', year: 2026, month: 5, monthLabel: 'May 2026', claimsCount: 5_190, claimsValueAed: 4_690_000, growthPct:  6.1, isCurrentMonth: false },
  { id: 'mv-4', year: 2026, month: 6, monthLabel: 'Jun 2026', claimsCount: 3_120, claimsValueAed: 2_840_000, growthPct: null, isCurrentMonth: true  },
];

// ─── KPI Strip ────────────────────────────────────────────────────────────────

interface KpiCardSpec {
  icon: React.ElementType;
  accent: string;
  value: string;
  label: string;
  sub: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  pulse?: boolean;
  href: string;
}

const KpiCardItem = ({
  card, idx,
}: {
  card: KpiCardSpec;
  idx: number;
}) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 60);
    return () => clearTimeout(t);
  }, [idx]);

  const Icon = card.icon;

  return (
    <div
      onClick={() => navigate(card.href)}
      className="cursor-pointer rounded-xl flex flex-col"
      style={{
        background: '#ffffff',
        border: '1px solid #E2E8F0',
        borderLeft: `3px solid ${card.accent}`,
        padding: '16px 16px 14px',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 350ms ease, transform 350ms ease, box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.accent}18` }}>
          <Icon style={{ width: 15, height: 15, color: card.accent }} />
        </div>
        {card.badge && (
          <span
            className="rounded-full px-2 py-0.5"
            style={{ fontSize: 10, fontWeight: 700, color: card.badgeColor, background: card.badgeBg, fontFamily: 'DM Mono, monospace' }}
          >
            {card.pulse && (
              <span className="inline-block w-1 h-1 rounded-full mr-1 align-middle animate-pulse" style={{ background: card.badgeColor }} />
            )}
            {card.badge}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: 4 }}>
        {card.value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
        {card.label}
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 'auto' }}>
        {card.sub}
      </div>
    </div>
  );
};

// ─── Claims Donut ─────────────────────────────────────────────────────────────

const DonutTooltip = ({
  active, payload, segments,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  segments: { name: string; value: number; amount: number; color: string }[];
}) => {
  if (!active || !payload?.length) return null;
  const seg = segments.find(s => s.name === payload[0].name);
  return (
    <div className="rounded-lg px-3 py-2.5 shadow-xl" style={{ background: '#1E293B', border: '1px solid #334155' }}>
      <p className="font-bold text-white mb-1" style={{ fontSize: 12 }}>{payload[0].name}</p>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>
        {payload[0].value} claims
      </p>
      {seg && (
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#34D399', marginTop: 2 }}>
          {formatCurrency(seg.amount)}
        </p>
      )}
    </div>
  );
};

const ClaimsDonut = ({ claims }: { claims: InsuranceClaim[] }) => {
  const navigate = useNavigate();

  const segments = useMemo(() => {
    const approved  = claims.filter(c => c.status === 'approved');
    const pending   = claims.filter(c => c.status === 'submitted' || c.status === 'under_review');
    const denied    = claims.filter(c => c.status === 'denied');
    const appealed  = claims.filter(c => c.status === 'appealed');
    return [
      { name: 'Auto-approved', value: approved.length,  amount: approved.reduce((s, c)  => s + c.amountAed, 0), color: '#059669' },
      { name: 'Pending',       value: pending.length,   amount: pending.reduce((s, c)   => s + c.amountAed, 0), color: '#D97706' },
      { name: 'Denied',        value: denied.length,    amount: denied.reduce((s, c)    => s + c.amountAed, 0), color: '#DC2626' },
      { name: 'Appealed',      value: appealed.length,  amount: appealed.reduce((s, c)  => s + c.amountAed, 0), color: '#7C3AED' },
    ];
  }, [claims]);

  const total       = segments.reduce((s, g) => s + g.value, 0);
  const totalAmount = segments.reduce((s, g) => s + g.amount, 0);
  const approvedAmt = segments.find(s => s.name === 'Auto-approved')?.amount ?? 0;
  const pendingAmt  = segments.find(s => s.name === 'Pending')?.amount ?? 0;

  return (
    <div
      className="rounded-xl cursor-pointer"
      style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #2563EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      onClick={() => navigate('/insurance/claims')}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <TrendingUp style={{ width: 14, height: 14, color: '#2563EB' }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Claims Today</span>
        </div>
        <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>View all →</span>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="relative" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                animationDuration={700}
              >
                {segments.map((seg, i) => (
                  <Cell key={i} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip segments={segments} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {total}
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>claims today</span>
          </div>
        </div>

        <div className="space-y-2 mt-2">
          {segments.map(seg => (
            <div key={seg.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                <span style={{ fontSize: 12, color: '#475569' }}>{seg.name}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  {seg.value}
                </span>
              </div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>
                {formatCurrency(seg.amount)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid #F1F5F9' }}>
          <div className="flex justify-between">
            <span style={{ fontSize: 12, color: '#64748B' }}>Total value</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 12, color: '#64748B' }}>Daman exposure</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#059669' }}>
              {formatCurrency(approvedAmt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 12, color: '#64748B' }}>Pending decision</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#D97706' }}>
              {formatCurrency(pendingAmt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Claims Trend Chart ───────────────────────────────────────────────────────

type ViewMode = 'volume' | 'value' | 'both';

const TrendTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const currentMonth = new Date().toLocaleString('default', { month: 'short' });
  const isPartial = label === currentMonth;
  return (
    <div className="rounded-lg shadow-xl" style={{ background: '#1E293B', border: '1px solid #334155', padding: '10px 14px', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: '#fff', fontSize: 12, marginBottom: 8 }}>
        {label}
        {isPartial && <span style={{ color: '#64748B', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>(in progress)</span>}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4" style={{ marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.name}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: p.color }}>
            {p.name === 'Value (AED)' ? `AED ${(p.value / 1_000_000).toFixed(2)}M` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const ClaimsTrendChart = ({ points, profile }: {
  points: InsuranceMonthlyClaimsVolumePoint[];
  profile: { claimsMtdAed?: number | null; claimsBudgetAed?: number | null; claimsBudgetPct?: number | null; priorMonthGrowthPercent?: number | null } | null;
}) => {
  const [view, setView] = useState<ViewMode>('both');

  const chartData = useMemo(() =>
    points.map(p => ({
      month: p.monthLabel,
      claims: p.claimsCount,
      value: p.claimsValueAed,
    })),
    [points],
  );

  const budgetLine = profile?.claimsBudgetAed ?? 4_000_000;

  return (
    <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <BarChart3 style={{ width: 14, height: 14, color: '#059669' }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
            Claims Volume &amp; Value — {points[0]?.year ?? new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          {(['volume', 'value', 'both'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="rounded-md px-2.5 py-1 transition-all capitalize"
              style={{
                fontSize: 11, fontWeight: view === v ? 700 : 500,
                background: view === v ? '#ffffff' : 'transparent',
                color: view === v ? '#0F172A' : '#64748B',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-3">
        <ResponsiveContainer width="100%" height={190}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} hide={view === 'value'} />
            <YAxis
              yAxisId="right" orientation="right"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
              axisLine={false} tickLine={false}
              hide={view === 'volume'}
            />
            <Tooltip content={<TrendTooltip />} />
            <ReferenceLine yAxisId="right" y={budgetLine} stroke="#1E3A5F" strokeDasharray="5 3" strokeWidth={1.5}>
              <Label value={`Budget ${formatCurrency(budgetLine)}`} position="insideTopRight" style={{ fontSize: 9, fill: '#1E3A5F' }} />
            </ReferenceLine>
            {view !== 'value' && (
              <Bar yAxisId="left" dataKey="claims" name="Claims" fill="#BFDBFE" radius={[3, 3, 0, 0]} animationDuration={600} />
            )}
            {view !== 'volume' && (
              <Line
                yAxisId="right" type="monotone" dataKey="value" name="Value (AED)"
                stroke="#059669" strokeWidth={2}
                dot={{ fill: '#059669', r: 3.5, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                animationDuration={600}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#475569' }}>
            {profile?.claimsMtdAed != null && profile?.claimsBudgetAed != null ? (
              <>
                <span style={{ color: '#059669', fontWeight: 700 }}>On-track:</span>{' '}
                {formatCurrency(profile.claimsMtdAed)} / {formatCurrency(profile.claimsBudgetAed)} budget ({profile.claimsBudgetPct ?? 0}%)
              </>
            ) : 'Monthly claims data'}
          </span>
          {profile?.priorMonthGrowthPercent != null && (
            <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>
              Prior month: {profile.priorMonthGrowthPercent > 0 ? '+' : ''}{profile.priorMonthGrowthPercent}% vs previous
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Fraud Alerts Panel ───────────────────────────────────────────────────────

const riskConfig = {
  high:     { dot: '#DC2626', label: 'HIGH',   labelBg: '#FEE2E2', labelColor: '#991B1B' },
  medium:   { dot: '#D97706', label: 'MEDIUM', labelBg: '#FEF3C7', labelColor: '#92400E' },
  low:      { dot: '#059669', label: 'LOW',    labelBg: '#DCFCE7', labelColor: '#065F46' },
} as const;

const FraudAlertsPanel = ({ alerts }: { alerts: InsuranceFraudAlert[] }) => {
  const navigate = useNavigate();
  const [showMedium, setShowMedium] = useState(false);

  const highAlerts   = alerts.filter(a => a.severity === 'high' && a.status !== 'resolved');
  const mediumAlerts = alerts.filter(a => a.severity !== 'high' && a.status !== 'resolved');

  return (
    <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <ShieldAlert style={{ width: 14, height: 14, color: '#DC2626' }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Fraud Alerts</span>
          {alerts.filter(a => a.status !== 'resolved').length > 0 && (
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', fontFamily: 'DM Mono, monospace' }}>
              {alerts.filter(a => a.status !== 'resolved').length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/insurance/fraud')}
          style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#B91C1C'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#DC2626'; }}
        >
          View all →
        </button>
      </div>

      <div className="p-4 space-y-3">
        {highAlerts.slice(0, 2).map(alert => {
          const cfg = riskConfig['high'];
          return (
            <div key={alert.id} className="rounded-lg p-3" style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: cfg.dot }} />
                <span className="rounded px-1.5 py-0.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color: cfg.labelColor, background: cfg.labelBg }}>
                  {cfg.label}
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8' }}>
                  {alert.score}% confidence
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{alert.subjectName}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{alert.reason}</div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 11, color: '#475569' }}>Amount at risk</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 800, color: '#DC2626' }}>
                  {formatCurrency(alert.exposureAmountAed)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); navigate('/insurance/fraud'); }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors"
                  style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}
                >
                  <Search style={{ width: 11, height: 11 }} />
                  Investigate
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 11, fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FECACA'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                >
                  <Lock style={{ width: 11, height: 11 }} />
                  Freeze
                </button>
              </div>
            </div>
          );
        })}

        {mediumAlerts.length > 0 && (
          <div>
            <button
              onClick={() => setShowMedium(v => !v)}
              className="flex items-center gap-1.5 transition-colors"
              style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#B45309'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#D97706'; }}
            >
              <ChevronDown style={{ width: 13, height: 13, transition: 'transform 200ms', transform: showMedium ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              {mediumAlerts.length} medium risk alerts
            </button>

            {showMedium && (
              <div className="mt-2 space-y-2">
                {mediumAlerts.map(alert => {
                  const cfg = riskConfig['medium'];
                  return (
                    <div
                      key={alert.id}
                      onClick={() => navigate('/insurance/fraud')}
                      className="rounded-lg p-3 cursor-pointer transition-colors"
                      style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF3C7'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFFBEB'; }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color: cfg.labelColor }}>
                          {cfg.label} · {alert.score}%
                        </span>
                        <span className="ml-auto" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: '#D97706' }}>
                          {formatCurrency(alert.exposureAmountAed)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{alert.subjectName}</div>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{alert.reason}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {alerts.filter(a => a.status !== 'resolved').length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center" style={{ fontSize: 12, color: '#94A3B8' }}>
            No active fraud alerts.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Risk Intelligence Panel ──────────────────────────────────────────────────

const insightTypeConfig = {
  preventive:   { accent: '#059669', iconBg: '#DCFCE7', tagBg: '#DCFCE7', tagColor: '#065F46', tag: 'PREVENTIVE', cardBg: '#F0FDF4', border: '#BBF7D0' },
  cluster_risk: { accent: '#D97706', iconBg: '#FEF3C7', tagBg: '#FEF3C7', tagColor: '#92400E', tag: 'CLUSTER',    cardBg: '#FFFBEB', border: '#FDE68A' },
  cluster:      { accent: '#D97706', iconBg: '#FEF3C7', tagBg: '#FEF3C7', tagColor: '#92400E', tag: 'CLUSTER',    cardBg: '#FFFBEB', border: '#FDE68A' },
  provider:     { accent: '#2563EB', iconBg: '#DBEAFE', tagBg: '#DBEAFE', tagColor: '#1E40AF', tag: 'PROVIDER',   cardBg: '#EFF6FF', border: '#BFDBFE' },
} as const;

const defaultInsightCfg = { accent: '#7C3AED', iconBg: '#EDE9FE', tagBg: '#EDE9FE', tagColor: '#5B21B6', tag: 'INSIGHT', cardBg: '#F5F3FF', border: '#DDD6FE' };

const RiskIntelligencePanel = ({ insights }: { insights: InsuranceAiInsight[] }) => (
  <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #7C3AED', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EDE9FE' }}>
        <Bot style={{ width: 13, height: 13, color: '#7C3AED' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', lineHeight: 1.2 }}>AI Risk Intelligence</div>
        <div style={{ fontSize: 10, color: '#94A3B8' }}>Powered by CeenAiX</div>
      </div>
    </div>
    <div className="p-4 space-y-3">
      {insights.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center" style={{ fontSize: 12, color: '#94A3B8' }}>
          No AI insights available.
        </div>
      )}
      {insights.map(insight => {
        const cfg = insightTypeConfig[insight.insightType as keyof typeof insightTypeConfig] ?? defaultInsightCfg;
        return (
          <div key={insight.id} className="rounded-lg p-3"
            style={{ background: cfg.cardBg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.accent}` }}>
            <div className="flex items-start gap-2 mb-2">
              <span className="rounded px-1.5 py-0.5 flex-shrink-0"
                style={{ fontSize: 10, fontWeight: 700, color: cfg.tagColor, background: cfg.tagBg, fontFamily: 'DM Mono, monospace' }}>
                {cfg.tag}
              </span>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{insight.title}</p>
            </div>
            <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, marginBottom: insight.savingsLabel ? 6 : 8 }}>
              {insight.description}
            </p>
            {insight.savingsLabel && (
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: cfg.accent, marginBottom: 8 }}>
                {insight.savingsLabel}
              </p>
            )}
            <div className="flex gap-2">
              {insight.primaryActionLabel && (
                <button className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition-opacity hover:opacity-80"
                  style={{ background: cfg.iconBg, color: cfg.accent, fontSize: 11, fontWeight: 600 }}>
                  <Mail style={{ width: 10, height: 10 }} />
                  {insight.primaryActionLabel}
                </button>
              )}
              {insight.secondaryActionLabel && (
                <button className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors hover:bg-slate-200"
                  style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 600 }}>
                  <User style={{ width: 10, height: 10 }} />
                  {insight.secondaryActionLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Network Providers Panel ──────────────────────────────────────────────────

const FraudRiskBadge = ({ score }: { score: 'low' | 'medium' | 'high' | null }) => {
  const cfg = {
    low:    { bg: '#DCFCE7', color: '#065F46', label: 'LOW'    },
    medium: { bg: '#FEF3C7', color: '#92400E', label: 'MEDIUM' },
    high:   { bg: '#FEE2E2', color: '#991B1B', label: 'HIGH'   },
  }[score ?? 'low'] ?? { bg: '#F1F5F9', color: '#64748B', label: '—' };

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
      {cfg.label}
    </span>
  );
};

const NetworkProvidersPanel = ({ providers }: { providers: InsuranceNetworkProvider[] }) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #0D9488', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <Building2 style={{ width: 14, height: 14, color: '#0D9488' }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Top Network Providers</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>by claims volume this month</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/insurance/network')}
          className="flex items-center gap-1 transition-colors"
          style={{ fontSize: 11, color: '#0D9488', fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0F766E'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#0D9488'; }}
        >
          View all <ArrowUpRight style={{ width: 11, height: 11 }} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
              {['Provider', 'Claims', 'Avg Value', 'Denial %', 'Fraud Risk'].map(col => (
                <th key={col} className="text-left px-4 py-2.5"
                  style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((p, idx) => {
              const isFlagged = p.fraudScore === 'high';
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate('/insurance/network')}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: idx < providers.length - 1 ? '1px solid #F8FAFC' : 'none',
                    background: isFlagged ? 'rgba(254,226,226,0.4)' : 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isFlagged ? 'rgba(254,226,226,0.6)' : '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isFlagged ? 'rgba(254,226,226,0.4)' : 'transparent'; }}
                >
                  <td className="px-4 py-2.5" style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isFlagged ? '#DC2626' : '#0F172A', lineHeight: 1.3 }}>
                      {p.providerName}
                    </div>
                    {p.performanceFlag && (
                      <div style={{ fontSize: 10, color: isFlagged ? '#DC2626' : '#94A3B8', marginTop: 1 }}>
                        {p.performanceFlag}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                      {p.claimsCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#475569' }}>
                      {formatCurrency(p.averageCostAed)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: (p.denialRatePercent ?? 0) > 6 ? '#D97706' : '#059669' }}>
                      {p.denialRatePercent ?? p.approvalRatePercent ?? 0}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <FraudRiskBadge score={p.fraudScore} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Quick Actions Strip ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Review Pre-Auths',  icon: ClipboardList, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', href: '/insurance/preauth' },
  { label: 'Bulk Approve',      icon: Check,         color: '#059669', bg: '#DCFCE7', border: '#BBF7D0', href: '/insurance/preauth' },
  { label: 'Review Fraud',      icon: Shield,        color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', href: '/insurance/fraud'   },
  { label: 'Generate Report',   icon: BarChart3,     color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE', href: '/insurance/reports' },
  { label: 'Member Search',     icon: Users,         color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE', href: '/insurance/members' },
  { label: 'Provider Query',    icon: Building2,     color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4', href: '/insurance/network' },
] as const;

const QuickActionsStrip = ({
  pendingPreAuths,
  aiBulkApproveCount,
  fraudCount,
  activeMembers,
}: {
  pendingPreAuths: number;
  aiBulkApproveCount: number;
  fraudCount: number;
  activeMembers: number | null | undefined;
}) => {
  const navigate = useNavigate();
  const subs: Record<string, string> = {
    'Review Pre-Auths': `${pendingPreAuths} pending`,
    'Bulk Approve':     `${aiBulkApproveCount} eligible`,
    'Review Fraud':     `${fraudCount} alerts`,
    'Generate Report':  'Daily summary',
    'Member Search':    `${formatNumber(activeMembers)} active`,
    'Provider Query':   'Network lookup',
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Quick Actions
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="rounded-xl flex items-center gap-3 transition-all"
              style={{ background: '#ffffff', border: '1px solid #E2E8F0', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'left' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = action.bg;
                e.currentTarget.style.borderColor = action.border;
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: action.bg, color: action.color }}>
                <Icon style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{action.label}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{subs[action.label]}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const InsuranceDashboard = () => {
  const { data, loading, error, overduePreAuth, openFraud, refetch } = useInsurancePageData();
  const profile       = (data?.profile?.activeMembers ?? 0) > 0 ? data!.profile! : MOCK_PROFILE;
  const preAuths      = useMemo(() =>
    (data?.preAuthorizations.length ?? 0) > 0 ? data!.preAuthorizations : MOCK_PRE_AUTHS,
    [data?.preAuthorizations]);
  const fraudAlerts   = (data?.fraudAlerts.length       ?? 0) > 0 ? data!.fraudAlerts       : MOCK_FRAUD_ALERTS;
  const aiInsights    = (data?.aiInsights.length         ?? 0) > 0 ? data!.aiInsights        : MOCK_AI_INSIGHTS;
  const monthlyVolume = (data?.monthlyClaimsVolume.length ?? 0) > 0 ? data!.monthlyClaimsVolume : MOCK_MONTHLY_VOLUME;
  const claims        = (data?.claims.length             ?? 0) > 0 ? data!.claims            : MOCK_CLAIMS;
  const providers     = data?.networkProviders ?? [];

  const pendingPreAuths  = preAuths.filter(p => p.status === 'review' || p.status === 'overdue');
  const urgentPending    = pendingPreAuths.filter(p => p.priority === 'urgent').length;
  const standardPending  = pendingPreAuths.length - urgentPending;
  const overdueCount     = preAuths.filter(p => p.status === 'overdue').length;
  const aiHigh           = fraudAlerts.filter(a => a.severity === 'high'   && a.status !== 'resolved').length;
  const aiMedium         = fraudAlerts.filter(a => a.severity === 'medium' && a.status !== 'resolved').length;

  const aiBulkApprove = useMemo(
    () => preAuths.filter(p => p.aiRecommendation === 'approve' && (p.aiConfidencePercent ?? 0) >= 95 && p.status !== 'approved'),
    [preAuths],
  );
  const aiBulkApproveCount = aiBulkApprove.length;
  const [bulkBusy, setBulkBusy]   = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleBulkApprove = async () => {
    if (aiBulkApprove.length === 0) return;
    setBulkError(null);
    setBulkBusy(true);
    try {
      await bulkApprovePreAuthorizations(aiBulkApprove.map(r => ({ id: r.id, requestedAmountAed: r.requestedAmountAed })));
      refetch();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk approval failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const [filter, setFilter] = useState<'all' | 'urgent' | 'review' | 'deny' | 'overdue'>('all');
  const filtered = useMemo(() => {
    if (filter === 'urgent')  return preAuths.filter(p => p.priority === 'urgent');
    if (filter === 'review')  return preAuths.filter(p => p.aiRecommendation === 'review');
    if (filter === 'deny')    return preAuths.filter(p => p.aiRecommendation === 'deny');
    if (filter === 'overdue') return preAuths.filter(p => p.status === 'overdue');
    return preAuths;
  }, [preAuths, filter]);

  const filterTabs = [
    { id: 'all'     as const, label: 'All',        count: preAuths.length },
    { id: 'urgent'  as const, label: 'Urgent',     count: preAuths.filter(p => p.priority === 'urgent').length },
    { id: 'review'  as const, label: 'AI: Review', count: preAuths.filter(p => p.aiRecommendation === 'review').length },
    { id: 'deny'    as const, label: 'AI: Deny',   count: preAuths.filter(p => p.aiRecommendation === 'deny').length },
    { id: 'overdue' as const, label: 'Overdue',    count: overdueCount },
  ];

  // ── KPI cards wired to real data ──
  const kpiCards: KpiCardSpec[] = [
    {
      icon: ClipboardList, accent: '#F59E0B',
      value: loading ? '…' : formatNumber(pendingPreAuths.length),
      label: 'Pending Pre-Auths',
      sub: `${urgentPending} urgent · ${standardPending} standard`,
      badge: overdueCount > 0 ? `${overdueCount} OVERDUE` : undefined,
      badgeColor: '#DC2626', badgeBg: '#FEE2E2', pulse: overdueCount > 0,
      href: '/insurance/preauth',
    },
    {
      icon: FileText, accent: '#2563EB',
      value: loading ? '…' : formatNumber(profile?.claimsTodayCount),
      label: 'Claims Today',
      sub: formatCurrency(profile?.claimsTodayTotalAed),
      badge: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length > 0
        ? `${claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length} pending`
        : undefined,
      badgeColor: '#2563EB', badgeBg: '#DBEAFE',
      href: '/insurance/claims',
    },
    {
      icon: Zap, accent: '#059669',
      value: loading ? '…' : `${profile?.aiAutoApprovalPercent ?? 0}%`,
      label: 'AI Auto-Approval',
      sub: `${formatNumber(profile?.claimsTodayApprovedCount)} of ${formatNumber(profile?.claimsTodayCount)} claims`,
      badge: profile?.aiAutoApprovalChangePercent != null ? `↑ +${profile.aiAutoApprovalChangePercent}%` : undefined,
      badgeColor: '#059669', badgeBg: '#DCFCE7',
      href: '/insurance/analytics',
    },
    {
      icon: AlertTriangle, accent: '#DC2626',
      value: loading ? '…' : formatNumber(openFraud.length),
      label: 'Fraud Alerts',
      sub: `${aiHigh} HIGH · ${aiMedium} MEDIUM risk`,
      badge: aiHigh > 0 ? `${aiHigh} HIGH` : undefined,
      badgeColor: '#DC2626', badgeBg: '#FEE2E2', pulse: aiHigh > 0,
      href: '/insurance/fraud',
    },
    {
      icon: Clock, accent: '#0D9488',
      value: loading ? '…' : `${profile?.avgProcessingHours ?? 0}h`,
      label: 'Avg Processing',
      sub: `DHA ${profile?.slaTargetUrgentHours ?? 4}h urgent · ${profile?.slaTargetStandardHours ?? 8}h standard`,
      badge: overdueCount > 0 ? `${overdueCount} breach` : undefined,
      badgeColor: '#D97706', badgeBg: '#FEF3C7',
      href: '/insurance/analytics',
    },
    {
      icon: Users, accent: '#7C3AED',
      value: loading ? '…' : formatNumber(profile?.activeMembers),
      label: 'Active Members',
      sub: `Gold · Silver · Basic`,
      href: '/insurance/members',
    },
  ];

  // ── Stable refetch ref to avoid stale closure in useCallback ──
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const stableRefetch = useCallback(() => refetchRef.current(), []);

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* KPI Strip */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => (
          <KpiCardItem key={card.label} card={card} idx={idx} />
        ))}
      </section>

      {/* Main content grid */}
      <section className="grid gap-5" style={{ gridTemplateColumns: '1fr 380px' }}>

        {/* Left column */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Pre-Auth Queue */}
          <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderLeft: '3px solid #F59E0B', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Pre-Authorization Queue</h2>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{pendingPreAuths.length} pending · DHA response required</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkApprove()}
                    disabled={bulkBusy || aiBulkApproveCount === 0}
                    className="rounded-lg px-3 py-1.5 transition-colors"
                    style={{ background: '#059669', color: '#fff', fontSize: 11, fontWeight: 700 }}
                    onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#047857'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#059669'; }}
                  >
                    {bulkBusy ? 'Approving…' : `Bulk Approve AI Recommended (${aiBulkApproveCount})`}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 transition-colors"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 11, fontWeight: 600 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  >
                    View All →
                  </button>
                </div>
                {bulkError ? <p style={{ fontSize: 11, color: '#E11D48', fontWeight: 600 }}>{bulkError}</p> : null}
              </div>
            </div>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div className="flex flex-wrap gap-1.5">
                {filterTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className="rounded-full px-3 py-1 transition-colors"
                    style={{
                      fontSize: 11, fontWeight: 700,
                      background: filter === tab.id ? '#1E3A5F' : '#F1F5F9',
                      color: filter === tab.id ? '#fff' : '#64748B',
                    }}
                  >
                    {tab.label} <span style={{ opacity: 0.7 }}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <PreAuthHostedTable rows={filtered} max={5} onApproved={stableRefetch} />
              {filtered.length > 5 && (
                <button
                  className="mt-3 w-full rounded-lg px-4 py-2 transition-colors"
                  style={{ background: '#F8FAFC', color: '#1E3A5F', fontSize: 11, fontWeight: 700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  Show {filtered.length - 5} more pre-auths →
                </button>
              )}
            </div>
          </div>

          <ClaimsTrendChart points={monthlyVolume} profile={profile} />
          <NetworkProvidersPanel providers={providers} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5" style={{ width: 380 }}>
          <ClaimsDonut claims={claims} />
          <FraudAlertsPanel alerts={fraudAlerts} />
          <RiskIntelligencePanel insights={aiInsights} />
        </div>
      </section>

      {/* Quick Actions */}
      <QuickActionsStrip
        pendingPreAuths={pendingPreAuths.length}
        aiBulkApproveCount={aiBulkApproveCount}
        fraudCount={openFraud.length}
        activeMembers={profile?.activeMembers}
      />
    </InsuranceShell>
  );
};

export default InsuranceDashboard;
