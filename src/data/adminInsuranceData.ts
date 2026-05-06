export type InsurerTier = 'premium' | 'standard';
export type ApiStatus = 'healthy' | 'degraded' | 'down';
export type SlaStatus = 'compliant' | 'breach';
export type FraudRisk = 'HIGH' | 'MEDIUM' | 'LOW';
export type FraudType = 'provider' | 'patient' | 'pattern' | 'duplicate' | 'phantom';

export interface InsurancePlan {
  name: string;
  members: number;
  color: string;
}

export interface AdminInsurer {
  id: string;
  name: string;
  nameAr?: string;
  initials: string;
  avatarGradient: string;
  license: string;
  tier: InsurerTier;
  partnerSince: string;
  membersTotal: number;
  plans: InsurancePlan[];
  claimsToday: number;
  claimsValueToday: number;
  claimsMonthly: number;
  claimsValueMonthly: number;
  autoApprovalRate: number;
  apiStatus: ApiStatus;
  apiResponseMs: number;
  apiBaselineMs: number;
  apiDegradedSince?: string;
  slaStatus: SlaStatus;
  slaBreachesToday: number;
  slaBreachRef?: string;
  fraudAlertsOpen: number;
  fraudHighCount: number;
  fraudMediumCount: number;
  fraudLowCount: number;
  platformRevenueMonth: number;
  denialRate: number;
  appealRate: number;
  avgProcessingHours: number;
  primaryContact?: string;
  technicalContact?: string;
  apiEndpoint?: string;
  contractRenewal?: string;
  isGovernment?: boolean;
  isNew?: boolean;
  borderColor: string;
}

