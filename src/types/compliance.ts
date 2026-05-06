export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'n/a';

export interface ComplianceRequirement {
  id: string;
  category: string;
  requirement: string;
  status: ComplianceStatus;
  evidenceLink?: string;
  lastVerified: Date;
  responsiblePerson: string;
  remediationPlan?: string;
  dueDate?: Date;
  assignedOwner?: string;
}

export interface UpcomingAudit {
  id: string;
  type: 'audit' | 'reporting_deadline';
  title: string;
  date: Date;
  description: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

export interface NABIDHSyncError {
  id: string;
  patientId: string;
  recordType: string;
  errorMessage: string;
  retryStatus: 'pending' | 'retrying' | 'failed' | 'resolved';
  timestamp: Date;
}

export interface DataCategory {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

export interface ConsentRecord {
  patientId: string;
  patientName: string;
  enrollmentDate: Date;
  consentStatus: 'granted' | 'missing' | 'withdrawn';
  lastUpdated: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  portal: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  result: 'success' | 'failure';
  isSensitive: boolean;
}

export interface SecurityIncident {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  affectedUsers: number;
  resolutionStatus: 'open' | 'investigating' | 'resolved' | 'closed';
  dhaNotified: boolean;
  assignedTo: string;
}

export interface ActiveSession {
  userId: string;
  userName: string;
  location: string;
  country: string;
  ipAddress: string;
  startTime: Date;
  lastActivity: Date;
  lat: number;
  lng: number;
}

export const MOCK_COMPLIANCE_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'req-1',
    category: 'Data Protection',
    requirement: 'Patient data must be encrypted at rest and in transit using AES-256',
    status: 'compliant',
    evidenceLink: '/docs/encryption-policy.pdf',
    lastVerified: new Date('2026-04-01'),
    responsiblePerson: 'Ahmed Al-Mazrouei',
  },
  {
    id: 'req-2',
    category: 'Data Protection',
    requirement: 'Access to patient records must be logged and auditable for 7 years',
    status: 'compliant',
    evidenceLink: '/docs/audit-policy.pdf',
    lastVerified: new Date('2026-04-05'),
    responsiblePerson: 'Sara Johnson',
  },
  {
    id: 'req-3',
    category: 'Clinical Governance',
    requirement: 'AI clinical decision support must have documented validation process',
    status: 'compliant',
    evidenceLink: '/docs/ai-validation.pdf',
    lastVerified: new Date('2026-03-28'),
    responsiblePerson: 'Dr. Mohammed Hassan',
  },
  {
    id: 'req-4',
    category: 'Clinical Governance',
    requirement: 'Telemedicine consultations must record informed consent',
    status: 'partial',
    lastVerified: new Date('2026-04-03'),
    responsiblePerson: 'Fatima Al-Suwaidi',
    remediationPlan: 'Implement automated consent form in telemedicine workflow',
    dueDate: new Date('2026-04-30'),
    assignedOwner: 'Dev Team Alpha',
  },
  {
    id: 'req-5',
    category: 'Interoperability',
    requirement: 'NABIDH integration must sync patient records within 24 hours',
    status: 'compliant',
    evidenceLink: '/docs/nabidh-sla.pdf',
    lastVerified: new Date('2026-04-07'),
    responsiblePerson: 'Khalid Rahman',
  },
  {
    id: 'req-6',
    category: 'Interoperability',
    requirement: 'HL7 FHIR R4 compliance for data exchange',
    status: 'compliant',
    evidenceLink: '/docs/fhir-compliance.pdf',
    lastVerified: new Date('2026-04-02'),
    responsiblePerson: 'Layla Abdulla',
  },
  {
    id: 'req-7',
    category: 'Security',
    requirement: 'Multi-factor authentication required for all clinical staff',
    status: 'non-compliant',
    lastVerified: new Date('2026-04-06'),
    responsiblePerson: 'Security Team',
    remediationPlan: 'Roll out MFA to remaining 12% of clinical staff accounts',
    dueDate: new Date('2026-04-20'),
    assignedOwner: 'IT Security',
  },
  {
    id: 'req-8',
    category: 'Security',
    requirement: 'Penetration testing must be conducted annually',
    status: 'compliant',
    evidenceLink: '/docs/pentest-2026.pdf',
    lastVerified: new Date('2026-03-15'),
    responsiblePerson: 'CyberSec UAE',
  },
  {
    id: 'req-9',
    category: 'Patient Rights',
    requirement: 'Patients must be able to access their records within 48 hours of request',
    status: 'compliant',
    evidenceLink: '/docs/patient-access-sla.pdf',
    lastVerified: new Date('2026-04-04'),
    responsiblePerson: 'Patient Services',
  },
  {
    id: 'req-10',
    category: 'Patient Rights',
    requirement: 'Data deletion requests must be processed within 30 days',
    status: 'compliant',
    evidenceLink: '/docs/data-deletion-policy.pdf',
    lastVerified: new Date('2026-04-01'),
    responsiblePerson: 'Privacy Officer',
  },
];

