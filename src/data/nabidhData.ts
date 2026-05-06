// NABIDH Integration mock data for the CeenAiX Super Admin portal
// Dubai Health Authority NABIDH (National Backbone for Health Information Exchange)

export type NabidhPermission =
  | 'nabidh:view'
  | 'nabidh:view-phi'
  | 'nabidh:resubmit'
  | 'nabidh:resolve'
  | 'nabidh:consent:manage'
  | 'nabidh:mappings:edit'
  | 'nabidh:certificates:manage'
  | 'nabidh:configure'
  | 'nabidh:export-phi'
  | 'nabidh:approve';

export type SubmissionStatus =
  | 'Submitted'
  | 'Accepted'
  | 'Rejected'
  | 'Pending'
  | 'Resubmitted'
  | 'Processing'
  | 'Failed';

export type ConsentStatus = 'Granted' | 'Revoked' | 'Pending' | 'Expired';
export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type CertStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Revoked';

// ─── Compliance Strip ───────────────────────────────────────────────────────
export const COMPLIANCE_STRIP = {
  dhaLicense: {
    number: 'DHA-FACI-2024-00412',
    status: 'Active' as const,
    expiryDate: '2026-03-31',
    daysToExpiry: 331,
  },
  certificate: {
    subject: 'NABIDH-TLS-PROD',
    status: 'Expiring Soon' as CertStatus,
    expiryDate: '2026-06-12',
    daysToExpiry: 39,
    fingerprint: 'SHA256:A4:B2:...',
  },
  submissionSLA: {
    target: 99.5,
    current: 99.1,
    breached: false,
    lastChecked: '2026-05-04T07:55:00Z',
  },
  consentCoverage: {
    pct: 94.2,
    totalPatients: 48231,
    consented: 45433,
    pending: 2798,
  },
  complianceScore: {
    value: 91,
    grade: 'B+',
    lastAudit: '2026-04-15',
  },
};

// ─── KPI Cards ───────────────────────────────────────────────────────────────
export const NABIDH_KPIS = {
  submissions24h: { value: 14820, delta: 3.2, successCount: 14612 },
  successRate: { value: 98.59, delta: 0.41, target: 99.5 },
  avgLatency: { value: 342, unit: 'ms', delta: -8.1, p99: 1240 },
  pendingQueue: { value: 208, delta: 12, oldestAge: '4h 22m' },
  rejected24h: { value: 208, delta: -14.2, topReason: 'Invalid MRN' },
  consentCoverage: { value: 94.2, delta: 0.8, unconsented: 2798 },
};

// ─── Overview Charts ─────────────────────────────────────────────────────────
export const SUBMISSION_TREND = [
  { hour: '00:00', submitted: 420, accepted: 414, rejected: 6 },
  { hour: '02:00', submitted: 280, accepted: 276, rejected: 4 },
  { hour: '04:00', submitted: 190, accepted: 188, rejected: 2 },
  { hour: '06:00', submitted: 560, accepted: 551, rejected: 9 },
  { hour: '08:00', submitted: 1240, accepted: 1221, rejected: 19 },
  { hour: '10:00', submitted: 1820, accepted: 1794, rejected: 26 },
  { hour: '12:00', submitted: 2100, accepted: 2072, rejected: 28 },
  { hour: '14:00', submitted: 1980, accepted: 1954, rejected: 26 },
  { hour: '16:00', submitted: 1640, accepted: 1618, rejected: 22 },
  { hour: '18:00', submitted: 1120, accepted: 1106, rejected: 14 },
  { hour: '20:00', submitted: 840, accepted: 831, rejected: 9 },
  { hour: '22:00', submitted: 630, accepted: 622, rejected: 8 },
];

export const LATENCY_PERCENTILES = [
  { label: 'p50', value: 182 },
  { label: 'p75', value: 248 },
  { label: 'p90', value: 496 },
  { label: 'p95', value: 724 },
  { label: 'p99', value: 1240 },
];

export const RESOURCE_BREAKDOWN = [
  { name: 'Patient Demographics', count: 5820, pct: 39.3 },
  { name: 'Clinical Encounters', count: 4204, pct: 28.4 },
  { name: 'Medications', count: 2116, pct: 14.3 },
  { name: 'Diagnoses (ICD-10)', count: 1420, pct: 9.6 },
  { name: 'Lab Results', count: 828, pct: 5.6 },
  { name: 'Imaging Reports', count: 432, pct: 2.9 },
];

