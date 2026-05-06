export type NotificationCategory =
  | 'all'
  | 'clinical-alerts'
  | 'appointments'
  | 'lab-results'
  | 'prescriptions'
  | 'messages'
  | 'system'
  | 'ai-insights'
  | 'compliance';

export type NotificationType =
  | 'appointment-reminder'
  | 'lab-result-ready'
  | 'medication-refill'
  | 'ai-health-alert'
  | 'doctor-message'
  | 'prescription-ready'
  | 'critical-lab-value'
  | 'prescription-interaction'
  | 'appointment-start'
  | 'referral-received'
  | 'patient-message'
  | 'ai-clinical-insight'
  | 'new-prescription-received'
  | 'interaction-alert'
  | 'stock-low'
  | 'insurance-preauth-response'
  | 'new-test-order'
  | 'critical-result-notification'
  | 'qc-failure'
  | 'nabidh-submission'
  | 'compliance-alert'
  | 'system-health-event'
  | 'new-org-registration'
  | 'dha-notification';

export type UserRole = 'patient' | 'doctor' | 'pharmacy' | 'lab' | 'admin';

export type DeliveryChannel = 'in-app' | 'push' | 'sms' | 'email' | 'whatsapp';

export type NotificationFrequency = 'immediate' | 'daily-digest' | 'weekly';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  category: NotificationCategory;
  channels: DeliveryChannel[];
  frequency: NotificationFrequency;
  enabled: boolean;
}

