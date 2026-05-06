export const SUPER_ADMIN_USER = {
  name: 'Dr. Parnia Yazdkhasti',
  role: 'CEO & Co-Founder',
  company: 'AryAiX LLC',
  initials: 'PY',
  email: 'parnia@aryaix.com',
  access: 'Super Admin · Full Access',
};

export const PLATFORM_INFO = {
  name: 'CeenAiX',
  company: 'AryAiX LLC (Intelligent Ventures)',
  hq: 'Dilan Tower, Al Jadaf, Dubai, UAE',
  dhaLicense: 'DHA-PLAT-2025-001847',
  nabidh: 'Approved',
  version: '2.4.1',
  environment: 'PRODUCTION',
  timestamp: 'Wednesday, 7 April 2026 · 2:07 PM GST',
};

export interface OrgDot {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab' | 'insurance';
  city: string;
  sessions: number;
  active: number;
  x: number;
  y: number;
  isPrimary?: boolean;
}

export const orgDots: OrgDot[] = [
  { id: 'o1', name: 'Al Noor Medical Center', type: 'clinic', city: 'Jumeirah, Dubai', sessions: 234, active: 28, x: 42, y: 52, isPrimary: true },
  { id: 'o2', name: 'Emirates Specialty Hospital', type: 'hospital', city: 'DHCC, Dubai', sessions: 189, active: 22, x: 46, y: 48, isPrimary: true },
  { id: 'o3', name: 'Dubai Medical & Imaging Centre', type: 'lab', city: 'Healthcare City, Dubai', sessions: 156, active: 18, x: 48, y: 50, isPrimary: true },
  { id: 'o4', name: 'Al Shifa Pharmacy', type: 'pharmacy', city: 'Al Barsha, Dubai', sessions: 47, active: 8, x: 38, y: 55, isPrimary: false },
  { id: 'o5', name: 'Gulf Medical Center', type: 'clinic', city: 'Al Barsha, Dubai', sessions: 134, active: 15, x: 36, y: 57, isPrimary: true },
  { id: 'o6', name: 'Daman Insurance', type: 'insurance', city: 'DHCC, Dubai', sessions: 24, active: 4, x: 50, y: 47, isPrimary: false },
  { id: 'o7', name: 'Saudi German Hospital', type: 'hospital', city: 'Al Barsha, Dubai', sessions: 98, active: 11, x: 35, y: 53, isPrimary: false },
  { id: 'o8', name: 'City Medical Center', type: 'clinic', city: 'Deira, Dubai', sessions: 67, active: 9, x: 52, y: 44, isPrimary: false },
  { id: 'o9', name: 'HealthBay Polyclinic', type: 'clinic', city: 'Business Bay, Dubai', sessions: 89, active: 12, x: 44, y: 46, isPrimary: false },
  { id: 'o10', name: 'Aster Pharmacy', type: 'pharmacy', city: 'Jumeirah, Dubai', sessions: 31, active: 5, x: 40, y: 54, isPrimary: false },
  { id: 'o11', name: 'Burjeel Hospital', type: 'hospital', city: 'Abu Dhabi', sessions: 45, active: 7, x: 25, y: 68, isPrimary: false },
  { id: 'o12', name: 'SEHA Al Rahba Hospital', type: 'hospital', city: 'Abu Dhabi', sessions: 38, active: 5, x: 22, y: 72, isPrimary: false },
  { id: 'o13', name: 'University Hospital Sharjah', type: 'hospital', city: 'Sharjah', sessions: 54, active: 8, x: 55, y: 40, isPrimary: false },
  { id: 'o14', name: 'NMC Healthcare Sharjah', type: 'clinic', city: 'Sharjah', sessions: 33, active: 4, x: 57, y: 38, isPrimary: false },
  { id: 'o15', name: 'Gulf Pharmacy RAK', type: 'pharmacy', city: 'Ras Al Khaimah', sessions: 12, active: 2, x: 72, y: 24, isPrimary: false },
  { id: 'o16', name: 'GMC Ajman', type: 'clinic', city: 'Ajman', sessions: 22, active: 3, x: 60, y: 36, isPrimary: false },
  { id: 'o17', name: 'Fujairah Hospital', type: 'hospital', city: 'Fujairah', sessions: 19, active: 3, x: 82, y: 44, isPrimary: false },
  { id: 'o18', name: 'AXA Gulf Insurance', type: 'insurance', city: 'DIFC, Dubai', sessions: 18, active: 3, x: 47, y: 49, isPrimary: false },
];