// ─── Submission Queue ────────────────────────────────────────────────────────
export interface Submission {
  id: string;
  messageId: string;
  workspace: string;
  patientMrn: string;
  resourceType: string;
  fhirVersion: string;
  status: SubmissionStatus;
  attempts: number;
  created: string;
  lastAttempt: string;
  latencyMs: number;
  size: string;
  correlationId: string;
}

export const SUBMISSIONS: Submission[] = [
  { id: 'SUB-001', messageId: 'MSG-4F2A1', workspace: 'Aster DM Healthcare', patientMrn: 'MRN-****-4821', resourceType: 'Patient', fhirVersion: 'R4', status: 'Accepted', attempts: 1, created: '2026-05-04 07:48', lastAttempt: '2026-05-04 07:48', latencyMs: 312, size: '4.2 KB', correlationId: 'CORR-88A2' },
  { id: 'SUB-002', messageId: 'MSG-9C3B2', workspace: 'Cleveland Clinic Abu Dhabi', patientMrn: 'MRN-****-7204', resourceType: 'Encounter', fhirVersion: 'R4', status: 'Rejected', attempts: 2, created: '2026-05-04 07:45', lastAttempt: '2026-05-04 07:52', latencyMs: 0, size: '6.8 KB', correlationId: 'CORR-A14F' },
  { id: 'SUB-003', messageId: 'MSG-7E1D3', workspace: 'Mediclinic City Hospital', patientMrn: 'MRN-****-3312', resourceType: 'MedicationRequest', fhirVersion: 'R4', status: 'Processing', attempts: 1, created: '2026-05-04 07:55', lastAttempt: '2026-05-04 07:55', latencyMs: 0, size: '3.1 KB', correlationId: 'CORR-D28C' },
  { id: 'SUB-004', messageId: 'MSG-2B4E4', workspace: 'NMC Royal Hospital', patientMrn: 'MRN-****-9041', resourceType: 'Observation', fhirVersion: 'R4', status: 'Pending', attempts: 0, created: '2026-05-04 07:56', lastAttempt: '—', latencyMs: 0, size: '2.8 KB', correlationId: 'CORR-F93A' },
  { id: 'SUB-005', messageId: 'MSG-5A2F5', workspace: 'Aster DM Healthcare', patientMrn: 'MRN-****-5528', resourceType: 'DiagnosticReport', fhirVersion: 'R4', status: 'Accepted', attempts: 1, created: '2026-05-04 07:41', lastAttempt: '2026-05-04 07:41', latencyMs: 488, size: '12.4 KB', correlationId: 'CORR-B71E' },
  { id: 'SUB-006', messageId: 'MSG-3C8G6', workspace: 'Emirates Hospital', patientMrn: 'MRN-****-1190', resourceType: 'Condition', fhirVersion: 'R4', status: 'Failed', attempts: 3, created: '2026-05-04 07:22', lastAttempt: '2026-05-04 07:48', latencyMs: 0, size: '1.9 KB', correlationId: 'CORR-C55D' },
  { id: 'SUB-007', messageId: 'MSG-8D9H7', workspace: 'Al Zahra Hospital', patientMrn: 'MRN-****-6634', resourceType: 'Procedure', fhirVersion: 'R4', status: 'Accepted', attempts: 1, created: '2026-05-04 07:38', lastAttempt: '2026-05-04 07:38', latencyMs: 215, size: '5.6 KB', correlationId: 'CORR-E82B' },
  { id: 'SUB-008', messageId: 'MSG-1F0J8', workspace: 'Mediclinic City Hospital', patientMrn: 'MRN-****-8847', resourceType: 'AllergyIntolerance', fhirVersion: 'R4', status: 'Resubmitted', attempts: 2, created: '2026-05-04 07:18', lastAttempt: '2026-05-04 07:50', latencyMs: 344, size: '2.2 KB', correlationId: 'CORR-G10F' },
];

// ─── Rejections ───────────────────────────────────────────────────────────────
export interface RejectionError {
  id: string;
  code: string;
  message: string;
  count: number;
  pct: number;
  severity: SeverityLevel;
  affectedWorkspaces: number;
  firstSeen: string;
  lastSeen: string;
  autoResolvable: boolean;
  resolution?: string;
}

