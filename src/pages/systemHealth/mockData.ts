import type { Service, Incident, MaintenanceWindow, ErrorSignature, CapacityGauge } from './types';

function spark(base = 70, variance = 20): number[] {
  return Array.from({ length: 24 }, () => Math.max(0, base + (Math.random() - 0.5) * variance * 2));
}

export const SERVICES: Service[] = [
  // Portals
  { id: 'patient-portal', name: 'Patient Portal', category: 'portal', status: 'Operational', uptime24h: '100.00%', latencyP95: '210ms', latencyP50: '124ms', errorRate: '0.01%', version: '2.4.1', owner: 'Platform', sparkline: spark(85, 8) },
  { id: 'doctor-portal', name: 'Doctor Portal', category: 'portal', status: 'Operational', uptime24h: '100.00%', latencyP95: '145ms', latencyP50: '89ms', errorRate: '0.00%', version: '2.4.1', owner: 'Platform', sparkline: spark(88, 6) },
  { id: 'pharmacy-portal', name: 'Pharmacy Portal', category: 'portal', status: 'Operational', uptime24h: '99.98%', latencyP95: '180ms', latencyP50: '112ms', errorRate: '0.02%', version: '2.3.8', owner: 'Platform', sparkline: spark(83, 9) },
  { id: 'lab-portal', name: 'Lab & Radiology Portal', category: 'portal', status: 'Operational', uptime24h: '100.00%', latencyP95: '198ms', latencyP50: '130ms', errorRate: '0.00%', version: '2.4.0', owner: 'Platform', sparkline: spark(86, 7) },
  { id: 'insurance-portal', name: 'Insurance Portal', category: 'portal', status: 'Degraded', uptime24h: '98.70%', latencyP95: '5100ms', latencyP50: '3200ms', errorRate: '2.40%', version: '2.4.1', owner: 'Integrations', sparkline: spark(60, 30), lastIncident: '45m ago' },
  { id: 'admin-portal', name: 'Super Admin Portal', category: 'portal', status: 'Operational', uptime24h: '100.00%', latencyP95: '98ms', latencyP50: '67ms', errorRate: '0.00%', version: '2.4.1', owner: 'Platform', sparkline: spark(90, 5) },
  { id: 'public-site', name: 'Public Site', category: 'portal', status: 'Operational', uptime24h: '100.00%', latencyP95: '88ms', latencyP50: '42ms', errorRate: '0.00%', version: '1.9.2', owner: 'Marketing', sparkline: spark(92, 4) },
  // Core APIs
  { id: 'auth', name: 'Auth & Identity', category: 'api', status: 'Operational', uptime24h: '100.00%', latencyP95: '89ms', latencyP50: '45ms', errorRate: '0.00%', version: '3.1.0', owner: 'Security', sparkline: spark(95, 3) },
  { id: 'clinical-records', name: 'Clinical Records API', category: 'api', status: 'Operational', uptime24h: '99.99%', latencyP95: '320ms', latencyP50: '180ms', errorRate: '0.00%', version: '2.4.1', owner: 'Clinical', sparkline: spark(87, 8) },
  { id: 'scheduling', name: 'Scheduling API', category: 'api', status: 'Operational', uptime24h: '99.97%', latencyP95: '200ms', latencyP50: '110ms', errorRate: '0.01%', version: '2.2.5', owner: 'Platform', sparkline: spark(88, 7) },
  { id: 'billing', name: 'Billing API', category: 'api', status: 'Operational', uptime24h: '100.00%', latencyP95: '250ms', latencyP50: '140ms', errorRate: '0.00%', version: '2.1.3', owner: 'Finance', sparkline: spark(90, 5) },
  { id: 'notifications', name: 'Notifications API', category: 'api', status: 'Operational', uptime24h: '99.95%', latencyP95: '160ms', latencyP50: '90ms', errorRate: '0.03%', version: '1.8.2', owner: 'Platform', sparkline: spark(85, 10) },
  { id: 'file-storage', name: 'File Storage API', category: 'api', status: 'Operational', uptime24h: '100.00%', latencyP95: '160ms', latencyP50: '98ms', errorRate: '0.00%', version: '2.0.1', owner: 'Infrastructure', sparkline: spark(89, 6) },
  { id: 'search', name: 'Search API', category: 'api', status: 'Operational', uptime24h: '99.92%', latencyP95: '180ms', latencyP50: '95ms', errorRate: '0.05%', version: '1.5.4', owner: 'Platform', sparkline: spark(84, 11) },
  // Integrations
  { id: 'dha-sheryan', name: 'DHA Sheryan', category: 'integration', status: 'Operational', uptime24h: '100.00%', latencyP95: '600ms', latencyP50: '340ms', errorRate: '0.00%', version: 'v2.1', owner: 'Compliance', sparkline: spark(88, 9), certExpiry: '2026-11-15', throughput: '1.2k/h', successRate: '99.98%' },
  { id: 'nabidh', name: 'NABIDH Gateway', category: 'integration', status: 'Operational', uptime24h: '99.96%', latencyP95: '520ms', latencyP50: '310ms', errorRate: '0.04%', version: 'HL7 FHIR R4', owner: 'Compliance', sparkline: spark(87, 10), certExpiry: '2026-08-20', throughput: '3.4k/h', successRate: '99.96%' },
  { id: 'fhir', name: 'FHIR R4 Endpoint', category: 'integration', status: 'Operational', uptime24h: '99.99%', latencyP95: '320ms', latencyP50: '180ms', errorRate: '0.00%', version: 'R4', owner: 'Clinical', sparkline: spark(90, 6), throughput: '2.1k/h', successRate: '100%' },
  { id: 'hl7', name: 'HL7 Message Bus', category: 'integration', status: 'Operational', uptime24h: '100.00%', latencyP95: '140ms', latencyP50: '95ms', errorRate: '0.00%', version: 'v2.5.1', owner: 'Clinical', sparkline: spark(92, 5), throughput: '0.8k/h', successRate: '100%' },
  { id: 'dicom', name: 'DICOM Service', category: 'integration', status: 'Operational', uptime24h: '99.90%', latencyP95: '1200ms', latencyP50: '800ms', errorRate: '0.08%', version: '3.0', owner: 'Radiology', sparkline: spark(82, 14), throughput: '120/h', successRate: '99.92%' },
  { id: 'payment', name: 'Payment Gateway', category: 'integration', status: 'Operational', uptime24h: '100.00%', latencyP95: '380ms', latencyP50: '210ms', errorRate: '0.00%', version: 'v3', owner: 'Finance', sparkline: spark(91, 5), certExpiry: '2026-07-01', throughput: '340/h', successRate: '99.99%' },
  { id: 'sms', name: 'SMS Provider', category: 'integration', status: 'Operational', uptime24h: '99.98%', latencyP95: '700ms', latencyP50: '445ms', errorRate: '0.01%', version: '-', owner: 'Platform', sparkline: spark(86, 9), throughput: '2.8k/h', successRate: '99.98%' },
  { id: 'email', name: 'Email Provider', category: 'integration', status: 'Operational', uptime24h: '99.95%', latencyP95: '500ms', latencyP50: '320ms', errorRate: '0.01%', version: '-', owner: 'Platform', sparkline: spark(85, 10), throughput: '1.5k/h', successRate: '99.95%' },
  // Infrastructure
  { id: 'db-primary', name: 'Database (Primary)', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '41ms', latencyP50: '24ms', errorRate: '0.00%', version: 'PG 15.4', owner: 'Infrastructure', sparkline: spark(95, 3) },
  { id: 'db-replica', name: 'Database (Replica)', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '48ms', latencyP50: '28ms', errorRate: '0.00%', version: 'PG 15.4', owner: 'Infrastructure', sparkline: spark(94, 3) },
  { id: 'cache', name: 'Cache (Redis)', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '4ms', latencyP50: '2ms', errorRate: '0.00%', version: '7.2', owner: 'Infrastructure', sparkline: spark(97, 2) },
  { id: 'object-storage', name: 'Object Storage', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '160ms', latencyP50: '98ms', errorRate: '0.00%', version: 'S3-compat', owner: 'Infrastructure', sparkline: spark(90, 5) },
  { id: 'cdn', name: 'CDN', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '32ms', latencyP50: '18ms', errorRate: '0.00%', version: '-', owner: 'Infrastructure', sparkline: spark(96, 3) },
  { id: 'queue', name: 'Message Queue', category: 'infrastructure', status: 'Operational', uptime24h: '100.00%', latencyP95: '12ms', latencyP50: '6ms', errorRate: '0.00%', version: 'PGMQ', owner: 'Infrastructure', sparkline: spark(93, 4) },
  { id: 'workers', name: 'Background Workers', category: 'infrastructure', status: 'Operational', uptime24h: '99.98%', latencyP95: '-', latencyP50: '-', errorRate: '0.01%', version: '-', owner: 'Infrastructure', sparkline: spark(91, 6) },
];

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-0412',
    title: 'Insurance Portal API elevated latency',
    severity: 'SEV2',
    status: 'Investigating',
    started: '2026-05-04 13:22 GST',
    duration: '45m',
    affectedServices: ['Insurance Portal', 'Billing API'],
    impact: 'Insurance portal users experiencing slow page loads (3-5s). Claim submissions may timeout.',
    commander: 'Ahmed Al-Rashid',
    team: 'Platform Reliability',
    lastUpdate: 'Root cause identified: database connection pool exhaustion on insurance-shard. Mitigation in progress.',
    lastUpdateTime: '13:58 GST',
    postmortemRequired: true,
    postmortemFiled: false,
  },
  {
    id: 'INC-2026-0389',
    title: 'NABIDH submission failures — batch 2026-04-28',
    severity: 'SEV2',
    status: 'Resolved',
    started: '2026-04-28 09:14 GST',
    duration: '2h 18m',
    affectedServices: ['NABIDH Gateway', 'Clinical Records API'],
    impact: '1,240 NABIDH submissions failed. All requeued and submitted successfully after fix.',
    commander: 'Sara Khalil',
    team: 'Integrations',
    lastUpdate: 'All failed submissions reprocessed. No data loss. Postmortem scheduled.',
    lastUpdateTime: '11:32 GST',
    postmortemRequired: true,
    postmortemFiled: true,
  },
  {
    id: 'INC-2026-0341',
    title: 'Auth service latency spike',
    severity: 'SEV3',
    status: 'Resolved',
    started: '2026-04-15 18:40 GST',
    duration: '22m',
    affectedServices: ['Auth & Identity'],
    impact: 'Login latency increased 3x for ~22 minutes. No authentication failures.',
    commander: 'Omar Siddiqui',
    team: 'Security',
    lastUpdate: 'Resolved via cache warm-up. Monitoring for recurrence.',
    lastUpdateTime: '19:02 GST',
    postmortemRequired: false,
    postmortemFiled: false,
  },
];