export interface FeedItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'ai' | 'teal';
  event: string;
  detail: string;
  timeAgo: string;
  seconds: number;
}

export const initialFeedItems: FeedItem[] = [
  { id: 'f1', type: 'success', event: 'New patient registered', detail: 'Mariam Al Suwaidi · Daman Gold · Dubai', timeAgo: 'just now', seconds: 0 },
  { id: 'f2', type: 'teal', event: 'Consultation completed', detail: 'Dr. Ahmed → Aisha Mohammed · Al Noor', timeAgo: '12s ago', seconds: 12 },
  { id: 'f3', type: 'info', event: 'Prescription sent to pharmacy', detail: 'RX-20260407-003124 → Al Shifa Pharmacy', timeAgo: '45s ago', seconds: 45 },
  { id: 'f4', type: 'ai', event: 'AI consultation started', detail: 'Patient #48231 · Symptom checker · Arabic', timeAgo: '1m ago', seconds: 60 },
  { id: 'f5', type: 'success', event: 'Lab results released', detail: 'Dubai Medical Lab → PT-004 · Mohammed Al Shamsi', timeAgo: '1m ago', seconds: 75 },
  { id: 'f6', type: 'warning', event: 'Pre-auth submitted to Daman', detail: 'PA-20260407-00847 · AED 2,500 · Cardiac MRI', timeAgo: '2m ago', seconds: 120 },
  { id: 'f7', type: 'info', event: 'Doctor login · Al Noor Medical', detail: 'Dr. Ahmed Al Rashidi · Dubai · Chrome', timeAgo: '3m ago', seconds: 180 },
  { id: 'f8', type: 'success', event: 'Insurance claim approved', detail: 'CLM-20260407-00481 · AED 360 · Daman Gold', timeAgo: '3m ago', seconds: 210 },
  { id: 'f9', type: 'ai', event: 'AI consultation → doctor escalation', detail: 'Patient #31847 → Dr. Maryam Al Farsi', timeAgo: '4m ago', seconds: 240 },
  { id: 'f10', type: 'warning', event: 'DHA license renewal alert sent', detail: 'Dr. Ahmed Sultan · Expires 25 April 2026', timeAgo: '8m ago', seconds: 480 },
  { id: 'f11', type: 'error', event: 'Failed login blocked', detail: 'IP 182.X.X.X · 3 attempts · Dubai', timeAgo: '12m ago', seconds: 720 },
  { id: 'f12', type: 'teal', event: 'Nabidh sync batch completed', detail: '3,421 records · 8:00 AM bulk sync ✅', timeAgo: '6h ago', seconds: 21600 },
];

export const newFeedTemplates: Omit<FeedItem, 'id' | 'timeAgo' | 'seconds'>[] = [
  { type: 'success', event: 'New patient registered', detail: 'Fatima Al Zaabi · AXA Gulf · Abu Dhabi' },
  { type: 'teal', event: 'Consultation completed', detail: 'Dr. Reem Al Suwaidi → Khalid Bin Talal · DHCC' },
  { type: 'ai', event: 'AI consultation started', detail: 'Patient #48232 · Medication query · English' },
  { type: 'info', event: 'Lab order placed', detail: 'CBC + Lipid Panel → Dubai Medical Lab · PT-047' },
  { type: 'success', event: 'Prescription dispensed', detail: 'DIS-20260407-01229 · Al Shifa Pharmacy ✅' },
  { type: 'info', event: 'Telemedicine session started', detail: 'Dr. Ahmed → Noura Al Marzouqi · Video call' },
  { type: 'success', event: 'Insurance claim submitted', detail: 'CLM-20260407-00482 · AED 1,200 · ADNIC' },
];

export const revenueData = [
  { date: 'Apr 1', total: 89200, ai: 31200, consultation: 42100, lab: 15900 },
  { date: 'Apr 2', total: 98400, ai: 34100, consultation: 46200, lab: 18100 },
  { date: 'Apr 3', total: 112800, ai: 39200, consultation: 52400, lab: 21200 },
  { date: 'Apr 4', total: 104600, ai: 36100, consultation: 49200, lab: 19300 },
  { date: 'Apr 5', total: 98400, ai: 34200, consultation: 46100, lab: 18100 },
  { date: 'Apr 6', total: 124600, ai: 43100, consultation: 58200, lab: 23300 },
  { date: 'Apr 7', total: 187200, ai: 65100, consultation: 87200, lab: 34900 },
];