export const MOCK_UPCOMING_AUDITS: UpcomingAudit[] = [
  {
    id: 'audit-1',
    type: 'audit',
    title: 'DHA Annual Compliance Audit',
    date: new Date('2026-05-15'),
    description: 'Comprehensive audit of digital health platform compliance',
    status: 'upcoming',
  },
  {
    id: 'audit-2',
    type: 'reporting_deadline',
    title: 'Q1 2026 Security Incident Report',
    date: new Date('2026-04-15'),
    description: 'Mandatory quarterly security incident reporting to DHA',
    status: 'upcoming',
  },
  {
    id: 'audit-3',
    type: 'reporting_deadline',
    title: 'Population Health Data Submission',
    date: new Date('2026-04-30'),
    description: 'Monthly population health statistics for DHA registry',
    status: 'upcoming',
  },
  {
    id: 'audit-4',
    type: 'audit',
    title: 'NABIDH Integration Review',
    date: new Date('2026-06-01'),
    description: 'Bi-annual review of NABIDH connectivity and data quality',
    status: 'upcoming',
  },
];

export const MOCK_NABIDH_ERRORS: NABIDHSyncError[] = [
  {
    id: 'err-1',
    patientId: 'PT-8923',
    recordType: 'Lab Results',
    errorMessage: 'Invalid LOINC code for test "Complete Blood Count"',
    retryStatus: 'retrying',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 'err-2',
    patientId: 'PT-7634',
    recordType: 'Prescription',
    errorMessage: 'Missing patient Emirates ID in record',
    retryStatus: 'failed',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: 'err-3',
    patientId: 'PT-5421',
    recordType: 'Clinical Notes',
    errorMessage: 'Timeout connecting to NABIDH endpoint',
    retryStatus: 'pending',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

export const MOCK_DATA_CATEGORIES: DataCategory[] = [
  { name: 'Lab Results', percentage: 34, count: 3034, color: '#06b6d4' },
  { name: 'Prescriptions', percentage: 28, count: 2498, color: '#8b5cf6' },
  { name: 'Clinical Notes', percentage: 21, count: 1874, color: '#14b8a6' },
  { name: 'Imaging', percentage: 17, count: 1517, color: '#f59e0b' },
];

export const MOCK_CONSENT_RECORDS: ConsentRecord[] = [
  {
    patientId: 'PT-9234',
    patientName: 'Patient #9234',
    enrollmentDate: new Date('2025-11-12'),
    consentStatus: 'missing',
    lastUpdated: new Date('2025-11-12'),
  },
  {
    patientId: 'PT-8123',
    patientName: 'Patient #8123',
    enrollmentDate: new Date('2025-09-23'),
    consentStatus: 'missing',
    lastUpdated: new Date('2025-09-23'),
  },
  {
    patientId: 'PT-7456',
    patientName: 'Patient #7456',
    enrollmentDate: new Date('2026-01-05'),
    consentStatus: 'missing',
    lastUpdated: new Date('2026-01-05'),
  },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    userId: 'USR-1234',
    userName: 'Dr. Sarah Johnson',
    organizationId: 'ORG-001',
    organizationName: 'Mediclinic Dubai Mall',
    portal: 'Doctor Portal',
    action: 'VIEW',
    resourceType: 'Patient Record',
    resourceId: 'PT-8923',
    ipAddress: '192.168.1.45',
    result: 'success',
    isSensitive: true,
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    userId: 'USR-5678',
    userName: 'Ahmed Al-Mazrouei',
    organizationId: 'ORG-004',
    organizationName: 'CeenAiX Admin',
    portal: 'Admin Portal',
    action: 'EXPORT',
    resourceType: 'Analytics Report',
    resourceId: 'RPT-2026-Q1',
    ipAddress: '10.0.1.23',
    result: 'success',
    isSensitive: true,
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 23 * 60 * 1000),
    userId: 'USR-9012',
    userName: 'Fatima Al-Suwaidi',
    organizationId: 'ORG-002',
    organizationName: 'Aster Pharmacy Marina',
    portal: 'Pharmacy Portal',
    action: 'UPDATE',
    resourceType: 'Prescription',
    resourceId: 'RX-45678',
    ipAddress: '192.168.2.89',
    result: 'success',
    isSensitive: false,
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    userId: 'USR-3456',
    userName: 'John Smith',
    organizationId: 'ORG-003',
    organizationName: 'Unilabs Dubai',
    portal: 'Lab Portal',
    action: 'CREATE',
    resourceType: 'Lab Result',
    resourceId: 'LAB-98234',
    ipAddress: '172.16.5.12',
    result: 'success',
    isSensitive: false,
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 67 * 60 * 1000),
    userId: 'USR-7890',
    userName: 'Mohammed Hassan',
    organizationId: 'ORG-001',
    organizationName: 'Mediclinic Dubai Mall',
    portal: 'Doctor Portal',
    action: 'LOGIN',
    resourceType: 'Session',
    resourceId: 'SESS-12345',
    ipAddress: '192.168.1.78',
    result: 'success',
    isSensitive: false,
  },
  {
    id: 'log-6',
    timestamp: new Date(Date.now() - 89 * 60 * 1000),
    userId: 'USR-2345',
    userName: 'Unknown User',
    organizationId: 'ORG-001',
    organizationName: 'Mediclinic Dubai Mall',
    portal: 'Doctor Portal',
    action: 'LOGIN',
    resourceType: 'Session',
    resourceId: 'SESS-12346',
    ipAddress: '203.45.67.89',
    result: 'failure',
    isSensitive: false,
  },
];

