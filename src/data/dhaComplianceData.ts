// DHA Compliance mock data for CeenAiX Super Admin portal
// Covers all DHA programs: Sheryan, NABIDH, Tatmeen, Shafafiya, MOHAP Formulary, Path B, Patient Rights, Inspections, Policies, Training

export type ComplianceStatus = 'Compliant' | 'Action required' | 'At risk' | 'Non-compliant';
export type LicenseStatus = 'Active' | 'Expiring' | 'Expired' | 'Suspended' | 'Under review';
export type FindingSeverity = 'Critical' | 'Major' | 'Minor' | 'Observation';
export type CapaStatus = 'Draft' | 'Submitted to DHA' | 'Under review' | 'Accepted' | 'In progress' | 'Verification' | 'Closed' | 'Reopened';
export type ProgramKey = 'Sheryan' | 'NABIDH' | 'Tatmeen' | 'Shafafiya' | 'Formulary' | 'PathB' | 'PatientRights' | 'Quality' | 'DataProtection';

export interface FacilityLicense {
  licenseNumber: string;
  facilityName: string;
  activityScope: string;
  status: LicenseStatus;
  validFrom: string;
  validTo: string;
  issuedBy: string;
  licenseType: string;
  dedLicenseNumber: string;
  ownerOnRecord: string;
  conditions: string[];
  renewalDue: number; // days
}

export interface ProfessionalLicense {
  id: string;
  name: string;
  role: string;
  licenseNumber: string;
  specialty: string;
  subSpecialty: string;
  emirate: string;
  status: LicenseStatus;
  validUntil: string;
  linkedUser: string;
  linkedFacility: string;
  lastVerified: string;
}

export interface InspectionFinding {
  id: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  regulatoryRef: string;
  capaRequired: boolean;
  capaStatus?: CapaStatus;
  owner?: string;
  dueDate?: string;
  daysRemaining?: number;
}

export interface Inspection {
  id: string;
  type: 'Routine' | 'Re-inspection' | 'Surprise' | 'Themed' | 'Pre-licensing';
  date: string;
  inspectors: string[];
  scope: string;
  outcome: 'Pass' | 'Conditional' | 'Fail' | 'Pending';
  findings: InspectionFinding[];
  status: 'Completed' | 'Ongoing' | 'Scheduled';
}

export interface Policy {
  id: string;
  category: string;
  name: string;
  version: string;
  effectiveDate: string;
  nextReviewDue: string;
  owner: string;
  approver: string;
  acknowledgementCoverage: number; // %
  status: 'Current' | 'In review' | 'Overdue review' | 'Draft';
  languages: string[];
}

export interface TrainingModule {
  id: string;
  name: string;
  applicableRoles: string[];
  completionRate: number; // %
  overdueCount: number;
  expiryMonths: number;
  lastUpdated: string;
}

export interface DhaReport {
  id: string;
  name: string;
  description: string;
  frequency: string;
  lastGenerated: string;
  nextScheduled: string;
  recipients: string[];
  submitToDHA: boolean;
  lastFilingRef?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  program: ProgramKey;
  category: 'Renewal' | 'Expiring credential' | 'Open finding' | 'CAPA task' | 'Pending approval' | 'Required submission' | 'Document re-attestation' | 'Training overdue';
  dueDate: string;
  daysRemaining: number;
  owner: string;
  status: 'Open' | 'In progress' | 'Blocked' | 'Overdue';
  priority: FindingSeverity;
}

export interface DhaAnnouncement {
  id: string;
  title: string;
  publishedDate: string;
  deadline?: string;
  affectedPrograms: ProgramKey[];
  acknowledged: boolean;
  url?: string;
}

