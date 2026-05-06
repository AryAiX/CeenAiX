export type PatientStatus = 'active' | 'inactive' | 'flagged' | 'suspended';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type InsuranceProvider =
  | 'Daman Gold' | 'Daman Silver' | 'Daman Basic'
  | 'AXA Gulf' | 'ADNIC' | 'Thiqa' | 'Oman Insurance' | 'Cash';

export interface AdminPatient {
  id: string;
  ptId: string;
  name: string;
  nameAr?: string;
  initials: string;
  avatarGradient: string;
  age: number;
  gender: 'M' | 'F';
  bloodType: string;
  emiratesId: string;
  insurance: InsuranceProvider;
  policyNumber: string;
  location: string;
  joined: string;
  lastActive: string;
  lastActiveRelative: string;
  lastActiveColor: string;
  risk: RiskLevel;
  status: PatientStatus;
  isPremium?: boolean;
  flagReason?: string;
  email: string;
  phone: string;
  nationality: string;
  address: string;
  language: string;
  dob: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  appointmentsCount: number;
  labResultsCount: number;
  aiSessionsCount: number;
  messagesCount: number;
  nabidh: boolean;
  twoFA: boolean;
  careTeam: { name: string; specialty: string; isPrimary?: boolean }[];
}

export const mockPatients: AdminPatient[] = [
  {
    id: '1', ptId: 'PT-001', name: 'Parnia Yazdkhasti', nameAr: 'بارنيا يزدخاستي',
    initials: 'PY', avatarGradient: 'linear-gradient(135deg, #0D9488, #0891B2)',
    age: 38, gender: 'F', bloodType: 'A+',
    emiratesId: '784-1988-3047821-3', insurance: 'Daman Gold', policyNumber: 'DAM-2024-IND-047821',
    location: 'Dubai', joined: 'Jan 2024', lastActive: 'Just now', lastActiveRelative: 'Just now',
    lastActiveColor: '#34D399', risk: 'medium', status: 'active', isPremium: true,
    email: 'parnia.yazdkhasti@email.com', phone: '+971 55 123 4567',
    nationality: 'Iranian', address: 'Dilan Tower, Al Jadaf, Dubai',
    language: 'Farsi | English', dob: '22 Mar 1988',
    allergies: ['Penicillin (SEVERE)', 'Sulfa drugs'],
    conditions: ['Hypertension I10', 'T2 Diabetes E11.9', 'CAC Score 42', 'Hepatic Steatosis'],
    medications: ['Atorvastatin 20mg', 'Amlodipine 5mg', 'Metformin 850mg'],
    appointmentsCount: 12, labResultsCount: 24, aiSessionsCount: 34, messagesCount: 47,
    nabidh: true, twoFA: true,
    careTeam: [
      { name: 'Dr. Ahmed Al Rashidi', specialty: 'Cardiologist', isPrimary: true },
      { name: 'Dr. Fatima Al Mansoori', specialty: 'Endocrinologist' },
    ],
  },
  {
    id: '2', ptId: 'PT-002', name: 'Khalid Hassan Abdullah',
    initials: 'KH', avatarGradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    age: 54, gender: 'M', bloodType: 'B+',
    emiratesId: '784-1970-5821049-1', insurance: 'ADNIC', policyNumber: 'ADN-2023-IND-089134',
    location: 'Dubai', joined: 'Jan 2024', lastActive: '2 hours ago', lastActiveRelative: '2 hours ago',
    lastActiveColor: '#6EE7B7', risk: 'low', status: 'active',
    email: 'khalid.hassan@email.com', phone: '+971 50 987 6543',
    nationality: 'Emirati', address: 'Jumeirah 1, Dubai',
    language: 'Arabic | English', dob: '15 Jun 1970',
    allergies: [],
    conditions: ['Hypertension I10', 'Hyperlipidemia'],
    medications: ['Amlodipine 5mg', 'Rosuvastatin 10mg'],
    appointmentsCount: 8, labResultsCount: 15, aiSessionsCount: 12, messagesCount: 23,
    nabidh: true, twoFA: false,
    careTeam: [{ name: 'Dr. Ahmed Al Rashidi', specialty: 'Cardiologist', isPrimary: true }],
  },
  {
    id: '3', ptId: 'PT-003', name: 'Fatima Bint Rashid',
    initials: 'FB', avatarGradient: 'linear-gradient(135deg, #059669, #0D9488)',
    age: 41, gender: 'F', bloodType: 'O+',
    emiratesId: '784-1983-2938471-2', insurance: 'Thiqa', policyNumber: 'THQ-2024-IND-021847',
    location: 'Abu Dhabi', joined: 'Feb 2024', lastActive: 'Yesterday', lastActiveRelative: 'Yesterday',
    lastActiveColor: '#CBD5E1', risk: 'low', status: 'active',
    email: 'fatima.rashid@email.com', phone: '+971 56 234 5678',
    nationality: 'Emirati', address: 'Khalidiyah, Abu Dhabi',
    language: 'Arabic', dob: '3 Feb 1983',
    allergies: ['Aspirin'],
    conditions: ['T2 Diabetes E11.9', 'Thyroid disorder'],
    medications: ['Metformin 500mg', 'Levothyroxine 50mcg'],
    appointmentsCount: 6, labResultsCount: 18, aiSessionsCount: 8, messagesCount: 14,
    nabidh: true, twoFA: true,
    careTeam: [{ name: 'Dr. Sara Al Falasi', specialty: 'Endocrinologist', isPrimary: true }],
  },
  {
    id: '4', ptId: 'PT-004', name: 'Mohammed Rashid Al Shamsi',
    initials: 'MS', avatarGradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
    age: 48, gender: 'M', bloodType: 'AB+',
    emiratesId: '784-1976-8471029-4', insurance: 'Daman Basic', policyNumber: 'DAM-2024-IND-012847',
    location: 'Dubai', joined: 'Mar 2024', lastActive: '3 hours ago', lastActiveRelative: '3 hours ago',
    lastActiveColor: '#6EE7B7', risk: 'high', status: 'active',
    email: 'mohammed.shamsi@email.com', phone: '+971 54 345 6789',
    nationality: 'Emirati', address: 'Al Barsha, Dubai',
    language: 'Arabic | English', dob: '28 Oct 1976',
    allergies: ['Codeine'],
    conditions: ['CAD', 'Hypertension I10', 'CKD Stage 2'],
    medications: ['Aspirin 100mg', 'Bisoprolol 5mg', 'Amlodipine 10mg'],
    appointmentsCount: 15, labResultsCount: 31, aiSessionsCount: 19, messagesCount: 38,
    nabidh: true, twoFA: true,
    careTeam: [
      { name: 'Dr. Ahmed Al Rashidi', specialty: 'Cardiologist', isPrimary: true },
      { name: 'Dr. Khalid Al Nasser', specialty: 'Nephrologist' },
    ],
  },
  {
    id: '5', ptId: 'PT-006', name: 'Aisha Mohammed Al Reem',
    initials: 'AM', avatarGradient: 'linear-gradient(135deg, #0D9488, #06B6D4)',
    age: 42, gender: 'F', bloodType: 'O-',
    emiratesId: '784-1982-9302817-5', insurance: 'AXA Gulf', policyNumber: 'AXA-2024-IND-038291',
    location: 'Dubai', joined: 'Jun 2024', lastActive: 'Today 2:05 PM', lastActiveRelative: 'Today 2:05 PM',
    lastActiveColor: '#34D399', risk: 'medium', status: 'active',
    email: 'aisha.alreem@email.com', phone: '+971 55 456 7890',
    nationality: 'Emirati', address: 'Downtown Dubai, Dubai',
    language: 'Arabic | English', dob: '14 Apr 1982',
    allergies: ['Penicillin'],
    conditions: ['Hypertension I10', 'PCOS'],
    medications: ['Amlodipine 5mg', 'Metformin 500mg'],
    appointmentsCount: 9, labResultsCount: 11, aiSessionsCount: 22, messagesCount: 29,
    nabidh: false, twoFA: true,
    careTeam: [{ name: 'Dr. Maryam Al Hashimi', specialty: 'OB/GYN', isPrimary: true }],
  },
  {
    id: '6', ptId: 'PT-007', name: 'Saeed Rashid Al Mansoori',
    initials: 'SR', avatarGradient: 'linear-gradient(135deg, #4F46E5, #6366F1)',
    age: 58, gender: 'M', bloodType: 'A-',
    emiratesId: '784-1966-4729104-6', insurance: 'Oman Insurance', policyNumber: 'OMN-2023-IND-047291',
    location: 'Sharjah', joined: 'Aug 2024', lastActive: 'Today 2:30 PM', lastActiveRelative: 'Today 2:30 PM',
    lastActiveColor: '#34D399', risk: 'medium', status: 'active',
    email: 'saeed.mansoori@email.com', phone: '+971 50 567 8901',
    nationality: 'Emirati', address: 'Al Nahda, Sharjah',
    language: 'Arabic', dob: '7 Jan 1966',
    allergies: [],
    conditions: ['COPD', 'T2 Diabetes E11.9'],
    medications: ['Salbutamol inhaler', 'Metformin 1000mg', 'Tiotropium'],
    appointmentsCount: 7, labResultsCount: 14, aiSessionsCount: 6, messagesCount: 11,
    nabidh: true, twoFA: false,
    careTeam: [{ name: 'Dr. Hamad Al Zaabi', specialty: 'Pulmonologist', isPrimary: true }],
  },
  {
    id: '7', ptId: 'PT-008', name: 'Noura Bint Khalid',
    initials: 'NK', avatarGradient: 'linear-gradient(135deg, #E11D48, #F43F5E)',
    age: 28, gender: 'F', bloodType: 'B-',
    emiratesId: '784-1996-3847201-7', insurance: 'Daman Silver', policyNumber: 'DAM-2024-IND-038271',
    location: 'Dubai', joined: 'Sep 2024', lastActive: 'Today 3:30 PM', lastActiveRelative: 'Today 3:30 PM',
    lastActiveColor: '#34D399', risk: 'low', status: 'active',
    email: 'noura.khalid@email.com', phone: '+971 56 678 9012',
    nationality: 'Emirati', address: 'Mirdif, Dubai',
    language: 'Arabic | English', dob: '19 Sep 1996',
    allergies: [],
    conditions: ['Asthma', 'Iron deficiency anemia'],
    medications: ['Fluticasone inhaler', 'Iron supplements'],
    appointmentsCount: 4, labResultsCount: 7, aiSessionsCount: 14, messagesCount: 18,
    nabidh: false, twoFA: true,
    careTeam: [{ name: 'Dr. Reem Al Falasi', specialty: 'General Medicine', isPrimary: true }],
  },
  {
    id: '8', ptId: 'PT-009', name: 'Ibrahim Al Marzouqi',
    initials: 'IM', avatarGradient: 'linear-gradient(135deg, #EA580C, #F97316)',
    age: 55, gender: 'M', bloodType: 'O+',
    emiratesId: '784-1969-8492031-8', insurance: 'Daman Gold', policyNumber: 'DAM-2024-IND-092481',
    location: 'Dubai', joined: 'Oct 2024', lastActive: 'Today 1:52 PM', lastActiveRelative: 'Today 1:52 PM',
    lastActiveColor: '#34D399', risk: 'critical', status: 'active',
    email: 'ibrahim.marzouqi@email.com', phone: '+971 54 789 0123',
    nationality: 'Emirati', address: 'Al Quoz, Dubai',
    language: 'Arabic', dob: '30 Mar 1969',
    allergies: ['NSAIDs'],
    conditions: ['CKD Stage 4', 'Hyperkalemia (K+ 6.8)', 'Hypertension I10', 'T2 Diabetes E11.9'],
    medications: ['Calcium resonium', 'Sodium bicarbonate', 'Furosemide 40mg', 'Insulin Glargine'],
    appointmentsCount: 21, labResultsCount: 48, aiSessionsCount: 9, messagesCount: 52,
    nabidh: true, twoFA: true,
    careTeam: [
      { name: 'Dr. Khalid Al Nasser', specialty: 'Nephrologist', isPrimary: true },
      { name: 'Dr. Ahmed Al Rashidi', specialty: 'Cardiologist' },
    ],
  },
  {
    id: '9', ptId: 'PT-010', name: 'Layla Ahmed Al Rashidi',
    initials: 'LA', avatarGradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
    age: 34, gender: 'F', bloodType: 'A+',
    emiratesId: '784-1990-2938471-9', insurance: 'Daman Silver', policyNumber: 'DAM-2025-IND-028471',
    location: 'Abu Dhabi', joined: 'Nov 2024', lastActive: '5 days ago', lastActiveRelative: '5 days ago',
    lastActiveColor: '#94A3B8', risk: 'low', status: 'active',
    email: 'layla.rashidi@email.com', phone: '+971 55 890 1234',
    nationality: 'Emirati', address: 'Al Reem Island, Abu Dhabi',
    language: 'Arabic | English', dob: '5 May 1990',
    allergies: [],
    conditions: ['Migraine', 'Anxiety disorder'],
    medications: ['Sumatriptan 50mg', 'Escitalopram 10mg'],
    appointmentsCount: 5, labResultsCount: 9, aiSessionsCount: 17, messagesCount: 24,
    nabidh: false, twoFA: true,
    careTeam: [{ name: 'Dr. Amina Al Suwaidi', specialty: 'Neurology', isPrimary: true }],
  },
  {
    id: '10', ptId: 'PT-011', name: 'Omar Khalil Al Hassan',
    initials: 'OH', avatarGradient: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
    age: 62, gender: 'M', bloodType: 'B+',
    emiratesId: '784-1962-7382910-0', insurance: 'Cash', policyNumber: '—',
    location: 'Dubai', joined: 'Jan 2025', lastActive: '45 days ago', lastActiveRelative: '45 days ago',
    lastActiveColor: '#64748B', risk: 'low', status: 'inactive',
    email: 'omar.hassan@email.com', phone: '+971 50 901 2345',
    nationality: 'Jordanian', address: 'Al Karama, Dubai',
    language: 'Arabic', dob: '12 Nov 1962',
    allergies: [],
    conditions: ['Osteoarthritis', 'Hypertension I10'],
    medications: ['Paracetamol 500mg', 'Amlodipine 5mg'],
    appointmentsCount: 3, labResultsCount: 6, aiSessionsCount: 2, messagesCount: 7,
    nabidh: false, twoFA: false,
    careTeam: [{ name: 'Dr. Walid Al Hamdan', specialty: 'General Medicine', isPrimary: true }],
  },
  {
    id: '11', ptId: 'PT-012', name: 'Sarah Bint Hamdan',
    initials: 'SH', avatarGradient: 'linear-gradient(135deg, #0D9488, #059669)',
    age: 35, gender: 'F', bloodType: 'A-',
    emiratesId: '784-1989-4729104-1', insurance: 'Daman Gold', policyNumber: 'DAM-2025-IND-047104',
    location: 'Dubai', joined: 'Feb 2025', lastActive: 'Today 1:00 PM', lastActiveRelative: 'Today 1:00 PM',
    lastActiveColor: '#34D399', risk: 'low', status: 'active',
    email: 'sarah.hamdan@email.com', phone: '+971 56 012 3456',
    nationality: 'Emirati', address: 'Palm Jumeirah, Dubai',
    language: 'Arabic | English', dob: '18 Dec 1989',
    allergies: [],
    conditions: [],
    medications: [],
    appointmentsCount: 2, labResultsCount: 4, aiSessionsCount: 8, messagesCount: 10,
    nabidh: true, twoFA: true,
    careTeam: [{ name: 'Dr. Maryam Al Hashimi', specialty: 'General Medicine', isPrimary: true }],
  },
  {
    id: '12', ptId: 'PT-013', name: 'Mariam Jassim Al Suwaidi',
    initials: 'MS', avatarGradient: 'linear-gradient(135deg, #7C3AED, #9333EA)',
    age: 38, gender: 'F', bloodType: 'O+',
    emiratesId: '784-1986-3847201-2', insurance: 'AXA Gulf', policyNumber: 'AXA-2025-IND-038472',
    location: 'Sharjah', joined: 'Mar 2025', lastActive: 'Today 2:45 PM', lastActiveRelative: 'Today 2:45 PM',
    lastActiveColor: '#34D399', risk: 'low', status: 'active',
    email: 'mariam.suwaidi@email.com', phone: '+971 54 123 4567',
    nationality: 'Emirati', address: 'Al Majaz, Sharjah',
    language: 'Arabic', dob: '22 Jul 1986',
    allergies: [],
    conditions: ['Gestational diabetes (resolved)'],
    medications: [],
    appointmentsCount: 4, labResultsCount: 8, aiSessionsCount: 11, messagesCount: 16,
    nabidh: true, twoFA: false,
    careTeam: [{ name: 'Dr. Hessa Al Muhairi', specialty: 'OB/GYN', isPrimary: true }],
  },
  {
    id: '13', ptId: 'PT-014', name: 'Yousuf Khalid Al Zaabi',
    initials: 'YZ', avatarGradient: 'linear-gradient(135deg, #059669, #10B981)',
    age: 48, gender: 'M', bloodType: 'A+',
    emiratesId: '784-1976-2938471-3', insurance: 'Daman Silver', policyNumber: 'DAM-2025-IND-029384',
    location: 'Dubai', joined: 'Apr 2025', lastActive: 'Yesterday', lastActiveRelative: 'Yesterday',
    lastActiveColor: '#CBD5E1', risk: 'medium', status: 'active',
    email: 'yousuf.zaabi@email.com', phone: '+971 50 234 5678',
    nationality: 'Emirati', address: 'Dubai Silicon Oasis, Dubai',
    language: 'Arabic | English', dob: '3 Aug 1976',
    allergies: ['Sulfa drugs'],
    conditions: ['T2 Diabetes E11.9', 'Fatty liver'],
    medications: ['Metformin 1000mg', 'Vitamin D 1000IU'],
    appointmentsCount: 6, labResultsCount: 13, aiSessionsCount: 9, messagesCount: 19,
    nabidh: true, twoFA: true,
    careTeam: [{ name: 'Dr. Ahmad Al Rashidi', specialty: 'Endocrinologist', isPrimary: true }],
  },
  {
    id: '14', ptId: 'PT-015', name: 'Hassan Rashid Al Mansoori',
    initials: 'HM', avatarGradient: 'linear-gradient(135deg, #EA580C, #D97706)',
    age: 45, gender: 'M', bloodType: 'AB+',
    emiratesId: '784-1979-8492031-4', insurance: 'ADNIC', policyNumber: 'ADN-2025-IND-084920',
    location: 'Dubai', joined: 'May 2025', lastActive: '3 weeks ago', lastActiveRelative: '3 weeks ago',
    lastActiveColor: '#64748B', risk: 'high', status: 'flagged',
    flagReason: 'Duplicate account suspected',
    email: 'hassan.mansoori@email.com', phone: '+971 55 345 6789',
    nationality: 'Emirati', address: 'Deira, Dubai',
    language: 'Arabic', dob: '11 Feb 1979',
    allergies: [],
    conditions: ['Hypertension I10'],
    medications: ['Amlodipine 5mg'],
    appointmentsCount: 2, labResultsCount: 3, aiSessionsCount: 1, messagesCount: 4,
    nabidh: false, twoFA: false,
    careTeam: [{ name: 'Dr. Walid Al Hamdan', specialty: 'General Medicine', isPrimary: true }],
  },
  {
    id: '15', ptId: 'PT-016', name: 'Ahmad Mohammed Ibrahim',
    initials: 'AI', avatarGradient: 'linear-gradient(135deg, #DC2626, #EF4444)',
    age: 52, gender: 'M', bloodType: 'O-',
    emiratesId: '784-1972-5829104-5', insurance: 'Daman Basic', policyNumber: 'DAM-2025-IND-058291',
    location: 'Dubai', joined: 'Jun 2025', lastActive: '6 days ago', lastActiveRelative: '6 days ago',
    lastActiveColor: '#94A3B8', risk: 'high', status: 'suspended',
    flagReason: 'Fraudulent activity reported',
    email: 'ahmad.ibrahim@email.com', phone: '+971 54 456 7890',
    nationality: 'Egyptian', address: 'International City, Dubai',
    language: 'Arabic', dob: '25 Jun 1972',
    allergies: [],
    conditions: ['Hypertension I10', 'T2 Diabetes E11.9'],
    medications: ['Metformin 500mg', 'Enalapril 5mg'],
    appointmentsCount: 1, labResultsCount: 2, aiSessionsCount: 0, messagesCount: 3,
    nabidh: false, twoFA: false,
    careTeam: [{ name: 'Dr. Walid Al Hamdan', specialty: 'General Medicine', isPrimary: true }],
  },
];

