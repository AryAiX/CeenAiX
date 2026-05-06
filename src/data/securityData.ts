// Security page mock data for CeenAiX Super Admin portal

export type SecurityPosture = 'Strong' | 'Good' | 'Needs attention' | 'At risk';
export type ThreatSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type IncidentStatus = 'Triage' | 'Investigation' | 'Containment' | 'Eradication' | 'Recovery' | 'Closed';
export type VulnStatus = 'Open' | 'Triaged' | 'Fix in progress' | 'Fixed' | 'Accepted risk' | "Won't fix";
export type SecretType = 'API key' | 'OAuth client' | 'DB password' | 'Certificate' | 'SSH key' | 'Token';
export type SecretStatus = 'Active' | 'Expiring' | 'Expired' | 'Leaked' | 'Rotated';
export type CertStatus = 'Valid' | 'Expiring' | 'Expired' | 'Revoked';
export type FrameworkStatus = 'Active' | 'In progress' | 'Lapsed' | 'Not applicable';
export type UserRiskScore = 'low' | 'medium' | 'high' | 'critical';

// ─── Security posture ─────────────────────────────────────────────────────────
export const SECURITY_POSTURE = {
  overall: 'Needs attention' as SecurityPosture,
  score: 74,
  grade: 'C+',
  lastAssessed: '2026-05-04T11:30:00+04:00',
  dimensions: {
    identity: 82,
    threats: 61,
    data: 78,
    network: 85,
    endpoint: 70,
    compliance: 71,
  },
  targets: {
    identity: 95,
    threats: 90,
    data: 95,
    network: 90,
    endpoint: 85,
    compliance: 90,
  },
  sparkline: [68, 70, 69, 72, 71, 74, 74],
};

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const SECURITY_KPIS = {
  securityScore: { value: 74, grade: 'C+', delta: 2, sparkline: [68, 70, 69, 72, 71, 74, 74] },
  activeThreats: { critical: 2, high: 5, medium: 11, low: 8, total: 26, delta: 3, sparkline: [18, 21, 19, 24, 22, 25, 26] },
  failedAuths: { value: 1842, anomalous: true, delta: 42, sparkline: [1240, 1380, 1290, 1540, 1620, 1780, 1842] },
  mfaCoverage: { value: 84.2, adminCoverage: 91.7, target: 100, delta: 1.8, sparkline: [78, 79, 80, 81, 82, 83, 84.2] },
  privilegedAccess: { total: 12, breakGlassActive: 1, delta: 1, sparkline: [9, 10, 10, 11, 11, 12, 12] },
  vulnerabilities: { critical: 3, high: 12, medium: 28, low: 41, total: 84, delta: -2, sparkline: [91, 89, 88, 87, 86, 85, 84] },
  secretsAtRisk: { expiring30d: 7, leakedDetected: 1, total: 8, delta: 2, sparkline: [4, 4, 5, 5, 6, 7, 8] },
  openFindings: { critical: 4, high: 9, medium: 18, low: 22, total: 53, delta: -3, sparkline: [60, 58, 57, 56, 55, 54, 53] },
};

// ─── Active alerts ────────────────────────────────────────────────────────────
export const ACTIVE_ALERTS = [
  { id: 'ALT-001', severity: 'Critical' as ThreatSeverity, headline: 'Leaked API key detected in public GitHub commit', scope: 'Integration: Stripe webhook · Production', started: '2026-05-04T08:12:00+04:00', action: 'rotate-secret' },
  { id: 'ALT-002', severity: 'High' as ThreatSeverity, headline: 'Anomalous bulk PHI export — 1,200 records by USR-ADMIN-0041', scope: 'Admin portal · Patient records', started: '2026-05-04T10:44:00+04:00', action: 'investigate' },
  { id: 'ALT-003', severity: 'High' as ThreatSeverity, headline: 'MFA disabled for privileged account Dr. Yasir Arafat (USR-DOC-0718)', scope: 'All portals', started: '2026-05-04T11:02:00+04:00', action: 'enforce-mfa' },
];