// ─── Facility License ─────────────────────────────────────────────────────────
export const FACILITY_LICENSE: FacilityLicense = {
  licenseNumber: 'DHA-F-0012847',
  facilityName: 'CeenAiX Health Technology Services LLC',
  activityScope: 'Health Information Technology · Telemedicine Platform · Clinical Decision Support',
  status: 'Active',
  validFrom: '2024-05-01',
  validTo: '2026-04-30',
  issuedBy: 'Dubai Health Authority',
  licenseType: 'Health Information Technology',
  dedLicenseNumber: 'CN-3824190',
  ownerOnRecord: 'Dr. Tariq Al-Mansouri',
  conditions: [
    'Platform shall comply with DHA NABIDH standards at all times',
    'Telemedicine services require valid DHA Path B approval before patient activation',
    'Pharmacy modules require active Tatmeen connectivity for dispensing flows',
    'Annual DHA compliance report to be submitted by May 30 each year',
  ],
  renewalDue: 362,
};

// ─── Professional Licenses ────────────────────────────────────────────────────
export const PROFESSIONAL_LICENSES: ProfessionalLicense[] = [
  { id: 'PL-001', name: 'Dr. Amira Hassan', role: 'Doctor', licenseNumber: 'DHA-P-2841920', specialty: 'Internal Medicine', subSpecialty: 'Cardiology', emirate: 'Dubai', status: 'Active', validUntil: '2026-12-31', linkedUser: 'USR-DOC-0842', linkedFacility: 'Aster DM Healthcare', lastVerified: '2026-05-04' },
  { id: 'PL-002', name: 'Dr. Khalid Mansoor', role: 'Doctor', licenseNumber: 'DHA-P-1924810', specialty: 'General Practice', subSpecialty: '', emirate: 'Dubai', status: 'Active', validUntil: '2026-08-15', linkedUser: 'USR-DOC-0412', linkedFacility: 'Al Zahra Hospital', lastVerified: '2026-05-04' },
  { id: 'PL-003', name: 'Fatima Al-Zaabi', role: 'Pharmacist', licenseNumber: 'DHA-P-3710482', specialty: 'Clinical Pharmacy', subSpecialty: '', emirate: 'Dubai', status: 'Expiring', validUntil: '2026-07-01', linkedUser: 'USR-PHM-0234', linkedFacility: 'Mediclinic City Hospital', lastVerified: '2026-05-03' },
  { id: 'PL-004', name: 'Dr. Nour Khalifa', role: 'Doctor', licenseNumber: 'DHA-P-4821034', specialty: 'Emergency Medicine', subSpecialty: '', emirate: 'Dubai', status: 'Active', validUntil: '2027-01-20', linkedUser: 'USR-DOC-0512', linkedFacility: 'Aster DM Healthcare', lastVerified: '2026-05-04' },
  { id: 'PL-005', name: 'Ahmad Al-Rashidi', role: 'Radiographer', licenseNumber: 'DHA-P-5932814', specialty: 'Diagnostic Radiology', subSpecialty: 'MRI', emirate: 'Dubai', status: 'Active', validUntil: '2026-11-30', linkedUser: 'USR-RAD-0091', linkedFacility: 'Cleveland Clinic Abu Dhabi', lastVerified: '2026-05-02' },
  { id: 'PL-006', name: 'Sara Al-Naqbi', role: 'Nurse', licenseNumber: 'DHA-P-6041928', specialty: 'Critical Care', subSpecialty: 'ICU', emirate: 'Dubai', status: 'Expiring', validUntil: '2026-06-15', linkedUser: 'USR-NRS-0182', linkedFacility: 'NMC Royal Hospital', lastVerified: '2026-05-01' },
  { id: 'PL-007', name: 'Dr. Yasir Arafat', role: 'Doctor', licenseNumber: 'DHA-P-7248193', specialty: 'Psychiatry', subSpecialty: '', emirate: 'Dubai', status: 'Suspended', validUntil: '2025-12-31', linkedUser: 'USR-DOC-0718', linkedFacility: 'Emirates Hospital', lastVerified: '2026-05-04' },
  { id: 'PL-008', name: 'Layla Hassan', role: 'Lab Tech', licenseNumber: 'DHA-P-8314029', specialty: 'Clinical Laboratory', subSpecialty: 'Microbiology', emirate: 'Dubai', status: 'Active', validUntil: '2027-03-10', linkedUser: 'USR-LAB-0044', linkedFacility: 'Mediclinic City Hospital', lastVerified: '2026-05-04' },
];