export const MAINTENANCE_WINDOWS: MaintenanceWindow[] = [
  {
    id: 'MW-2026-042',
    title: 'Database maintenance & index rebuild',
    services: ['Database (Primary)', 'Database (Replica)', 'Clinical Records API'],
    start: '2026-05-05 02:00 GST',
    end: '2026-05-05 04:00 GST',
    impact: 'Read replica unavailable for up to 2 minutes. Write operations unaffected.',
    customerFacing: false,
    owner: 'Infrastructure',
    status: 'upcoming',
  },
  {
    id: 'MW-2026-041',
    title: 'NABIDH certificate rotation',
    services: ['NABIDH Gateway'],
    start: '2026-05-10 00:00 GST',
    end: '2026-05-10 00:30 GST',
    impact: 'NABIDH submissions paused for ~10 minutes. Queued submissions will process after window.',
    customerFacing: true,
    owner: 'Compliance',
    status: 'upcoming',
  },
  {
    id: 'MW-2026-039',
    title: 'CDN configuration update',
    services: ['CDN', 'Public Site'],
    start: '2026-05-01 03:00 GST',
    end: '2026-05-01 03:20 GST',
    impact: 'Brief cache purge. No user-visible impact expected.',
    customerFacing: false,
    owner: 'Infrastructure',
    status: 'completed',
  },
];