// ─── Threats & Detections ─────────────────────────────────────────────────────
export interface ThreatDetection {
  id: string;
  timestamp: string;
  severity: ThreatSeverity;
  category: string;
  summary: string;
  affectedUser?: string;
  affectedService?: string;
  sourceIp?: string;
  country?: string;
  mitre?: string;
  status: 'New' | 'Investigating' | 'Mitigated' | 'Resolved' | 'False positive' | 'Suppressed';
  autoMitigated?: boolean;
}

export const THREAT_DETECTIONS: ThreatDetection[] = [
  { id: 'DET-001', timestamp: '2026-05-04T08:12:00+04:00', severity: 'Critical', category: 'Credential abuse', summary: 'Leaked API key (Stripe webhook) detected in public GitHub repo — auto-revoked', affectedService: 'Stripe Integration', status: 'New', mitre: 'T1552.001', autoMitigated: true },
  { id: 'DET-002', timestamp: '2026-05-04T10:44:00+04:00', severity: 'High', category: 'Data exfiltration', summary: 'Admin USR-ADMIN-0041 exported 1,200 patient records in 4 minutes — 8× above 30d baseline', affectedUser: 'USR-ADMIN-0041', affectedService: 'Admin portal · Patient records', status: 'Investigating', mitre: 'T1020' },
  { id: 'DET-003', timestamp: '2026-05-04T11:02:00+04:00', severity: 'High', category: 'Authentication anomaly', summary: 'MFA bypass detected: privileged account signed in without MFA challenge after policy change', affectedUser: 'USR-DOC-0718', status: 'New', mitre: 'T1556.006' },
  { id: 'DET-004', timestamp: '2026-05-04T07:28:00+04:00', severity: 'Medium', category: 'Brute force', summary: '428 failed login attempts from 185.220.101.44 in 12 minutes — IP rate-limited', sourceIp: '185.220.101.44', country: 'RU', status: 'Mitigated', autoMitigated: true, mitre: 'T1110.001' },
  { id: 'DET-005', timestamp: '2026-05-04T09:15:00+04:00', severity: 'Medium', category: 'Geo anomaly', summary: 'Admin sign-in from previously unseen location: Lagos, Nigeria (usual: Dubai, UAE)', affectedUser: 'USR-ADMIN-0089', country: 'NG', status: 'Investigating', mitre: 'T1078' },
  { id: 'DET-006', timestamp: '2026-05-04T06:50:00+04:00', severity: 'Low', category: 'Suspicious automation', summary: 'API consumer INT-WEBHOOK-003 exceeds rate limit 3× in 1h — consistent bot-like pattern', affectedService: 'NABIDH webhook consumer', status: 'New' },
  { id: 'DET-007', timestamp: '2026-05-03T22:18:00+04:00', severity: 'Medium', category: 'Credential stuffing', summary: '92 accounts targeted with known-breached credentials — 3 successful before block', sourceIp: '45.141.84.201', status: 'Mitigated', autoMitigated: true, mitre: 'T1110.004' },
  { id: 'DET-008', timestamp: '2026-05-03T18:40:00+04:00', severity: 'Low', category: 'Known-bad indicator', summary: 'Outbound DNS query matching IOC from healthcare threat intel feed HEALTH-ISAC-2026-031', affectedService: 'Lab integration service', status: 'Resolved', mitre: 'T1071.004' },
];

// ─── Vulnerabilities ──────────────────────────────────────────────────────────
export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  severity: ThreatSeverity;
  cvss: number;
  source: 'SCA' | 'SAST' | 'DAST' | 'Container' | 'Infrastructure' | 'Pentest' | 'Bug bounty';
  affectedService: string;
  firstSeen: string;
  agedays: number;
  owner: string;
  status: VulnStatus;
  slaBreached: boolean;
  slaDaysRemaining: number;
  exploitAvailable: boolean;
}