// ─── Tatmeen data ─────────────────────────────────────────────────────────────
export const TATMEEN_STATUS = {
  connected: true,
  certExpiry: '2026-08-12',
  certDaysRemaining: 99,
  lastSubmission: '2026-05-04T07:58:00+04:00',
  volume24h: 8420,
  successRate24h: 99.2,
  eventTypes: [
    { type: 'Receiving', count: 3200, successRate: 99.8, avgLatencyMs: 420 },
    { type: 'Dispensing', count: 2890, successRate: 98.9, avgLatencyMs: 510 },
    { type: 'Dispatch', count: 1440, successRate: 99.4, avgLatencyMs: 380 },
    { type: 'Returns', count: 620, successRate: 99.1, avgLatencyMs: 440 },
    { type: 'Destruction', count: 210, successRate: 100, avgLatencyMs: 320 },
    { type: 'Aggregation', count: 60, successRate: 98.3, avgLatencyMs: 580 },
  ],
  gs1Coverage: 97.4,
  pharmacies: [
    { id: 'PH-001', name: 'Mediclinic City Hospital Pharmacy', tatmeenId: 'TAT-P-0024810', submissions24h: 2840, successRate: 99.3 },
    { id: 'PH-002', name: 'Al Zahra Hospital Pharmacy', tatmeenId: 'TAT-P-0031492', submissions24h: 1920, successRate: 98.8 },
    { id: 'PH-003', name: 'NMC Royal Pharmacy', tatmeenId: 'TAT-P-0041928', submissions24h: 1480, successRate: 99.6 },
    { id: 'PH-004', name: 'Aster DM Pharmacy', tatmeenId: 'TAT-P-0058312', submissions24h: 2180, successRate: 99.1 },
  ],
};

// ─── Shafafiya / eClaim ───────────────────────────────────────────────────────
export const SHAFAFIYA_STATUS = {
  connected: true,
  certExpiry: '2026-09-20',
  volume24h: 4820,
  successRate24h: 97.8,
  avgTurnaroundDays: 2.4,
  payers: [
    { name: 'Dubai Islamic Insurance', submitted: 1240, accepted: 1218, rejected: 22, acceptanceRate: 98.2, avgPaymentDays: 18 },
    { name: 'AXA Gulf', submitted: 980, accepted: 942, rejected: 38, acceptanceRate: 96.1, avgPaymentDays: 22 },
    { name: 'DAMAN', submitted: 1480, accepted: 1451, rejected: 29, acceptanceRate: 98.0, avgPaymentDays: 15 },
    { name: 'Oman Insurance', submitted: 620, accepted: 592, rejected: 28, acceptanceRate: 95.5, avgPaymentDays: 28 },
  ],
  topRejectionReasons: [
    { reason: 'Invalid ICD-10 code', count: 42, pct: 35.9 },
    { reason: 'Missing pre-authorization', count: 28, pct: 23.9 },
    { reason: 'Policy not active', count: 22, pct: 18.8 },
    { reason: 'Duplicate claim', count: 15, pct: 12.8 },
    { reason: 'Other', count: 10, pct: 8.5 },
  ],
  codingComplianceRate: 94.2,
};