export const REJECTION_ERRORS: RejectionError[] = [
  { id: 'ERR-001', code: 'NABIDH-E-4001', message: 'Invalid Emirates ID format', count: 88, pct: 42.3, severity: 'High', affectedWorkspaces: 6, firstSeen: '2026-05-04 00:12', lastSeen: '2026-05-04 07:54', autoResolvable: false, resolution: 'Validate Emirates ID checksum before submission' },
  { id: 'ERR-002', code: 'NABIDH-E-4002', message: 'MRN not registered in NABIDH index', count: 42, pct: 20.2, severity: 'High', affectedWorkspaces: 8, firstSeen: '2026-05-03 14:22', lastSeen: '2026-05-04 07:41', autoResolvable: true, resolution: 'Pre-register patient with DHA patient index endpoint' },
  { id: 'ERR-003', code: 'NABIDH-E-3001', message: 'Expired digital signature', count: 28, pct: 13.5, severity: 'Critical', affectedWorkspaces: 2, firstSeen: '2026-05-04 03:00', lastSeen: '2026-05-04 07:52', autoResolvable: false, resolution: 'Renew mTLS certificate — see Certificates tab' },
  { id: 'ERR-004', code: 'NABIDH-W-2001', message: 'Non-mandatory field missing: telecom.value', count: 22, pct: 10.6, severity: 'Low', affectedWorkspaces: 4, firstSeen: '2026-05-02 09:00', lastSeen: '2026-05-04 07:30', autoResolvable: true, resolution: 'Update mapping to include telecom field' },
  { id: 'ERR-005', code: 'NABIDH-E-5001', message: 'Duplicate submission within 5-minute window', count: 14, pct: 6.7, severity: 'Medium', affectedWorkspaces: 3, firstSeen: '2026-05-04 06:15', lastSeen: '2026-05-04 07:44', autoResolvable: true, resolution: 'Implement idempotency key check' },
  { id: 'ERR-006', code: 'NABIDH-E-4010', message: 'ICD-10 code not in approved DHA list', count: 10, pct: 4.8, severity: 'Medium', affectedWorkspaces: 5, firstSeen: '2026-05-03 18:00', lastSeen: '2026-05-04 07:28', autoResolvable: false, resolution: 'Sync ICD-10 approved code list' },
  { id: 'ERR-007', code: 'NABIDH-E-4015', message: 'Patient consent not recorded', count: 4, pct: 1.9, severity: 'Critical', affectedWorkspaces: 1, firstSeen: '2026-05-04 07:01', lastSeen: '2026-05-04 07:47', autoResolvable: false, resolution: 'Obtain explicit NABIDH consent before submission' },
];

// ─── Patient Consent ──────────────────────────────────────────────────────────
export interface ConsentRecord {
  id: string;
  patientMrn: string;
  name: string; // redacted by default
  emiratesId: string; // redacted
  workspace: string;
  status: ConsentStatus;
  grantedDate?: string;
  expiryDate?: string;
  revokedDate?: string;
  channel: string;
  version: string;
}

export const CONSENT_RECORDS: ConsentRecord[] = [
  { id: 'CNS-001', patientMrn: 'MRN-****-4821', name: 'P. *** Al-***', emiratesId: '784-****-****-*', workspace: 'Aster DM Healthcare', status: 'Granted', grantedDate: '2026-02-14', expiryDate: '2027-02-14', channel: 'Portal', version: 'v2.1' },
  { id: 'CNS-002', patientMrn: 'MRN-****-7204', name: 'M. *** Al-***', emiratesId: '784-****-****-*', workspace: 'Cleveland Clinic Abu Dhabi', status: 'Revoked', grantedDate: '2025-11-20', revokedDate: '2026-04-28', channel: 'In-person', version: 'v2.0' },
  { id: 'CNS-003', patientMrn: 'MRN-****-3312', name: 'F. *** Al-***', emiratesId: '784-****-****-*', workspace: 'Mediclinic City Hospital', status: 'Pending', channel: 'SMS', version: 'v2.1' },
  { id: 'CNS-004', patientMrn: 'MRN-****-9041', name: 'S. *** Al-***', emiratesId: '784-****-****-*', workspace: 'NMC Royal Hospital', status: 'Granted', grantedDate: '2026-01-08', expiryDate: '2027-01-08', channel: 'Email', version: 'v2.1' },
  { id: 'CNS-005', patientMrn: 'MRN-****-5528', name: 'A. *** Al-***', emiratesId: '784-****-****-*', workspace: 'Aster DM Healthcare', status: 'Expired', grantedDate: '2025-04-01', expiryDate: '2026-04-01', channel: 'Portal', version: 'v1.9' },
  { id: 'CNS-006', patientMrn: 'MRN-****-1190', name: 'K. *** Al-***', emiratesId: '784-****-****-*', workspace: 'Emirates Hospital', status: 'Granted', grantedDate: '2026-03-10', expiryDate: '2027-03-10', channel: 'Portal', version: 'v2.1' },
];