export const VULNERABILITIES: Vulnerability[] = [
  { id: 'VLN-001', cve: 'CVE-2024-21626', title: 'Container escape via runc CVE', severity: 'Critical', cvss: 9.0, source: 'Container', affectedService: 'API gateway container', firstSeen: '2026-04-01', agedays: 33, owner: 'Platform Team', status: 'Fix in progress', slaBreached: true, slaDaysRemaining: -19, exploitAvailable: true },
  { id: 'VLN-002', cve: 'CVE-2025-1234', title: 'JWT library remote code execution', severity: 'Critical', cvss: 9.8, source: 'SCA', affectedService: 'Auth service · NABIDH connector', firstSeen: '2026-04-14', agedays: 20, owner: 'Security Team', status: 'Triaged', slaBreached: false, slaDaysRemaining: 1, exploitAvailable: false },
  { id: 'VLN-003', cve: 'CVE-2024-38374', title: 'SQL injection in pharmacy search endpoint', severity: 'High', cvss: 8.1, source: 'DAST', affectedService: 'Pharmacy portal · Drug search API', firstSeen: '2026-03-28', agedays: 37, owner: 'Backend Team', status: 'Fix in progress', slaBreached: false, slaDaysRemaining: 7, exploitAvailable: false },
  { id: 'VLN-004', cve: 'CVE-2025-0912', title: 'OIDC token confusion attack', severity: 'High', cvss: 7.5, source: 'Pentest', affectedService: 'UAE Pass integration', firstSeen: '2026-04-02', agedays: 32, owner: 'Identity Team', status: 'Open', slaBreached: false, slaDaysRemaining: 12, exploitAvailable: false },
  { id: 'VLN-005', cve: 'CVE-2024-55591', title: 'FortiGate config API authentication bypass', severity: 'High', cvss: 9.6, source: 'Infrastructure', affectedService: 'Network edge · VPN gateway', firstSeen: '2026-04-20', agedays: 14, owner: 'Infra Team', status: 'Fixed', slaBreached: false, slaDaysRemaining: 24, exploitAvailable: true },
  { id: 'VLN-006', title: 'Hardcoded credentials in lab integration config', severity: 'High', cvss: 7.8, source: 'SAST', affectedService: 'Lab radiology connector', firstSeen: '2026-04-10', agedays: 24, owner: 'Integration Team', status: 'Triaged', slaBreached: false, slaDaysRemaining: 18, exploitAvailable: false },
  { id: 'VLN-007', title: 'Insecure direct object reference in patient records', severity: 'Medium', cvss: 6.5, source: 'DAST', affectedService: 'Patient portal · Records API', firstSeen: '2026-03-15', agedays: 50, owner: 'Backend Team', status: 'Open', slaBreached: true, slaDaysRemaining: -20, exploitAvailable: false },
  { id: 'VLN-008', cve: 'CVE-2025-2819', title: 'XSS in rich-text prescription notes', severity: 'Medium', cvss: 5.4, source: 'Bug bounty', affectedService: 'Doctor portal · Prescription editor', firstSeen: '2026-04-25', agedays: 9, owner: 'Frontend Team', status: 'Fix in progress', slaBreached: false, slaDaysRemaining: 81, exploitAvailable: false },
];

// ─── Secrets ──────────────────────────────────────────────────────────────────
export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  ownerTeam: string;
  environment: 'Production' | 'Staging' | 'Development';
  lastRotated: string;
  nextRotationDue: string;
  daysToRotation: number;
  status: SecretStatus;
  lastUsed: string;
}