export const ERROR_SIGNATURES: ErrorSignature[] = [
  { id: 'ERR-001', signature: 'ConnectionPool::exhausted — insurance-shard (PG)', service: 'Insurance Portal', firstSeen: '13:22 GST', lastSeen: '14:05 GST', occurrences: 4821, affectedUsers: 312, severity: 'high', status: 'Investigating', owner: 'Ahmed Al-Rashid' },
  { id: 'ERR-002', signature: 'NABIDH::SubmissionTimeout (HTTP 504)', service: 'NABIDH Gateway', firstSeen: '2026-04-28', lastSeen: '2026-04-28', occurrences: 1240, affectedUsers: 0, severity: 'high', status: 'Resolved' },
  { id: 'ERR-003', signature: 'DICOM::TransferSyntaxMismatch — StudyUID mismatch', service: 'DICOM Service', firstSeen: '2026-04-20', lastSeen: '2026-05-04', occurrences: 88, affectedUsers: 21, severity: 'medium', status: 'Acknowledged', owner: 'Radiology Team' },
  { id: 'ERR-004', signature: 'Search::IndexLagExceeded (>30s)', service: 'Search API', firstSeen: '2026-05-02', lastSeen: '2026-05-03', occurrences: 34, affectedUsers: 0, severity: 'low', status: 'New' },
  { id: 'ERR-005', signature: 'Auth::TokenRefreshRaceCondition', service: 'Auth & Identity', firstSeen: '2026-04-10', lastSeen: '2026-04-10', occurrences: 12, affectedUsers: 12, severity: 'medium', status: 'Resolved' },
];

