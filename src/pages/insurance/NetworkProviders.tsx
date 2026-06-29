import { useState, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  AlertOctagon, AlertTriangle, BarChart2, Building2,
  CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Download,
  ExternalLink, Eye, FileText, Filter, Grid2x2, List, Mail,
  Map as MapIcon, MapPin, MessageSquare, MoreVertical, RefreshCw,
  Search, Star, Upload, X,
} from 'lucide-react';
import InsuranceShell, {
  KpiHostedCard,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';
import { type InsuranceNetworkProvider } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONO = "'DM Mono', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderStatus = 'Active' | 'Pending' | 'Under Review' | 'Flagged' | 'Suspended' | 'Terminated';
type FraudLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ACTIVE';
type ProviderType = 'Doctor' | 'Hospital' | 'Clinic' | 'Pharmacy' | 'Diagnostic';
type ViewMode = 'table' | 'cards' | 'map';
type MainTab = 'all' | 'pending' | 'top' | 'review' | 'terminated';
type DrawerTab = 'overview' | 'performance' | 'claims' | 'contract' | 'notes';
type ToastType = 'success' | 'warning' | 'info';
interface Toast { id: number; msg: string; type: ToastType }

interface ProviderVM {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  subSpecialty: string | null;
  dhaNumber: string;
  dhaValid: boolean;
  type: ProviderType;
  location: string;
  emirate: string;
  mapX: number;
  mapY: number;
  status: ProviderStatus;
  claimsApril: number;
  claimsAllTime: number;
  avgClaim: number;
  specialtyAvgClaim: number;
  denialRate: number;
  approvalRate: number;
  fraudScore: FraudLevel;
  fraudNumericScore: number;
  fraudCaseRef: string | null;
  overallScore: number;
  rating: number | null;
  reviewCount: number;
  networkTier: 'Standard' | 'Premium' | 'Preferred';
  networkSinceDisplay: string;
  contractExpiry: string | null;
  contractExpiryDays: number;
  badges: string[];
  isOrgRow: boolean;
  reviewNote: string | null;
  isBoardCertified: boolean;
  boardCerts: string[];
  facilityName: string | null;
  doctorCount: number | undefined;
  denialSparkline: { month: string; rate: number }[];
  paCompliance: number;
  networkNote: string | null;
}

interface PendingProviderMock {
  id: string;
  name: string;
  role: string;
  clinic: string;
  dha: string;
  dhaVerified: boolean;
  status: 'ready' | 'incomplete' | 'dha_issue';
  docsComplete: number;
  docsTotal: number;
  missingDocs: string[];
  appliedDate: string;
  waitingDays: number;
}

interface TerminatedProviderMock {
  id: string;
  name: string;
  specialty: string;
  dha: string;
  terminatedDate: string;
  reason: string;
  amountRecovered: number;
  dhaReportSubmitted: boolean;
}

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_MONTHLY_TREND = [
  { month: 'Jan', amount: 420000 },
  { month: 'Feb', amount: 380000 },
  { month: 'Mar', amount: 510000 },
  { month: 'Apr', amount: 490000 },
  { month: 'May', amount: 530000 },
  { month: 'Jun', amount: 480000 },
];

const MOCK_CLAIMS_HISTORY = [
  { date: '02 Apr', claimId: 'CLM-78231', plan: 'Gold Plus', service: 'Cardiology Consultation', amount: 2800, status: 'Approved' },
  { date: '05 Apr', claimId: 'CLM-78418', plan: 'Silver', service: 'Echocardiogram', amount: 4200, status: 'Approved' },
  { date: '09 Apr', claimId: 'CLM-78502', plan: 'Gold Plus', service: 'Stress Test', amount: 3100, status: 'Approved' },
  { date: '12 Apr', claimId: 'CLM-78611', plan: 'Basic', service: 'Follow-up', amount: 950, status: 'Denied' },
  { date: '15 Apr', claimId: 'CLM-78720', plan: 'Gold Plus', service: 'Cardiac MRI', amount: 8500, status: 'Approved' },
];

const MOCK_PENDING: PendingProviderMock[] = [
  {
    id: 'pend-001', name: 'Dr. Sara Al Mansouri', role: 'Dermatologist', clinic: 'DermaCare Dubai',
    dha: 'DHA-PRAC-2024-112233', dhaVerified: true, status: 'ready',
    docsComplete: 6, docsTotal: 6, missingDocs: [], appliedDate: '22 Mar 2026', waitingDays: 16,
  },
  {
    id: 'pend-002', name: 'Dr. Khalid Yousuf', role: 'Orthopedic Surgeon', clinic: 'Emirates Ortho',
    dha: 'DHA-PRAC-2024-998877', dhaVerified: true, status: 'ready',
    docsComplete: 6, docsTotal: 6, missingDocs: [], appliedDate: '28 Mar 2026', waitingDays: 10,
  },
  {
    id: 'pend-003', name: 'Dr. Fatima Rashid', role: 'Endocrinologist', clinic: 'Wellbeing Clinic',
    dha: 'DHA-PRAC-2024-445566', dhaVerified: false, status: 'dha_issue',
    docsComplete: 4, docsTotal: 6, missingDocs: ['Board Certificate', 'Profile Photo'], appliedDate: '10 Mar 2026', waitingDays: 28,
  },
  {
    id: 'pend-004', name: 'Medline Diagnostic Center', role: 'Diagnostic Lab', clinic: 'Medline LLC',
    dha: 'DHA-FAC-2024-776655', dhaVerified: true, status: 'incomplete',
    docsComplete: 3, docsTotal: 6, missingDocs: ['Medical Degree', 'Board Certificate', 'Passport Copy'], appliedDate: '05 Apr 2026', waitingDays: 2,
  },
];

const MOCK_TERMINATED: TerminatedProviderMock[] = [
  {
    id: 'term-001', name: 'Dr. Nasser Al Habtoor', specialty: 'Internal Medicine',
    dha: 'DHA-PRAC-2021-334455', terminatedDate: 'Jan 2026',
    reason: 'Confirmed fraudulent billing — 47 duplicate claims submitted over 3 months',
    amountRecovered: 184000, dhaReportSubmitted: true,
  },
  {
    id: 'term-002', name: 'Sunrise Pharmacy LLC', specialty: 'Pharmacy',
    dha: 'DHA-FAC-2020-556677', terminatedDate: 'Nov 2025',
    reason: 'License expired — failed to renew DHA facility license for 4+ months',
    amountRecovered: 0, dhaReportSubmitted: true,
  },
];

const MOCK_STATIC_PROVIDERS: ProviderVM[] = [
  {
    id: 'mock-001', name: 'Dr. Ahmed Al Mazrouei', nameAr: null, specialty: 'Cardiology', subSpecialty: 'Interventional Cardiology',
    dhaNumber: 'DHA-PRAC-2021-009821', dhaValid: true, type: 'Doctor',
    location: 'Dubai · Business Bay', emirate: 'Dubai', mapX: 72, mapY: 38,
    status: 'Active', claimsApril: 892, claimsAllTime: 7140, avgClaim: 3200, specialtyAvgClaim: 3800,
    denialRate: 1.8, approvalRate: 98.2, fraudScore: 'LOW', fraudNumericScore: 8, fraudCaseRef: null,
    overallScore: 94, rating: 4.9, reviewCount: 1120, networkTier: 'Premium',
    networkSinceDisplay: 'Jan 2021', contractExpiry: 'Dec 2026', contractExpiryDays: 182,
    badges: ['Top Performer', 'Low Denial'], isOrgRow: false, reviewNote: null,
    isBoardCertified: true, boardCerts: ['Cardiology Board', 'Interventional Cardiology'],
    facilityName: null, doctorCount: undefined,
    denialSparkline: [
      { month: 'Nov', rate: 2.1 }, { month: 'Dec', rate: 1.9 }, { month: 'Jan', rate: 2.3 },
      { month: 'Feb', rate: 1.7 }, { month: 'Mar', rate: 1.5 }, { month: 'Apr', rate: 1.8 },
    ],
    paCompliance: 97, networkNote: 'Long-standing top performer. Premium tier priority.',
  },
  {
    id: 'mock-002', name: 'Emirates Medical Center', nameAr: null, specialty: 'Multi-Specialty Hospital', subSpecialty: null,
    dhaNumber: 'DHA-FAC-2019-002211', dhaValid: true, type: 'Hospital',
    location: 'Abu Dhabi · Corniche', emirate: 'Abu Dhabi', mapX: 38, mapY: 58,
    status: 'Under Review', claimsApril: 1240, claimsAllTime: 9900, avgClaim: 5100, specialtyAvgClaim: 4800,
    denialRate: 7.4, approvalRate: 92.6, fraudScore: 'MEDIUM', fraudNumericScore: 48, fraudCaseRef: null,
    overallScore: 68, rating: 4.1, reviewCount: 430, networkTier: 'Preferred',
    networkSinceDisplay: 'Mar 2019', contractExpiry: 'Sep 2026', contractExpiryDays: 75,
    badges: [], isOrgRow: true, reviewNote: 'Upcoding pattern detected in orthopedic claims. Audit in progress.',
    isBoardCertified: false, boardCerts: [],
    facilityName: 'Emirates Medical Center', doctorCount: 47,
    denialSparkline: [
      { month: 'Nov', rate: 5.8 }, { month: 'Dec', rate: 6.2 }, { month: 'Jan', rate: 6.9 },
      { month: 'Feb', rate: 7.1 }, { month: 'Mar', rate: 7.8 }, { month: 'Apr', rate: 7.4 },
    ],
    paCompliance: 88, networkNote: 'Under review for billing anomalies.',
  },
  {
    id: 'mock-003', name: 'Dr. Khalid Ibrahim', nameAr: null, specialty: 'Neurology', subSpecialty: null,
    dhaNumber: 'DHA-PRAC-2020-554422', dhaValid: true, type: 'Doctor',
    location: 'Dubai · DIFC', emirate: 'Dubai', mapX: 76, mapY: 42,
    status: 'Suspended', claimsApril: 47, claimsAllTime: 2800, avgClaim: 4400, specialtyAvgClaim: 3600,
    denialRate: 12.1, approvalRate: 87.9, fraudScore: 'ACTIVE', fraudNumericScore: 91, fraudCaseRef: 'CASE-FR-2026-017',
    overallScore: 31, rating: null, reviewCount: 0, networkTier: 'Standard',
    networkSinceDisplay: 'Aug 2020', contractExpiry: null, contractExpiryDays: 0,
    badges: [], isOrgRow: false, reviewNote: 'Active fraud investigation. 47 claims frozen. DHA notified.',
    isBoardCertified: true, boardCerts: ['Neurology Board'],
    facilityName: null, doctorCount: undefined,
    denialSparkline: [
      { month: 'Nov', rate: 5.2 }, { month: 'Dec', rate: 7.8 }, { month: 'Jan', rate: 9.1 },
      { month: 'Feb', rate: 10.4 }, { month: 'Mar', rate: 11.8 }, { month: 'Apr', rate: 12.1 },
    ],
    paCompliance: 71, networkNote: 'Suspended pending fraud investigation.',
  },
  {
    id: 'mock-004', name: 'Dr. Layla Hassan', nameAr: null, specialty: 'Pediatrics', subSpecialty: null,
    dhaNumber: 'DHA-PRAC-2022-771190', dhaValid: true, type: 'Doctor',
    location: 'Sharjah · Al Nahda', emirate: 'Sharjah', mapX: 68, mapY: 28,
    status: 'Active', claimsApril: 560, claimsAllTime: 4480, avgClaim: 1200, specialtyAvgClaim: 1400,
    denialRate: 2.9, approvalRate: 97.1, fraudScore: 'LOW', fraudNumericScore: 11, fraudCaseRef: null,
    overallScore: 88, rating: 4.7, reviewCount: 680, networkTier: 'Preferred',
    networkSinceDisplay: 'Jun 2022', contractExpiry: 'Dec 2026', contractExpiryDays: 185,
    badges: ['Top Performer'], isOrgRow: false, reviewNote: null,
    isBoardCertified: true, boardCerts: ['Pediatrics Board'],
    facilityName: null, doctorCount: undefined,
    denialSparkline: [
      { month: 'Nov', rate: 3.4 }, { month: 'Dec', rate: 3.1 }, { month: 'Jan', rate: 2.8 },
      { month: 'Feb', rate: 3.0 }, { month: 'Mar', rate: 2.7 }, { month: 'Apr', rate: 2.9 },
    ],
    paCompliance: 95, networkNote: null,
  },
  {
    id: 'mock-005', name: 'Gulf Pharmacy Group', nameAr: null, specialty: 'Pharmacy', subSpecialty: null,
    dhaNumber: 'DHA-FAC-2020-334488', dhaValid: true, type: 'Pharmacy',
    location: 'Dubai · Jumeirah', emirate: 'Dubai', mapX: 66, mapY: 44,
    status: 'Active', claimsApril: 2100, claimsAllTime: 16800, avgClaim: 280, specialtyAvgClaim: 320,
    denialRate: 3.8, approvalRate: 96.2, fraudScore: 'LOW', fraudNumericScore: 15, fraudCaseRef: null,
    overallScore: 82, rating: 4.4, reviewCount: 320, networkTier: 'Standard',
    networkSinceDisplay: 'Sep 2020', contractExpiry: 'Jun 2026', contractExpiryDays: 42,
    badges: [], isOrgRow: true, reviewNote: null,
    isBoardCertified: false, boardCerts: [],
    facilityName: 'Gulf Pharmacy Group — 12 locations', doctorCount: undefined,
    denialSparkline: [
      { month: 'Nov', rate: 4.1 }, { month: 'Dec', rate: 3.9 }, { month: 'Jan', rate: 4.3 },
      { month: 'Feb', rate: 3.6 }, { month: 'Mar', rate: 3.8 }, { month: 'Apr', rate: 3.8 },
    ],
    paCompliance: 91, networkNote: '12-location pharmacy chain. Contract renewal pending.',
  },
  {
    id: 'mock-006', name: 'Dr. Omar Bin Sulayem', nameAr: null, specialty: 'Orthopedics', subSpecialty: 'Spine Surgery',
    dhaNumber: 'DHA-PRAC-2021-883311', dhaValid: true, type: 'Doctor',
    location: 'Dubai · Al Barsha', emirate: 'Dubai', mapX: 62, mapY: 40,
    status: 'Active', claimsApril: 310, claimsAllTime: 2480, avgClaim: 6200, specialtyAvgClaim: 5800,
    denialRate: 4.2, approvalRate: 95.8, fraudScore: 'LOW', fraudNumericScore: 19, fraudCaseRef: null,
    overallScore: 85, rating: 4.6, reviewCount: 240, networkTier: 'Preferred',
    networkSinceDisplay: 'Apr 2021', contractExpiry: 'Dec 2026', contractExpiryDays: 188,
    badges: [], isOrgRow: false, reviewNote: null,
    isBoardCertified: true, boardCerts: ['Orthopedics Board', 'Spine Surgery Fellowship'],
    facilityName: null, doctorCount: undefined,
    denialSparkline: [
      { month: 'Nov', rate: 4.8 }, { month: 'Dec', rate: 4.5 }, { month: 'Jan', rate: 4.3 },
      { month: 'Feb', rate: 4.1 }, { month: 'Mar', rate: 4.4 }, { month: 'Apr', rate: 4.2 },
    ],
    paCompliance: 93, networkNote: null,
  },
];

const NETWORK_SUMMARY = {
  totalProviders: 864,
  totalDoctors: 847,
  totalOrganizations: 34,
  pendingCredentialing: MOCK_PENDING.length,
  underReview: 2,
  flagged: 3,
  terminated: MOCK_TERMINATED.length,
  avgDenialRate: 4.2,
  coverageByEmirate: [
    { emirate: 'Dubai', count: 312, status: 'good' as const },
    { emirate: 'Abu Dhabi', count: 228, status: 'good' as const },
    { emirate: 'Sharjah', count: 87, status: 'good' as const },
    { emirate: 'Ajman', count: 44, status: 'warn' as const },
    { emirate: 'Ras Al Khaimah', count: 38, status: 'warn' as const },
    { emirate: 'Fujairah', count: 10, status: 'critical' as const },
    { emirate: 'UAQ', count: 4, status: 'critical' as const },
  ],
};

// ─── Config maps ──────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<ProviderStatus, { bg: string; color: string; label: string }> = {
  Active:         { bg: '#F0FDF4', color: '#15803D', label: 'Active' },
  Pending:        { bg: '#FFFBEB', color: '#92400E', label: 'Pending' },
  'Under Review': { bg: '#EFF6FF', color: '#1D4ED8', label: 'Under Review' },
  Flagged:        { bg: '#FFF7ED', color: '#9A3412', label: 'Flagged' },
  Suspended:      { bg: '#FFF5F5', color: '#DC2626', label: 'Suspended' },
  Terminated:     { bg: '#F1F5F9', color: '#64748B', label: 'Terminated' },
};

