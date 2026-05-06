// Platform-wide audit log mock data for CeenAiX Super Admin portal
// Covers all portals, integrations, AI services, and system events

export type AuditCategory =
  | 'Authentication'
  | 'Authorization'
  | 'Data Access'
  | 'Data Modification'
  | 'Configuration'
  | 'Integration'
  | 'Security'
  | 'Compliance'
  | 'Billing'
  | 'Impersonation'
  | 'System'
  | 'AI'
  | 'Communication';

export type AuditSeverity = 'Info' | 'Notice' | 'Warning' | 'Error' | 'Critical';
export type AuditOutcome = 'Success' | 'Failure' | 'Blocked' | 'Anomaly';
export type ActorType = 'Human Admin' | 'Human User' | 'System' | 'Integration' | 'AI Service' | 'Anonymous';
export type SourcePortal = 'Patient' | 'Doctor' | 'Pharmacy' | 'Lab & Radiology' | 'Insurance' | 'Admin' | 'Public' | 'API' | 'System';

export interface PayloadDiff {
  field: string;
  oldValue: string;
  newValue: string;
  phi: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  isoTimestamp: string;
  severity: AuditSeverity;
  category: AuditCategory;
  event: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorType: ActorType;
  impersonating?: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  workspace: string;
  portal: SourcePortal;
  outcome: AuditOutcome;
  ip: string;
  location: string;
  correlationId: string;
  sessionId: string;
  requestId: string;
  aiModel?: string;
  phiAccessed: boolean;
  phiFields?: string[];
  anomaly?: { reason: string; score: number };
  flagged: boolean;
  entryHash: string;
  prevHash: string;
  diff?: PayloadDiff[];
  legalHold?: string;
  device?: string;
  browser?: string;
  justification?: string;
}