export const SECRETS: Secret[] = [
  { id: 'SEC-001', name: 'STRIPE_SECRET_KEY', type: 'API key', ownerTeam: 'Platform Team', environment: 'Production', lastRotated: '2025-11-01', nextRotationDue: '2026-05-01', daysToRotation: -3, status: 'Leaked', lastUsed: '2026-05-04' },
  { id: 'SEC-002', name: 'NABIDH_MTLS_CERT_PRIVATE_KEY', type: 'Certificate', ownerTeam: 'Integration Team', environment: 'Production', lastRotated: '2025-12-01', nextRotationDue: '2026-06-12', daysToRotation: 39, status: 'Expiring', lastUsed: '2026-05-04' },
  { id: 'SEC-003', name: 'TATMEEN_API_KEY', type: 'API key', ownerTeam: 'Pharmacy Team', environment: 'Production', lastRotated: '2026-02-01', nextRotationDue: '2026-08-01', daysToRotation: 88, status: 'Active', lastUsed: '2026-05-04' },
  { id: 'SEC-004', name: 'SUPABASE_SERVICE_ROLE_KEY', type: 'API key', ownerTeam: 'Backend Team', environment: 'Production', lastRotated: '2026-01-15', nextRotationDue: '2026-07-15', daysToRotation: 72, status: 'Active', lastUsed: '2026-05-04' },
  { id: 'SEC-005', name: 'SHAFAFIYA_ECLAIM_OAUTH_SECRET', type: 'OAuth client', ownerTeam: 'Insurance Team', environment: 'Production', lastRotated: '2025-09-20', nextRotationDue: '2026-05-20', daysToRotation: 16, status: 'Expiring', lastUsed: '2026-05-04' },
  { id: 'SEC-006', name: 'DB_REPLICA_PASSWORD_PROD', type: 'DB password', ownerTeam: 'Backend Team', environment: 'Production', lastRotated: '2025-12-10', nextRotationDue: '2026-06-10', daysToRotation: 37, status: 'Expiring', lastUsed: '2026-05-04' },
  { id: 'SEC-007', name: 'UAT_ADMIN_SSH_KEY', type: 'SSH key', ownerTeam: 'Infra Team', environment: 'Staging', lastRotated: '2025-08-01', nextRotationDue: '2026-02-01', daysToRotation: -92, status: 'Expired', lastUsed: '2026-01-14' },
  { id: 'SEC-008', name: 'TWILIO_AUTH_TOKEN', type: 'Token', ownerTeam: 'Platform Team', environment: 'Production', lastRotated: '2026-03-01', nextRotationDue: '2026-09-01', daysToRotation: 119, status: 'Active', lastUsed: '2026-05-04' },
];

// ─── Certificates ──────────────────────────────────────────────────────────────
export interface Certificate {
  id: string;
  subject: string;
  issuer: string;
  fingerprint: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  deployments: string[];
  status: CertStatus;
  autoRenewal: boolean;
  keyStrength: string;
}

export const CERTIFICATES: Certificate[] = [
  { id: 'CERT-001', subject: '*.ceenaixhealth.ae', issuer: "Let's Encrypt Authority X3", fingerprint: 'AB:12:CD:34:EF:56:78:90:AB:CD', validFrom: '2026-02-12', validTo: '2026-05-13', daysRemaining: 9, deployments: ['Patient portal', 'Doctor portal', 'Admin portal'], status: 'Expiring', autoRenewal: true, keyStrength: 'RSA 2048' },
  { id: 'CERT-002', subject: 'nabidh-prod.ceenaixhealth.ae', issuer: 'DHA PKI CA', fingerprint: 'CF:82:AA:11:22:33:44:55:66:77', validFrom: '2025-12-01', validTo: '2026-06-12', daysRemaining: 39, deployments: ['NABIDH mTLS'], status: 'Expiring', autoRenewal: false, keyStrength: 'RSA 4096' },
  { id: 'CERT-003', subject: 'api.ceenaixhealth.ae', issuer: "Let's Encrypt Authority X3", fingerprint: '11:22:33:44:55:66:77:88:99:AA', validFrom: '2026-03-01', validTo: '2026-06-01', daysRemaining: 28, deployments: ['API gateway', 'Mobile apps'], status: 'Expiring', autoRenewal: true, keyStrength: 'ECDSA P-256' },
  { id: 'CERT-004', subject: 'tatmeen-prod.ceenaixhealth.ae', issuer: 'MOHAP PKI CA', fingerprint: 'BB:CC:DD:EE:FF:00:11:22:33:44', validFrom: '2026-02-01', validTo: '2026-08-12', daysRemaining: 99, deployments: ['Tatmeen mTLS'], status: 'Valid', autoRenewal: false, keyStrength: 'RSA 4096' },
  { id: 'CERT-005', subject: 'internal.ceenaixhealth.ae', issuer: 'CeenAiX Internal CA', fingerprint: 'DE:AD:BE:EF:CA:FE:BA:BE:00:01', validFrom: '2026-01-01', validTo: '2027-01-01', daysRemaining: 242, deployments: ['Internal mTLS', 'Service mesh'], status: 'Valid', autoRenewal: true, keyStrength: 'ECDSA P-384' },
];

// ─── Security incidents ───────────────────────────────────────────────────────
export interface SecurityIncident {
  id: string;
  title: string;
  summary: string;
  classification: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  openedAt: string;
  durationHours: number;
  commander: string;
  affectedSystems: string[];
  phiInvolved: boolean;
  dhaNotified: boolean;
  timeline: { time: string; event: string }[];
}