// ─── MOHAP Drug Formulary ──────────────────────────────────────────────────────
export const FORMULARY_STATUS = {
  activeVersion: 'MOHAP-2026-Q1',
  lastSync: '2026-05-03T02:00:00+04:00',
  source: 'MOHAP API',
  totalDrugs: 8420,
  mappedDrugs: 8114,
  coverageRate: 96.4,
  unmappedCount: 306,
  offFormularyPrescriptions: 48,
  controlledSubstanceQuota: {
    used: 68,
    limit: 100,
    unit: 'daily_avg_prescriptions',
  },
  diff: {
    added: 12,
    removed: 3,
    changed: 28,
    asOf: '2026-04-01',
  },
};

// ─── DHA Path B ───────────────────────────────────────────────────────────────
export const PATH_B_STATUS = {
  status: 'Approved' as 'Not started' | 'Submitted' | 'Under review' | 'Approved' | 'Conditionally approved' | 'Rejected',
  referenceNumber: 'DHA-PATHB-2024-00842',
  submittedDate: '2024-01-15',
  approvalDate: '2024-04-22',
  validUntil: '2026-04-21',
  daysRemaining: 352,
  conditions: [
    'Synchronous video consultations only for primary care; specialist video requires referral from DHA-licensed GP',
    'Prescriptions via telehealth must be co-signed by DHA-licensed prescriber available in UAE',
    'Patient must be located within UAE at time of consultation',
    'Technical failure rate must remain below 2% per rolling 7-day period',
  ],
  approvedModalities: ['Synchronous video', 'Asynchronous messaging', 'Remote monitoring'],
  approvedSpecialties: ['General Practice', 'Internal Medicine', 'Dermatology', 'Psychiatry', 'Physiotherapy'],
  qualityMetrics: {
    consultationCompletionRate: 96.8,
    technicalFailureRate: 0.8,
    followUpAdherence: 82.4,
    patientSatisfaction: 4.6,
  },
};

// ─── Patient Rights & Consent ─────────────────────────────────────────────────
export const PATIENT_RIGHTS_STATUS = {
  charterVersion: 'v2.3',
  charterEffectiveDate: '2026-01-01',
  charterViewedRate: 84.2,
  charterAcknowledgedRate: 71.8,
  languages: ['en', 'ar', 'fa'],
  consentTypes: [
    { type: 'NABIDH sharing (general)', coverage: 91.2, recentWithdrawals: 14 },
    { type: 'NABIDH sharing (sensitive)', coverage: 78.4, recentWithdrawals: 22 },
    { type: 'Telehealth services', coverage: 88.6, recentWithdrawals: 8 },
    { type: 'Marketing communications', coverage: 44.1, recentWithdrawals: 180 },
    { type: 'Research participation', coverage: 22.8, recentWithdrawals: 12 },
    { type: 'AI-assisted clinical features', coverage: 76.3, recentWithdrawals: 31 },
    { type: 'Third-party app sharing (SMART)', coverage: 18.4, recentWithdrawals: 6 },
  ],
  accessRequests: {
    open: 8,
    inProgress: 14,
    overdueSla: 2,
    closedLast30d: 84,
  },
  complaints: {
    open: 5,
    resolved30d: 32,
    pendingDhaReport: 1,
  },
};

// ─── Compliance Heatmap ───────────────────────────────────────────────────────
export const HEATMAP_MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
type HeatStatus = 'green' | 'amber' | 'red' | 'grey';
export const HEATMAP_DATA: Record<ProgramKey, HeatStatus[]> = {
  Sheryan: ['green','green','green','green','green','green','green','green','green','green','green','green'],
  NABIDH:  ['green','green','amber','green','green','green','red','amber','green','green','green','amber'],
  Tatmeen: ['green','green','green','green','green','amber','green','green','green','green','green','green'],
  Shafafiya:['green','green','green','amber','green','green','green','green','green','amber','green','green'],
  Formulary:['green','green','green','green','green','green','amber','green','green','green','green','green'],
  PathB:   ['green','green','green','green','green','green','green','green','green','green','green','green'],
  PatientRights:['green','green','amber','green','green','green','green','green','amber','green','green','green'],
  Quality: ['green','green','green','green','amber','green','green','green','green','green','green','green'],
  DataProtection:['green','green','green','green','green','green','green','green','green','green','amber','green'],
};