export const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: 'AE-000001',
    timestamp: '2026-05-04 08:14:22',
    isoTimestamp: '2026-05-04T08:14:22+04:00',
    severity: 'Critical',
    category: 'Security',
    event: 'API key rotated for production integration',
    actorId: 'USR-ADMIN-001',
    actorName: 'Dr. Tariq Al-Mansouri',
    actorRole: 'Super Admin',
    actorType: 'Human Admin',
    resourceType: 'API key',
    resourceId: 'KEY-PROD-004',
    resourceName: 'NABIDH Production Key',
    workspace: 'Global',
    portal: 'Admin',
    outcome: 'Success',
    ip: '10.0.4.22',
    location: 'Dubai, AE',
    device: 'MacBook Pro 16"',
    browser: 'Chrome 124',
    correlationId: 'CORR-4F2A1',
    sessionId: 'SES-A82F',
    requestId: 'REQ-8824A',
    phiAccessed: false,
    flagged: true,
    justification: 'Scheduled annual rotation per security policy SEC-004',
    diff: [
      { field: 'key_prefix', oldValue: 'nab_prod_K3x...', newValue: 'nab_prod_M9z...', phi: false },
      { field: 'expiry_date', oldValue: '2025-05-04', newValue: '2026-05-04', phi: false },
      { field: 'rotated_by', oldValue: '—', newValue: 'USR-ADMIN-001', phi: false },
    ],
    entryHash: 'sha256:4f2a1b8c3e9d7a0f2b6c4e8d1a5f3c9b7e2d6a0f4c8b2e6d0a4f8c2b6e0d4a8',
    prevHash: 'sha256:3e1a09f8c4b2d6a0f8c2b4e6d0a8f2c4b6e0d8a2f4c6b8e0d2a6f0c8b4e2d6a',
  },
  {
    id: 'AE-000002',
    timestamp: '2026-05-04 08:12:04',
    isoTimestamp: '2026-05-04T08:12:04+04:00',
    severity: 'Warning',
    category: 'Data Access',
    event: 'Patient medical record viewed',
    actorId: 'USR-DOC-0842',
    actorName: 'Dr. Amira Hassan',
    actorRole: 'Attending Physician',
    actorType: 'Human User',
    resourceType: 'Patient',
    resourceId: 'PAT-****-4821',
    workspace: 'Aster DM Healthcare',
    portal: 'Doctor',
    outcome: 'Success',
    ip: '10.12.3.44',
    location: 'Dubai, AE',
    device: 'iPad Pro',
    browser: 'Safari 17',
    correlationId: 'CORR-9C3B2',
    sessionId: 'SES-D441',
    requestId: 'REQ-7742B',
    phiAccessed: true,
    phiFields: ['name', 'date_of_birth', 'emirates_id', 'diagnoses', 'medications'],
    flagged: false,
    entryHash: 'sha256:9c3b2d7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c',
    prevHash: 'sha256:4f2a1b8c3e9d7a0f2b6c4e8d1a5f3c9b7e2d6a0f4c8b2e6d0a4f8c2b6e0d4a8',
  },
  {
    id: 'AE-000003',
    timestamp: '2026-05-04 08:09:38',
    isoTimestamp: '2026-05-04T08:09:38+04:00',
    severity: 'Critical',
    category: 'Impersonation',
    event: 'Admin impersonated patient account',
    actorId: 'USR-ADMIN-001',
    actorName: 'Dr. Tariq Al-Mansouri',
    actorRole: 'Super Admin',
    actorType: 'Human Admin',
    impersonating: 'M. Al-Rashidi (PAT-****-7204)',
    resourceType: 'User account',
    resourceId: 'PAT-****-7204',
    workspace: 'Cleveland Clinic Abu Dhabi',
    portal: 'Admin',
    outcome: 'Success',
    ip: '10.0.4.22',
    location: 'Dubai, AE',
    device: 'MacBook Pro 16"',
    browser: 'Chrome 124',
    correlationId: 'CORR-7E1D3',
    sessionId: 'SES-A82F',
    requestId: 'REQ-9912C',
    phiAccessed: true,
    phiFields: ['name', 'emirates_id', 'insurance_id', 'address'],
    anomaly: { reason: 'Impersonation with PHI access outside business hours (08:09 local)', score: 78 },
    flagged: true,
    justification: 'Patient support ticket #SUP-44821 — patient unable to access appointment records',
    entryHash: 'sha256:7e1d3f8a2c6b0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e',
    prevHash: 'sha256:9c3b2d7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c3b7f1a5e9c',
  },
  {
    id: 'AE-000004',
    timestamp: '2026-05-04 08:07:55',
    isoTimestamp: '2026-05-04T08:07:55+04:00',
    severity: 'Info',
    category: 'Authentication',
    event: 'User login successful',
    actorId: 'USR-PHM-0234',
    actorName: 'Fatima Al-Zaabi',
    actorRole: 'Lead Pharmacist',
    actorType: 'Human User',
    resourceType: 'User account',
    resourceId: 'USR-PHM-0234',
    workspace: 'Mediclinic City Hospital',
    portal: 'Pharmacy',
    outcome: 'Success',
    ip: '10.8.2.11',
    location: 'Dubai, AE',
    device: 'Dell Latitude 5540',
    browser: 'Edge 124',
    correlationId: 'CORR-2B4E4',
    sessionId: 'SES-F104',
    requestId: 'REQ-3341D',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:2b4e4a9c1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e',
    prevHash: 'sha256:7e1d3f8a2c6b0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e4d8f2a6c0e',
  },
  {
    id: 'AE-000005',
    timestamp: '2026-05-04 08:05:12',
    isoTimestamp: '2026-05-04T08:05:12+04:00',
    severity: 'Critical',
    category: 'Authentication',
    event: 'Login failed — invalid credentials (14th attempt)',
    actorId: 'UNKNOWN',
    actorName: 'Unknown',
    actorRole: '—',
    actorType: 'Anonymous',
    resourceType: 'User account',
    resourceId: 'login@emirates-hospital.ae',
    workspace: 'Emirates Hospital',
    portal: 'Doctor',
    outcome: 'Failure',
    ip: '185.220.101.48',
    location: 'Rotterdam, NL',
    device: 'Unknown Linux',
    browser: 'Automated / headless',
    correlationId: 'CORR-5A2F5',
    sessionId: '—',
    requestId: 'REQ-0020E',
    anomaly: { reason: 'Geo-anomaly: 14 consecutive failed logins from Netherlands Tor exit node on UAE healthcare portal', score: 95 },
    phiAccessed: false,
    flagged: true,
    entryHash: 'sha256:5a2f5c0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f',
    prevHash: 'sha256:2b4e4a9c1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e1d5f3b7e',
  },
  {
    id: 'AE-000006',
    timestamp: '2026-05-04 08:03:40',
    isoTimestamp: '2026-05-04T08:03:40+04:00',
    severity: 'Notice',
    category: 'Integration',
    event: 'NABIDH submission batch processed — 247 records',
    actorId: 'SVC-NABIDH-SYNC',
    actorName: 'NABIDH Sync Service',
    actorRole: 'Service Account',
    actorType: 'System',
    resourceType: 'Integration',
    resourceId: 'INT-NABIDH-PROD',
    workspace: 'Global',
    portal: 'System',
    outcome: 'Success',
    ip: '10.0.1.5',
    location: 'UAE East DC, AE',
    correlationId: 'CORR-3C8G6',
    sessionId: 'SES-SVC1',
    requestId: 'REQ-BATCH-992',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:3c8g6h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g',
    prevHash: 'sha256:5a2f5c0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f6a0e8d4b2f',
  },
  {
    id: 'AE-000007',
    timestamp: '2026-05-04 08:01:08',
    isoTimestamp: '2026-05-04T08:01:08+04:00',
    severity: 'Warning',
    category: 'AI',
    event: 'AI clinical recommendation generated for patient encounter',
    actorId: 'SVC-AI-CLINICAL',
    actorName: 'CeenAiX Clinical AI',
    actorRole: 'AI Service',
    actorType: 'AI Service',
    resourceType: 'Patient',
    resourceId: 'PAT-****-3312',
    workspace: 'NMC Royal Hospital',
    portal: 'Doctor',
    outcome: 'Success',
    ip: '10.0.1.8',
    location: 'UAE East DC, AE',
    correlationId: 'CORR-8D9H7',
    sessionId: 'SES-AI-044',
    requestId: 'REQ-4418F',
    aiModel: 'CeenAiX-Clinical-v2.1 (claude-sonnet-4-6)',
    phiAccessed: true,
    phiFields: ['diagnoses', 'lab_results', 'medications', 'allergies'],
    flagged: false,
    entryHash: 'sha256:8d9h7i2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a',
    prevHash: 'sha256:3c8g6h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g7h1e5d9b3g',
  },
  {
    id: 'AE-000008',
    timestamp: '2026-05-04 07:58:30',
    isoTimestamp: '2026-05-04T07:58:30+04:00',
    severity: 'Critical',
    category: 'Compliance',
    event: 'Bulk patient data export blocked — rate limit exceeded',
    actorId: 'USR-ADMIN-003',
    actorName: 'Farhan Ali',
    actorRole: 'Workspace Admin',
    actorType: 'Human Admin',
    resourceType: 'Patient',
    resourceId: 'BATCH-PAT-8841',
    workspace: 'Aster DM Healthcare',
    portal: 'Admin',
    outcome: 'Blocked',
    ip: '10.0.2.41',
    location: 'Dubai, AE',
    device: 'HP EliteBook 840',
    browser: 'Chrome 124',
    correlationId: 'CORR-1F0J8',
    sessionId: 'SES-C91D',
    requestId: 'REQ-5528G',
    anomaly: { reason: 'Bulk PHI export attempted without audit:export-phi permission; 4,821 patient records requested; exceeds 500-record rate limit', score: 95 },
    phiAccessed: false,
    flagged: true,
    entryHash: 'sha256:1f0j8k3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f',
    prevHash: 'sha256:8d9h7i2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a8e2f6e0c4a',
  },
  {
    id: 'AE-000009',
    timestamp: '2026-05-04 07:55:14',
    isoTimestamp: '2026-05-04T07:55:14+04:00',
    severity: 'Info',
    category: 'Data Modification',
    event: 'Prescription dosage updated',
    actorId: 'USR-DOC-0412',
    actorName: 'Dr. Khalid Mansoor',
    actorRole: 'GP',
    actorType: 'Human User',
    resourceType: 'Prescription',
    resourceId: 'RX-88420',
    workspace: 'Al Zahra Hospital',
    portal: 'Doctor',
    outcome: 'Success',
    ip: '10.15.4.7',
    location: 'Sharjah, AE',
    device: 'MacBook Air M3',
    browser: 'Safari 17',
    correlationId: 'CORR-6G1L9',
    sessionId: 'SES-K22C',
    requestId: 'REQ-7731H',
    phiAccessed: true,
    phiFields: ['patient_name', 'medication_name', 'dosage'],
    flagged: false,
    diff: [
      { field: 'dosage', oldValue: '500mg twice daily', newValue: '1000mg once daily', phi: false },
      { field: 'duration_days', oldValue: '7', newValue: '14', phi: false },
      { field: 'notes', oldValue: '', newValue: 'Extended due to persistent infection — reviewed with consultant', phi: false },
    ],
    entryHash: 'sha256:6g1l9m4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a',
    prevHash: 'sha256:1f0j8k3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f9c3d7b1e5f',
  },
  {
    id: 'AE-000010',
    timestamp: '2026-05-04 07:50:00',
    isoTimestamp: '2026-05-04T07:50:00+04:00',
    severity: 'Notice',
    category: 'Configuration',
    event: 'Workspace notification settings updated',
    actorId: 'USR-ADMIN-004',
    actorName: 'Sara Al-Naqbi',
    actorRole: 'Workspace Admin',
    actorType: 'Human Admin',
    resourceType: 'Setting',
    resourceId: 'WS-MEDICLINIC-NOTIF',
    workspace: 'Mediclinic City Hospital',
    portal: 'Admin',
    outcome: 'Success',
    ip: '10.0.3.18',
    location: 'Dubai, AE',
    device: 'Surface Pro 9',
    browser: 'Edge 124',
    correlationId: 'CORR-4H2M0',
    sessionId: 'SES-S71B',
    requestId: 'REQ-8844I',
    phiAccessed: false,
    flagged: false,
    diff: [
      { field: 'email_alerts_critical', oldValue: 'false', newValue: 'true', phi: false },
      { field: 'sms_alerts_critical', oldValue: 'false', newValue: 'true', phi: false },
      { field: 'slack_webhook_url', oldValue: '(none)', newValue: 'https://hooks.slack.com/services/T***...', phi: false },
    ],
    entryHash: 'sha256:4h2m0n5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b',
    prevHash: 'sha256:6g1l9m4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a0d4h8c2f6a',
  },
  {
    id: 'AE-000011',
    timestamp: '2026-05-04 07:44:32',
    isoTimestamp: '2026-05-04T07:44:32+04:00',
    severity: 'Warning',
    category: 'Authorization',
    event: 'Access denied — insufficient permissions for billing records',
    actorId: 'USR-DOC-0512',
    actorName: 'Dr. Nour Khalifa',
    actorRole: 'Resident',
    actorType: 'Human User',
    resourceType: 'Billing',
    resourceId: 'BILL-2024-8812',
    workspace: 'Aster DM Healthcare',
    portal: 'Doctor',
    outcome: 'Blocked',
    ip: '10.12.1.92',
    location: 'Dubai, AE',
    device: 'iPhone 15 Pro',
    browser: 'Safari iOS 17',
    correlationId: 'CORR-9J3N1',
    sessionId: 'SES-N88E',
    requestId: 'REQ-9955J',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:9j3n1o6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c',
    prevHash: 'sha256:4h2m0n5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b1e5i9d3g7b',
  },
  {
    id: 'AE-000012',
    timestamp: '2026-05-04 07:38:17',
    isoTimestamp: '2026-05-04T07:38:17+04:00',
    severity: 'Info',
    category: 'Communication',
    event: 'Secure message sent: doctor to patient',
    actorId: 'USR-DOC-0842',
    actorName: 'Dr. Amira Hassan',
    actorRole: 'Attending Physician',
    actorType: 'Human User',
    resourceType: 'Message',
    resourceId: 'MSG-SEC-4421',
    workspace: 'Aster DM Healthcare',
    portal: 'Doctor',
    outcome: 'Success',
    ip: '10.12.3.44',
    location: 'Dubai, AE',
    device: 'iPad Pro',
    browser: 'Safari 17',
    correlationId: 'CORR-9C3B2',
    sessionId: 'SES-D441',
    requestId: 'REQ-1102K',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:5k4p2q7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e',
    prevHash: 'sha256:9j3n1o6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c2f6k0e4h8c',
  },
  {
    id: 'AE-000013',
    timestamp: '2026-05-04 07:32:44',
    isoTimestamp: '2026-05-04T07:32:44+04:00',
    severity: 'Error',
    category: 'Integration',
    event: 'eClaims submission failed — invalid insurance policy number',
    actorId: 'SVC-ECLAIM',
    actorName: 'eClaims Gateway',
    actorRole: 'Integration',
    actorType: 'Integration',
    resourceType: 'Encounter',
    resourceId: 'ENC-CLM-2241',
    workspace: 'Cleveland Clinic Abu Dhabi',
    portal: 'System',
    outcome: 'Failure',
    ip: '10.0.1.12',
    location: 'UAE East DC, AE',
    correlationId: 'CORR-2M5R3',
    sessionId: 'SES-SVC3',
    requestId: 'REQ-CLM-0041',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:2m5r3p9l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l',
    prevHash: 'sha256:5k4p2q7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e3h7l1f5j9e',
  },
  {
    id: 'AE-000014',
    timestamp: '2026-05-04 07:28:09',
    isoTimestamp: '2026-05-04T07:28:09+04:00',
    severity: 'Notice',
    category: 'Billing',
    event: 'Workspace subscription plan upgraded',
    actorId: 'USR-ADMIN-001',
    actorName: 'Dr. Tariq Al-Mansouri',
    actorRole: 'Super Admin',
    actorType: 'Human Admin',
    resourceType: 'Workspace',
    resourceId: 'WS-NMC-ROYAL',
    resourceName: 'NMC Royal Hospital',
    workspace: 'NMC Royal Hospital',
    portal: 'Admin',
    outcome: 'Success',
    ip: '10.0.4.22',
    location: 'Dubai, AE',
    correlationId: 'CORR-4F2A1',
    sessionId: 'SES-A82F',
    requestId: 'REQ-BIL-0221',
    phiAccessed: false,
    flagged: false,
    diff: [
      { field: 'plan', oldValue: 'Professional', newValue: 'Enterprise', phi: false },
      { field: 'mrr_aed', oldValue: '14,800', newValue: '28,200', phi: false },
      { field: 'effective_date', oldValue: '—', newValue: '2026-05-01', phi: false },
    ],
    entryHash: 'sha256:4q8t6w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s',
    prevHash: 'sha256:2m5r3p9l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l3g7e1d5l',
  },
  {
    id: 'AE-000015',
    timestamp: '2026-05-04 07:22:55',
    isoTimestamp: '2026-05-04T07:22:55+04:00',
    severity: 'Info',
    category: 'System',
    event: 'Scheduled database backup completed successfully',
    actorId: 'SVC-BACKUP',
    actorName: 'Backup Service',
    actorRole: 'Service Account',
    actorType: 'System',
    resourceType: 'Setting',
    resourceId: 'SYS-DB-BACKUP-07',
    workspace: 'Global',
    portal: 'System',
    outcome: 'Success',
    ip: '10.0.1.2',
    location: 'UAE East DC, AE',
    correlationId: 'CORR-7S9V1',
    sessionId: 'SES-SVC7',
    requestId: 'REQ-BCK-0704',
    phiAccessed: false,
    flagged: false,
    entryHash: 'sha256:7s9v1y5a9u3z7v1y5a9u3z7v1y5a9u3z7v1y5a9u3z7v1y5a9u3z7v1y5a9u3z7v',
    prevHash: 'sha256:4q8t6w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s8w2x6r0v4s',
  },
];

