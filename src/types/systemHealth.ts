export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export interface Service {
  id: string;
  name: string;
  category: 'portal' | 'api' | 'infrastructure';
  status: ServiceStatus;
  uptimePercent: number;
  responseTime: number;
  lastIncident?: Date;
}

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration: string;
  impact: 'critical' | 'major' | 'minor';
  resolution: string;
  status: 'resolved' | 'ongoing' | 'investigating';
}

export interface SLATarget {
  serviceId: string;
  serviceName: string;
  contractualSLA: number;
  actualUptime: number;
  difference: number;
}

export interface PerformanceMetric {
  timestamp: Date;
  value: number;
}

export interface BackgroundJob {
  id: string;
  name: string;
  status: 'running' | 'queued' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface Integration {
  id: string;
  name: string;
  logoUrl?: string;
  status: 'connected' | 'error' | 'disconnected';
  lastSync: Date;
  dataFlow: 'inbound' | 'outbound' | 'bidirectional';
  description: string;
  errorMessage?: string;
}

export interface APIKey {
  id: string;
  organizationName: string;
  keyPrefix: string;
  scopes: string[];
  createdDate: Date;
  lastUsed: Date;
  rateLimit: number;
  currentUsage: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  organizationName: string;
  deliverySuccessRate: number;
  lastDelivery: Date;
  isActive: boolean;
}

export interface Release {
  version: string;
  deploymentDate: Date;
  changelog: string[];
  status: 'deployed' | 'staging' | 'planned';
  canRollback: boolean;
}

export const MOCK_SERVICES: Service[] = [
  {
    id: 'svc-1',
    name: 'Patient Portal',
    category: 'portal',
    status: 'operational',
    uptimePercent: 99.98,
    responseTime: 145,
    lastIncident: new Date('2026-03-15'),
  },
  {
    id: 'svc-2',
    name: 'Doctor Portal',
    category: 'portal',
    status: 'operational',
    uptimePercent: 99.95,
    responseTime: 167,
    lastIncident: new Date('2026-03-20'),
  },
  {
    id: 'svc-3',
    name: 'Pharmacy Portal',
    category: 'portal',
    status: 'operational',
    uptimePercent: 99.92,
    responseTime: 132,
    lastIncident: new Date('2026-03-28'),
  },
  {
    id: 'svc-4',
    name: 'Lab Portal',
    category: 'portal',
    status: 'operational',
    uptimePercent: 99.97,
    responseTime: 156,
  },
  {
    id: 'svc-5',
    name: 'Super Admin',
    category: 'portal',
    status: 'operational',
    uptimePercent: 99.99,
    responseTime: 123,
  },
  {
    id: 'svc-6',
    name: 'AI Services',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.87,
    responseTime: 2340,
    lastIncident: new Date('2026-04-02'),
  },
  {
    id: 'svc-7',
    name: 'NABIDH API',
    category: 'api',
    status: 'degraded',
    uptimePercent: 98.45,
    responseTime: 3456,
    lastIncident: new Date('2026-04-07'),
  },
  {
    id: 'svc-8',
    name: 'DHA Reporting API',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.91,
    responseTime: 567,
  },
  {
    id: 'svc-9',
    name: 'Payment Gateway',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.99,
    responseTime: 234,
  },
  {
    id: 'svc-10',
    name: 'SMS Service',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.94,
    responseTime: 456,
  },
  {
    id: 'svc-11',
    name: 'Email Service',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.96,
    responseTime: 389,
  },
  {
    id: 'svc-12',
    name: 'WhatsApp API',
    category: 'api',
    status: 'operational',
    uptimePercent: 99.88,
    responseTime: 678,
  },
  {
    id: 'svc-13',
    name: 'Cloud Storage',
    category: 'infrastructure',
    status: 'operational',
    uptimePercent: 99.99,
    responseTime: 89,
  },
  {
    id: 'svc-14',
    name: 'Database Cluster',
    category: 'infrastructure',
    status: 'operational',
    uptimePercent: 99.99,
    responseTime: 12,
  },
  {
    id: 'svc-15',
    name: 'CDN',
    category: 'infrastructure',
    status: 'operational',
    uptimePercent: 99.98,
    responseTime: 45,
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    serviceId: 'svc-7',
    serviceName: 'NABIDH API',
    title: 'Intermittent connectivity issues with NABIDH HIE',
    startTime: new Date('2026-04-07T14:23:00'),
    endTime: new Date('2026-04-07T15:45:00'),
    duration: '82 minutes',
    impact: 'major',
    resolution: 'External issue resolved by NABIDH team. Connection restored.',
    status: 'resolved',
  },
  {
    id: 'inc-2',
    serviceId: 'svc-6',
    serviceName: 'AI Services',
    title: 'AI model response latency spike',
    startTime: new Date('2026-04-02T09:15:00'),
    endTime: new Date('2026-04-02T09:47:00'),
    duration: '32 minutes',
    impact: 'minor',
    resolution: 'Scaled up inference servers to handle increased load.',
    status: 'resolved',
  },
  {
    id: 'inc-3',
    serviceId: 'svc-3',
    serviceName: 'Pharmacy Portal',
    title: 'Prescription search functionality timeout',
    startTime: new Date('2026-03-28T16:30:00'),
    endTime: new Date('2026-03-28T17:12:00'),
    duration: '42 minutes',
    impact: 'minor',
    resolution: 'Database query optimization applied. Index rebuilt.',
    status: 'resolved',
  },
  {
    id: 'inc-4',
    serviceId: 'svc-2',
    serviceName: 'Doctor Portal',
    title: 'SOAP note autosave failure',
    startTime: new Date('2026-03-20T11:05:00'),
    endTime: new Date('2026-03-20T11:23:00'),
    duration: '18 minutes',
    impact: 'minor',
    resolution: 'Redis cache connection issue. Restarted cache cluster.',
    status: 'resolved',
  },
];

export const MOCK_SLA_TARGETS: SLATarget[] = [
  {
    serviceId: 'svc-1',
    serviceName: 'Patient Portal',
    contractualSLA: 99.9,
    actualUptime: 99.98,
    difference: 0.08,
  },
  {
    serviceId: 'svc-6',
    serviceName: 'AI Services',
    contractualSLA: 99.5,
    actualUptime: 99.87,
    difference: 0.37,
  },
  {
    serviceId: 'svc-7',
    serviceName: 'NABIDH API',
    contractualSLA: 99.0,
    actualUptime: 98.45,
    difference: -0.55,
  },
  {
    serviceId: 'svc-14',
    serviceName: 'Database Cluster',
    contractualSLA: 99.95,
    actualUptime: 99.99,
    difference: 0.04,
  },
];

export const MOCK_BACKGROUND_JOBS: BackgroundJob[] = [
  {
    id: 'job-1',
    name: 'NABIDH Daily Sync',
    status: 'running',
    progress: 67,
    startTime: new Date(Date.now() - 15 * 60 * 1000),
    estimatedCompletion: new Date(Date.now() + 8 * 60 * 1000),
  },
  {
    id: 'job-2',
    name: 'Analytics Report Generation',
    status: 'running',
    progress: 34,
    startTime: new Date(Date.now() - 8 * 60 * 1000),
    estimatedCompletion: new Date(Date.now() + 16 * 60 * 1000),
  },
  {
    id: 'job-3',
    name: 'Database Backup',
    status: 'queued',
    progress: 0,
    startTime: new Date(Date.now() + 5 * 60 * 1000),
  },
  {
    id: 'job-4',
    name: 'Email Campaign Delivery',
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 45 * 60 * 1000),
  },
];