export const CAPACITY_GAUGES: CapacityGauge[] = [
  { label: 'DB Connections', used: 340, total: 500, unit: 'conn', warning: 80, critical: 90 },
  { label: 'DB Storage', used: 1.8, total: 5, unit: 'TB', warning: 70, critical: 85, runway: '94 days' },
  { label: 'Cache Memory', used: 12.4, total: 32, unit: 'GB', warning: 75, critical: 90 },
  { label: 'Queue Depth', used: 142, total: 10000, unit: 'jobs', warning: 60, critical: 80 },
  { label: 'Worker Capacity', used: 18, total: 40, unit: 'workers', warning: 70, critical: 85 },
  { label: 'Object Storage', used: 4.2, total: 20, unit: 'TB', warning: 70, critical: 85, runway: '180 days' },
  { label: 'NABIDH Concurrency', used: 8, total: 20, unit: 'slots', warning: 75, critical: 90 },
  { label: 'AI Rate Limit', used: 62, total: 100, unit: '%', warning: 80, critical: 95 },
];

export const LIVE_FEED = [
  { id: 'f1', type: 'warning' as const, msg: 'Insurance Portal API: latency spike detected', service: 'Insurance Portal', time: '14:05' },
  { id: 'f2', type: 'info' as const, msg: 'Deploy v2.4.1 → Patient Portal completed', service: 'Patient Portal', time: '13:50' },
  { id: 'f3', type: 'success' as const, msg: 'NABIDH health check passed', service: 'NABIDH Gateway', time: '13:45' },
  { id: 'f4', type: 'warning' as const, msg: 'DB connection pool at 68% — insurance-shard', service: 'Database', time: '13:40' },
  { id: 'f5', type: 'info' as const, msg: 'Auto-scale: +2 workers added to billing queue', service: 'Background Workers', time: '13:30' },
  { id: 'f6', type: 'success' as const, msg: 'SSL certificate rotated — api.ceenaix.ae', service: 'Networking', time: '12:55' },
  { id: 'f7', type: 'info' as const, msg: 'Deploy v2.4.1 → Doctor Portal completed', service: 'Doctor Portal', time: '12:40' },
  { id: 'f8', type: 'info' as const, msg: 'Search index rebalance completed', service: 'Search API', time: '12:15' },
  { id: 'f9', type: 'success' as const, msg: 'DHA Sheryan health check passed', service: 'DHA Sheryan', time: '12:00' },
  { id: 'f10', type: 'info' as const, msg: 'Backup completed: db-primary (2.1GB, 4m 12s)', service: 'Database', time: '11:30' },
];