// Correlation group: same session entries for detail panel "Related" tab
export const CORR_9C3B2_ENTRIES = AUDIT_ENTRIES.filter(e => e.correlationId === 'CORR-9C3B2');
export const CORR_4F2A1_ENTRIES = AUDIT_ENTRIES.filter(e => e.correlationId === 'CORR-4F2A1');

// ─── KPI Data ────────────────────────────────────────────────────────────────
export const AUDIT_KPIS = {
  totalEvents: { value: 284_920, delta: 3.8, sparkline: [240, 258, 265, 272, 280, 274, 285] },
  phiAccess: { value: 12_441, pct: 4.37, delta: -1.2, sparkline: [11, 12, 13, 12, 13, 12, 12] },
  failures: { value: 1_824, delta: 8.4, sparkline: [1400, 1500, 1700, 1600, 1800, 1700, 1824] },
  highRisk: { value: 342, delta: -5.1, sparkline: [380, 360, 355, 350, 348, 345, 342] },
  uniqueActors: { value: 4_218, delta: 2.1, sparkline: [3900, 4000, 4100, 4050, 4180, 4200, 4218] },
  anomalies: { value: 28, delta: -12.5, breakdown: { critical: 3, high: 8, medium: 11, low: 6 }, sparkline: [40, 36, 32, 30, 29, 31, 28] },
};