export const adminInsurers: AdminInsurer[] = [
  {
    id: 'daman',
    name: 'Daman National Health Insurance',
    nameAr: 'شركة ضمان للتأمين الصحي الوطني',
    initials: 'D',
    avatarGradient: 'linear-gradient(135deg, #1E3A5F, #2563EB)',
    license: 'CBUAE-INS-2006-001847',
    tier: 'premium',
    partnerSince: 'Jan 2024',
    membersTotal: 8247,
    plans: [
      { name: 'Daman Gold', members: 2847, color: '#F59E0B' },
      { name: 'Daman Silver', members: 3104, color: '#94A3B8' },
      { name: 'Daman Basic', members: 1892, color: '#64748B' },
      { name: 'Thiqa', members: 404, color: '#10B981' },
    ],
    claimsToday: 312,
    claimsValueToday: 1247840,
    claimsMonthly: 4891,
    claimsValueMonthly: 15700000,
    autoApprovalRate: 78.2,
    apiStatus: 'degraded',
    apiResponseMs: 3247,
    apiBaselineMs: 800,
    apiDegradedSince: 'Today 1:20 PM',
    slaStatus: 'breach',
    slaBreachesToday: 1,
    slaBreachRef: 'PA-20260407-00912',
    fraudAlertsOpen: 5,
    fraudHighCount: 2,
    fraudMediumCount: 3,
    fraudLowCount: 0,
    platformRevenueMonth: 92062,
    denialRate: 5.8,
    appealRate: 2.6,
    avgProcessingHours: 4.2,
    primaryContact: 'Mariam Al Khateeb (Claims)',
    technicalContact: 'IT Support — it@daman.ae',
    apiEndpoint: 'api.daman.ae/ceenaix/v2',
    contractRenewal: '31 Dec 2026',
    borderColor: '#F59E0B',
  },
  {
    id: 'axa',
    name: 'AXA Gulf',
    initials: 'A',
    avatarGradient: 'linear-gradient(135deg, #7F1D1D, #DC2626)',
    license: 'CBUAE-INS-2004-000891',
    tier: 'standard',
    partnerSince: 'Mar 2024',
    membersTotal: 6341,
    plans: [
      { name: 'AXA Standard', members: 3891, color: '#2563EB' },
      { name: 'AXA Enhanced', members: 2450, color: '#3B82F6' },
    ],
    claimsToday: 218,
    claimsValueToday: 847200,
    claimsMonthly: 3210,
    claimsValueMonthly: 10500000,
    autoApprovalRate: 82.1,
    apiStatus: 'healthy',
    apiResponseMs: 421,
    apiBaselineMs: 600,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 1,
    fraudHighCount: 0,
    fraudMediumCount: 1,
    fraudLowCount: 0,
    platformRevenueMonth: 61400,
    denialRate: 4.2,
    appealRate: 1.8,
    avgProcessingHours: 3.1,
    primaryContact: 'James Al-Farsi (Claims Manager)',
    technicalContact: 'tech@axa-gulf.ae',
    apiEndpoint: 'api.axa-gulf.ae/ceenaix/v1',
    contractRenewal: '28 Feb 2027',
    borderColor: '#10B981',
  },
  {
    id: 'adnic',
    name: 'ADNIC',
    nameAr: 'شركة أبوظبي الوطنية للتأمين',
    initials: 'AD',
    avatarGradient: 'linear-gradient(135deg, #1E3A5F, #0EA5E9)',
    license: 'CBUAE-INS-2001-000234',
    tier: 'standard',
    partnerSince: 'Jun 2024',
    membersTotal: 4891,
    plans: [
      { name: 'ADNIC Standard', members: 3241, color: '#0EA5E9' },
      { name: 'ADNIC Plus', members: 1650, color: '#38BDF8' },
    ],
    claimsToday: 167,
    claimsValueToday: 621400,
    claimsMonthly: 2640,
    claimsValueMonthly: 7000000,
    autoApprovalRate: 85.4,
    apiStatus: 'healthy',
    apiResponseMs: 378,
    apiBaselineMs: 600,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 0,
    fraudHighCount: 0,
    fraudMediumCount: 0,
    fraudLowCount: 0,
    platformRevenueMonth: 42800,
    denialRate: 3.9,
    appealRate: 1.4,
    avgProcessingHours: 2.8,
    primaryContact: 'Sara Al Hamdan (Operations)',
    technicalContact: 'systems@adnic.ae',
    apiEndpoint: 'api.adnic.ae/ceenaix/v2',
    contractRenewal: '30 Jun 2027',
    borderColor: '#10B981',
  },
  {
    id: 'thiqa',
    name: 'Thiqa (Abu Dhabi Government Healthcare)',
    nameAr: 'ثقة',
    initials: 'T',
    avatarGradient: 'linear-gradient(135deg, #064E3B, #059669)',
    license: 'CBUAE-INS-THIQA-001',
    tier: 'premium',
    partnerSince: 'Jan 2024',
    membersTotal: 3847,
    plans: [
      { name: 'Thiqa (Government)', members: 3847, color: '#10B981' },
    ],
    claimsToday: 89,
    claimsValueToday: 354100,
    claimsMonthly: 1820,
    claimsValueMonthly: 8000000,
    autoApprovalRate: 94.7,
    apiStatus: 'healthy',
    apiResponseMs: 291,
    apiBaselineMs: 500,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 0,
    fraudHighCount: 0,
    fraudMediumCount: 0,
    fraudLowCount: 0,
    platformRevenueMonth: 48200,
    denialRate: 1.2,
    appealRate: 0.5,
    avgProcessingHours: 1.8,
    primaryContact: 'Ahmed Khalifa Al Mansoori',
    technicalContact: 'it-healthcare@abudhabi.ae',
    apiEndpoint: 'api.thiqa.ae/ceenaix/v3',
    contractRenewal: '31 Dec 2026',
    isGovernment: true,
    borderColor: '#10B981',
  },
  {
    id: 'oman',
    name: 'Oman Insurance Company',
    initials: 'O',
    avatarGradient: 'linear-gradient(135deg, #1E293B, #475569)',
    license: 'CBUAE-INS-2003-000612',
    tier: 'standard',
    partnerSince: 'Sep 2024',
    membersTotal: 2847,
    plans: [
      { name: 'OIC Standard', members: 1891, color: '#64748B' },
      { name: 'OIC Gold', members: 956, color: '#F59E0B' },
    ],
    claimsToday: 134,
    claimsValueToday: 421700,
    claimsMonthly: 1580,
    claimsValueMonthly: 4460000,
    autoApprovalRate: 79.3,
    apiStatus: 'healthy',
    apiResponseMs: 612,
    apiBaselineMs: 800,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 0,
    fraudHighCount: 0,
    fraudMediumCount: 0,
    fraudLowCount: 0,
    platformRevenueMonth: 28100,
    denialRate: 5.1,
    appealRate: 2.1,
    avgProcessingHours: 4.8,
    primaryContact: 'Nasser Al-Balushi (Claims)',
    technicalContact: 'tech@omansurance.ae',
    apiEndpoint: 'api.omansurance.ae/ceenaix/v1',
    contractRenewal: '31 Aug 2027',
    borderColor: '#10B981',
  },
  {
    id: 'orient',
    name: 'Orient Insurance',
    initials: 'OR',
    avatarGradient: 'linear-gradient(135deg, #78350F, #D97706)',
    license: 'CBUAE-INS-2000-000184',
    tier: 'standard',
    partnerSince: 'Dec 2024',
    membersTotal: 1647,
    plans: [
      { name: 'Orient Standard', members: 1647, color: '#D97706' },
    ],
    claimsToday: 67,
    claimsValueToday: 214800,
    claimsMonthly: 820,
    claimsValueMonthly: 2064000,
    autoApprovalRate: 76.8,
    apiStatus: 'healthy',
    apiResponseMs: 548,
    apiBaselineMs: 700,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 0,
    fraudHighCount: 0,
    fraudMediumCount: 0,
    fraudLowCount: 0,
    platformRevenueMonth: 14200,
    denialRate: 6.2,
    appealRate: 2.9,
    avgProcessingHours: 5.2,
    primaryContact: 'Layla Hassan (Operations)',
    technicalContact: 'tech@orientins.ae',
    apiEndpoint: 'api.orientins.ae/ceenaix/v1',
    contractRenewal: '30 Nov 2026',
    borderColor: '#10B981',
  },
  {
    id: 'gig',
    name: 'GIG Gulf',
    initials: 'G',
    avatarGradient: 'linear-gradient(135deg, #312E81, #6366F1)',
    license: 'CBUAE-INS-2005-000743',
    tier: 'standard',
    partnerSince: 'Feb 2025',
    membersTotal: 1241,
    plans: [
      { name: 'GIG Standard', members: 891, color: '#6366F1' },
      { name: 'GIG Premium', members: 350, color: '#818CF8' },
    ],
    claimsToday: 45,
    claimsValueToday: 147800,
    claimsMonthly: 612,
    claimsValueMonthly: 1562000,
    autoApprovalRate: 73.4,
    apiStatus: 'healthy',
    apiResponseMs: 714,
    apiBaselineMs: 800,
    slaStatus: 'compliant',
    slaBreachesToday: 0,
    fraudAlertsOpen: 1,
    fraudHighCount: 0,
    fraudMediumCount: 0,
    fraudLowCount: 1,
    platformRevenueMonth: 9800,
    denialRate: 7.1,
    appealRate: 3.2,
    avgProcessingHours: 5.8,
    primaryContact: 'Omar Al-Qassim (Claims)',
    technicalContact: 'tech@gig.ae',
    apiEndpoint: 'api.gig.ae/ceenaix/v1',
    contractRenewal: '31 Jan 2027',
    isNew: true,
    borderColor: '#10B981',
  },
];

