export type ServiceStatus = 'Operational' | 'Degraded' | 'Partial outage' | 'Major outage';
export type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type IncidentStatus = 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';
export type SlaStatus = 'Met' | 'At risk' | 'Breached';

export interface Service {
  id: string;
  name: string;
  category: 'portal' | 'api' | 'integration' | 'infrastructure';
  status: ServiceStatus;
  uptime24h: string;
  latencyP95: string;
  latencyP50: string;
  errorRate: string;
  version: string;
  owner: string;
  sparkline: number[];
  lastIncident?: string;
  certExpiry?: string;
  throughput?: string;
  successRate?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  started: string;
  duration: string;
  affectedServices: string[];
  impact: string;
  commander: string;
  team: string;
  lastUpdate: string;
  lastUpdateTime: string;
  postmortemRequired: boolean;
  postmortemFiled: boolean;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  services: string[];
  start: string;
  end: string;
  impact: string;
  customerFacing: boolean;
  owner: string;
  status: 'upcoming' | 'in-progress' | 'completed';
}

export interface ErrorSignature {
  id: string;
  signature: string;
  service: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  affectedUsers: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'New' | 'Investigating' | 'Acknowledged' | 'Resolved' | 'Ignored';
  owner?: string;
}

export interface CapacityGauge {
  label: string;
  used: number;
  total: number;
  unit: string;
  warning: number;
  critical: number;
  runway?: string;
}