export const activityLog = [
  { id: '1', time: 'Today 9:15 AM', type: 'login', color: '#34D399', desc: 'Logged in via CeenAiX iOS App' },
  { id: '2', time: 'Today 9:00 AM', type: 'ai', color: '#7C3AED', desc: 'AI health consultation (8 min)' },
  { id: '3', time: 'Today 9:30 AM', type: 'appointment', color: '#0D9488', desc: 'Cardiology consultation · Dr. Ahmed' },
  { id: '4', time: 'Today 11:20 AM', type: 'lab', color: '#3B82F6', desc: 'Lab results released · 3 flags' },
  { id: '5', time: 'Today 2:10 PM', type: 'pharmacy', color: '#F59E0B', desc: 'Prescription ready · Al Shifa' },
  { id: '6', time: 'Today 2:15 PM', type: 'message', color: '#06B6D4', desc: 'Message received from Dr. Ahmed' },
  { id: '7', time: 'Yesterday 8:30 AM', type: 'appointment', color: '#0D9488', desc: 'Appointment confirmed Apr 15' },
  { id: '8', time: 'Yesterday', type: 'insurance', color: '#10B981', desc: 'Insurance claim CLM-00481 approved' },
  { id: '9', time: '5 Apr', type: 'record', color: '#8B5CF6', desc: 'Health record updated by Dr. Ahmed' },
  { id: '10', time: '2 Apr', type: 'imaging', color: '#64748B', desc: 'Cardiac MRI report released' },
];