// ─── Action queue ─────────────────────────────────────────────────────────────
export const ACTION_ITEMS: ActionItem[] = [
  { id: 'ACT-001', title: 'Renew DHA Path B approval — expires 2026-04-21', program: 'PathB', category: 'Renewal', dueDate: '2026-03-22', daysRemaining: 352, owner: 'Dr. Tariq Al-Mansouri', status: 'Open', priority: 'Minor' },
  { id: 'ACT-002', title: 'Renew DHA professional license — Sara Al-Naqbi expires 2026-06-15', program: 'Sheryan', category: 'Expiring credential', dueDate: '2026-05-16', daysRemaining: 12, owner: 'Sara Al-Naqbi', status: 'In progress', priority: 'Major' },
  { id: 'ACT-003', title: 'Renew DHA professional license — Fatima Al-Zaabi expires 2026-07-01', program: 'Sheryan', category: 'Expiring credential', dueDate: '2026-06-01', daysRemaining: 28, owner: 'Fatima Al-Zaabi', status: 'Open', priority: 'Major' },
  { id: 'ACT-004', title: 'Resolve NABIDH certificate warning — 39 days to expiry', program: 'NABIDH', category: 'Expiring credential', dueDate: '2026-05-14', daysRemaining: 10, owner: 'Dr. Tariq Al-Mansouri', status: 'In progress', priority: 'Critical' },
  { id: 'ACT-005', title: 'Map 306 unmapped drug catalog entries to MOHAP formulary', program: 'Formulary', category: 'Document re-attestation', dueDate: '2026-05-20', daysRemaining: 16, owner: 'Fatima Al-Zaabi', status: 'Open', priority: 'Major' },
  { id: 'ACT-006', title: 'Close overdue patient access request x2 (SLA breach)', program: 'PatientRights', category: 'Required submission', dueDate: '2026-05-02', daysRemaining: -2, owner: 'Sara Al-Naqbi', status: 'Overdue', priority: 'Critical' },
  { id: 'ACT-007', title: 'CAPA: Bulk PHI export attempt — root cause + corrective actions', program: 'DataProtection', category: 'CAPA task', dueDate: '2026-05-18', daysRemaining: 14, owner: 'Dr. Tariq Al-Mansouri', status: 'In progress', priority: 'Critical' },
  { id: 'ACT-008', title: 'Acknowledge DHA Circular 2026-14: updated NABIDH consent framework', program: 'NABIDH', category: 'Pending approval', dueDate: '2026-05-10', daysRemaining: 6, owner: 'Dr. Tariq Al-Mansouri', status: 'Open', priority: 'Major' },
  { id: 'ACT-009', title: 'Submit DHA Annual Compliance Report 2025–2026', program: 'Sheryan', category: 'Required submission', dueDate: '2026-05-30', daysRemaining: 26, owner: 'Dr. Tariq Al-Mansouri', status: 'Open', priority: 'Major' },
  { id: 'ACT-010', title: 'Pharmacist Tatmeen recertification training overdue — 4 staff', program: 'Tatmeen', category: 'Training overdue', dueDate: '2026-05-08', daysRemaining: 4, owner: 'Fatima Al-Zaabi', status: 'Open', priority: 'Minor' },
  { id: 'ACT-011', title: 'Reinstate or terminate suspended Dr. Yasir Arafat DHA license', program: 'Sheryan', category: 'Open finding', dueDate: '2026-05-07', daysRemaining: 3, owner: 'Dr. Tariq Al-Mansouri', status: 'In progress', priority: 'Critical' },
];