export const MOCK_SECURITY_INCIDENTS: SecurityIncident[] = [
  {
    id: 'inc-1',
    timestamp: new Date('2026-04-05T14:23:00'),
    severity: 'high',
    type: 'Brute Force Attack',
    description: 'Multiple failed login attempts from suspicious IP range',
    affectedUsers: 0,
    resolutionStatus: 'resolved',
    dhaNotified: false,
    assignedTo: 'Security Team',
  },
  {
    id: 'inc-2',
    timestamp: new Date('2026-03-28T09:15:00'),
    severity: 'medium',
    type: 'Unusual Access Pattern',
    description: 'User accessed 150+ patient records in 30 minutes',
    affectedUsers: 1,
    resolutionStatus: 'closed',
    dhaNotified: false,
    assignedTo: 'Compliance Officer',
  },
  {
    id: 'inc-3',
    timestamp: new Date('2026-03-15T22:45:00'),
    severity: 'low',
    type: 'Off-Hours Access',
    description: 'Administrative access from new location at 2 AM',
    affectedUsers: 1,
    resolutionStatus: 'closed',
    dhaNotified: false,
    assignedTo: 'IT Security',
  },
  {
    id: 'inc-4',
    timestamp: new Date('2026-02-20T16:30:00'),
    severity: 'critical',
    type: 'Data Breach Attempt',
    description: 'SQL injection attempt on patient search endpoint',
    affectedUsers: 0,
    resolutionStatus: 'resolved',
    dhaNotified: true,
    assignedTo: 'CTO',
  },
];

export const MOCK_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    userId: 'USR-1234',
    userName: 'Dr. Sarah Johnson',
    location: 'Dubai, UAE',
    country: 'UAE',
    ipAddress: '192.168.1.45',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    lat: 25.2048,
    lng: 55.2708,
  },
  {
    userId: 'USR-5678',
    userName: 'Ahmed Al-Mazrouei',
    location: 'Abu Dhabi, UAE',
    country: 'UAE',
    ipAddress: '10.0.1.23',
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 2 * 60 * 1000),
    lat: 24.4539,
    lng: 54.3773,
  },
  {
    userId: 'USR-9012',
    userName: 'John Smith',
    location: 'London, UK',
    country: 'UK',
    ipAddress: '81.23.45.67',
    startTime: new Date(Date.now() - 45 * 60 * 1000),
    lastActivity: new Date(Date.now() - 3 * 60 * 1000),
    lat: 51.5074,
    lng: -0.1278,
  },
  {
    userId: 'USR-3456',
    userName: 'Fatima Al-Suwaidi',
    location: 'Sharjah, UAE',
    country: 'UAE',
    ipAddress: '192.168.2.89',
    startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 10 * 60 * 1000),
    lat: 25.3463,
    lng: 55.4209,
  },
  {
    userId: 'USR-7890',
    userName: 'Mohammed Hassan',
    location: 'Riyadh, Saudi Arabia',
    country: 'Saudi Arabia',
    ipAddress: '195.67.89.12',
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    lastActivity: new Date(Date.now() - 1 * 60 * 1000),
    lat: 24.7136,
    lng: 46.6753,
  },
];