const FRAUD_CHIP: Record<FraudLevel, { bg: string; color: string; label: string }> = {
  LOW:    { bg: '#F0FDF4', color: '#15803D', label: 'LOW' },
  MEDIUM: { bg: '#FFFBEB', color: '#92400E', label: 'MEDIUM' },
  HIGH:   { bg: '#FFF7ED', color: '#9A3412', label: 'HIGH' },
  ACTIVE: { bg: '#FFF5F5', color: '#DC2626', label: 'ACTIVE' },
};

function getPerformanceBand(denialRate: number, status: ProviderStatus): 'excellent' | 'good' | 'warn' | 'poor' {
  if (status === 'Pending') return 'good';
  if (denialRate < 3) return 'excellent';
  if (denialRate < 5) return 'good';
  if (denialRate < 8) return 'warn';
  return 'poor';
}

const PERF_BORDER: Record<string, string> = {
  excellent: '#16A34A', good: '#0D9488', warn: '#D97706', poor: '#DC2626',
};

// ─── Data mapping ─────────────────────────────────────────────────────────────

function toProviderVM(p: InsuranceNetworkProvider, idx: number): ProviderVM {
  const fraudMap: Record<string, FraudLevel> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' };
  const fraudLevel: FraudLevel = p.fraudScore ? (fraudMap[p.fraudScore] ?? 'LOW') : 'LOW';

  const status: ProviderStatus = p.fraudScore === 'high' ? 'Flagged'
    : p.performanceFlag === 'under_review' ? 'Under Review'
    : p.performanceFlag === 'suspended' ? 'Suspended'
    : 'Active';

  const denial = p.denialRatePercent ?? Math.round(100 - p.approvalRatePercent);
  const locs = [
    ['Dubai · Business Bay',    'Dubai',     72, 38],
    ['Abu Dhabi · Corniche',     'Abu Dhabi', 38, 58],
    ['Sharjah · Al Nahda',      'Sharjah',   68, 28],
    ['Dubai · DIFC',            'Dubai',     76, 42],
    ['Al Ain · City Centre',    'Al Ain',    42, 38],
    ['Ajman · Rumaila',         'Ajman',     74, 22],
  ] as const;
  const li = idx % locs.length;
  const [location, emirate, mapX, mapY] = locs[li];

  const overallScore = Math.min(100, Math.round((p.approvalRatePercent * 0.5) + ((10 - Math.min(10, denial)) * 4) + 5));
  const sparkMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const denialSparkline = sparkMonths.map((month, i) => ({
    month,
    rate: Math.max(0.5, Number((denial + Math.sin(i + idx) * 0.9).toFixed(1))),
  }));

  const isOrg = p.specialty.toLowerCase().includes('hospital') || p.specialty.toLowerCase().includes('clinic') || p.specialty.toLowerCase().includes('center');
  const provType: ProviderType = p.specialty.toLowerCase().includes('pharmacy') ? 'Pharmacy'
    : p.specialty.toLowerCase().includes('radiol') || p.specialty.toLowerCase().includes('lab') || p.specialty.toLowerCase().includes('diagn') ? 'Diagnostic'
    : isOrg ? 'Hospital'
    : 'Doctor';

  return {
    id: p.id,
    name: provType === 'Doctor' ? `Dr. ${p.providerName}` : p.providerName,
    nameAr: null,
    specialty: p.specialty,
    subSpecialty: null,
    dhaNumber: `DHA-PRAC-2022-${String(100000 + idx * 7919).slice(-6)}`,
    dhaValid: true,
    type: provType,
    location: String(location),
    emirate: String(emirate),
    mapX: Number(mapX),
    mapY: Number(mapY),
    status,
    claimsApril: p.claimsCount,
    claimsAllTime: p.claimsCount * 8 + idx * 200,
    avgClaim: p.averageCostAed,
    specialtyAvgClaim: Math.round(p.averageCostAed * 0.88 + 200),
    denialRate: Number(denial.toFixed(1)),
    approvalRate: p.approvalRatePercent,
    fraudScore: fraudLevel,
    fraudNumericScore: fraudLevel === 'ACTIVE' ? 88 : fraudLevel === 'HIGH' ? 72 : fraudLevel === 'MEDIUM' ? 42 : 12,
    fraudCaseRef: fraudLevel === 'ACTIVE' || fraudLevel === 'HIGH' ? `CASE-${p.id.slice(0, 6).toUpperCase()}` : null,
    overallScore,
    rating: overallScore >= 80 ? Math.round((3.5 + (overallScore - 80) / 40) * 10) / 10 : null,
    reviewCount: p.claimsCount * 2,
    networkTier: overallScore >= 88 ? 'Premium' : overallScore >= 72 ? 'Preferred' : 'Standard',
    networkSinceDisplay: `Jan 202${Math.max(0, 2 - (idx % 3))}`,
    contractExpiry: 'Dec 2026',
    contractExpiryDays: Math.max(10, 200 - idx * 12),
    badges: overallScore >= 90 ? ['Top Performer'] : [],
    isOrgRow: isOrg,
    reviewNote: status === 'Under Review' ? (p.networkNote ?? 'Flagged for audit review') : null,
    isBoardCertified: provType === 'Doctor',
    boardCerts: provType === 'Doctor' ? [`${p.specialty} Board`] : [],
    facilityName: isOrg ? p.providerName : null,
    doctorCount: isOrg ? 15 + idx * 3 : undefined,
    denialSparkline,
    paCompliance: Math.min(100, Math.round(p.approvalRatePercent * 0.95 + 5)),
    networkNote: p.networkNote,
  };
}