export const CONSENT_STATS = {
  total: 48231,
  granted: 45433,
  pending: 1204,
  revoked: 882,
  expired: 712,
  grantRate: 94.2,
  pendingRate: 2.5,
};

// ─── Mappings & Schemas ───────────────────────────────────────────────────────
export interface MappingEntry {
  id: string;
  name: string;
  resourceType: string;
  version: string;
  workspace: string;
  status: 'Active' | 'Draft' | 'Deprecated' | 'Under Review';
  mappedFields: number;
  totalFields: number;
  validationErrors: number;
  lastUpdated: string;
  updatedBy: string;
}

export const MAPPINGS: MappingEntry[] = [
  { id: 'MAP-001', name: 'Patient Demographics → FHIR Patient R4', resourceType: 'Patient', version: '3.2.1', workspace: 'Global', status: 'Active', mappedFields: 42, totalFields: 44, validationErrors: 0, lastUpdated: '2026-04-20', updatedBy: 'Dr. Tariq Al-Mansouri' },
  { id: 'MAP-002', name: 'Clinical Encounter → FHIR Encounter R4', resourceType: 'Encounter', version: '2.8.0', workspace: 'Global', status: 'Active', mappedFields: 38, totalFields: 38, validationErrors: 0, lastUpdated: '2026-04-18', updatedBy: 'System Auto-sync' },
  { id: 'MAP-003', name: 'HIS Medication → FHIR MedicationRequest R4', resourceType: 'MedicationRequest', version: '2.1.4', workspace: 'Aster DM Healthcare', status: 'Active', mappedFields: 24, totalFields: 26, validationErrors: 2, lastUpdated: '2026-04-10', updatedBy: 'Aster IT Ops' },
  { id: 'MAP-004', name: 'Lab Results → FHIR DiagnosticReport R4', resourceType: 'DiagnosticReport', version: '1.9.2', workspace: 'Global', status: 'Under Review', mappedFields: 30, totalFields: 34, validationErrors: 4, lastUpdated: '2026-05-01', updatedBy: 'Dr. Amira Hassan' },
  { id: 'MAP-005', name: 'ICD-10 Diagnosis → FHIR Condition R4', resourceType: 'Condition', version: '3.0.0', workspace: 'Global', status: 'Active', mappedFields: 18, totalFields: 18, validationErrors: 0, lastUpdated: '2026-03-28', updatedBy: 'System Auto-sync' },
  { id: 'MAP-006', name: 'Radiology Report → FHIR ImagingStudy R4', resourceType: 'ImagingStudy', version: '1.4.0', workspace: 'Global', status: 'Draft', mappedFields: 14, totalFields: 22, validationErrors: 8, lastUpdated: '2026-05-03', updatedBy: 'Dr. Farhan Ali' },
];

// ─── Connection & Certificates ────────────────────────────────────────────────
export interface Certificate {
  id: string;
  name: string;
  type: 'mTLS Client' | 'mTLS Server' | 'Signing' | 'Encryption';
  issuer: string;
  subject: string;
  status: CertStatus;
  issuedDate: string;
  expiryDate: string;
  daysToExpiry: number;
  serialNumber: string;
  algorithm: string;
  environment: 'Production' | 'Staging' | 'UAT';
}