// ─── Inspections ──────────────────────────────────────────────────────────────
export const INSPECTIONS: Inspection[] = [
  {
    id: 'INS-001',
    type: 'Routine',
    date: '2026-02-18',
    inspectors: ['Dr. Mariam Al-Suwaidi (DHA)', 'Eng. Rashid Al-Mansoori (DHA IT)'],
    scope: 'Full platform compliance: NABIDH, Tatmeen, patient rights, data security',
    outcome: 'Conditional',
    status: 'Completed',
    findings: [
      { id: 'FND-001', severity: 'Major', category: 'Data Security', description: 'Bulk PHI export controls insufficient — no rate limit enforced at time of inspection', regulatoryRef: 'DHA Policy 2.4.8: PHI Access Controls', capaRequired: true, capaStatus: 'In progress', owner: 'Dr. Tariq Al-Mansouri', dueDate: '2026-05-18', daysRemaining: 14 },
      { id: 'FND-002', severity: 'Minor', category: 'NABIDH', description: 'NABIDH certificate renewal process not formally documented in operations manual', regulatoryRef: 'NABIDH Technical Guide §7.2', capaRequired: true, capaStatus: 'Accepted', owner: 'Sara Al-Naqbi', dueDate: '2026-05-25', daysRemaining: 21 },
      { id: 'FND-003', severity: 'Observation', category: 'Training', description: 'PHI security training records not centralized — staff training tracked across multiple systems', regulatoryRef: 'DHA Staff Training Framework §3.1', capaRequired: false },
    ],
  },
  {
    id: 'INS-002',
    type: 'Themed',
    date: '2025-09-04',
    inspectors: ['Dr. Khaled Al-Hashimi (DHA)'],
    scope: 'Telemedicine (Path B) compliance review',
    outcome: 'Pass',
    status: 'Completed',
    findings: [
      { id: 'FND-004', severity: 'Observation', category: 'DHA Path B', description: 'Patient geography verification at consultation start is manual — recommend automated check', regulatoryRef: 'DHA Path B Guide §4.2', capaRequired: false },
    ],
  },
  {
    id: 'INS-003',
    type: 'Routine',
    date: '2026-07-14',
    inspectors: [],
    scope: 'Full annual inspection (scheduled)',
    outcome: 'Pending',
    status: 'Scheduled',
    findings: [],
  },
];

// ─── Policies ─────────────────────────────────────────────────────────────────
export const POLICIES: Policy[] = [
  { id: 'POL-001', category: 'Information Security', name: 'PHI Handling & Access Control Policy', version: 'v3.2', effectiveDate: '2026-01-01', nextReviewDue: '2027-01-01', owner: 'Dr. Tariq Al-Mansouri', approver: 'Legal & Compliance Team', acknowledgementCoverage: 94, status: 'Current', languages: ['en', 'ar'] },
  { id: 'POL-002', category: 'Patient Rights', name: 'Patient Rights Charter & Consent Policy', version: 'v2.3', effectiveDate: '2026-01-01', nextReviewDue: '2026-07-01', owner: 'Sara Al-Naqbi', approver: 'Dr. Tariq Al-Mansouri', acknowledgementCoverage: 71, status: 'Current', languages: ['en', 'ar', 'fa'] },
  { id: 'POL-003', category: 'Telemedicine', name: 'DHA Path B Telehealth Operations Policy', version: 'v1.4', effectiveDate: '2024-05-01', nextReviewDue: '2026-05-01', owner: 'Dr. Tariq Al-Mansouri', approver: 'Legal & Compliance Team', acknowledgementCoverage: 88, status: 'Overdue review', languages: ['en', 'ar'] },
  { id: 'POL-004', category: 'Pharmacy', name: 'Tatmeen Pharmaceutical Track & Trace Policy', version: 'v2.1', effectiveDate: '2025-07-01', nextReviewDue: '2026-07-01', owner: 'Fatima Al-Zaabi', approver: 'Dr. Tariq Al-Mansouri', acknowledgementCoverage: 96, status: 'Current', languages: ['en', 'ar'] },
  { id: 'POL-005', category: 'AI Clinical Use', name: 'AI Clinical Recommendation Safety Policy', version: 'v1.0', effectiveDate: '2025-12-01', nextReviewDue: '2026-12-01', owner: 'Dr. Tariq Al-Mansouri', approver: 'Legal & Compliance Team', acknowledgementCoverage: 82, status: 'Current', languages: ['en'] },
  { id: 'POL-006', category: 'Data Residency', name: 'UAE Data Residency & Sovereignty Policy', version: 'v1.2', effectiveDate: '2025-03-01', nextReviewDue: '2026-03-01', owner: 'Dr. Tariq Al-Mansouri', approver: 'Legal & Compliance Team', acknowledgementCoverage: 91, status: 'Overdue review', languages: ['en', 'ar'] },
  { id: 'POL-007', category: 'Incident Response', name: 'Security Incident Response & Breach Notification', version: 'v2.0', effectiveDate: '2025-09-01', nextReviewDue: '2026-09-01', owner: 'Dr. Tariq Al-Mansouri', approver: 'Legal & Compliance Team', acknowledgementCoverage: 87, status: 'Current', languages: ['en', 'ar'] },
];