// ─── Stats charts ─────────────────────────────────────────────────────────────
export const EVENTS_OVER_TIME = [
  { date: 'Apr 28', Authentication: 4200, 'Data Access': 12400, 'Data Modification': 3800, Integration: 8200, Security: 420, AI: 1800, Other: 2200 },
  { date: 'Apr 29', Authentication: 4800, 'Data Access': 13800, 'Data Modification': 4100, Integration: 8800, Security: 380, AI: 2100, Other: 2400 },
  { date: 'Apr 30', Authentication: 3900, 'Data Access': 11200, 'Data Modification': 3200, Integration: 7800, Security: 410, AI: 1900, Other: 2000 },
  { date: 'May 01', Authentication: 5100, 'Data Access': 14200, 'Data Modification': 4400, Integration: 9200, Security: 440, AI: 2300, Other: 2600 },
  { date: 'May 02', Authentication: 4600, 'Data Access': 13100, 'Data Modification': 4000, Integration: 8600, Security: 395, AI: 2000, Other: 2300 },
  { date: 'May 03', Authentication: 4900, 'Data Access': 13900, 'Data Modification': 4300, Integration: 9000, Security: 428, AI: 2200, Other: 2500 },
  { date: 'May 04', Authentication: 5200, 'Data Access': 14800, 'Data Modification': 4600, Integration: 9400, Security: 460, AI: 2400, Other: 2700 },
];