export interface FraudAlert {
  id: string;
  insurerId: string;
  insurerName: string;
  risk: FraudRisk;
  type: FraudType;
  confidence: number;
  subject: string;
  subjectDetail: string;
  description: string;
  amountAtRisk: number;
  claimsFrozen: number;
  flaggedAt: string;
  status: 'new' | 'reviewing' | 'reported' | 'resolved';
  aiAnalysis: string;
}

export const fraudAlerts: FraudAlert[] = [
  {
    id: 'f1',
    insurerId: 'daman',
    insurerName: 'Daman',
    risk: 'HIGH',
    type: 'provider',
    confidence: 94,
    subject: 'Dr. Khalid Ibrahim — Unnamed Clinic',
    subjectDetail: 'DHA unverified provider',
    description: '340 consultations billed in 15 days. Average 22.7/day — physically impossible. All billed under consultation code 99213. No NABIDH records found for any of these patients.',
    amountAtRisk: 136000,
    claimsFrozen: 47,
    flaggedAt: 'Today 12:30 PM',
    status: 'reviewing',
    aiAnalysis: 'Pattern matches known billing fraud type 3 (ghost consultations). Cross-referencing with NABIDH HIE shows 0% of these patients have any health records. Confidence: 94%.',
  },
  {
    id: 'f2',
    insurerId: 'daman',
    insurerName: 'Daman',
    risk: 'HIGH',
    type: 'duplicate',
    confidence: 89,
    subject: 'Patient PT-089241',
    subjectDetail: 'Duplicate procedures across multiple providers',
    description: 'Procedure code B1245 billed 5 times within 7 days across different doctors and clinics. Medically implausible for a single patient. Cross-provider pattern detected by AI.',
    amountAtRisk: 28500,
    claimsFrozen: 5,
    flaggedAt: 'Today 11:15 AM',
    status: 'new',
    aiAnalysis: 'Classic duplicate billing pattern across facilities. No clinical justification for same procedure 5 times in 7 days. Recommend immediate freeze and investigation.',
  },
  {
    id: 'f3',
    insurerId: 'daman',
    insurerName: 'Daman',
    risk: 'MEDIUM',
    type: 'provider',
    confidence: 76,
    subject: 'Dr. Rashida Yousuf — Gulf Medical Center',
    subjectDetail: 'Billing anomaly — new patient code misuse',
    description: '14 of 20 consultations in the same week billed as "New Patient" (code 99202) for patients with existing records. Inflates claim value by 40% over repeat visit codes.',
    amountAtRisk: 5600,
    claimsFrozen: 0,
    flaggedAt: 'Today 9:30 AM',
    status: 'new',
    aiAnalysis: 'Statistical analysis shows 70% new-patient rate vs. 12% platform average for this clinic. Likely upcoding. Review recommended before suspension.',
  },
  {
    id: 'f4',
    insurerId: 'daman',
    insurerName: 'Daman',
    risk: 'MEDIUM',
    type: 'pattern',
    confidence: 71,
    subject: '3 providers — Daman network',
    subjectDetail: 'Consistent upcoding pattern',
    description: 'Three unrelated providers consistently billing 99215 (complex consultation) instead of 99213 (standard). Statistical anomaly — all three joined platform within 3 months.',
    amountAtRisk: 18400,
    claimsFrozen: 0,
    flaggedAt: 'Yesterday 4:00 PM',
    status: 'reviewing',
    aiAnalysis: 'Coordinated upcoding pattern across 3 providers is unusual. May indicate shared billing advisor or coordinated fraud ring. Cross-insurer check recommended.',
  },
  {
    id: 'f5',
    insurerId: 'axa',
    insurerName: 'AXA',
    risk: 'MEDIUM',
    type: 'phantom',
    confidence: 68,
    subject: 'Al Reef Pharmacy — Abu Dhabi',
    subjectDetail: 'Pharmacy claims without dispensing records',
    description: 'Pharmacy claims submitted for prescriptions with no corresponding dispensing records in NABIDH. Lab orders do not match prescription claims. 18 claims over 14 days.',
    amountAtRisk: 7200,
    claimsFrozen: 0,
    flaggedAt: 'Yesterday 2:15 PM',
    status: 'new',
    aiAnalysis: 'NABIDH record gap analysis shows prescription claims with no electronic dispensing confirmation. Possible phantom billing. Requires pharmacy inspection.',
  },
  {
    id: 'f6',
    insurerId: 'daman',
    insurerName: 'Daman',
    risk: 'MEDIUM',
    type: 'pattern',
    confidence: 65,
    subject: 'Unknown provider — Daman network',
    subjectDetail: 'After-hours billing anomaly',
    description: 'All 34 claims from this provider submitted between 11 PM and 1 AM. Outside normal operating hours for any clinic. Automated batch submission pattern detected.',
    amountAtRisk: 11800,
    claimsFrozen: 0,
    flaggedAt: '6 Apr 2026',
    status: 'new',
    aiAnalysis: 'Time-stamp analysis shows 100% of claims outside clinic hours. Combined with batch submission pattern — highly unusual. May indicate after-hours fraudulent billing.',
  },
  {
    id: 'f7',
    insurerId: 'gig',
    insurerName: 'GIG Gulf',
    risk: 'LOW',
    type: 'provider',
    confidence: 52,
    subject: 'Dr. Yousuf Al-Qahtani — GIG network',
    subjectDetail: 'Above-average claim values',
    description: 'Single provider with claim values 2.3× above network average. May reflect specialist services but warrants review. No duplicates detected.',
    amountAtRisk: 3400,
    claimsFrozen: 0,
    flaggedAt: '5 Apr 2026',
    status: 'new',
    aiAnalysis: 'Low confidence flag — could be genuine specialist billing. Recommend manual review before any action. 52% confidence does not meet threshold for freeze.',
  },
];

