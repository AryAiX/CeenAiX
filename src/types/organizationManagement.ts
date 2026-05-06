export type OrganizationTypeFilter = 'hospital' | 'clinic' | 'pharmacy' | 'laboratory' | 'insurance' | 'multi';
export type OrganizationStatusFilter = 'active' | 'pending_approval' | 'suspended' | 'onboarding';
export type EmirateFilter = 'Dubai' | 'Abu Dhabi' | 'Sharjah' | 'Ajman' | 'RAK' | 'Fujairah' | 'UAQ';

export interface OrganizationFilters {
  search: string;
  types: OrganizationTypeFilter[];
  statuses: OrganizationStatusFilter[];
  emirates: EmirateFilter[];
  insuranceNetwork: boolean | null;
  nabidhConnected: boolean | null;
}

export interface OrganizationStats {
  hospitals: number;
  clinics: number;
  pharmacies: number;
  laboratories: number;
  total: number;
}

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: string;
  dhaLicense?: string;
  status: 'active' | 'inactive';
  lastLogin: Date;
}

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedDate?: Date;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'compliant' | 'pending' | 'overdue';
  dueDate?: Date;
  description: string;
}

export interface PortalAccess {
  portalId: string;
  portalName: string;
  enabled: boolean;
  features: {
    featureId: string;
    featureName: string;
    enabled: boolean;
  }[];
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  logo?: string;
  type: OrganizationTypeFilter;
  status: OrganizationStatusFilter;

  dhaLicense: string;
  tradeLicense: string;
  facilityType: string;

  emirate: EmirateFilter;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;

  primaryContact: {
    name: string;
    phone: string;
    email: string;
  };

  technicalContact: {
    name: string;
    phone: string;
    email: string;
  };

  contract: {
    startDate: Date;
    plan: string;
    renewalDate: Date;
    paymentStatus: 'paid' | 'pending' | 'overdue';
  };

  stats: {
    activeUsers: number;
    monthlyTransactions: number;
    nabidhSyncStatus: 'connected' | 'disconnected' | 'error';
  };

  insuranceNetworkParticipation: boolean;
  nabidhConnected: boolean;

  onboardingProgress: number;
  onboardingChecklist: OnboardingChecklistItem[];

  users: OrganizationUser[];
  portalAccess: PortalAccess[];
  compliance: {
    dhaScore: number;
    dataRetentionPolicyStatus: 'compliant' | 'pending' | 'non_compliant';
    nabidhSubmissionRate: number;
    outstandingItems: ComplianceItem[];
  };