export const aiBarData = [
  { day: 'Apr 1', sessions: 14200 },
  { day: 'Apr 2', sessions: 16800 },
  { day: 'Apr 3', sessions: 19200 },
  { day: 'Apr 4', sessions: 17100 },
  { day: 'Apr 5', sessions: 15400 },
  { day: 'Apr 6', sessions: 21300 },
  { day: 'Apr 7', sessions: 8921 },
];

export const systemServices = [
  { name: 'API Availability', status: 'healthy' as const, metric: '99.99%', sub: 'Uptime 30d', pct: 99.99 },
  { name: 'Nabidh HIE Sync', status: 'healthy' as const, metric: 'Last: 12s ago', sub: 'Active', pct: 100 },
  { name: 'DHA ePrescription API', status: 'healthy' as const, metric: '340ms', sub: 'Response time', pct: 100 },
  { name: 'Payment Gateway', status: 'healthy' as const, metric: '0 failures', sub: 'Today', pct: 100 },
  { name: 'Claude AI API', status: 'healthy' as const, metric: '2.3s avg', sub: 'Response time', pct: 96 },
  { name: 'Database (Primary)', status: 'healthy' as const, metric: '24ms', sub: 'Response time', pct: 99.98 },
  { name: 'Database (Replica)', status: 'healthy' as const, metric: 'Lag: 0.8s', sub: 'Synced', pct: 99 },
  { name: 'CDN (CloudFront)', status: 'healthy' as const, metric: '99.8%', sub: 'Cache hit rate', pct: 99.8 },
  { name: 'Daman Insurance API', status: 'warning' as const, metric: '3.2s ⚠️', sub: 'Normal <0.8s', pct: 25 },
  { name: 'Background Jobs (14)', status: 'healthy' as const, metric: '14/14 running', sub: '0 failed', pct: 100 },
];

export const integrations = [
  { name: 'Nabidh HIE', status: 'active' as const },
  { name: 'DHA ePrescription', status: 'active' as const },
  { name: 'Daman API', status: 'warning' as const },
  { name: 'ADNIC API', status: 'active' as const },
  { name: 'AXA Gulf API', status: 'active' as const },
  { name: 'Thiqa API', status: 'active' as const },
  { name: 'Dubai Medical Lab', status: 'active' as const },
  { name: 'Emirates Diagnostics', status: 'active' as const },
];

export const alerts = [
  { id: 'a1', type: 'warning' as const, message: "Dr. Ahmed Sultan — DHA license expires in 18 days", action: 'View' },
  { id: 'a2', type: 'error' as const, message: 'IP 182.X.X.X — 3 failed logins · Blocked', action: 'Review' },
  { id: 'a3', type: 'warning' as const, message: 'Daman API slow · 3.2s response', action: 'Check' },
];

export const portals = [
  { id: 'patient', name: 'Patient Portal', icon: 'Heart', color: 'teal', active: 891, status: 'Online', ms: 124 },
  { id: 'doctor', name: 'Doctor Portal', icon: 'Stethoscope', color: 'blue', active: 234, status: 'Online', ms: 89 },
  { id: 'pharmacy', name: 'Pharmacy Portal', icon: 'Pill', color: 'emerald', active: 67, status: 'Online', ms: 112 },
  { id: 'diagnostics', name: 'Diagnostics Portal', icon: 'FlaskConical', color: 'indigo', active: 38, status: 'Online', ms: 98 },
  { id: 'insurance', name: 'Insurance Portal', icon: 'Shield', color: 'amber', active: 14, status: 'Degraded', ms: 3200 },
  { id: 'admin', name: 'Admin Portal', icon: 'Settings', color: 'slate', active: 3, status: 'Online', ms: 67 },
];

export const docLicenseExpiries = [
  { name: 'Dr. Ahmed Sultan', days: 18 },
  { name: 'Dr. Layla Rashid', days: 24 },
  { name: 'Dr. Omar Al Farsi', days: 29 },
];