// ─── Toast colors ─────────────────────────────────────────────────────────────

const TOAST_COLORS: Record<ToastType, { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
};

// ─── DenialCell ───────────────────────────────────────────────────────────────

function DenialCell({ rate, sparkline, status }: {
  rate: number;
  sparkline: { month: string; rate: number }[];
  status: ProviderStatus;
}) {
  const color = rate < 3 ? '#16A34A' : rate < 5 ? '#0D9488' : rate < 7 ? '#D97706' : '#EA580C';
  const lineColor = sparkline.length > 1
    ? (sparkline[sparkline.length - 1].rate < sparkline[sparkline.length - 2].rate ? '#16A34A' : '#EF4444')
    : '#94A3B8';
  if (status === 'Pending') return <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color }}>{rate}%</span>
      {sparkline.length > 1 && (
        <ResponsiveContainer width={40} height={16}>
          <LineChart data={sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Line dataKey="rate" stroke={lineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#0D9488' : score >= 55 ? '#D97706' : '#DC2626';
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={size * 0.08} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.08}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="flex flex-col items-center" style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: size * 0.3, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: size * 0.12, color: '#94A3B8' }}>/100</span>
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', width: 100, flexShrink: 0 }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 11, color: '#1E293B', width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── ProviderRow ──────────────────────────────────────────────────────────────

function ProviderRow({ prov, selected, onSelect, onView }: {
  prov: ProviderVM;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const band = getPerformanceBand(prov.denialRate, prov.status);
  const border = PERF_BORDER[band];
  const sc = STATUS_CHIP[prov.status];
  const fc = FRAUD_CHIP[prov.fraudScore];
  const initials = prov.name.replace('Dr. ', '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const pulsing = prov.fraudScore === 'ACTIVE';
  const rowBg = pulsing ? 'rgba(254,242,242,0.7)' : prov.status === 'Under Review' ? 'rgba(255,251,235,0.5)' : '#fff';

  return (
    <tr className="group" style={{ borderBottom: '1px solid #F8FAFC', background: selected ? '#EFF6FF' : rowBg, cursor: 'pointer' }} onClick={onView}>
      <td style={{ width: 4, padding: 0, background: border, position: 'relative' }}>
        {pulsing && <div style={{ position: 'absolute', inset: 0, background: border, animation: 'fraud-pulse 1.4s ease-in-out infinite' }} />}
      </td>
      <td className="px-3 py-4" style={{ width: 36 }} onClick={e => { e.stopPropagation(); onSelect(); }}>
        <input type="checkbox" checked={selected} onChange={() => undefined} style={{ accentColor: '#1E3A5F', cursor: 'pointer' }} />
      </td>
      <td className="py-3 pr-3" style={{ width: 200 }}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className="rounded-full flex items-center justify-center" style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #0D9488, #0F766E)', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {prov.isOrgRow ? <Building2 size={14} color="#fff" /> : initials}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: prov.status === 'Active' ? '#16A34A' : prov.status === 'Suspended' ? '#DC2626' : '#F59E0B' }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{prov.name}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: '#0D9488', marginTop: 1 }}>{prov.dhaNumber}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{prov.networkSinceDisplay}</p>
            {prov.badges.slice(0, 1).map(b => (
              <span key={b} className="inline-block px-1.5 py-0.5 rounded mt-1" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: '#FFFBEB', color: '#92400E' }}>{b}</span>
            ))}
          </div>
        </div>
      </td>
      <td className="px-2 py-3" style={{ width: 80 }}>
        <span className="px-2 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: prov.type === 'Hospital' ? '#EFF6FF' : prov.type === 'Pharmacy' ? '#FFFBEB' : prov.type === 'Diagnostic' ? '#F5F3FF' : '#F0FDFA', color: prov.type === 'Hospital' ? '#1D4ED8' : prov.type === 'Pharmacy' ? '#92400E' : prov.type === 'Diagnostic' ? '#6D28D9' : '#0F766E' }}>
          {prov.type}
        </span>
      </td>
      <td className="px-2 py-3" style={{ width: 130 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>{prov.specialty}</p>
        {prov.subSpecialty && <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>{prov.subSpecialty}</p>}
        {prov.doctorCount !== undefined && <p style={{ fontFamily: MONO, fontSize: 9, color: '#64748B', marginTop: 1 }}>{prov.doctorCount} doctors</p>}
      </td>
      <td className="px-2 py-3" style={{ width: 100 }}>
        <div className="flex items-start gap-1">
          <MapPin size={10} color="#94A3B8" className="mt-0.5 flex-shrink-0" />
          <p style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{prov.location}</p>
        </div>
      </td>
      <td className="px-2 py-3" style={{ width: 80 }}>
        <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#0D9488' }}>{prov.claimsApril > 0 ? prov.claimsApril.toLocaleString() : '—'}</p>
        {prov.claimsAllTime > 0 && <p style={{ fontFamily: MONO, fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{prov.claimsAllTime.toLocaleString()} all</p>}
      </td>
      <td className="px-2 py-3" style={{ width: 100 }}>
        {prov.avgClaim > 0 ? (
          <>
            <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#1E293B' }}>AED {prov.avgClaim.toLocaleString()}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: '#94A3B8', marginTop: 1 }}>avg {formatCurrency(prov.specialtyAvgClaim)}</p>
            {prov.avgClaim < prov.specialtyAvgClaim
              ? <p style={{ fontSize: 9, color: '#16A34A', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>below avg</p>
              : <p style={{ fontSize: 9, color: '#D97706', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>above avg</p>}
          </>
        ) : <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>}
      </td>
      <td className="px-2 py-3" style={{ width: 80 }}>
        <DenialCell rate={prov.denialRate} sparkline={prov.denialSparkline} status={prov.status} />
      </td>
      <td className="px-2 py-3" style={{ width: 72 }}>
        {prov.rating ? (
          <div className="flex items-center gap-1">
            <Star size={12} fill="#F59E0B" color="#F59E0B" />
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#D97706' }}>{prov.rating}</span>
          </div>
        ) : <span style={{ fontSize: 10, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>—</span>}
      </td>
      <td className="px-2 py-3" style={{ width: 90 }}>
        <span className="inline-block px-2 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: fc.bg, color: fc.color, border: pulsing ? `1px solid ${fc.color}` : 'none' }}>{fc.label}</span>
        <p style={{ fontFamily: MONO, fontSize: 9, color: '#94A3B8', marginTop: 2 }}>Score: {prov.fraudNumericScore}/100</p>
      </td>
      <td className="px-2 py-3" style={{ width: 110 }}>
        <span className="inline-block px-2 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: sc.bg, color: sc.color }}>{sc.label}</span>
        {prov.contractExpiry && (
          <p style={{ fontFamily: MONO, fontSize: 9, color: prov.contractExpiryDays < 90 ? '#D97706' : '#94A3B8', marginTop: 3 }}>
            {prov.contractExpiryDays < 90 ? `${prov.contractExpiryDays}d` : prov.contractExpiry}
          </p>
        )}
        {prov.reviewNote && (
          <p style={{ fontSize: 8, color: '#D97706', fontFamily: 'Inter, sans-serif', marginTop: 2, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prov.reviewNote}</p>
        )}
      </td>
      <td className="px-2 py-3" style={{ width: 80 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onView} title="View"><Eye size={13} color="#475569" /></button>
          <button className="p-1.5 rounded-lg hover:bg-slate-100" title="Report"><BarChart2 size={13} color="#475569" /></button>
          <button className="p-1.5 rounded-lg hover:bg-slate-100" title="More"><MoreVertical size={13} color="#475569" /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── ProviderCard ─────────────────────────────────────────────────────────────

function ProviderCard({ prov, onView }: { prov: ProviderVM; onView: () => void }) {
  const band = getPerformanceBand(prov.denialRate, prov.status);
  const border = PERF_BORDER[band];
  const sc = STATUS_CHIP[prov.status];
  const fc = FRAUD_CHIP[prov.fraudScore];
  const initials = prov.name.replace('Dr. ', '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const r = 26;
  const circ = 2 * Math.PI * r;
  const fill = prov.overallScore > 0 ? (prov.overallScore / 100) * circ : 0;
  const scoreColor = prov.overallScore >= 85 ? '#16A34A' : prov.overallScore >= 70 ? '#0D9488' : prov.overallScore >= 55 ? '#D97706' : '#DC2626';

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md" style={{ background: '#fff', border: '1px solid #E2E8F0' }} onClick={onView}>
      <div style={{ height: 4, background: border }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="rounded-full flex items-center justify-center" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0D9488, #0F766E)', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {prov.isOrgRow ? <Building2 size={16} color="#fff" /> : initials}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: prov.status === 'Active' ? '#16A34A' : prov.status === 'Suspended' ? '#DC2626' : '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>{prov.name}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: '#0D9488', marginTop: 1 }}>{prov.dhaNumber}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: 4 }}>{prov.specialty}</span>
              <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: sc.bg, color: sc.color, padding: '1px 6px', borderRadius: 4 }}>{sc.label}</span>
            </div>
          </div>
          <div className="flex-shrink-0 relative flex items-center justify-center" style={{ width: 54, height: 54 }}>
            <svg width="54" height="54" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
              <circle cx="27" cy="27" r={r} fill="none" stroke="#F1F5F9" strokeWidth="4" />
              <circle cx="27" cy="27" r={r} fill="none" stroke={scoreColor} strokeWidth="4"
                strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center" style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{prov.overallScore || '—'}</span>
              {prov.overallScore > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 8, color: '#94A3B8' }}>/100</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            { label: 'Claims', val: prov.claimsApril > 0 ? prov.claimsApril.toString() : '—', color: '#0D9488' },
            { label: 'Avg', val: prov.avgClaim > 0 ? prov.avgClaim.toLocaleString() : '—', color: '#1E293B' },
            { label: 'Denial', val: prov.status !== 'Pending' ? `${prov.denialRate}%` : '—', color: prov.denialRate < 3 ? '#16A34A' : prov.denialRate < 5 ? '#0D9488' : '#D97706' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: '#F8FAFC' }}>
              <p style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: s.color }}>{s.val}</p>
              <p style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: fc.bg, color: fc.color, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{fc.label}</span>
          {prov.rating && (
            <div className="flex items-center gap-1">
              <Star size={11} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#D97706' }}>{prov.rating}</span>
            </div>
          )}
          <p style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{prov.location.split('·')[0].trim()}</p>
        </div>

        <div className="flex gap-1.5">
          <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#EFF6FF', color: '#1E40AF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }} onClick={onView}>Profile</button>
          <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#F1F5F9', color: '#475569', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>Perf</button>
          <button className="py-1.5 px-2 rounded-lg" style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer' }}><MoreVertical size={12} color="#64748B" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── MapView ──────────────────────────────────────────────────────────────────

function MapView({ providers }: { providers: ProviderVM[] }) {
  const dots = providers.filter(p => p.status !== 'Terminated');
  const { coverageByEmirate } = NETWORK_SUMMARY;
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 rounded-2xl overflow-hidden relative" style={{ background: '#0F172A', minHeight: 480 }}>
        <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%' }}>
          <polygon points="400,80 520,90 620,120 700,160 720,200 680,250 650,300 600,340 540,360 500,380 460,420 420,430 380,440 320,430 270,400 240,360 200,320 180,280 200,230 220,180 260,130 320,90"
            fill="rgba(30,58,95,0.8)" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
          <text x="580" y="180" fill="rgba(147,197,253,0.6)" fontSize="11" fontFamily="Inter, sans-serif">Dubai</text>
          <text x="350" y="280" fill="rgba(147,197,253,0.5)" fontSize="11" fontFamily="Inter, sans-serif">Abu Dhabi</text>
          <text x="560" y="130" fill="rgba(147,197,253,0.5)" fontSize="10" fontFamily="Inter, sans-serif">Sharjah</text>
          <text x="610" y="230" fill="rgba(147,197,253,0.4)" fontSize="9" fontFamily="Inter, sans-serif">Ajman</text>
          <text x="640" y="270" fill="rgba(147,197,253,0.4)" fontSize="9" fontFamily="Inter, sans-serif">RAK</text>
          <text x="680" y="310" fill="rgba(147,197,253,0.4)" fontSize="9" fontFamily="Inter, sans-serif">Fujairah</text>
          {dots.map(p => {
            const x = (p.mapX / 100) * 800;
            const y = (p.mapY / 100) * 500;
            const dotR = p.claimsApril > 500 ? 8 : p.claimsApril > 100 ? 6 : 4;
            const color = p.fraudScore === 'ACTIVE' ? '#DC2626' : p.status === 'Under Review' ? '#D97706' : p.overallScore >= 85 ? '#16A34A' : '#0D9488';
            return (
              <g key={p.id}>
                <circle cx={x} cy={y} r={dotR + 3} fill={color} fillOpacity={0.2} />
                <circle cx={x} cy={y} r={dotR} fill={color} fillOpacity={0.9} stroke="#0F172A" strokeWidth="1" />
                {p.networkTier === 'Premium' && <text x={x} y={y - dotR - 3} fill="#FDE68A" fontSize="7" textAnchor="middle">*</text>}
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5" style={{ background: 'rgba(15,23,42,0.85)', padding: '10px 12px', borderRadius: 10 }}>
          {[
            { color: '#16A34A', label: 'Top Performer' },
            { color: '#0D9488', label: 'Active' },
            { color: '#D97706', label: 'Under Review' },
            { color: '#DC2626', label: 'Fraud / Flagged' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
              <span style={{ fontSize: 10, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3" style={{ width: 220 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network Coverage</p>
        {coverageByEmirate.map(c => (
          <div key={c.emirate} className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{c.emirate}</span>
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: c.status === 'good' ? '#16A34A' : c.status === 'warn' ? '#D97706' : '#DC2626' }}>{c.count}</span>
              <span style={{ fontSize: 10 }}>{c.status === 'good' ? '' : c.status === 'warn' ? '' : ''}</span>
            </div>
          </div>
        ))}
        <div className="mt-2 p-3 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Network Gap Alert</p>
          <p style={{ fontSize: 10, color: '#78350F', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>Fujairah (10) and UAQ (4) critically under-served. Recommend recruiting 5+ providers per emirate.</p>
        </div>
      </div>
    </div>
  );
}

// ─── PendingTab ───────────────────────────────────────────────────────────────

function PendingTab({ onToast }: { onToast: (m: string, t: ToastType) => void }) {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const handleApprove = (id: string, name: string) => {
    setApproved(s => new Set([...s, id]));
    onToast(`${name} added to network — Welcome email sent`, 'success');
  };
  const handleReject = (id: string, name: string) => {
    setRejected(s => new Set([...s, id]));
    onToast(`${name} — credentialing rejected`, 'warning');
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={20} color="#D97706" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>Credentialing Queue — {MOCK_PENDING.length} providers</span>
        </div>
        <button onClick={() => onToast('2 providers approved — Welcome emails sent', 'success')}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
          <CheckCircle size={13} /> Approve All Ready (2)
        </button>
      </div>

      {MOCK_PENDING.map(p => {
        const done = approved.has(p.id);
        const rej = rejected.has(p.id);
        const borderColor = p.status === 'ready' ? '#16A34A' : p.status === 'dha_issue' ? '#DC2626' : '#D97706';
        return (
          <div key={p.id} className="rounded-2xl p-4" style={{ border: `1px solid ${borderColor}30`, borderLeft: `4px solid ${borderColor}`, background: done ? '#F0FDF4' : rej ? '#FFF5F5' : '#fff', opacity: done || rej ? 0.7 : 1 }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>{p.name}</p>
                  {done && <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#F0FDF4', color: '#15803D', fontFamily: 'Inter, sans-serif' }}>Approved</span>}
                  {rej && <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#FFF5F5', color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>Rejected</span>}
                </div>
                <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{p.role} — {p.clinic}</p>
                <p style={{ fontFamily: MONO, fontSize: 11, color: '#0D9488', marginBottom: 8 }}>{p.dha}</p>

                <div className="inline-block px-3 py-1.5 rounded-lg mb-3" style={{ background: p.dhaVerified ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${p.dhaVerified ? '#BBF7D0' : '#FCA5A5'}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: p.dhaVerified ? '#16A34A' : '#DC2626', fontFamily: 'Inter, sans-serif' }}>
                    {p.dhaVerified ? 'DHA VERIFIED — LICENSE VALID' : 'DHA LICENSE NOT VERIFIED'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['Emirates ID', 'DHA License', 'Medical Degree', 'Board Certificate', 'Passport', 'Profile Photo'].map((doc, idx) => {
                    const present = idx < p.docsComplete;
                    const missing = p.missingDocs.some(m => doc.toLowerCase().includes(m.toLowerCase().split(' ')[0].toLowerCase()));
                    return (
                      <span key={doc} className="px-2 py-0.5 rounded text-xs" style={{ fontFamily: 'Inter, sans-serif', background: missing ? '#FFF7ED' : present ? '#F0FDF4' : '#F1F5F9', color: missing ? '#92400E' : present ? '#15803D' : '#94A3B8' }}>
                        {doc}
                      </span>
                    );
                  })}
                </div>

                {p.missingDocs.length > 0 && (
                  <div className="p-2.5 rounded-xl mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', fontFamily: 'Inter, sans-serif' }}>Missing: {p.missingDocs.join(', ')}</p>
                    <p style={{ fontSize: 10, color: '#78350F', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Please submit via CeenAiX portal or email credentialing@daman.ae</p>
                  </div>
                )}

                <p style={{ fontFamily: MONO, fontSize: 10, color: '#94A3B8' }}>Applied: {p.appliedDate} — Waiting {p.waitingDays} days — {p.docsComplete}/{p.docsTotal} docs</p>
              </div>
            </div>

            {!done && !rej && (
              <div className="flex gap-2 mt-4">
                {p.status === 'ready' && (
                  <button onClick={() => handleApprove(p.id, p.name)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#16A34A', color: '#fff', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
                    Approve and Add to Network
                  </button>
                )}
                {p.status === 'incomplete' && (
                  <button onClick={() => onToast(`Document request sent to ${p.name}`, 'warning')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                    Request Missing Documents
                  </button>
                )}
                {p.status === 'dha_issue' && (
                  <button onClick={() => onToast(`DHA verification follow-up sent for ${p.name}`, 'warning')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#FFF5F5', color: '#DC2626', border: '1px solid #FCA5A5', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                    Follow Up with DHA
                  </button>
                )}
                <button onClick={() => handleReject(p.id, p.name)} className="py-2.5 px-4 rounded-xl text-sm font-semibold"
                  style={{ background: 'transparent', color: '#DC2626', border: '1px solid #FCA5A5', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ReviewTab ────────────────────────────────────────────────────────────────

function ReviewTab({ providers, onToast }: { providers: ProviderVM[]; onToast: (m: string, t: ToastType) => void }) {
  const reviewItems = providers.filter(p => p.status === 'Under Review' || p.status === 'Suspended' || p.status === 'Flagged');
  return (
    <div className="p-4 flex flex-col gap-4">
      {reviewItems.length === 0 && (
        <div className="py-12 text-center" style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No providers under review</div>
      )}
      {reviewItems.map(p => {
        const isFraud = p.fraudScore === 'ACTIVE';
        const borderColor = isFraud ? '#DC2626' : p.status === 'Under Review' ? '#EA580C' : '#D97706';
        return (
          <div key={p.id} className="rounded-2xl p-4" style={{ border: `1px solid ${borderColor}30`, borderLeft: `4px solid ${borderColor}`, background: isFraud ? 'rgba(254,242,242,0.6)' : 'rgba(255,247,237,0.5)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isFraud ? <AlertOctagon size={16} color="#DC2626" /> : <AlertTriangle size={16} color="#EA580C" />}
                  <p style={{ fontSize: 14, fontWeight: 700, color: isFraud ? '#7F1D1D' : '#7C2D12', fontFamily: 'Inter, sans-serif' }}>{p.name}</p>
                </div>
                {p.fraudCaseRef && <span className="inline-block px-2 py-0.5 rounded mb-2" style={{ fontSize: 10, fontWeight: 700, fontFamily: MONO, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{p.fraudCaseRef} — ACTIVE</span>}
                <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{p.specialty} — {p.facilityName ?? p.location}</p>
                {p.reviewNote && <p style={{ fontSize: 11, color: isFraud ? '#DC2626' : '#D97706', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>{p.reviewNote}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onToast(`Fraud investigation opened for ${p.name}`, 'warning')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: isFraud ? '#FFF5F5' : '#FFF7ED', color: isFraud ? '#DC2626' : '#EA580C', border: `1px solid ${isFraud ? '#FCA5A5' : '#FED7AA'}`, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                View Investigation
              </button>
              {isFraud && (
                <button onClick={() => onToast(`${p.name} terminated — DHA notified`, 'warning')} className="py-2.5 px-4 rounded-xl text-sm font-semibold"
                  style={{ background: 'transparent', color: '#DC2626', border: '1px solid #FCA5A5', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                  Terminate
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TopTab ───────────────────────────────────────────────────────────────────

function TopTab({ providers, onView, onToast }: {
  providers: ProviderVM[];
  onView: (p: ProviderVM) => void;
  onToast: (m: string, t: ToastType) => void;
}) {
  const top = [...providers].filter(p => p.overallScore >= 78 && p.status === 'Active').sort((a, b) => b.overallScore - a.overallScore);
  const podium = top.slice(0, 3);
  const rest = top.slice(3, 10);
  const medals = ['', '', ''];
  const medalColors = ['#D97706', '#94A3B8', '#92400E'];

  if (top.length === 0) return (
    <div className="p-4 py-12 text-center" style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No top performers available</div>
  );

  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="flex items-end justify-center gap-6" style={{ height: 140, paddingBottom: 0 }}>
        {[podium[1], podium[0], podium[2]].map((p, idx) => {
          if (!p) return <div key={idx} style={{ width: 140 }} />;
          const heights = [100, 140, 80];
          const rank = idx === 1 ? 0 : idx === 0 ? 1 : 2;
          return (
            <div key={p.id} className="flex flex-col items-center cursor-pointer" style={{ width: 140 }} onClick={() => onView(p)}>
              <p style={{ fontSize: 11, fontWeight: 700, color: medalColors[rank], fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{medals[rank]} {p.name.split(' ').slice(-1)[0]}</p>
              <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: medalColors[rank], marginBottom: 6 }}>{p.overallScore}/100</p>
              <div className="w-full rounded-t-xl flex items-center justify-center" style={{ height: heights[idx], background: idx === 1 ? '#1E3A5F' : '#E2E8F0' }}>
                <p style={{ fontFamily: MONO, fontSize: 13, color: idx === 1 ? '#fff' : '#64748B', fontWeight: 700 }}>{rank + 1}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Rank', 'Provider', 'Specialty', 'Denial', 'Rating', 'Score', 'Tier'].map(h => (
                <th key={h} className="text-left px-3 py-2.5" style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...podium, ...rest].map((p, i) => (
              <tr key={p.id} className="cursor-pointer hover:bg-slate-50" style={{ borderBottom: '1px solid #F1F5F9' }} onClick={() => onView(p)}>
                <td className="px-3 py-3" style={{ fontFamily: MONO, fontSize: 12, color: '#94A3B8' }}>#{i + 1}</td>
                <td className="px-3 py-3" style={{ fontWeight: 600, color: '#1E293B' }}>{p.name}</td>
                <td className="px-3 py-3" style={{ color: '#64748B' }}>{p.specialty}</td>
                <td className="px-3 py-3" style={{ fontFamily: MONO, fontWeight: 700, color: p.denialRate < 3 ? '#16A34A' : '#0D9488' }}>{p.denialRate}%</td>
                <td className="px-3 py-3">
                  {p.rating ? <span style={{ fontFamily: MONO, color: '#D97706', fontWeight: 700 }}>{p.rating}</span> : '—'}
                </td>
                <td className="px-3 py-3">
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: p.overallScore >= 90 ? '#16A34A' : '#0D9488' }}>{p.overallScore}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: p.networkTier === 'Premium' ? '#FFFBEB' : '#EFF6FF', color: p.networkTier === 'Premium' ? '#92400E' : '#1D4ED8', fontFamily: 'Inter, sans-serif' }}>{p.networkTier}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onToast('Excellence certificates sent to top providers', 'success')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
          Send Excellence Certificates
        </button>
        <button onClick={() => onToast('Report generated for DHA', 'success')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
          Export for DHA
        </button>
      </div>
    </div>
  );
}

// ─── TerminatedTab ────────────────────────────────────────────────────────────

function TerminatedTab({ onToast }: { onToast: (m: string, t: ToastType) => void }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      {MOCK_TERMINATED.map(p => (
        <div key={p.id} className="rounded-2xl p-4" style={{ background: '#FAFBFC', border: '1px solid #E2E8F0', opacity: 0.75 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>TERMINATED — {p.terminatedDate}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{p.name}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{p.specialty} — {p.dha}</p>
              <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>Reason: {p.reason}</p>
              <div className="flex items-center gap-3 mt-3">
                {p.amountRecovered > 0 && <span style={{ fontFamily: MONO, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>AED {p.amountRecovered.toLocaleString()} recovered</span>}
                {p.dhaReportSubmitted && <span style={{ fontSize: 11, color: '#16A34A', fontFamily: 'Inter, sans-serif' }}>DHA Report submitted</span>}
              </div>
            </div>
          </div>
          <button onClick={() => onToast('Case file opened', 'info')} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            View Case File
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ExportModal ──────────────────────────────────────────────────────────────

function ExportModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string, t: ToastType) => void }) {
  const [reportType, setReportType] = useState('directory');
  const [fmt, setFmt] = useState('csv');
  const [generating, setGenerating] = useState(false);
  const reportTypes = [
    { id: 'directory', label: 'Provider Directory' },
    { id: 'performance', label: 'Performance Report' },
    { id: 'credentialing', label: 'Credentialing Status' },
    { id: 'contracts', label: 'Contract Expiry Report' },
    { id: 'coverage', label: 'Network Coverage Analysis' },
    { id: 'dha', label: 'DHA Compliance Report' },
  ];
  const go = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onClose();
      onToast(`Provider ${reportType} report generated (${fmt.toUpperCase()}) — ready for download`, 'success');
    }, 1800);
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 480, background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#1E3A5F' }}>
          <div className="flex items-center gap-2.5">
            <FileText size={16} color="#93C5FD" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>Export Provider Directory</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6 }}><X size={14} color="#fff" /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Report Type</p>
            <div className="flex flex-col gap-2">
              {reportTypes.map(r => (
                <label key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style={{ border: `1px solid ${reportType === r.id ? '#BFDBFE' : '#F1F5F9'}`, background: reportType === r.id ? '#EFF6FF' : '#FAFBFC' }}>
                  <input type="radio" name="report" checked={reportType === r.id} onChange={() => setReportType(r.id)} style={{ accentColor: '#1E3A5F' }} />
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#374151' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Format</p>
            <div className="flex gap-2">
              {['csv', 'xlsx', 'pdf'].map(f => (
                <button key={f} onClick={() => setFmt(f)} className="flex-1 py-2 rounded-xl text-xs font-semibold"
                  style={{ border: `2px solid ${fmt === f ? '#1E3A5F' : '#E2E8F0'}`, background: fmt === f ? '#EFF6FF' : '#fff', color: fmt === f ? '#1E3A5F' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                  .{f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>Cancel</button>
            <button onClick={go} disabled={generating} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: generating ? '#94A3B8' : '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', border: 'none', cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Generating...</> : <><Download size={14} />Generate</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CredentialingModal ───────────────────────────────────────────────────────

type ProviderKind = 'Doctor' | 'Hospital' | 'Clinic' | 'Pharmacy' | 'Diagnostic';
type ModalStep = 1 | 2 | 3;
interface DhaResult { found: boolean; name: string; specialty: string; expiry: string }
const REQUIRED_DOCS_LIST = ['Emirates ID', 'DHA License', 'Medical Degree', 'Board Certificate', 'Passport Copy', 'Profile Photo'];

function CredentialingModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string, t: ToastType) => void }) {
  const [step, setStep] = useState<ModalStep>(1);
  const [kind, setKind] = useState<ProviderKind>('Doctor');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [dhaNumber, setDhaNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [dhaResult, setDhaResult] = useState<DhaResult | null>(null);
  const [dhaError, setDhaError] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [tier, setTier] = useState('Standard');
  const [term, setTerm] = useState('1 year');
  const [submitting, setSubmitting] = useState(false);

  const verifyDha = () => {
    if (!dhaNumber.trim()) return;
    setVerifying(true); setDhaResult(null); setDhaError(false);
    setTimeout(() => {
      setVerifying(false);
      if (dhaNumber.startsWith('DHA')) {
        setDhaResult({ found: true, name: name || 'Dr. [Verified Name]', specialty: 'Cardiology', expiry: '31 December 2026' });
      } else {
        setDhaError(true);
      }
    }, 1800);
  };

  const toggleDoc = (doc: string) => {
    setUploadedDocs(prev => { const n = new Set(prev); n.has(doc) ? n.delete(doc) : n.add(doc); return n; });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false); onClose();
      onToast(`${name || 'New provider'} added to credentialing queue`, 'success');
    }, 1800);
  };

  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 = dhaResult?.found === true && uploadedDocs.size >= 4;
  const stepLabels = ['Provider Details', 'DHA Verification', 'Contract Terms'];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl overflow-hidden flex flex-col" style={{ width: 600, maxHeight: '90vh', background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', border: '1px solid #E2E8F0' }}>
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5" style={{ background: '#1E3A5F' }}>
          <div className="flex items-center gap-3">
            <Building2 size={18} color="#93C5FD" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>Add Provider to Network</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}><X size={16} color="#fff" /></button>
        </div>

        <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          {stepLabels.map((label, i) => {
            const n = (i + 1) as ModalStep;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: done ? '#16A34A' : active ? '#1E3A5F' : '#E2E8F0' }}>
                  {done ? <CheckCircle size={14} color="#fff" /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#94A3B8', fontFamily: MONO }}>{n}</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#1E293B' : '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{label}</span>
                {i < 2 && <ChevronRight size={14} color="#CBD5E1" className="flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {step === 1 && (
            <>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provider Type</p>
                <div className="flex gap-2 flex-wrap">
                  {(['Doctor', 'Hospital', 'Clinic', 'Pharmacy', 'Diagnostic'] as ProviderKind[]).map(k => (
                    <button key={k} onClick={() => setKind(k)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ border: `2px solid ${kind === k ? '#1E3A5F' : '#E2E8F0'}`, background: kind === k ? '#EFF6FF' : '#fff', color: kind === k ? '#1E3A5F' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="col-span-2">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6 }}>Full Name (English) *</label>
                  <input value={name} onChange={e => setName(e.target.value)} maxLength={FORM_FIELD_LIMITS.shortText} placeholder={kind === 'Doctor' ? 'Dr. Full Name' : 'Facility Name'} className="w-full px-3 py-2.5 rounded-xl"
                    style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', outline: 'none', color: '#1E293B' }} />
                </div>
                <div className="col-span-2">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6 }}>Full Name (Arabic)</label>
                  <input value={nameAr} onChange={e => setNameAr(e.target.value)} maxLength={FORM_FIELD_LIMITS.shortText} placeholder="الاسم بالعربية" dir="rtl" className="w-full px-3 py-2.5 rounded-xl"
                    style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', outline: 'none', color: '#1E293B' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={FORM_FIELD_LIMITS.email} placeholder="email@clinic.ae" className="w-full px-3 py-2.5 rounded-xl"
                    style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', outline: 'none', color: '#1E293B' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6 }}>Mobile Number</label>
                  <input value={mobile} onChange={e => setMobile(e.target.value)} maxLength={FORM_FIELD_LIMITS.phone} placeholder="+971 50 000 0000" className="w-full px-3 py-2.5 rounded-xl"
                    style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', outline: 'none', color: '#1E293B' }} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DHA License Number *</label>
                <div className="flex gap-2">
                  <input value={dhaNumber} onChange={e => { setDhaNumber(e.target.value); setDhaResult(null); setDhaError(false); }} maxLength={40}
                    placeholder="DHA-PRAC-2024-XXXXXX" className="flex-1 px-3 py-2.5 rounded-xl"
                    style={{ fontFamily: MONO, fontSize: 13, border: '1px solid #E2E8F0', outline: 'none', color: '#0F766E' }} />
                  <button onClick={verifyDha} disabled={verifying || !dhaNumber.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                    style={{ background: verifying ? '#94A3B8' : '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', border: 'none', cursor: verifying ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    {verifying ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Checking...</> : <><Search size={13} />Verify DHA</>}
                  </button>
                </div>
                {dhaResult && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>DHA LICENSE VERIFIED</p>
                    <p style={{ fontSize: 12, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Specialty: {dhaResult.specialty} — Valid until {dhaResult.expiry}</p>
                  </div>
                )}
                {dhaError && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>License not found in DHA Sheryan database</p>
                    <p style={{ fontSize: 11, color: '#7F1D1D', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Enter a valid DHA license number. Ensure it starts with &quot;DHA-&quot;</p>
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Required Documents ({uploadedDocs.size}/{REQUIRED_DOCS_LIST.length} uploaded)
                </p>
                <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {REQUIRED_DOCS_LIST.map(doc => {
                    const done = uploadedDocs.has(doc);
                    return (
                      <button key={doc} onClick={() => toggleDoc(doc)}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all"
                        style={{ border: `1px solid ${done ? '#BBF7D0' : '#E2E8F0'}`, background: done ? '#F0FDF4' : '#FAFBFC', cursor: 'pointer' }}>
                        {done ? <CheckCircle size={16} color="#16A34A" /> : <Upload size={16} color="#94A3B8" />}
                        <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: done ? '#15803D' : '#64748B', fontWeight: done ? 600 : 400 }}>{doc}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>Click to simulate upload. PDF/JPG accepted.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-4">
                {([
                  { label: 'Network Tier', options: ['Standard', 'Premium', 'Preferred'], value: tier, onChange: setTier },
                  { label: 'Contract Duration', options: ['6 months', '1 year', '2 years', '3 years'], value: term, onChange: setTerm },
                ] as const).map(field => (
                  <div key={field.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</p>
                    <div className="flex gap-2 flex-wrap">
                      {field.options.map(opt => (
                        <button key={opt} onClick={() => (field.onChange as (v: string) => void)(opt)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ border: `2px solid ${field.value === opt ? '#1E3A5F' : '#E2E8F0'}`, background: field.value === opt ? '#EFF6FF' : '#fff', color: field.value === opt ? '#1E3A5F' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Upon approval:</p>
                {['Provider added to network directory', 'CeenAiX provider account activated', 'Welcome email sent to provider', 'DHA audit record created'].map(item => (
                  <div key={item} className="flex items-center gap-2 mb-1.5">
                    <CheckCircle size={12} color="#16A34A" />
                    <span style={{ fontSize: 11, color: '#374151', fontFamily: 'Inter, sans-serif' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p style={{ fontSize: 11, color: '#92400E', fontFamily: 'Inter, sans-serif' }}>
                  Provider: <strong>{name || '—'}</strong> — Tier: <strong>{tier}</strong> — Term: <strong>{term}</strong>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4" style={{ borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <button onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as ModalStep)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => (s + 1) as ModalStep)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: (step === 1 ? !canProceedStep1 : !canProceedStep2) ? '#94A3B8' : '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', cursor: (step === 1 ? !canProceedStep1 : !canProceedStep2) ? 'not-allowed' : 'pointer' }}>
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: submitting ? '#94A3B8' : '#16A34A', color: '#fff', fontFamily: 'Inter, sans-serif', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Adding...</> : 'Add to Network'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ProviderDetailDrawer ─────────────────────────────────────────────────────

const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'claims', label: 'Claims' },
  { id: 'contract', label: 'Contract & DHA' },
  { id: 'notes', label: 'Notes' },
];

const DONUT_DATA = [
  { name: 'Missing Docs', value: 67, color: '#64748B' },
  { name: 'Plan Exclusion', value: 22, color: '#94A3B8' },
  { name: 'Other', value: 11, color: '#CBD5E1' },
];

function DrawerOverview({ provider, onToast }: { provider: ProviderVM; onToast: (m: string, t: ToastType) => void }) {
  const initials = provider.name.replace('Dr. ', '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0D9488, #0F766E)', fontFamily: MONO, fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {provider.isOrgRow ? <Building2 size={22} color="#fff" /> : initials}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white" style={{ background: provider.status === 'Active' ? '#16A34A' : provider.status === 'Suspended' ? '#DC2626' : '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>{provider.name}</p>
            {provider.nameAr && <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{provider.nameAr}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded" style={{ fontSize: 10, fontFamily: MONO, background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1' }}>{provider.dhaNumber}</span>
              <span className="px-2 py-0.5 rounded" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', background: '#EFF6FF', color: '#1D4ED8' }}>{provider.specialty}</span>
              {provider.networkTier === 'Premium' && <span className="px-2 py-0.5 rounded" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', background: '#FFFBEB', color: '#92400E' }}>Premium Network</span>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Identity Details</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {[
            { label: 'Type', val: provider.type },
            { label: 'Emirate', val: provider.emirate },
            { label: 'Network Since', val: provider.networkSinceDisplay },
            { label: 'Network Tier', val: provider.networkTier },
            { label: 'Location', val: provider.location },
            { label: 'DHA Status', val: provider.dhaValid ? 'Valid' : 'Invalid' },
          ].map(item => (
            <div key={item.label} className="p-2.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      {provider.isBoardCertified && provider.boardCerts.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Board Certifications</p>
          <div className="flex flex-wrap gap-2">
            {provider.boardCerts.map(cert => (
              <span key={cert} className="px-2.5 py-1 rounded-lg" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{cert}</span>
            ))}
          </div>
        </div>
      )}

      {provider.facilityName && (
        <div className="p-3 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
          <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Primary Facility</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>{provider.facilityName}</p>
          <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{provider.location}</p>
        </div>
      )}

      {provider.status !== 'Pending' && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Performance Snapshot</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {[
              { label: 'All-Time Claims', val: formatNumber(provider.claimsAllTime), color: '#0D9488' },
              { label: 'Patient Rating', val: provider.rating ? `${provider.rating}` : 'N/A', color: '#D97706' },
              { label: 'Denial Rate', val: `${provider.denialRate}%`, color: provider.denialRate < 3 ? '#16A34A' : provider.denialRate < 5 ? '#0D9488' : '#D97706' },
              { label: 'Avg Claim', val: formatCurrency(provider.avgClaim), color: '#1E3A5F' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</p>
                <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Send Email', bg: '#EFF6FF', color: '#1E40AF', onClick: () => onToast('Email composer opened', 'info') },
            { label: 'Message', bg: '#F1F5F9', color: '#475569', onClick: () => onToast('Messaging opened', 'info') },
            { label: 'Renew Contract', bg: '#F0FDFA', color: '#0F766E', onClick: () => onToast('Contract renewal initiated', 'success') },
            { label: 'Flag for Review', bg: '#FFFBEB', color: '#92400E', onClick: () => onToast('Provider flagged for review', 'warning') },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: btn.bg, color: btn.color, fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrawerPerformance({ provider }: { provider: ProviderVM }) {
  const scoreColor = provider.overallScore >= 85 ? '#16A34A' : provider.overallScore >= 70 ? '#0D9488' : '#D97706';
  const denialColor = provider.denialRate < 3 ? '#16A34A' : provider.denialRate < 5 ? '#0D9488' : provider.denialRate < 7 ? '#D97706' : '#DC2626';
  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      <div className="rounded-xl p-4 flex items-center gap-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <ScoreRing score={provider.overallScore} size={80} />
        <div className="flex-1">
          <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Overall Performance Score</p>
          <div className="flex flex-col gap-2">
            <MiniBar label="Quality (denial)" value={Math.round(100 - provider.denialRate * 5)} color={scoreColor} />
            <MiniBar label="Efficiency (cost)" value={Math.min(100, Math.round((provider.specialtyAvgClaim / Math.max(provider.avgClaim, 1)) * 85))} color={scoreColor} />
            <MiniBar label="PA Compliance" value={provider.paCompliance} color={scoreColor} />
          </div>
          <p style={{ fontSize: 11, color: '#15803D', fontFamily: 'Inter, sans-serif', fontStyle: 'italic', marginTop: 8 }}>
            {provider.overallScore >= 90 ? 'Top 5% of network providers' : provider.overallScore >= 80 ? 'Above network average' : 'Network average'}
          </p>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Claims This Month', val: formatNumber(provider.claimsApril) },
          { label: 'All-Time Claims', val: formatNumber(provider.claimsAllTime) },
          { label: 'Approval Rate', val: `${provider.approvalRate.toFixed(1)}%` },
          { label: 'Average Claim', val: formatCurrency(provider.avgClaim) },
          { label: 'Specialty Avg', val: formatCurrency(provider.specialtyAvgClaim) },
          { label: 'PA Compliance', val: `${provider.paCompliance}%` },
        ].map(m => (
          <div key={m.label} className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.label}</p>
            <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{m.val}</p>
          </div>
        ))}
      </div>

      {provider.denialSparkline.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>Denial Rate Trend (6 months)</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={provider.denialSparkline} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis unit="%" tick={{ fontSize: 9, fill: '#94A3B8' }} />
              <Tooltip formatter={(v: unknown) => `${String(v)}%`} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <ReferenceLine y={4.7} stroke="#CBD5E1" strokeDasharray="4 3" label={{ value: 'Avg', position: 'right', fontSize: 9, fill: '#94A3B8' }} />
              <Line dataKey="rate" stroke={denialColor} strokeWidth={2} dot={{ r: 3, fill: denialColor }} animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>Monthly Claims Trend — 2026</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={MOCK_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis tickFormatter={(v: unknown) => `${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: '#94A3B8' }} />
            <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <Bar dataKey="amount" fill="#0D9488" radius={[3, 3, 0, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {provider.claimsAllTime > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>Denial Reasons</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie data={DONUT_DATA} cx="50%" cy="50%" innerRadius={24} outerRadius={38} dataKey="value" animationDuration={600}>
                  {DONUT_DATA.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {DONUT_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{d.name}: <span style={{ fontFamily: MONO, fontWeight: 600 }}>{d.value}%</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {provider.rating && (
        <div className="p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p style={{ fontSize: 11, color: '#92400E', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Patient Satisfaction — {provider.reviewCount} reviews</p>
          <div className="flex items-center gap-2">
            <Star size={18} fill="#F59E0B" color="#F59E0B" />
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: '#92400E' }}>{provider.rating}</span>
            <span style={{ fontSize: 12, color: '#78350F', fontFamily: 'Inter, sans-serif' }}>/ 5.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerClaims({ provider }: { provider: ProviderVM }) {
  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'This Month Claims', val: formatNumber(provider.claimsApril) },
          { label: 'This Month Total', val: formatCurrency(provider.claimsApril * provider.avgClaim) },
          { label: 'All-Time Claims', val: formatNumber(provider.claimsAllTime) },
          { label: 'All-Time Total', val: formatCurrency(provider.claimsAllTime * provider.avgClaim) },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <p style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{s.val}</p>
            <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>Recent Claims — {new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}</p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <table className="w-full" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Date', 'Claim ID', 'Plan', 'Service', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5" style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CLAIMS_HISTORY.map((claim, i) => (
                <tr key={claim.claimId} style={{ borderBottom: i < MOCK_CLAIMS_HISTORY.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td className="px-3 py-2.5" style={{ fontFamily: MONO, fontSize: 10, color: '#94A3B8' }}>{claim.date}</td>
                  <td className="px-3 py-2.5" style={{ fontFamily: MONO, fontSize: 10, color: '#0D9488' }}>{claim.claimId}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 11, color: '#475569' }}>{claim.plan}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 11, color: '#1E293B' }}>{claim.service}</td>
                  <td className="px-3 py-2.5" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: '#1E293B' }}>{formatCurrency(claim.amount)}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, background: claim.status === 'Approved' ? '#F0FDF4' : '#FFF5F5', color: claim.status === 'Approved' ? '#15803D' : '#DC2626' }}>{claim.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(provider.fraudScore === 'ACTIVE' || provider.fraudScore === 'HIGH') && (
        <div className="p-4 rounded-xl" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>All Claims Frozen</p>
          <p style={{ fontSize: 11, color: '#7F1D1D', fontFamily: 'Inter, sans-serif' }}>{provider.claimsApril} claims totaling approx. {formatCurrency(provider.claimsApril * provider.avgClaim)} have been frozen pending fraud investigation {provider.fraudCaseRef ?? ''}.</p>
        </div>
      )}
    </div>
  );
}

function DrawerContract({ provider, onToast }: { provider: ProviderVM; onToast: (m: string, t: ToastType) => void }) {
  const daysRemaining = provider.contractExpiryDays;
  const expiryColor = daysRemaining < 60 ? '#DC2626' : daysRemaining < 90 ? '#D97706' : '#16A34A';
  const expiryPct = Math.min(100, (daysRemaining / 365) * 100);
  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      <div className="rounded-xl p-4" style={{ background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>DHA License</p>
        <p style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: '#0F766E', marginBottom: 8 }}>{provider.dhaNumber}</p>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: provider.dhaValid ? '#16A34A' : '#DC2626', fontFamily: 'Inter, sans-serif' }}>{provider.dhaValid ? 'VALID' : 'INVALID'}</p>
            {provider.contractExpiry && (
              <>
                <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Expires: {provider.contractExpiry}</p>
                <p style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: expiryColor, marginTop: 4 }}>{daysRemaining} days</p>
              </>
            )}
            <p style={{ fontSize: 10, color: '#0D9488', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>Last DHA API check: Today</p>
          </div>
          {daysRemaining > 0 && (
            <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
              <svg width="60" height="60" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="30" cy="30" r="24" fill="none" stroke="#F1F5F9" strokeWidth="5" />
                <circle cx="30" cy="30" r="24" fill="none" stroke={expiryColor} strokeWidth="5"
                  strokeDasharray={`${(expiryPct / 100) * 150.8} 150.8`} strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: expiryColor, position: 'relative', zIndex: 1 }}>{Math.round(expiryPct)}%</span>
            </div>
          )}
        </div>
      </div>

      {provider.contractExpiry && (
        <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Network Contract</p>
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Contract Type', val: provider.isOrgRow ? 'Facility Network Agreement' : 'Panel Doctor Contract' },
              { label: 'Network Tier', val: provider.networkTier },
              { label: 'Current Term', val: `Jan 2026 – ${provider.contractExpiry}` },
              { label: 'Renewal', val: 'Auto-renewal configured' },
              { label: 'PA Requirements', val: provider.specialty.includes('General') ? 'Routine: No PA required' : 'Specialist procedures: PA required' },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', textAlign: 'right' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Compliance Record</p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'PA Submission Rate', val: `${provider.paCompliance}%`, ok: provider.paCompliance >= 85 },
            { label: 'Claims within 30 days', val: '99.2%', ok: true },
            { label: 'Open Grievances', val: '0', ok: true },
            { label: 'DHA Audit Violations', val: '0', ok: true },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{r.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: r.ok ? '#16A34A' : '#DC2626' }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onToast('Contract PDF opened', 'info')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: '#EFF6FF', color: '#1D4ED8', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
          <FileText size={13} /> View Full Contract
        </button>
        <button onClick={() => onToast('Contract renewal initiated', 'success')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: '#F0FDFA', color: '#0F766E', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={13} /> Renew Contract
        </button>
      </div>
    </div>
  );
}

function DrawerNotes({ provider, onToast }: { provider: ProviderVM; onToast: (m: string, t: ToastType) => void }) {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([
    { text: provider.networkNote ?? 'No notes added yet.', author: 'Network Management', date: 'Jan 2024' },
  ]);
  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [...n, { text: note.trim(), author: 'Insurance Officer', date: new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }) }]);
    setNote('');
    onToast('Note added successfully', 'success');
  };
  return (
    <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      <div className="p-2.5 rounded-lg" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <p style={{ fontSize: 11, color: '#92400E', fontFamily: 'Inter, sans-serif' }}>Internal notes — not visible to the provider</p>
      </div>
      {notes.map((n, i) => (
        <div key={i} className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 12, color: '#374151', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, marginBottom: 6 }}>{n.text}</p>
          <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: MONO }}>{n.author} — {n.date}</p>
        </div>
      ))}
      <div>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={FORM_FIELD_LIMITS.clinicalNotes} placeholder="Add an internal note..." rows={3}
          className="w-full rounded-xl p-3 resize-none" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', border: '1px solid #E2E8F0', outline: 'none', color: '#374151' }} />
        <button onClick={addNote} className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
          Add Note
        </button>
      </div>
    </div>
  );
}

function ProviderDetailDrawer({ provider, onClose, onToast }: {
  provider: ProviderVM;
  onClose: () => void;
  onToast: (m: string, t: ToastType) => void;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  return (
    <>
      <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,45,74,0.25)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-[300] flex flex-col"
        style={{ width: 660, background: '#fff', borderLeft: '1px solid #E2E8F0', boxShadow: '-8px 0 40px rgba(15,45,74,0.14)', animation: 'slideInRight 0.3s ease' }}>

        <div className="flex-shrink-0 flex items-center justify-between px-5" style={{ height: 72, background: '#0F2D4A', borderBottom: '1px solid #1E3A5F' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>Provider Profile</p>
            <p style={{ fontFamily: MONO, fontSize: 11, color: '#93C5FD' }}>{provider.name} — {provider.dhaNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {provider.overallScore >= 85 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(245,158,11,0.25)', color: '#FDE68A', fontFamily: 'Inter, sans-serif' }}>TOP PERFORMER</span>
            )}
            {(provider.fraudScore === 'ACTIVE' || provider.fraudScore === 'HIGH') && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(220,38,38,0.3)', color: '#FCA5A5', fontFamily: 'Inter, sans-serif' }}>FRAUD ACTIVE</span>
            )}
            <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
              <X size={16} color="#fff" />
            </button>
          </div>
        </div>

        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', overflowX: 'auto' }}>
          {DRAWER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 flex-shrink-0 text-xs font-semibold transition-all"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: activeTab === tab.id ? '#1E3A5F' : '#64748B', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1E3A5F' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && <DrawerOverview provider={provider} onToast={onToast} />}
          {activeTab === 'performance' && <DrawerPerformance provider={provider} />}
          {activeTab === 'claims' && <DrawerClaims provider={provider} />}
          {activeTab === 'contract' && <DrawerContract provider={provider} onToast={onToast} />}
          {activeTab === 'notes' && <DrawerNotes provider={provider} onToast={onToast} />}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 px-5" style={{ height: 56, borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          {[
            { icon: <Mail size={13} />, label: 'Email', onClick: () => onToast('Email opened', 'info') },
            { icon: <MessageSquare size={13} />, label: 'Message', onClick: () => onToast('Message opened', 'info') },
            { icon: <FileText size={13} />, label: 'Report', onClick: () => onToast('Performance report generated', 'success') },
            { icon: <ExternalLink size={13} />, label: 'EOB History', onClick: () => onToast('EOB history opened', 'info') },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: '#F1F5F9', color: '#475569', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
              {btn.icon} {btn.label}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button className="p-1.5 rounded-lg" style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer' }}><ChevronLeft size={14} color="#64748B" /></button>
            <button className="p-1.5 rounded-lg" style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer' }}><ChevronRight size={14} color="#64748B" /></button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fraud-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MAIN_TABS: { id: MainTab; label: string; countKey?: keyof typeof NETWORK_SUMMARY }[] = [
  { id: 'all', label: 'All Providers' },
  { id: 'pending', label: 'Pending Credentialing' },
  { id: 'top', label: 'Top Performers' },
  { id: 'review', label: 'Needs Review' },
  { id: 'terminated', label: 'Terminated' },
];

export const InsuranceNetworkProviders = () => {
  const { data, error, refetch } = useInsurancePageData();

  const displayProviders = useMemo<ProviderVM[]>(() => {
    const real = (data?.networkProviders ?? []).map((p, i) => toProviderVM(p, i));
    if (real.length >= 4) return real;
    const realIds = new Set(real.map(p => p.id));
    const extras = MOCK_STATIC_PROVIDERS.filter(p => !realIds.has(p.id));
    return [...real, ...extras];
  }, [data]);

  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openDrawer, setOpenDrawer] = useState<ProviderVM | null>(null);
  const [showCredentialing, setShowCredentialing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const filteredProviders = useMemo(() => {
    if (!search.trim()) return displayProviders;
    const q = search.toLowerCase();
    return displayProviders.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.dhaNumber.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q)
    );
  }, [displayProviders, search]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(prev => prev.size === filteredProviders.length ? new Set() : new Set(filteredProviders.map(p => p.id)));

  const realCounts = useMemo(() => {
    const providers = data?.networkProviders ?? [];
    return {
      total: providers.length || NETWORK_SUMMARY.totalProviders,
      flagged: providers.filter(p => p.fraudScore === 'high' || p.fraudScore === 'medium').length || NETWORK_SUMMARY.flagged,
      avgDenial: providers.length
        ? Number((providers.reduce((s, p) => s + (p.denialRatePercent ?? 0), 0) / providers.length).toFixed(1))
        : NETWORK_SUMMARY.avgDenialRate,
    };
  }, [data]);

  const reviewCount = displayProviders.filter(p => p.status === 'Under Review' || p.status === 'Suspended' || p.status === 'Flagged').length;
  const tabCounts: Record<MainTab, number | undefined> = {
    all: realCounts.total,
    pending: NETWORK_SUMMARY.pendingCredentialing,
    top: undefined,
    review: reviewCount,
    terminated: NETWORK_SUMMARY.terminated,
  };

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      {/* Alert strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        {[
          { icon: <AlertOctagon size={13} color="#EF4444" />, text: 'Active fraud investigation — claims frozen', btnBg: '#FEE2E2', btnColor: '#DC2626', btnText: 'View Case', tab: 'review' as MainTab },
          { icon: <Clock size={13} color="#D97706" />, text: `${NETWORK_SUMMARY.pendingCredentialing} providers pending credentialing — 2 ready to approve`, btnBg: '#FEF3C7', btnColor: '#D97706', btnText: 'Review Queue', tab: 'pending' as MainTab },
          { icon: <AlertTriangle size={13} color="#EA580C" />, text: 'Upcoding pattern detected — audit in progress', btnBg: '#FFEDD5', btnColor: '#EA580C', btnText: 'View Details', tab: 'review' as MainTab },
        ].map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            {a.icon}
            <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{a.text}</span>
            <button onClick={() => setActiveTab(a.tab)} className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: a.btnBg, color: a.btnColor, fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
              {a.btnText}
            </button>
          </div>
        ))}
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiHostedCard label="Total Providers" value={formatNumber(realCounts.total)} caption={`${NETWORK_SUMMARY.totalDoctors} doctors — ${NETWORK_SUMMARY.totalOrganizations} orgs`} tone="blue" />
        <KpiHostedCard label="Active Doctors" value={formatNumber(NETWORK_SUMMARY.totalDoctors)} caption="All DHA licensed — UAE-wide" tone="emerald" />
        <KpiHostedCard label="Pending Credentialing" value={String(NETWORK_SUMMARY.pendingCredentialing)} caption="2 ready to approve" tone="amber" />
        <KpiHostedCard label="Avg Denial Rate" value={`${realCounts.avgDenial}%`} caption="Target: less than 6%" tone="violet" />
        <KpiHostedCard label="Flagged / Issues" value={formatNumber(realCounts.flagged)} caption="Fraud — upcoding — performance" tone="red" />
      </section>

      {/* Main content card */}
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap border-b border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', maxWidth: 380 }}>
            <Search size={14} color="#94A3B8" />
            <input value={search} onChange={e => setSearch(e.target.value)} maxLength={FORM_FIELD_LIMITS.searchQuery}
              placeholder="Search provider, DHA license, specialty..."
              className="flex-1 bg-transparent outline-none" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#374151', border: 'none' }} />
            {search && <button onClick={() => setSearch('')}><X size={12} color="#94A3B8" /></button>}
          </div>

          <div className="ml-auto flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            {([['table', <List size={14} />], ['cards', <Grid2x2 size={14} />], ['map', <MapIcon size={14} />]] as [ViewMode, React.ReactNode][]).map(([v, icon]) => (
              <button key={v} onClick={() => setViewMode(v)} className="p-2 rounded-lg transition-all"
                style={{ background: viewMode === v ? '#1E3A5F' : 'transparent', border: 'none', cursor: 'pointer', color: viewMode === v ? '#fff' : '#94A3B8' }}>
                {icon}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            <Filter size={12} /> Filters <ChevronDown size={11} />
          </button>

          <button onClick={() => setShowCredentialing(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
            + Add Provider
          </button>

          <button onClick={() => setShowExport(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#F1F5F9', color: '#475569', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-slate-100">
          {MAIN_TABS.map(tab => {
            const count = tabCounts[tab.id];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 px-5 py-3 text-xs font-semibold transition-all"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: activeTab === tab.id ? '#1E3A5F' : '#64748B', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '3px solid #1E3A5F' : '3px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {tab.label}{count !== undefined ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'all' && (
          <>
            {viewMode === 'map' && <MapView providers={filteredProviders} />}
            {viewMode === 'cards' && (
              <div className="p-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {filteredProviders.map(p => <ProviderCard key={p.id} prov={p} onView={() => setOpenDrawer(p)} />)}
              </div>
            )}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 1100 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ width: 4, padding: 0, background: 'transparent' }} />
                      <th className="px-3 py-3" style={{ width: 36 }}>
                        <input type="checkbox" checked={selectedIds.size === filteredProviders.length && filteredProviders.length > 0} onChange={toggleAll} style={{ accentColor: '#1E3A5F' }} />
                      </th>
                      {['Provider', 'Type', 'Specialty', 'Location', 'Claims', 'Avg Claim', 'Denial %', 'Rating', 'Fraud', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-2 py-3" style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.map(p => (
                      <ProviderRow key={p.id} prov={p} selected={selectedIds.has(p.id)} onSelect={() => toggleSelect(p.id)} onView={() => setOpenDrawer(p)} />
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                    Showing {filteredProviders.length} of {realCounts.total} providers
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#94A3B8' }}>
                    {realCounts.total} active — {NETWORK_SUMMARY.pendingCredentialing} pending — {realCounts.flagged} flagged — {NETWORK_SUMMARY.terminated} terminated
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'pending' && <PendingTab onToast={addToast} />}
        {activeTab === 'top' && <TopTab providers={displayProviders} onView={p => setOpenDrawer(p)} onToast={addToast} />}
        {activeTab === 'review' && <ReviewTab providers={displayProviders} onToast={addToast} />}
        {activeTab === 'terminated' && <TerminatedTab onToast={addToast} />}
      </article>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 z-[100] flex items-center gap-3 px-6" style={{ left: 264, right: 0, height: 52, background: '#1E3A5F', borderTop: '1px solid #2D4A6F', boxShadow: '0 -4px 20px rgba(0,0,0,0.25)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Inter, sans-serif' }}>{selectedIds.size} providers selected</span>
          <div className="flex gap-2 ml-2">
            {[
              { label: 'Email', onClick: () => addToast(`Email sent to ${selectedIds.size} providers`, 'success') },
              { label: 'Message', onClick: () => addToast(`Message sent to ${selectedIds.size} providers`, 'success') },
              { label: 'Export', onClick: () => setShowExport(true) },
              { label: 'Flag', onClick: () => addToast(`${selectedIds.size} providers flagged for review`, 'warning') },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                {btn.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
            <X size={14} color="#fff" />
          </button>
        </div>
      )}

      {/* Drawer */}
      {openDrawer && <ProviderDetailDrawer provider={openDrawer} onClose={() => setOpenDrawer(null)} onToast={addToast} />}

      {/* Credentialing modal */}
      {showCredentialing && <CredentialingModal onClose={() => setShowCredentialing(false)} onToast={addToast} />}

      {/* Export modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onToast={addToast} />}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 400 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: 'Inter, sans-serif' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </InsuranceShell>
  );
};

export default InsuranceNetworkProviders;