  createdAt: Date;
  updatedAt: Date;
}

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    name: 'Mediclinic Dubai Mall',
    legalName: 'Mediclinic Middle East LLC - Dubai Mall Branch',
    type: 'hospital',
    status: 'active',
    dhaLicense: 'DHA-H-2023-10456',
    tradeLicense: 'TL-567234',
    facilityType: 'Multi-specialty Hospital',
    emirate: 'Dubai',
    city: 'Dubai',
    address: 'Dubai Mall, Downtown Dubai',
    latitude: 25.1972,
    longitude: 55.2744,
    primaryContact: {
      name: 'Dr. Ahmed Hassan',
      phone: '+971 4 123 4567',
      email: 'ahmed.hassan@mediclinic.ae',
    },
    technicalContact: {
      name: 'Fatima Al Zaabi',
      phone: '+971 4 123 4568',
      email: 'fatima.alzaabi@mediclinic.ae',
    },
    contract: {
      startDate: new Date('2024-01-15'),
      plan: 'Enterprise Plus',
      renewalDate: new Date('2027-01-14'),
      paymentStatus: 'paid',
    },
    stats: {
      activeUsers: 234,
      monthlyTransactions: 12470,
      nabidhSyncStatus: 'connected',
    },
    insuranceNetworkParticipation: true,
    nabidhConnected: true,
    onboardingProgress: 100,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2024-01-10') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2024-01-12') },
      { id: '3', label: 'Test users created', completed: true, completedDate: new Date('2024-01-13') },
      { id: '4', label: 'Go-live approved', completed: true, completedDate: new Date('2024-01-15') },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 98,
      dataRetentionPolicyStatus: 'compliant',
      nabidhSubmissionRate: 99.5,
      outstandingItems: [],
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2026-04-01'),
  },
  {
    id: 'org-2',
    name: 'Aster Pharmacy Marina',
    legalName: 'Aster DM Healthcare - Marina Branch',
    type: 'pharmacy',
    status: 'active',
    dhaLicense: 'DHA-P-2024-08923',
    tradeLicense: 'TL-892341',
    facilityType: 'Retail Pharmacy',
    emirate: 'Dubai',
    city: 'Dubai',
    address: 'Dubai Marina Walk',
    latitude: 25.0805,
    longitude: 55.1407,
    primaryContact: {
      name: 'Sara Mohammed',
      phone: '+971 4 987 6543',
      email: 'sara.mohammed@asterdm.com',
    },
    technicalContact: {
      name: 'Omar Khalid',
      phone: '+971 4 987 6544',
      email: 'omar.khalid@asterdm.com',
    },
    contract: {
      startDate: new Date('2024-03-10'),
      plan: 'Professional',
      renewalDate: new Date('2026-03-09'),
      paymentStatus: 'paid',
    },
    stats: {
      activeUsers: 45,
      monthlyTransactions: 8920,
      nabidhSyncStatus: 'connected',
    },
    insuranceNetworkParticipation: true,
    nabidhConnected: true,
    onboardingProgress: 100,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2024-03-05') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2024-03-07') },
      { id: '3', label: 'Test users created', completed: true, completedDate: new Date('2024-03-08') },
      { id: '4', label: 'Go-live approved', completed: true, completedDate: new Date('2024-03-10') },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 95,
      dataRetentionPolicyStatus: 'compliant',
      nabidhSubmissionRate: 98.2,
      outstandingItems: [],
    },
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date('2026-04-02'),
  },
  {
    id: 'org-3',
    name: 'NMC Royal Hospital',
    legalName: 'NMC Healthcare LLC - Royal Hospital Sharjah',
    type: 'hospital',
    status: 'active',
    dhaLicense: 'DHA-H-2023-07834',
    tradeLicense: 'TL-234567',
    facilityType: 'General Hospital',
    emirate: 'Sharjah',
    city: 'Sharjah',
    address: 'Al Qasimia, Sharjah',
    latitude: 25.3548,
    longitude: 55.3915,
    primaryContact: {
      name: 'Dr. Priya Sharma',
      phone: '+971 6 505 8000',
      email: 'priya.sharma@nmc.ae',
    },
    technicalContact: {
      name: 'Mohammed Iqbal',
      phone: '+971 6 505 8001',
      email: 'mohammed.iqbal@nmc.ae',
    },
    contract: {
      startDate: new Date('2023-11-20'),
      plan: 'Enterprise',
      renewalDate: new Date('2026-11-19'),
      paymentStatus: 'paid',
    },
    stats: {
      activeUsers: 312,
      monthlyTransactions: 18760,
      nabidhSyncStatus: 'connected',
    },
    insuranceNetworkParticipation: true,
    nabidhConnected: true,
    onboardingProgress: 100,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2023-11-15') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2023-11-17') },
      { id: '3', label: 'Test users created', completed: true, completedDate: new Date('2023-11-18') },
      { id: '4', label: 'Go-live approved', completed: true, completedDate: new Date('2023-11-20') },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 97,
      dataRetentionPolicyStatus: 'compliant',
      nabidhSubmissionRate: 99.1,
      outstandingItems: [],
    },
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2026-04-03'),
  },
  {
    id: 'org-4',
    name: 'HealthHub Clinic JLT',
    legalName: 'HealthHub Medical Center LLC',
    type: 'clinic',
    status: 'onboarding',
    dhaLicense: 'DHA-C-2026-02341',
    tradeLicense: 'TL-991234',
    facilityType: 'General Practice Clinic',
    emirate: 'Dubai',
    city: 'Dubai',
    address: 'Jumeirah Lakes Towers',
    latitude: 25.0657,
    longitude: 55.1441,
    primaryContact: {
      name: 'Dr. Ravi Kumar',
      phone: '+971 4 445 6789',
      email: 'ravi.kumar@healthhub.ae',
    },
    technicalContact: {
      name: 'Aisha Rahman',
      phone: '+971 4 445 6790',
      email: 'aisha.rahman@healthhub.ae',
    },
    contract: {
      startDate: new Date('2026-04-01'),
      plan: 'Standard',
      renewalDate: new Date('2027-03-31'),
      paymentStatus: 'pending',
    },
    stats: {
      activeUsers: 12,
      monthlyTransactions: 0,
      nabidhSyncStatus: 'disconnected',
    },
    insuranceNetworkParticipation: false,
    nabidhConnected: false,
    onboardingProgress: 50,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2026-04-02') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2026-04-05') },
      { id: '3', label: 'Test users created', completed: false },
      { id: '4', label: 'Go-live approved', completed: false },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 85,
      dataRetentionPolicyStatus: 'pending',
      nabidhSubmissionRate: 0,
      outstandingItems: [
        {
          id: 'c1',
          title: 'Submit data retention policy',
          status: 'overdue',
          dueDate: new Date('2026-04-10'),
          description: 'Data retention policy document required for compliance',
        },
        {
          id: 'c2',
          title: 'Complete NABIDH integration testing',
          status: 'pending',
          dueDate: new Date('2026-04-15'),
          description: 'Complete integration testing before go-live',
        },
      ],
    },
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'org-5',
    name: 'Unilabs Dubai',
    legalName: 'Unilabs Medical Laboratories LLC',
    type: 'laboratory',
    status: 'active',
    dhaLicense: 'DHA-L-2024-01123',
    tradeLicense: 'TL-445678',
    facilityType: 'Diagnostic Laboratory',
    emirate: 'Dubai',
    city: 'Dubai',
    address: 'Healthcare City',
    latitude: 25.2048,
    longitude: 55.2708,
    primaryContact: {
      name: 'Dr. Lisa Chen',
      phone: '+971 4 362 4000',
      email: 'lisa.chen@unilabs.ae',
    },
    technicalContact: {
      name: 'Tariq Mansoor',
      phone: '+971 4 362 4001',
      email: 'tariq.mansoor@unilabs.ae',
    },
    contract: {
      startDate: new Date('2024-01-05'),
      plan: 'Professional',
      renewalDate: new Date('2026-01-04'),
      paymentStatus: 'paid',
    },
    stats: {
      activeUsers: 67,
      monthlyTransactions: 11230,
      nabidhSyncStatus: 'connected',
    },
    insuranceNetworkParticipation: true,
    nabidhConnected: true,
    onboardingProgress: 100,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2023-12-28') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2024-01-02') },
      { id: '3', label: 'Test users created', completed: true, completedDate: new Date('2024-01-03') },
      { id: '4', label: 'Go-live approved', completed: true, completedDate: new Date('2024-01-05') },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 96,
      dataRetentionPolicyStatus: 'compliant',
      nabidhSubmissionRate: 99.8,
      outstandingItems: [],
    },
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2026-04-04'),
  },
  {
    id: 'org-6',
    name: 'Cleveland Clinic Abu Dhabi',
    legalName: 'Cleveland Clinic Abu Dhabi LLC',
    type: 'hospital',
    status: 'active',
    dhaLicense: 'DHA-H-2023-05001',
    tradeLicense: 'TL-112233',
    facilityType: 'Specialty Hospital',
    emirate: 'Abu Dhabi',
    city: 'Abu Dhabi',
    address: 'Al Maryah Island',
    latitude: 24.4539,
    longitude: 54.3773,
    primaryContact: {
      name: 'Dr. Michael Robertson',
      phone: '+971 2 501 9999',
      email: 'michael.robertson@clevelandclinicabudhabi.ae',
    },
    technicalContact: {
      name: 'Noura Al Dhaheri',
      phone: '+971 2 501 9998',
      email: 'noura.aldhaheri@clevelandclinicabudhabi.ae',
    },
    contract: {
      startDate: new Date('2023-10-12'),
      plan: 'Enterprise Plus',
      renewalDate: new Date('2026-10-11'),
      paymentStatus: 'paid',
    },
    stats: {
      activeUsers: 456,
      monthlyTransactions: 21340,
      nabidhSyncStatus: 'connected',
    },
    insuranceNetworkParticipation: true,
    nabidhConnected: true,
    onboardingProgress: 100,
    onboardingChecklist: [
      { id: '1', label: 'DHA license uploaded', completed: true, completedDate: new Date('2023-10-05') },
      { id: '2', label: 'NABIDH enrolled', completed: true, completedDate: new Date('2023-10-08') },
      { id: '3', label: 'Test users created', completed: true, completedDate: new Date('2023-10-10') },
      { id: '4', label: 'Go-live approved', completed: true, completedDate: new Date('2023-10-12') },
    ],
    users: [],
    portalAccess: [],
    compliance: {
      dhaScore: 99,
      dataRetentionPolicyStatus: 'compliant',
      nabidhSubmissionRate: 99.9,
      outstandingItems: [],
    },
    createdAt: new Date('2023-09-20'),
    updatedAt: new Date('2026-04-05'),
  },
];