export const SECURITY_INCIDENTS: SecurityIncident[] = [
  {
    id: 'INC-SEC-001', title: 'Leaked Stripe API key — credential compromise', classification: 'Credential compromise',
    summary: 'Stripe secret key leaked in public GitHub commit. Key auto-revoked within 2 minutes of detection. Scope investigation underway to confirm no unauthorized charges.',
    severity: 'SEV2', status: 'Containment', openedAt: '2026-05-04T08:12:00+04:00', durationHours: 3.4,
    commander: 'Dr. Tariq Al-Mansouri', affectedSystems: ['Stripe Integration', 'Billing service'], phiInvolved: false, dhaNotified: false,
    timeline: [
      { time: '2026-05-04T08:12:00+04:00', event: 'GitHub Secret Scanning alert received — key leaked in public commit' },
      { time: '2026-05-04T08:14:00+04:00', event: 'Stripe API key auto-revoked via webhook' },
      { time: '2026-05-04T08:18:00+04:00', event: 'Incident declared SEV2. Commander assigned.' },
      { time: '2026-05-04T09:00:00+04:00', event: 'Stripe transaction logs pulled. No unauthorized charges confirmed.' },
      { time: '2026-05-04T11:30:00+04:00', event: 'New key provisioned in vault. Containment confirmed.' },
    ],
  },
  {
    id: 'INC-SEC-002', title: 'Anomalous bulk PHI export — 1,200 records', classification: 'Suspected breach',
    summary: 'Admin user USR-ADMIN-0041 exported 1,200 patient records in under 4 minutes — 8× above their 30-day baseline. Session revoked. HIPAA breach assessment in progress.',
    severity: 'SEV1', status: 'Investigation', openedAt: '2026-05-04T10:44:00+04:00', durationHours: 0.9,
    commander: 'Dr. Tariq Al-Mansouri', affectedSystems: ['Admin portal', 'Patient records DB'], phiInvolved: true, dhaNotified: true,
    timeline: [
      { time: '2026-05-04T10:44:00+04:00', event: 'DLP alert: bulk export > 100 records triggered' },
      { time: '2026-05-04T10:46:00+04:00', event: 'Session of USR-ADMIN-0041 force-revoked' },
      { time: '2026-05-04T10:50:00+04:00', event: 'Incident declared SEV1. CISO paged.' },
      { time: '2026-05-04T11:10:00+04:00', event: 'DHA notified per 72h requirement' },
    ],
  },
  {
    id: 'INC-SEC-003', title: 'Credential stuffing — 3 accounts compromised', classification: 'Account takeover',
    summary: 'Automated credential stuffing campaign targeted patient portal. 3 accounts accessed using known-breached credentials before WAF rules deployed.',
    severity: 'SEV2', status: 'Recovery', openedAt: '2026-05-03T22:18:00+04:00', durationHours: 9.2,
    commander: 'Sara Al-Naqbi', affectedSystems: ['Patient portal'], phiInvolved: false, dhaNotified: false,
    timeline: [
      { time: '2026-05-03T22:18:00+04:00', event: 'SIEM alert: credential stuffing pattern detected from 45.141.84.201' },
      { time: '2026-05-03T22:22:00+04:00', event: '3 accounts confirmed compromised — force reset applied' },
      { time: '2026-05-03T22:30:00+04:00', event: 'WAF rules updated to block source IPs' },
      { time: '2026-05-04T07:30:00+04:00', event: 'Affected patients notified by email' },
    ],
  },
];

// ─── IAM Users ────────────────────────────────────────────────────────────────
export interface IamUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  workspaces: string[];
  mfaEnrolled: boolean;
  mfaMethod?: string;
  lastSignIn: string;
  riskScore: UserRiskScore;
  status: 'Active' | 'Suspended' | 'Pending' | 'Locked' | 'Disabled';
  privileged: boolean;
}