export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'int-1',
    name: 'NABIDH HIE',
    status: 'connected',
    lastSync: new Date(Date.now() - 5 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'National Unified Medical Records platform',
  },
  {
    id: 'int-2',
    name: 'DHA Reporting',
    status: 'connected',
    lastSync: new Date(Date.now() - 15 * 60 * 1000),
    dataFlow: 'outbound',
    description: 'Dubai Health Authority regulatory reporting',
  },
  {
    id: 'int-3',
    name: 'UAE PASS',
    status: 'connected',
    lastSync: new Date(Date.now() - 2 * 60 * 1000),
    dataFlow: 'inbound',
    description: 'National digital identity authentication',
  },
  {
    id: 'int-4',
    name: 'Daman Insurance',
    status: 'connected',
    lastSync: new Date(Date.now() - 30 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Insurance claims and eligibility verification',
  },
  {
    id: 'int-5',
    name: 'AXA Insurance',
    status: 'connected',
    lastSync: new Date(Date.now() - 45 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Insurance claims and pre-authorization',
  },
  {
    id: 'int-6',
    name: 'Thiqa',
    status: 'connected',
    lastSync: new Date(Date.now() - 20 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Abu Dhabi insurance scheme',
  },
  {
    id: 'int-7',
    name: 'Emirates Health Services',
    status: 'connected',
    lastSync: new Date(Date.now() - 10 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Federal healthcare provider network',
  },
  {
    id: 'int-8',
    name: 'HL7 FHIR Endpoint',
    status: 'connected',
    lastSync: new Date(Date.now() - 3 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Standardized health data exchange',
  },
  {
    id: 'int-9',
    name: 'Laboratory LIMS',
    status: 'error',
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
    dataFlow: 'inbound',
    description: 'Lab information management system integration',
    errorMessage: 'Authentication token expired',
  },
  {
    id: 'int-10',
    name: 'Pharmacy POS',
    status: 'connected',
    lastSync: new Date(Date.now() - 1 * 60 * 1000),
    dataFlow: 'bidirectional',
    description: 'Point of sale inventory sync',
  },
];

export const MOCK_API_KEYS: APIKey[] = [
  {
    id: 'key-1',
    organizationName: 'Mediclinic Dubai Mall',
    keyPrefix: 'pk_live_MED1234...',
    scopes: ['read:patients', 'write:appointments', 'read:records'],
    createdDate: new Date('2025-11-15'),
    lastUsed: new Date(Date.now() - 5 * 60 * 1000),
    rateLimit: 10000,
    currentUsage: 8934,
  },
  {
    id: 'key-2',
    organizationName: 'Aster Pharmacy Marina',
    keyPrefix: 'pk_live_AST5678...',
    scopes: ['read:prescriptions', 'write:dispensing'],
    createdDate: new Date('2025-12-03'),
    lastUsed: new Date(Date.now() - 15 * 60 * 1000),
    rateLimit: 5000,
    currentUsage: 2341,
  },
  {
    id: 'key-3',
    organizationName: 'Unilabs Dubai',
    keyPrefix: 'pk_live_UNI9012...',
    scopes: ['read:orders', 'write:results'],
    createdDate: new Date('2026-01-10'),
    lastUsed: new Date(Date.now() - 30 * 60 * 1000),
    rateLimit: 8000,
    currentUsage: 7856,
  },
  {
    id: 'key-4',
    organizationName: 'HealthHub AI',
    keyPrefix: 'pk_live_HHA3456...',
    scopes: ['read:analytics', 'read:population_health'],
    createdDate: new Date('2026-02-20'),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    rateLimit: 15000,
    currentUsage: 4532,
  },
];

export const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: 'hook-1',
    url: 'https://mediclinic.ae/api/webhooks/ceenaix',
    events: ['appointment.created', 'appointment.updated', 'record.updated'],
    organizationName: 'Mediclinic Dubai Mall',
    deliverySuccessRate: 99.8,
    lastDelivery: new Date(Date.now() - 10 * 60 * 1000),
    isActive: true,
  },
  {
    id: 'hook-2',
    url: 'https://aster.ae/webhooks/pharmacy',
    events: ['prescription.created', 'prescription.dispensed'],
    organizationName: 'Aster Pharmacy Marina',
    deliverySuccessRate: 98.5,
    lastDelivery: new Date(Date.now() - 25 * 60 * 1000),
    isActive: true,
  },
  {
    id: 'hook-3',
    url: 'https://unilabs.ae/api/v2/webhooks',
    events: ['lab_order.created', 'lab_result.verified'],
    organizationName: 'Unilabs Dubai',
    deliverySuccessRate: 97.2,
    lastDelivery: new Date(Date.now() - 45 * 60 * 1000),
    isActive: true,
  },
];

export const MOCK_RELEASES: Release[] = [
  {
    version: 'v3.2.1',
    deploymentDate: new Date('2026-04-05'),
    changelog: [
      'Fixed NABIDH sync performance issues',
      'Improved AI clinical insights accuracy',
      'Added bulk prescription dispensing workflow',
      'Security patch for authentication tokens',
      'Enhanced telemedicine video quality',
    ],
    status: 'deployed',
    canRollback: true,
  },
  {
    version: 'v3.2.0',
    deploymentDate: new Date('2026-03-22'),
    changelog: [
      'Launched Compliance & Audit dashboard',
      'Added organization management portal',
      'Implemented advanced analytics for population health',
      'New pharmacy inventory management system',
      'Enhanced laboratory workflow automation',
    ],
    status: 'deployed',
    canRollback: true,
  },
  {
    version: 'v3.1.8',
    deploymentDate: new Date('2026-03-10'),
    changelog: [
      'Performance improvements for patient portal',
      'Fixed doctor dashboard loading issues',
      'Updated DHA compliance requirements',
      'Improved mobile responsiveness',
    ],
    status: 'deployed',
    canRollback: false,
  },
  {
    version: 'v3.3.0',
    deploymentDate: new Date('2026-04-20'),
    changelog: [
      'AI-powered predictive analytics for patient outcomes',
      'Multi-language support (Arabic, Hindi, Urdu)',
      'Advanced telemedicine features with AI assistant',
      'Integrated pharmacy benefit management',
      'Enhanced security with biometric authentication',
    ],
    status: 'planned',
    canRollback: false,
  },
];