export const insuranceClaimsBreakdown = [
  { type: 'Consultations', value: 557, pct: 54, color: '#0D9488' },
  { type: 'Lab & Imaging', value: 227, pct: 22, color: '#2563EB' },
  { type: 'Pharmacy', value: 155, pct: 15, color: '#7C3AED' },
  { type: 'Emergency', value: 52, pct: 5, color: '#F59E0B' },
  { type: 'Other', value: 41, pct: 4, color: '#475569' },
];

export const claimsTrendWeekly = [
  { day: 'Mon', claims: 887 },
  { day: 'Tue', claims: 942 },
  { day: 'Wed', claims: 1032 },
  { day: 'Thu', claims: 998 },
  { day: 'Fri', claims: 876 },
  { day: 'Sat', claims: 654 },
  { day: 'Sun', claims: 421 },
];

export const monthlyStackedClaims = [
  { month: 'Jan', daman: 14200000, axa: 9800000, adnic: 6400000, thiqa: 7200000, oman: 4100000, orient: 1900000, gig: 1400000 },
  { month: 'Feb', daman: 13800000, axa: 10200000, adnic: 6800000, thiqa: 7800000, oman: 4400000, orient: 2100000, gig: 1500000 },
  { month: 'Mar', daman: 15200000, axa: 10800000, adnic: 7200000, thiqa: 8100000, oman: 4600000, orient: 2200000, gig: 1600000 },
  { month: 'Apr', daman: 3900000, axa: 2600000, adnic: 1800000, thiqa: 2000000, oman: 1100000, orient: 540000, gig: 400000 },
];

