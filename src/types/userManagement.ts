export type UserRole =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'lab_technician'
  | 'pharmacy_admin'
  | 'lab_admin'
  | 'org_admin'
  | 'super_admin';

export type UserStatus = 'active' | 'inactive' | 'pending_verification' | 'suspended' | 'locked';

export type DhaLicenseStatus = 'verified' | 'unverified' | 'expired' | 'not_applicable';

export interface UserFilters {
  search: string;
  roles: UserRole[];
  organizationId: string | null;
  statuses: UserStatus[];
  dhaLicenseStatuses: DhaLicenseStatus[];
  dateJoinedStart: Date | null;
  dateJoinedEnd: Date | null;
}

export interface LoginActivity {
  id: string;
  timestamp: Date;
  ipAddress: string;
  device: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
}

export interface RoleHistory {
  id: string;
  role: UserRole;
  assignedDate: Date;
  assignedBy: string;
  organization?: string;
}

export interface OrganizationHistory {
  id: string;
  organizationName: string;
  joinedDate: Date;
  leftDate?: Date;
  role: UserRole;
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: Date;
}

export interface PlatformUser {
  id: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  emiratesId?: string;
  email: string;
  phone?: string;
  role: UserRole;
  organization?: {
    id: string;
    name: string;
  };
  status: UserStatus;
  dhaLicenseNumber?: string;
  dhaLicenseStatus: DhaLicenseStatus;
  dhaLicenseExpiry?: Date;
  lastLogin?: Date;
  dateJoined: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  passwordLastChanged?: Date;
  loginActivities: LoginActivity[];
  activityLog: ActivityLogEntry[];
  roleHistory: RoleHistory[];
  organizationHistory: OrganizationHistory[];
  activeSessions: ActiveSession[];
  adminNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  emiratesId?: string;
  role: UserRole;
  organizationId?: string;
  dhaLicenseNumber?: string;
  dhaLicenseDocument?: File;
  sendInvitation: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  pharmacy_admin: 'Pharmacy Admin',
  lab_admin: 'Lab Admin',
  org_admin: 'Organization Admin',
  super_admin: 'Super Admin',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_verification: 'Pending Verification',
  suspended: 'Suspended',
  locked: 'Locked',
};