export const CATEGORY_CONFIG = [
  { id: 'all', label: 'All', color: 'slate' },
  { id: 'clinical-alerts', label: 'Clinical Alerts', color: 'rose' },
  { id: 'appointments', label: 'Appointments', color: 'blue' },
  { id: 'lab-results', label: 'Lab Results', color: 'green' },
  { id: 'prescriptions', label: 'Prescriptions', color: 'purple' },
  { id: 'messages', label: 'Messages', color: 'cyan' },
  { id: 'system', label: 'System', color: 'slate' },
  { id: 'ai-insights', label: 'AI Insights', color: 'violet' },
  { id: 'compliance', label: 'Compliance', color: 'amber' },
] as const;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings[] = [
  {
    category: 'clinical-alerts',
    channels: ['in-app', 'push', 'sms'],
    frequency: 'immediate',
    enabled: true,
  },
  {
    category: 'appointments',
    channels: ['in-app', 'push', 'email'],
    frequency: 'immediate',
    enabled: true,
  },
  {
    category: 'lab-results',
    channels: ['in-app', 'push'],
    frequency: 'immediate',
    enabled: true,
  },
  {
    category: 'prescriptions',
    channels: ['in-app', 'push'],
    frequency: 'immediate',
    enabled: true,
  },
  {
    category: 'messages',
    channels: ['in-app', 'push'],
    frequency: 'immediate',
    enabled: true,
  },
  {
    category: 'system',
    channels: ['in-app', 'email'],
    frequency: 'daily-digest',
    enabled: true,
  },
  {
    category: 'ai-insights',
    channels: ['in-app'],
    frequency: 'daily-digest',
    enabled: true,
  },
  {
    category: 'compliance',
    channels: ['in-app', 'email'],
    frequency: 'immediate',
    enabled: true,
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'critical-lab-value',
    category: 'clinical-alerts',
    title: 'Critical Lab Value Alert',
    description: 'Patient Ahmed Al Maktoum - Potassium: 6.2 mmol/L (Critical High). Immediate review required.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    source: 'Laboratory Dashboard',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'notif-002',
    type: 'ai-clinical-insight',
    category: 'ai-insights',
    title: 'AI Clinical Insight: Drug Interaction Risk',
    description: 'Patient Maria Santos - New prescription (Warfarin) has potential interaction with existing medication (Aspirin). Review recommended.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    source: 'AI Clinical Assistant',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'notif-003',
    type: 'appointment-start',
    category: 'appointments',
    title: 'Appointment Starting in 15 Minutes',
    description: 'Teleconsultation with Fatima Hassan scheduled at 2:30 PM. Review patient chart before starting.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    source: 'Appointments',
    isRead: false,
    priority: 'medium',
  },
  {
    id: 'notif-004',
    type: 'new-prescription-received',
    category: 'prescriptions',
    title: 'New E-Prescription Received',
    description: 'Prescription #RX-4521 from Dr. Sarah Johnson for patient Raj Kumar. 3 medications requiring dispensing.',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    source: 'Pharmacy Queue',
    isRead: false,
    priority: 'medium',
  },
  {
    id: 'notif-005',
    type: 'lab-result-ready',
    category: 'lab-results',
    title: 'Lab Results Available',
    description: 'Your Complete Blood Count (CBC) results are ready. View in Health Records.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    source: 'My Health',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-006',
    type: 'compliance-alert',
    category: 'compliance',
    title: 'DHA Compliance Review Required',
    description: 'Monthly NABIDH submission deadline in 3 days. 12 patient records pending review.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    source: 'Compliance Dashboard',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'notif-007',
    type: 'patient-message',
    category: 'messages',
    title: 'New Patient Message',
    description: 'John Williams sent a message: "Can I get a refill on my blood pressure medication?"',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    source: 'Messages',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-008',
    type: 'medication-refill',
    category: 'prescriptions',
    title: 'Medication Refill Due',
    description: 'Your Metformin prescription is due for refill in 3 days. Order now to avoid gaps in treatment.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    source: 'My Medications',
    isRead: false,
    priority: 'medium',
  },
  {
    id: 'notif-009',
    type: 'stock-low',
    category: 'system',
    title: 'Low Stock Alert',
    description: 'Amoxicillin 500mg - Current stock: 45 units. Reorder threshold: 50 units.',
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
    source: 'Inventory Management',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-010',
    type: 'insurance-preauth-response',
    category: 'prescriptions',
    title: 'Insurance Pre-Authorization Approved',
    description: 'Pre-auth for Coronary Angioplasty (PA-001) approved by Daman Insurance. Valid for 30 days.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    source: 'Insurance Portal',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-011',
    type: 'ai-health-alert',
    category: 'ai-insights',
    title: 'AI Health Pattern Detected',
    description: 'Your blood pressure readings show an upward trend over the past 2 weeks. Consider scheduling a checkup.',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
    source: 'AI Health Assistant',
    isRead: false,
    priority: 'medium',
  },
  {
    id: 'notif-012',
    type: 'appointment-reminder',
    category: 'appointments',
    title: 'Appointment Reminder',
    description: 'You have an appointment with Dr. Ahmed Khalil tomorrow at 10:00 AM at Mediclinic Dubai Mall.',
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000),
    source: 'Appointments',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-013',
    type: 'qc-failure',
    category: 'clinical-alerts',
    title: 'Quality Control Failure',
    description: 'Hematology analyzer QC failed for Level 2 control. Instrument locked until QC passes.',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    source: 'Laboratory Dashboard',
    isRead: true,
    priority: 'high',
  },
  {
    id: 'notif-014',
    type: 'system-health-event',
    category: 'system',
    title: 'System Maintenance Scheduled',
    description: 'Scheduled maintenance on Saturday, 2:00 AM - 4:00 AM. EMR system will be unavailable.',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    source: 'System Admin',
    isRead: true,
    priority: 'low',
  },
  {
    id: 'notif-015',
    type: 'new-org-registration',
    category: 'system',
    title: 'New Healthcare Organization Registered',
    description: 'Al Zahra Hospital - Dubai has completed registration and is pending approval.',
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000),
    source: 'Organization Management',
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'notif-016',
    type: 'prescription-ready',
    category: 'prescriptions',
    title: 'Prescription Ready for Pickup',
    description: 'Your prescription is ready at Aster Pharmacy - Dubai Mall. Bring your Emirates ID.',
    timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000),
    source: 'Pharmacy',
    isRead: true,
    priority: 'medium',
  },
];