export const accessLog = [
  { date: '7 Apr 2:07 PM', accessor: 'Parnia Y. (self)', role: 'Patient', data: 'Full record', action: 'View' },
  { date: '7 Apr 9:30 AM', accessor: 'Dr. Ahmed', role: 'Doctor', data: 'Consultation', action: 'Update' },
  { date: '7 Apr 11:15 AM', accessor: 'Daman Insurance', role: 'Insurance', data: 'Claim data', action: 'Auto' },
  { date: '7 Apr 9:59 AM', accessor: 'Al Shifa Pharmacy', role: 'Pharmacy', data: 'Prescription', action: 'View' },
  { date: '6 Apr 11:10 AM', accessor: 'Dr. Ahmed', role: 'Doctor', data: 'Lab results', action: 'View' },
];

export const patientGrowthData = [
  { month: 'Jan', patients: 2847 },
  { month: 'Feb', patients: 3241 },
  { month: 'Mar', patients: 3891 },
  { month: 'Apr', patients: 1247 },
];

export const insuranceDistData = [
  { name: 'ADNIC', value: 6241, color: '#7C3AED' },
  { name: 'Other', value: 14891, color: '#475569' },
  { name: 'Cash', value: 10518, color: '#334155' },
  { name: 'AXA Gulf', value: 4891, color: '#4F46E5' },
  { name: 'Thiqa', value: 3847, color: '#10B981' },
  { name: 'Daman Silver', value: 3104, color: '#3B82F6' },
  { name: 'Daman Gold', value: 2847, color: '#1D4ED8' },
  { name: 'Daman Basic', value: 1892, color: '#1E40AF' },
];

export const emirateData = [
  { emirate: 'Dubai', count: 31847 },
  { emirate: 'Abu Dhabi', count: 9241 },
  { emirate: 'Sharjah', count: 4891 },
  { emirate: 'Other UAE', count: 2252 },
];

export const activityByDay = [
  { day: 'Mon', logins: 4200, ai: 1800 },
  { day: 'Tue', logins: 3900, ai: 1650 },
  { day: 'Wed', logins: 4800, ai: 2100 },
  { day: 'Thu', logins: 5200, ai: 2400 },
  { day: 'Fri', logins: 4100, ai: 1700 },
  { day: 'Sat', logins: 2800, ai: 1100 },
  { day: 'Sun', logins: 2400, ai: 900 },
];