export const MOCK_USERS: PlatformUser[] = [
  {
    id: 'user-1',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    fullName: 'Dr. Ahmed Hassan',
    emiratesId: '784-1990-1234567-1',
    email: 'ahmed.hassan@mediclinic.ae',
    phone: '+971 50 123 4567',
    role: 'doctor',
    organization: {
      id: 'org-1',
      name: 'Mediclinic Dubai Mall',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-DR-2023-45678',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2026-12-31'),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
    dateJoined: new Date('2024-01-15'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    passwordLastChanged: new Date('2025-11-20'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: '',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'user-2',
    firstName: 'Fatima',
    lastName: 'Al Zaabi',
    fullName: 'Fatima Al Zaabi',
    emiratesId: '784-1995-2345678-2',
    email: 'fatima.alzaabi@mediclinic.ae',
    phone: '+971 50 234 5678',
    role: 'org_admin',
    organization: {
      id: 'org-1',
      name: 'Mediclinic Dubai Mall',
    },
    status: 'active',
    dhaLicenseStatus: 'not_applicable',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
    dateJoined: new Date('2024-01-10'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    passwordLastChanged: new Date('2026-02-15'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: 'Primary IT administrator for Mediclinic Dubai Mall',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2026-04-07'),
  },
  {
    id: 'user-3',
    firstName: 'Sarah',
    lastName: 'Johnson',
    fullName: 'Dr. Sarah Johnson',
    emiratesId: '784-1988-3456789-3',
    email: 'sarah.johnson@mediclinic.ae',
    phone: '+971 50 345 6789',
    role: 'doctor',
    organization: {
      id: 'org-1',
      name: 'Mediclinic Dubai Mall',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-DR-2024-12389',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2027-06-30'),
    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000),
    dateJoined: new Date('2024-02-20'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    passwordLastChanged: new Date('2025-10-05'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: '',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'user-4',
    firstName: 'Omar',
    lastName: 'Khalid',
    fullName: 'Omar Khalid',
    emiratesId: '784-1992-4567890-4',
    email: 'omar.khalid@asterdm.com',
    phone: '+971 50 456 7890',
    role: 'pharmacist',
    organization: {
      id: 'org-2',
      name: 'Aster Pharmacy Marina',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-PH-2023-98234',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2026-09-30'),
    lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000),
    dateJoined: new Date('2024-03-10'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    passwordLastChanged: new Date('2026-01-18'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: '',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'user-5',
    firstName: 'Lisa',
    lastName: 'Chen',
    fullName: 'Dr. Lisa Chen',
    emiratesId: '784-1985-5678901-5',
    email: 'lisa.chen@unilabs.ae',
    phone: '+971 50 567 8901',
    role: 'lab_admin',
    organization: {
      id: 'org-5',
      name: 'Unilabs Dubai',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-LT-2024-55678',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2027-03-31'),
    lastLogin: new Date(Date.now() - 8 * 60 * 60 * 1000),
    dateJoined: new Date('2024-01-05'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    passwordLastChanged: new Date('2025-12-10'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: 'Lead laboratory administrator',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'user-6',
    firstName: 'Mohammed',
    lastName: 'Abdullah',
    fullName: 'Mohammed Abdullah',
    emiratesId: '784-2000-6789012-6',
    email: 'mohammed.abdullah@patient.ae',
    phone: '+971 50 678 9012',
    role: 'patient',
    status: 'active',
    dhaLicenseStatus: 'not_applicable',
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    dateJoined: new Date('2025-06-15'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    passwordLastChanged: new Date('2025-06-15'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: '',
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2026-04-05'),
  },
  {
    id: 'user-7',
    firstName: 'Priya',
    lastName: 'Sharma',
    fullName: 'Dr. Priya Sharma',
    emiratesId: '784-1987-7890123-7',
    email: 'priya.sharma@nmc.ae',
    phone: '+971 50 789 0123',
    role: 'doctor',
    organization: {
      id: 'org-3',
      name: 'NMC Royal Hospital',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-DR-2022-34567',
    dhaLicenseStatus: 'expired',
    dhaLicenseExpiry: new Date('2025-12-31'),
    lastLogin: new Date(Date.now() - 48 * 60 * 60 * 1000),
    dateJoined: new Date('2023-11-20'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    passwordLastChanged: new Date('2025-08-22'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: 'DHA license expired - requires renewal',
    createdAt: new Date('2023-11-20'),
    updatedAt: new Date('2026-04-06'),
  },
  {
    id: 'user-8',
    firstName: 'Ravi',
    lastName: 'Kumar',
    fullName: 'Dr. Ravi Kumar',
    emiratesId: '784-1991-8901234-8',
    email: 'ravi.kumar@healthhub.ae',
    phone: '+971 50 890 1234',
    role: 'doctor',
    organization: {
      id: 'org-4',
      name: 'HealthHub Clinic JLT',
    },
    status: 'pending_verification',
    dhaLicenseNumber: 'DHA-DR-2026-99999',
    dhaLicenseStatus: 'unverified',
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
    dateJoined: new Date('2026-04-05'),
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: 'New clinic onboarding - pending DHA license verification',
    createdAt: new Date('2026-04-05'),
    updatedAt: new Date('2026-04-08'),
  },
  {
    id: 'user-9',
    firstName: 'Aisha',
    lastName: 'Rahman',
    fullName: 'Aisha Rahman',
    emiratesId: '784-1993-9012345-9',
    email: 'aisha.rahman@healthhub.ae',
    phone: '+971 50 901 2345',
    role: 'nurse',
    organization: {
      id: 'org-4',
      name: 'HealthHub Clinic JLT',
    },
    status: 'suspended',
    dhaLicenseNumber: 'DHA-NR-2024-77888',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2027-01-31'),
    lastLogin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    dateJoined: new Date('2024-08-12'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    passwordLastChanged: new Date('2025-07-30'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: 'Suspended due to policy violation - pending investigation',
    createdAt: new Date('2024-08-12'),
    updatedAt: new Date('2026-03-20'),
  },
  {
    id: 'user-10',
    firstName: 'Tariq',
    lastName: 'Mansoor',
    fullName: 'Tariq Mansoor',
    emiratesId: '784-1994-0123456-0',
    email: 'tariq.mansoor@unilabs.ae',
    phone: '+971 50 012 3456',
    role: 'lab_technician',
    organization: {
      id: 'org-5',
      name: 'Unilabs Dubai',
    },
    status: 'active',
    dhaLicenseNumber: 'DHA-LT-2023-66789',
    dhaLicenseStatus: 'verified',
    dhaLicenseExpiry: new Date('2026-11-30'),
    lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
    dateJoined: new Date('2023-12-20'),
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    passwordLastChanged: new Date('2025-09-14'),
    loginActivities: [],
    activityLog: [],
    roleHistory: [],
    organizationHistory: [],
    activeSessions: [],
    adminNotes: '',
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2026-04-08'),
  },
];