// ─── Training modules ─────────────────────────────────────────────────────────
export const TRAINING_MODULES: TrainingModule[] = [
  { id: 'TRN-001', name: 'PHI Security & Data Protection', applicableRoles: ['All staff'], completionRate: 88, overdueCount: 24, expiryMonths: 12, lastUpdated: '2025-11-01' },
  { id: 'TRN-002', name: 'NABIDH Consent Handling for Clinicians', applicableRoles: ['Doctor', 'Nurse', 'Allied Health'], completionRate: 94, overdueCount: 6, expiryMonths: 12, lastUpdated: '2026-01-15' },
  { id: 'TRN-003', name: 'Tatmeen Pharmaceutical Handling', applicableRoles: ['Pharmacist', 'Lab Tech'], completionRate: 76, overdueCount: 4, expiryMonths: 12, lastUpdated: '2025-08-01' },
  { id: 'TRN-004', name: 'DHA Path B Telemedicine Etiquette', applicableRoles: ['Doctor', 'Nurse'], completionRate: 91, overdueCount: 9, expiryMonths: 24, lastUpdated: '2024-07-01' },
  { id: 'TRN-005', name: 'Patient Rights & Complaint Handling', applicableRoles: ['All clinical staff'], completionRate: 96, overdueCount: 2, expiryMonths: 12, lastUpdated: '2026-01-01' },
  { id: 'TRN-006', name: 'Controlled Substance Handling', applicableRoles: ['Pharmacist', 'Doctor'], completionRate: 100, overdueCount: 0, expiryMonths: 12, lastUpdated: '2025-06-01' },
];