export const IAM_USERS: IamUser[] = [
  { id: 'USR-ADMIN-0001', name: 'Dr. Tariq Al-Mansouri', email: 'tariq@ceenaixhealth.ae', roles: ['Super Admin'], workspaces: ['All'], mfaEnrolled: true, mfaMethod: 'FIDO2', lastSignIn: '2026-05-04T11:00:00+04:00', riskScore: 'low', status: 'Active', privileged: true },
  { id: 'USR-ADMIN-0041', name: 'Reem Al-Farsi', email: 'reem@ceenaixhealth.ae', roles: ['Admin'], workspaces: ['Mediclinic', 'Al Zahra'], mfaEnrolled: true, mfaMethod: 'TOTP', lastSignIn: '2026-05-04T10:44:00+04:00', riskScore: 'critical', status: 'Suspended', privileged: true },
  { id: 'USR-ADMIN-0089', name: 'Khalid Mansoor', email: 'khalid.m@ceenaixhealth.ae', roles: ['Compliance Officer'], workspaces: ['All'], mfaEnrolled: true, mfaMethod: 'TOTP', lastSignIn: '2026-05-04T09:15:00+04:00', riskScore: 'medium', status: 'Active', privileged: false },
  { id: 'USR-DOC-0718', name: 'Dr. Yasir Arafat', email: 'yasir@emirateshospital.ae', roles: ['Doctor'], workspaces: ['Emirates Hospital'], mfaEnrolled: false, lastSignIn: '2026-05-04T11:02:00+04:00', riskScore: 'high', status: 'Active', privileged: false },
  { id: 'USR-PHM-0234', name: 'Fatima Al-Zaabi', email: 'fatima@mediclinic.ae', roles: ['Pharmacist'], workspaces: ['Mediclinic'], mfaEnrolled: true, mfaMethod: 'TOTP', lastSignIn: '2026-05-04T08:30:00+04:00', riskScore: 'low', status: 'Active', privileged: false },
  { id: 'USR-ADMIN-0012', name: 'Sara Al-Naqbi', email: 'sara@ceenaixhealth.ae', roles: ['Security Officer'], workspaces: ['All'], mfaEnrolled: true, mfaMethod: 'WebAuthn', lastSignIn: '2026-05-04T07:00:00+04:00', riskScore: 'low', status: 'Active', privileged: true },
];

// ─── Frameworks ───────────────────────────────────────────────────────────────
export interface FrameworkControlDomain {
  domain: string;
  total: number;
  passed: number;
  failed: number;
  exceptions: number;
}