export const revenueData = [
  { month: 'Jan', daman: 88200, axa: 58100, adnic: 40300, thiqa: 45800, oman: 26400, orient: 13100, gig: 9200 },
  { month: 'Feb', daman: 89400, axa: 59200, adnic: 41200, thiqa: 46500, oman: 27100, orient: 13600, gig: 9400 },
  { month: 'Mar', daman: 91300, axa: 60800, adnic: 42100, thiqa: 47800, oman: 27800, orient: 14000, gig: 9700 },
  { month: 'Apr', daman: 92062, axa: 61400, adnic: 42800, thiqa: 48200, oman: 28100, orient: 14200, gig: 9800 },
];

export const slaComplianceData = [
  { insurer: 'Daman', compliance: 99.7, color: '#F59E0B' },
  { insurer: 'AXA', compliance: 100, color: '#10B981' },
  { insurer: 'ADNIC', compliance: 100, color: '#10B981' },
  { insurer: 'Thiqa', compliance: 100, color: '#10B981' },
  { insurer: 'Oman', compliance: 100, color: '#10B981' },
  { insurer: 'Orient', compliance: 100, color: '#10B981' },
  { insurer: 'GIG', compliance: 100, color: '#10B981' },
];

export const autoApprovalTrendData = [
  { month: 'Jan', daman: 76.4, axa: 80.2, adnic: 83.1, thiqa: 93.8, oman: 77.9, orient: 75.2, gig: 71.8 },
  { month: 'Feb', daman: 77.1, axa: 81.0, adnic: 84.2, thiqa: 94.1, oman: 78.4, orient: 76.0, gig: 72.3 },
  { month: 'Mar', daman: 77.8, axa: 81.8, adnic: 84.9, thiqa: 94.5, oman: 79.0, orient: 76.5, gig: 72.9 },
  { month: 'Apr', daman: 78.2, axa: 82.1, adnic: 85.4, thiqa: 94.7, oman: 79.3, orient: 76.8, gig: 73.4 },
];