export const ANOMALY_TREND = [
  { date: 'Apr 28', Critical: 2, High: 6, Medium: 14, Low: 8 },
  { date: 'Apr 29', Critical: 1, High: 7, Medium: 12, Low: 9 },
  { date: 'Apr 30', Critical: 4, High: 9, Medium: 18, Low: 7 },
  { date: 'May 01', Critical: 3, High: 8, Medium: 15, Low: 6 },
  { date: 'May 02', Critical: 2, High: 6, Medium: 11, Low: 5 },
  { date: 'May 03', Critical: 1, High: 5, Medium: 9, Low: 7 },
  { date: 'May 04', Critical: 3, High: 8, Medium: 11, Low: 6 },
];

export const TOP_ACTORS = [
  { name: 'NABIDH Sync Service', role: 'System', count: 28420, type: 'System' },
  { name: 'Dr. Amira Hassan', role: 'Attending Physician', count: 4218, type: 'Human User' },
  { name: 'CeenAiX Clinical AI', role: 'AI Service', count: 3890, type: 'AI Service' },
  { name: 'Dr. Tariq Al-Mansouri', role: 'Super Admin', count: 2104, type: 'Human Admin' },
  { name: 'Fatima Al-Zaabi', role: 'Lead Pharmacist', count: 1842, type: 'Human User' },
  { name: 'eClaims Gateway', role: 'Integration', count: 1640, type: 'Integration' },
  { name: 'Dr. Khalid Mansoor', role: 'GP', count: 1320, type: 'Human User' },
];