export const CERTIFICATES: Certificate[] = [
  { id: 'CERT-001', name: 'NABIDH Production mTLS Client', type: 'mTLS Client', issuer: 'DHA Root CA', subject: 'CN=ceenaix-prod.dha.ae', status: 'Expiring Soon', issuedDate: '2025-06-12', expiryDate: '2026-06-12', daysToExpiry: 39, serialNumber: '04:A2:8F:...', algorithm: 'RSA-4096', environment: 'Production' },
  { id: 'CERT-002', name: 'NABIDH Production Signing Cert', type: 'Signing', issuer: 'DHA Root CA', subject: 'CN=ceenaix-sign.dha.ae', status: 'Valid', issuedDate: '2026-01-15', expiryDate: '2027-01-15', daysToExpiry: 256, serialNumber: '06:B4:9D:...', algorithm: 'ECDSA-P256', environment: 'Production' },
  { id: 'CERT-003', name: 'NABIDH Staging mTLS Client', type: 'mTLS Client', issuer: 'DHA Test CA', subject: 'CN=ceenaix-stg.dha.ae', status: 'Valid', issuedDate: '2026-02-01', expiryDate: '2027-02-01', daysToExpiry: 273, serialNumber: '08:C1:2E:...', algorithm: 'RSA-4096', environment: 'Staging' },
  { id: 'CERT-004', name: 'NABIDH Message Encryption', type: 'Encryption', issuer: 'DHA Root CA', subject: 'CN=ceenaix-enc.dha.ae', status: 'Valid', issuedDate: '2025-12-01', expiryDate: '2026-12-01', daysToExpiry: 211, serialNumber: '02:D8:7A:...', algorithm: 'RSA-2048', environment: 'Production' },
];

export const CONNECTION_ENDPOINTS = [
  { name: 'NABIDH FHIR Gateway', url: 'https://fhir.nabidh.ae/R4', status: 'Healthy', latencyMs: 182, uptime: '99.94%', lastCheck: '2026-05-04 07:55' },
  { name: 'Patient Index Service', url: 'https://pis.nabidh.ae/v1', status: 'Healthy', latencyMs: 144, uptime: '99.99%', lastCheck: '2026-05-04 07:55' },
  { name: 'Consent Management API', url: 'https://consent.nabidh.ae/v2', status: 'Degraded', latencyMs: 812, uptime: '98.12%', lastCheck: '2026-05-04 07:55' },
  { name: 'Terminology Server', url: 'https://terms.nabidh.ae/v1', status: 'Healthy', latencyMs: 98, uptime: '99.98%', lastCheck: '2026-05-04 07:55' },
  { name: 'Audit Log Endpoint', url: 'https://audit.nabidh.ae/v1', status: 'Healthy', latencyMs: 220, uptime: '99.87%', lastCheck: '2026-05-04 07:55' },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  patientMrn?: string;
  outcome: 'Success' | 'Failure' | 'Warning';
  ipAddress: string;
  sessionId: string;
  details: string;
  phiAccessed: boolean;
}

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'AUD-001', timestamp: '2026-05-04 07:55:12', actor: 'Dr. Tariq Al-Mansouri', actorRole: 'Super Admin', action: 'PHI_VIEW', resource: 'Patient/MRN-****-4821', patientMrn: 'MRN-****-4821', outcome: 'Success', ipAddress: '10.0.4.22', sessionId: 'SES-A82F', details: 'Viewed patient submission history', phiAccessed: true },
  { id: 'AUD-002', timestamp: '2026-05-04 07:52:44', actor: 'System Auto', actorRole: 'Service Account', action: 'RESUBMIT', resource: 'Submission/SUB-008', outcome: 'Success', ipAddress: '10.0.1.5', sessionId: 'SES-SVC1', details: 'Auto-resubmit triggered for SUB-008 after 30min retry window', phiAccessed: false },
  { id: 'AUD-003', timestamp: '2026-05-04 07:48:20', actor: 'Dr. Amira Hassan', actorRole: 'Integration Manager', action: 'MAPPING_EDIT', resource: 'Mapping/MAP-004', outcome: 'Warning', ipAddress: '10.0.3.18', sessionId: 'SES-B44C', details: 'Mapping updated — requires second approval before activation', phiAccessed: false },
  { id: 'AUD-004', timestamp: '2026-05-04 07:41:08', actor: 'Farhan Ali', actorRole: 'Technical Ops', action: 'CONFIG_CHANGE', resource: 'NABIDH/RetryPolicy', outcome: 'Success', ipAddress: '10.0.2.41', sessionId: 'SES-C91D', details: 'Max retry attempts changed from 3 to 5', phiAccessed: false },
  { id: 'AUD-005', timestamp: '2026-05-04 07:38:55', actor: 'System Auto', actorRole: 'Service Account', action: 'CERT_ALERT', resource: 'Certificate/CERT-001', outcome: 'Warning', ipAddress: '10.0.1.5', sessionId: 'SES-SVC1', details: 'mTLS certificate expiring in 39 days — automated alert dispatched', phiAccessed: false },
  { id: 'AUD-006', timestamp: '2026-05-04 07:20:00', actor: 'Dr. Tariq Al-Mansouri', actorRole: 'Super Admin', action: 'CONSENT_REVOKE', resource: 'Consent/CNS-002', patientMrn: 'MRN-****-7204', outcome: 'Success', ipAddress: '10.0.4.22', sessionId: 'SES-A82F', details: 'Patient consent revoked per patient request — two-person approval completed', phiAccessed: false },
  { id: 'AUD-007', timestamp: '2026-05-04 03:00:01', actor: 'System Monitor', actorRole: 'Service Account', action: 'CERT_EXPIRY_CHECK', resource: 'Certificate/CERT-001', outcome: 'Warning', ipAddress: '10.0.1.5', sessionId: 'SES-MON', details: 'Scheduled certificate expiry check — CERT-001 flagged as expiring soon', phiAccessed: false },
  { id: 'AUD-008', timestamp: '2026-05-03 18:22:00', actor: 'Aster IT Ops', actorRole: 'Workspace Admin', action: 'SUBMISSION_MANUAL', resource: 'Submission/BATCH-992', outcome: 'Failure', ipAddress: '10.12.4.8', sessionId: 'SES-WS-12', details: 'Batch resubmission failed — NABIDH timeout on 14 records', phiAccessed: false },
];