export const apiSparklineData = {
  daman: [
    { t: '-60m', ms: 412 }, { t: '-50m', ms: 398 }, { t: '-40m', ms: 421 }, { t: '-30m', ms: 390 },
    { t: '-20m', ms: 1847 }, { t: '-10m', ms: 2941 }, { t: 'now', ms: 3247 },
  ],
  axa: [
    { t: '-60m', ms: 438 }, { t: '-50m', ms: 412 }, { t: '-40m', ms: 425 }, { t: '-30m', ms: 418 },
    { t: '-20m', ms: 407 }, { t: '-10m', ms: 421 }, { t: 'now', ms: 421 },
  ],
  adnic: [
    { t: '-60m', ms: 394 }, { t: '-50m', ms: 381 }, { t: '-40m', ms: 372 }, { t: '-30m', ms: 388 },
    { t: '-20m', ms: 375 }, { t: '-10m', ms: 382 }, { t: 'now', ms: 378 },
  ],
  thiqa: [
    { t: '-60m', ms: 302 }, { t: '-50m', ms: 295 }, { t: '-40m', ms: 288 }, { t: '-30m', ms: 294 },
    { t: '-20m', ms: 287 }, { t: '-10m', ms: 291 }, { t: 'now', ms: 291 },
  ],
  oman: [
    { t: '-60m', ms: 628 }, { t: '-50m', ms: 614 }, { t: '-40m', ms: 607 }, { t: '-30m', ms: 619 },
    { t: '-20m', ms: 608 }, { t: '-10m', ms: 612 }, { t: 'now', ms: 612 },
  ],
  orient: [
    { t: '-60m', ms: 561 }, { t: '-50m', ms: 542 }, { t: '-40m', ms: 551 }, { t: '-30m', ms: 548 },
    { t: '-20m', ms: 544 }, { t: '-10m', ms: 548 }, { t: 'now', ms: 548 },
  ],
  gig: [
    { t: '-60m', ms: 728 }, { t: '-50m', ms: 712 }, { t: '-40m', ms: 718 }, { t: '-30m', ms: 721 },
    { t: '-20m', ms: 709 }, { t: '-10m', ms: 714 }, { t: 'now', ms: 714 },
  ],
};

export const webhookLog = [
  { time: '2:07 PM', event: 'Claim approved', insurer: 'Daman', status: '200', ok: true },
  { time: '2:06 PM', event: 'Pre-auth response', insurer: 'AXA', status: '200', ok: true },
  { time: '2:05 PM', event: 'Eligibility check', insurer: 'ADNIC', status: '200', ok: true },
  { time: '2:03 PM', event: 'Member sync', insurer: 'Thiqa', status: '200', ok: true },
  { time: '2:01 PM', event: 'Claim approved', insurer: 'Oman', status: '200', ok: true },
  { time: '1:59 PM', event: 'Pre-auth response', insurer: 'Orient', status: '200', ok: true },
  { time: '1:57 PM', event: 'Eligibility check', insurer: 'GIG', status: '200', ok: true },
  { time: '1:52 PM', event: 'Pre-auth response', insurer: 'Daman', status: '3.2s', ok: false },
  { time: '1:48 PM', event: 'Claim denied', insurer: 'Daman', status: '3.1s', ok: false },
  { time: '1:40 PM', event: 'Claim approved', insurer: 'AXA', status: '200', ok: true },
];

export const PLATFORM_TOTALS = {
  totalInsurers: 7,
  premiumPartners: 2,
  standardPartners: 5,
  totalMembers: 29061,
  claimsToday: 1032,
  claimsValueToday: 3854840,
  claimsValueMonthly: 9900000,
  platformRevenueMonth: 296562,
  fraudAlertsOpen: 7,
  fraudHigh: 2,
  fraudMedium: 4,
  fraudLow: 1,
  apiIssues: 1,
  slaBreachesToday: 1,
};