// ─── DHA Reports ──────────────────────────────────────────────────────────────
export const DHA_REPORTS: DhaReport[] = [
  { id: 'RPT-001', name: 'DHA Annual Compliance Report', description: 'Consolidated narrative and evidence package covering all DHA programs', frequency: 'Annual', lastGenerated: '2025-05-28', nextScheduled: '2026-05-30', recipients: ['DHA Digital Health', 'Legal & Compliance'], submitToDHA: true, lastFilingRef: 'DHA-ACR-2025-00441' },
  { id: 'RPT-002', name: 'NABIDH Monthly Compliance Report', description: 'Submission rates, rejection categories, consent coverage, integration health', frequency: 'Monthly', lastGenerated: '2026-04-30', nextScheduled: '2026-05-31', recipients: ['DHA Digital Health'], submitToDHA: true, lastFilingRef: 'DHA-NABIDH-2026-04' },
  { id: 'RPT-003', name: 'Tatmeen Quarterly Report', description: 'Pharmaceutical event submission summary, serialization compliance, pharmacy roster', frequency: 'Quarterly', lastGenerated: '2026-03-31', nextScheduled: '2026-06-30', recipients: ['MOHAP Tatmeen Team'], submitToDHA: false },
  { id: 'RPT-004', name: 'Shafafiya / eClaim Compliance Summary', description: 'Submission rates, rejection categories, pre-auth SLAs, coding compliance', frequency: 'Monthly', lastGenerated: '2026-04-30', nextScheduled: '2026-05-31', recipients: ['Insurance Authority', 'Finance'], submitToDHA: false },
  { id: 'RPT-005', name: 'DHA Path B Periodic Activity Report', description: 'Telehealth volume, modality breakdown, quality metrics, patient outcomes', frequency: 'Quarterly', lastGenerated: '2026-03-31', nextScheduled: '2026-06-30', recipients: ['DHA Digital Health'], submitToDHA: true },
  { id: 'RPT-006', name: 'Patient Rights & Complaints Summary', description: 'Consent coverage, access request handling, complaints log and resolution', frequency: 'Quarterly', lastGenerated: '2026-03-31', nextScheduled: '2026-06-30', recipients: ['DHA Patient Rights Unit', 'Legal & Compliance'], submitToDHA: true },
  { id: 'RPT-007', name: 'Training & Policy Compliance Report', description: 'Staff training completion rates, overdue training, policy acknowledgement coverage', frequency: 'Monthly', lastGenerated: '2026-04-30', nextScheduled: '2026-05-31', recipients: ['HR & Training'], submitToDHA: false },
];

// ─── DHA Announcements ────────────────────────────────────────────────────────
export const DHA_ANNOUNCEMENTS: DhaAnnouncement[] = [
  { id: 'ANN-001', title: 'DHA Circular 2026-14: Updated NABIDH Sensitive Category Consent Framework', publishedDate: '2026-04-28', deadline: '2026-05-28', affectedPrograms: ['NABIDH', 'PatientRights'], acknowledged: false },
  { id: 'ANN-002', title: 'MOHAP Formulary Update Q2-2026: 12 new drugs added, 3 removed', publishedDate: '2026-04-20', deadline: '2026-05-15', affectedPrograms: ['Formulary'], acknowledged: false },
  { id: 'ANN-003', title: 'DHA Tatmeen API v4.2 migration — all platforms must migrate by 2026-07-01', publishedDate: '2026-04-15', deadline: '2026-07-01', affectedPrograms: ['Tatmeen'], acknowledged: true },
  { id: 'ANN-004', title: 'DHA Path B: New quality reporting template for H1-2026', publishedDate: '2026-03-31', deadline: '2026-06-30', affectedPrograms: ['PathB'], acknowledged: true },
  { id: 'ANN-005', title: 'DHA Sheryan: New digital renewal portal launched — paper renewals discontinued 2026-06-01', publishedDate: '2026-03-10', deadline: '2026-06-01', affectedPrograms: ['Sheryan'], acknowledged: true },
];

// ─── KPI Sparklines ───────────────────────────────────────────────────────────
export const DHA_KPIS = {
  complianceScore: { value: 87, grade: 'B+', delta: 2.1, sparkline: [81, 83, 84, 85, 86, 84, 87] },
  openFindings: { value: 3, delta: -1, severity: { critical: 1, major: 2, minor: 0 }, sparkline: [8, 6, 5, 4, 3, 4, 3] },
  expiringCredentials: { value: 5, delta: 2, breakdown: { facility: 0, professional: 2, tatmeen: 0, pathb: 0, certs: 3 }, sparkline: [2, 2, 3, 3, 4, 4, 5] },
  submissions24h: { value: 13240, successRate: 98.7, delta: 1.2, sparkline: [11200, 11800, 12200, 12800, 12600, 13100, 13240] },
  patientRightsEvents: { value: 284, delta: -3.2, sparkline: [310, 298, 290, 285, 288, 282, 284] },
  inspectionReadiness: { value: 82, delta: 4.1, sparkline: [71, 74, 76, 78, 80, 79, 82] },
};