export interface Framework {
  id: string;
  name: string;
  shortName: string;
  status: FrameworkStatus;
  certBody?: string;
  lastAudit?: string;
  nextAudit?: string;
  controlsCoverage: number;
  openFindings: number;
  controlDomains: FrameworkControlDomain[];
  evidence: { collected: number; pending: number; exceptions: number };
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'FW-001', name: 'HIPAA Security Rule', shortName: 'HIPAA', status: 'Active',
    certBody: 'KPMG UAE', lastAudit: '2025-11-01', nextAudit: '2026-11-01', controlsCoverage: 91, openFindings: 4,
    controlDomains: [
      { domain: 'Administrative safeguards', total: 54, passed: 50, failed: 2, exceptions: 2 },
      { domain: 'Physical safeguards', total: 28, passed: 28, failed: 0, exceptions: 0 },
      { domain: 'Technical safeguards', total: 42, passed: 38, failed: 3, exceptions: 1 },
      { domain: 'Organizational requirements', total: 40, passed: 33, failed: 4, exceptions: 3 },
    ],
    evidence: { collected: 149, pending: 12, exceptions: 3 },
  },
  {
    id: 'FW-002', name: 'UAE Personal Data Protection Law', shortName: 'UAE PDPL', status: 'In progress',
    nextAudit: '2026-09-01', controlsCoverage: 68, openFindings: 11,
    controlDomains: [
      { domain: 'Lawful basis & consent', total: 14, passed: 8, failed: 4, exceptions: 2 },
      { domain: 'Data subject rights', total: 12, passed: 9, failed: 2, exceptions: 1 },
      { domain: 'Security measures', total: 14, passed: 10, failed: 3, exceptions: 1 },
      { domain: 'Controller obligations', total: 8, passed: 6, failed: 1, exceptions: 1 },
    ],
    evidence: { collected: 33, pending: 14, exceptions: 1 },
  },
  {
    id: 'FW-003', name: 'DHA Security Requirements', shortName: 'DHA Security', status: 'Active',
    certBody: 'DHA Digital Health', lastAudit: '2026-01-14', nextAudit: '2026-07-14', controlsCoverage: 84, openFindings: 6,
    controlDomains: [
      { domain: 'Identity & access', total: 18, passed: 16, failed: 1, exceptions: 1 },
      { domain: 'Clinical data security', total: 22, passed: 19, failed: 2, exceptions: 1 },
      { domain: 'Incident response', total: 16, passed: 13, failed: 2, exceptions: 1 },
      { domain: 'Audit & monitoring', total: 16, passed: 12, failed: 3, exceptions: 1 },
    ],
    evidence: { collected: 60, pending: 10, exceptions: 2 },
  },
  {
    id: 'FW-004', name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001', status: 'Active',
    certBody: 'BSI Group', lastAudit: '2025-02-28', nextAudit: '2027-01-15', controlsCoverage: 94, openFindings: 2,
    controlDomains: [
      { domain: 'Organizational controls', total: 37, passed: 35, failed: 1, exceptions: 1 },
      { domain: 'People controls', total: 8, passed: 8, failed: 0, exceptions: 0 },
      { domain: 'Physical controls', total: 14, passed: 14, failed: 0, exceptions: 0 },
      { domain: 'Technological controls', total: 34, passed: 30, failed: 3, exceptions: 1 },
    ],
    evidence: { collected: 87, pending: 6, exceptions: 0 },
  },
  {
    id: 'FW-005', name: 'SOC 2 Type II', shortName: 'SOC 2', status: 'In progress',
    nextAudit: '2026-10-01', controlsCoverage: 78, openFindings: 7,
    controlDomains: [
      { domain: 'Security (CC)', total: 28, passed: 22, failed: 4, exceptions: 2 },
      { domain: 'Availability (A)', total: 14, passed: 12, failed: 1, exceptions: 1 },
      { domain: 'Confidentiality (C)', total: 12, passed: 9, failed: 2, exceptions: 1 },
      { domain: 'Privacy (P)', total: 6, passed: 4, failed: 2, exceptions: 0 },
    ],
    evidence: { collected: 47, pending: 13, exceptions: 0 },
  },
  {
    id: 'FW-006', name: 'ISO/IEC 27799', shortName: 'ISO 27799', status: 'In progress',
    nextAudit: '2026-12-01', controlsCoverage: 72, openFindings: 5,
    controlDomains: [
      { domain: 'Health informatics security', total: 22, passed: 16, failed: 4, exceptions: 2 },
      { domain: 'PHI lifecycle management', total: 12, passed: 8, failed: 3, exceptions: 1 },
      { domain: 'Clinical system controls', total: 7, passed: 6, failed: 1, exceptions: 0 },
    ],
    evidence: { collected: 30, pending: 11, exceptions: 0 },
  },
  {
    id: 'FW-007', name: 'NIST Cybersecurity Framework', shortName: 'NIST CSF', status: 'Active',
    controlsCoverage: 81, openFindings: 8,
    controlDomains: [
      { domain: 'Identify', total: 23, passed: 19, failed: 3, exceptions: 1 },
      { domain: 'Protect', total: 35, passed: 29, failed: 4, exceptions: 2 },
      { domain: 'Detect', total: 18, passed: 14, failed: 3, exceptions: 1 },
      { domain: 'Respond', total: 18, passed: 14, failed: 3, exceptions: 1 },
      { domain: 'Recover', total: 14, passed: 11, failed: 2, exceptions: 1 },
    ],
    evidence: { collected: 87, pending: 15, exceptions: 6 },
  },
];

// ─── Authentication trend data ────────────────────────────────────────────────
export const AUTH_TREND = [
  { hour: '00', success: 182, failed: 28, blocked: 4, mfaChallenged: 42 },
  { hour: '01', success: 94, failed: 14, blocked: 2, mfaChallenged: 18 },
  { hour: '02', success: 61, failed: 8, blocked: 1, mfaChallenged: 12 },
  { hour: '03', success: 48, failed: 6, blocked: 1, mfaChallenged: 9 },
  { hour: '04', success: 72, failed: 11, blocked: 2, mfaChallenged: 14 },
  { hour: '05', success: 138, failed: 22, blocked: 3, mfaChallenged: 28 },
  { hour: '06', success: 312, failed: 48, blocked: 8, mfaChallenged: 74 },
  { hour: '07', success: 682, failed: 94, blocked: 12, mfaChallenged: 148 },
  { hour: '08', success: 924, failed: 142, blocked: 18, mfaChallenged: 204 },
  { hour: '09', success: 1040, failed: 186, blocked: 22, mfaChallenged: 240 },
  { hour: '10', success: 1120, failed: 248, blocked: 31, mfaChallenged: 268 },
  { hour: '11', success: 980, failed: 312, blocked: 48, mfaChallenged: 244 },
];