export const FAILURE_REASONS = [
  { reason: 'Invalid credentials', count: 620, pct: 34.0 },
  { reason: 'Session expired', count: 440, pct: 24.1 },
  { reason: 'Permission denied', count: 380, pct: 20.8 },
  { reason: 'Rate limit exceeded', count: 210, pct: 11.5 },
  { reason: 'Invalid token', count: 98, pct: 5.4 },
  { reason: 'Other', count: 76, pct: 4.2 },
];

export const GEO_DISTRIBUTION = [
  { country: 'UAE', city: 'Dubai', count: 218400, pct: 76.7, risk: 'low' as const },
  { country: 'UAE', city: 'Abu Dhabi', count: 32100, pct: 11.3, risk: 'low' as const },
  { country: 'UAE', city: 'Sharjah', count: 18200, pct: 6.4, risk: 'low' as const },
  { country: 'India', city: 'Mumbai', count: 4800, pct: 1.7, risk: 'medium' as const },
  { country: 'UK', city: 'London', count: 2200, pct: 0.8, risk: 'medium' as const },
  { country: 'Netherlands', city: 'Rotterdam', count: 420, pct: 0.1, risk: 'high' as const },
  { country: 'Germany', city: 'Frankfurt', count: 310, pct: 0.1, risk: 'medium' as const },
  { country: 'Other', city: '—', count: 8490, pct: 3.0, risk: 'medium' as const },
];