// ─── Reports ──────────────────────────────────────────────────────────────────
export const REPORT_TEMPLATES = [
  { id: 'RPT-001', name: 'DHA Monthly Compliance Report', description: 'Submission rates, error analysis, consent coverage for DHA auditors', schedule: 'Monthly', lastRun: '2026-05-01', nextRun: '2026-06-01', format: 'PDF', recipients: 4 },
  { id: 'RPT-002', name: 'Weekly NABIDH Health Summary', description: 'Success rates, latency p99, rejection breakdown, certificate status', schedule: 'Weekly', lastRun: '2026-04-28', nextRun: '2026-05-05', format: 'XLSX', recipients: 8 },
  { id: 'RPT-003', name: 'Consent Coverage by Workspace', description: 'Per-facility consent grant/revoke rates and pending action items', schedule: 'Weekly', lastRun: '2026-04-28', nextRun: '2026-05-05', format: 'PDF', recipients: 12 },
  { id: 'RPT-004', name: 'Rejection Root Cause Analysis', description: 'Detailed breakdown of rejection codes with resolution recommendations', schedule: 'Weekly', lastRun: '2026-04-28', nextRun: '2026-05-05', format: 'PDF', recipients: 3 },
  { id: 'RPT-005', name: 'SLA Breach Incident Log', description: 'All SLA breaches with timestamps, root cause, and remediation actions', schedule: 'Monthly', lastRun: '2026-05-01', nextRun: '2026-06-01', format: 'XLSX', recipients: 6 },
];

// ─── Configuration ────────────────────────────────────────────────────────────
export const NABIDH_CONFIG = {
  environment: 'Production' as const,
  fhirVersion: 'R4',
  baseUrl: 'https://fhir.nabidh.ae/R4',
  facilityCode: 'DHA-FACI-00412',
  retryPolicy: { maxAttempts: 5, backoffSeconds: [30, 60, 120, 300, 600], timeoutSeconds: 30 },
  rateLimits: { requestsPerMinute: 500, requestsPerHour: 20000, burstSize: 50 },
  queueSettings: { maxQueueSize: 10000, processingConcurrency: 8, deadLetterRetention: 7 },
  phiRedaction: { enabled: true, revealRequiresDualApproval: true, logAllReveals: true },
  alertThresholds: { successRateCritical: 95, successRateWarning: 99, latencyP99Critical: 3000, latencyP99Warning: 1500, queueSizeCritical: 5000, queueSizeWarning: 1000 },
};