// ─── Top risks for Overview tab ───────────────────────────────────────────────
export const TOP_RISKS = [
  { id: 'RSK-001', severity: 'Critical' as ThreatSeverity, headline: 'Leaked Stripe API key — auto-revoked, scope investigation in progress', scope: 'Production · Stripe integration', age: '3h 22m', owner: 'Security Team', category: 'Credential' },
  { id: 'RSK-002', severity: 'Critical' as ThreatSeverity, headline: 'HIPAA breach assessment required: 1,200 PHI records accessed anomalously', scope: 'Patient records · Admin portal', age: '1h 4m', owner: 'Compliance', category: 'Data' },
  { id: 'RSK-003', severity: 'High' as ThreatSeverity, headline: 'MFA not enrolled: Dr. Yasir Arafat (privileged, Psychiatry)', scope: 'All portals', age: '48d', owner: 'Unassigned', category: 'Identity' },
  { id: 'RSK-004', severity: 'High' as ThreatSeverity, headline: 'CVE-2024-21626 (CVSS 9.0) — container escape — SLA breached 19d', scope: 'API gateway container', age: '33d', owner: 'Platform Team', category: 'Vulnerability' },
  { id: 'RSK-005', severity: 'High' as ThreatSeverity, headline: 'NABIDH mTLS certificate expires in 39 days — manual renewal required', scope: 'NABIDH Production', age: '39d remaining', owner: 'Integration Team', category: 'Certificate' },
  { id: 'RSK-006', severity: 'High' as ThreatSeverity, headline: 'Geo-anomalous admin sign-in from Lagos, Nigeria under investigation', scope: 'USR-ADMIN-0089', age: '1h 49m', owner: 'Security Team', category: 'Threat' },
  { id: 'RSK-007', severity: 'Medium' as ThreatSeverity, headline: 'Access review Q2-2026 overdue for 6 of 14 privileged users', scope: 'Privileged access', age: '4d overdue', owner: 'Dr. Tariq Al-Mansouri', category: 'Identity' },
  { id: 'RSK-008', severity: 'Medium' as ThreatSeverity, headline: 'UAE PDPL framework only 68% evidenced — audit in 120 days', scope: 'All data', age: '120d to audit', owner: 'Compliance', category: 'Framework' },
];

// ─── Live security events ──────────────────────────────────────────────────────
export const LIVE_EVENTS = [
  { id: 'EVT-001', severity: 'Critical' as ThreatSeverity, headline: 'Leaked API key detected & auto-revoked', time: '08:12' },
  { id: 'EVT-002', severity: 'High' as ThreatSeverity, headline: 'Bulk PHI export anomaly flagged — session revoked', time: '10:44' },
  { id: 'EVT-003', severity: 'High' as ThreatSeverity, headline: 'MFA bypass on privileged account — step-up forced', time: '11:02' },
  { id: 'EVT-004', severity: 'Medium' as ThreatSeverity, headline: 'Geo anomaly: admin sign-in from NG (usual: AE)', time: '09:15' },
  { id: 'EVT-005', severity: 'Medium' as ThreatSeverity, headline: 'Credential stuffing: 3 accounts compromised, reset', time: 'Yesterday' },
  { id: 'EVT-006', severity: 'Low' as ThreatSeverity, headline: 'NABIDH cert expiry reminder generated (39d)', time: '08:00' },
  { id: 'EVT-007', severity: 'Low' as ThreatSeverity, headline: 'Secret rotation campaign: 7 keys queued', time: '07:30' },
  { id: 'EVT-008', severity: 'Info' as ThreatSeverity, headline: 'New FIDO2 authenticator registered: USR-ADMIN-0001', time: '06:45' },
];