export const AI_USAGE = [
  { model: 'CeenAiX-Clinical-v2.1', calls: 8820, phiCalls: 6410, avgLatencyMs: 1240, topUse: 'Clinical recommendations' },
  { model: 'CeenAiX-Imaging-v1.4', calls: 3200, phiCalls: 3200, avgLatencyMs: 4800, topUse: 'MRI/CT analysis' },
  { model: 'CeenAiX-Pharmacy-v1.0', calls: 2140, phiCalls: 840, avgLatencyMs: 680, topUse: 'Drug interaction checks' },
  { model: 'CeenAiX-Transcription-v2.0', calls: 1820, phiCalls: 1820, avgLatencyMs: 2200, topUse: 'Consultation notes' },
];

export const ANOMALY_FEED = [
  { id: 'ANO-001', severity: 'Critical' as AuditSeverity, summary: 'Bulk PHI export blocked — Farhan Ali attempted to export 4,821 patient records without required permission', time: '5 min ago', score: 95, status: 'Open' as const, entryId: 'AE-000008', suggestedQuery: 'actor=Farhan+Ali&category=Compliance&range=24h' },
  { id: 'ANO-002', severity: 'Critical' as AuditSeverity, summary: '14 consecutive failed logins from Netherlands Tor exit node on Emirates Hospital portal', time: '9 min ago', score: 91, status: 'Open' as const, entryId: 'AE-000005', suggestedQuery: 'ip=185.220.101.48&outcome=Failure' },
  { id: 'ANO-003', severity: 'Warning' as AuditSeverity, summary: 'Admin impersonation with PHI access before business hours (08:09 local) — patient support context recorded', time: '12 min ago', score: 78, status: 'Open' as const, entryId: 'AE-000003', suggestedQuery: 'category=Impersonation&actor=Dr.+Tariq' },
  { id: 'ANO-004', severity: 'Warning' as AuditSeverity, summary: 'Repeated NABIDH submission failures for workspace Emirates Hospital — cert expiry root cause identified', time: '22 min ago', score: 82, status: 'Acknowledged' as const, entryId: 'AE-000006', suggestedQuery: 'category=Integration&workspace=Emirates+Hospital&outcome=Failure' },
  { id: 'ANO-005', severity: 'Warning' as AuditSeverity, summary: 'Production API key rotation without linked change management ticket in ITSM', time: '1 h ago', score: 68, status: 'Investigating' as const, entryId: 'AE-000001', suggestedQuery: 'category=Security&event=API+key+rotation&range=24h' },
];

export const SAVED_VIEWS = [
  { id: 'SV-001', name: "Today's PHI access", shared: true, category: 'Data Access' },
  { id: 'SV-002', name: 'Failed logins (24h)', shared: true, category: 'Authentication' },
  { id: 'SV-003', name: 'All impersonation events', shared: true, category: 'Impersonation' },
  { id: 'SV-004', name: 'Production config changes', shared: true, category: 'Configuration' },
  { id: 'SV-005', name: 'Critical events (7d)', shared: true, category: 'Security' },
  { id: 'SV-006', name: 'Bulk exports', shared: true, category: 'Compliance' },
  { id: 'SV-007', name: 'Sensitive consent changes', shared: false, category: 'Compliance' },
];

export const INTEGRITY_STRIP = {
  chainStatus: 'Verified' as 'Verified' | 'Failed',
  lastVerified: '2026-05-04T07:00:00+04:00',
  totalEntries: 284_920,
  retentionYears: 7,
  lastEntry: '2026-05-04T08:14:22+04:00',
  storageRegion: 'UAE East',
  encryptedAtRest: true,
  wormLocked: true,
};

export const INCIDENTS = [
  { id: 'INC-001', name: 'Suspicious geo-anomaly login attempts', severity: 'Critical' as AuditSeverity, status: 'Investigating' as const, owner: 'Dr. Tariq Al-Mansouri', created: '2026-05-04', entryCount: 3, description: 'Multiple failed login attempts from Netherlands IP targeting Emirates Hospital staff accounts.' },
  { id: 'INC-002', name: 'Unauthorized bulk PHI export attempt', severity: 'Critical' as AuditSeverity, status: 'Open' as const, owner: 'Sara Al-Naqbi', created: '2026-05-04', entryCount: 1, description: 'Workspace admin attempted to export 4,821 patient records without required permission.' },
];
