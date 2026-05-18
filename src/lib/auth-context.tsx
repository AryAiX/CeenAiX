/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { clearPreviewAccess } from './preview-access';
import { supabase } from './supabase';
import type { DoctorProfile, PatientProfile, UserProfile, UserRole } from '../types';

interface PasswordSignInInput {
  email: string;
  password: string;
}

interface PasswordSignUpInput {
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  fullName: string;
  firstName?: string;
  lastName?: string;
  termsAccepted: boolean;
}

interface OtpRequestInput {
  phone: string;
  shouldCreateUser?: boolean;
  data?: Record<string, unknown>;
}

type VerifyOtpInput =
  | {
      token: string;
      phone: string;
      type: 'sms';
    }
  | {
      token: string;
      email: string;
      type: 'email' | 'recovery';
    };

interface AuthActionResult {
  error: Error | null;
}

interface SignUpActionResult extends AuthActionResult {
  session: Session | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithPassword: (input: PasswordSignInInput) => Promise<AuthActionResult>;
  signUpWithPassword: (input: PasswordSignUpInput) => Promise<SignUpActionResult>;
  resendSignupConfirmation: (email: string) => Promise<AuthActionResult>;
  requestOtp: (input: OtpRequestInput) => Promise<AuthActionResult>;
  verifyOtp: (input: VerifyOtpInput) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

interface ProfileSeed {
  role: UserRole;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  termsAccepted: boolean;
}

const VALID_ROLES: readonly UserRole[] = [
  'patient',
  'doctor',
  'nurse',
  'pharmacy',
  'lab',
  'insurance',
  'facility_admin',
  'super_admin',
];

const validRoleSet = new Set<string>(VALID_ROLES);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isUserRole = (value: string | null | undefined): value is UserRole =>
  Boolean(value && validRoleSet.has(value));

const safeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toError = (value: unknown) => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return new Error(value.trim());
  }

  return new Error('Something went wrong. Please try again.');
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: null,
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const buildFullName = (firstName: string | null, lastName: string | null) =>
  [firstName, lastName].filter(Boolean).join(' ').trim() || null;

const getProfileSeed = (user: User): ProfileSeed => {
  const metadata = user.user_metadata ?? {};
  const metadataRole = safeString(metadata.role);
  const firstName = safeString(metadata.first_name);
  const lastName = safeString(metadata.last_name);
  const metadataFullName = safeString(metadata.full_name);
  const fullName =
    metadataFullName ??
    buildFullName(firstName, lastName) ??
    safeString(user.email) ??
    safeString(user.phone) ??
    'CeenAiX User';

  return {
    role: isUserRole(metadataRole) ? metadataRole : 'patient',
    fullName,
    firstName: firstName ?? splitFullName(fullName).firstName,
    lastName: lastName ?? splitFullName(fullName).lastName,
    phone: safeString(user.phone) ?? safeString(metadata.phone),
    email: safeString(user.email) ?? safeString(metadata.email),
    termsAccepted: Boolean(metadata.terms_accepted),
  };
};

export const getDefaultRouteForRole = (role: UserRole | null | undefined) => {
  if (role === 'patient') {
    return '/patient/dashboard';
  }

  if (role === 'doctor') {
    return '/doctor/dashboard';
  }

  if (role === 'pharmacy') {
    return '/pharmacy/dashboard';
  }

  if (role === 'lab') {
    return '/lab/dashboard';
  }

  if (role === 'insurance') {
    return '/insurance/dashboard';
  }

  if (role === 'super_admin' || role === 'facility_admin') {
    return '/admin/dashboard';
  }

  // Roles without a portal (nurse and other non-MVP staff) should land on the
  // public home rather than be bounced back to onboarding indefinitely.
  if (role) {
    return '/';
  }

  return '/auth/onboarding';
};

const buildAuthRedirectUrl = (path: string) => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${path}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Monotonically-increasing generation used to ignore stale profile loads
  // when the auth state changes rapidly (sign in / sign out / token refresh
  // happening back-to-back). Each new syncSession or refreshProfile call
  // bumps the generation; async branches only apply their state updates if
  // their captured generation still matches the latest.
  const profileLoadGenerationRef = useRef(0);

  const loadExtensionProfiles = useCallback(async (nextRole: UserRole, userId: string) => {
    const patientRequest =
      nextRole === 'patient'
        ? supabase.from('patient_profiles').select('*').eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null, error: null });

    const doctorRequest =
      nextRole === 'doctor'
        ? supabase.from('doctor_profiles').select('*').eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null, error: null });

    const [{ data: patientData, error: patientError }, { data: doctorData, error: doctorError }] =
      await Promise.all([patientRequest, doctorRequest]);

    if (patientError) {
      console.error('Failed to load patient profile', patientError);
    }

    if (doctorError) {
      console.error('Failed to load doctor profile', doctorError);
    }

    return {
      patientProfile: patientData ?? null,
      doctorProfile: doctorData ?? null,
    };
  }, []);

  const ensureProfileForUser = useCallback(async (nextUser: User) => {
    const seed = getProfileSeed(nextUser);

    const { data: insertedUserProfile, error: userProfileInsertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: nextUser.id,
        role: seed.role,
        full_name: seed.fullName,
        first_name: seed.firstName,
        last_name: seed.lastName,
        phone: seed.phone,
        email: seed.email,
        notification_preferences: {},
        profile_completed: false,
        terms_accepted: seed.termsAccepted,
      })
      .select('*')
      .maybeSingle();

    let userProfile = insertedUserProfile;

    if (userProfileInsertError) {
      const duplicateProfileError =
        userProfileInsertError.code === '23505' ||
        (userProfileInsertError.message?.toLowerCase().includes('duplicate') ?? false);

      if (!duplicateProfileError) {
        console.error('Failed to create user profile', userProfileInsertError);
        return null;
      }

      const { data: existingUserProfile, error: existingUserProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', nextUser.id)
        .maybeSingle();

      if (existingUserProfileError) {
        console.error('Failed to load existing user profile', existingUserProfileError);
        return null;
      }

      userProfile = existingUserProfile;
    }

    if (!userProfile) {
      return null;
    }

    if (seed.role === 'patient') {
      const { error } = await supabase.from('patient_profiles').insert({ user_id: nextUser.id });

      if (error && error.code !== '23505') {
        console.error('Failed to create patient profile', error);
      }
    }

    if (seed.role === 'doctor') {
      const { error } = await supabase.from('doctor_profiles').insert({ user_id: nextUser.id });

      if (error && error.code !== '23505') {
        console.error('Failed to create doctor profile', error);
      }
    }

    return userProfile;
  }, []);

  const loadProfileState = useCallback(
    async (nextUser: User) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', nextUser.id)
        .maybeSingle();
      let nextProfile = data;

      if (error) {
        console.error('Failed to load user profile', error);
      }

      if (!nextProfile) {
        nextProfile = await ensureProfileForUser(nextUser);
      }

      if (!nextProfile) {
        return {
          profile: null,
          patientProfile: null,
          doctorProfile: null,
          role: null,
        };
      }

      const extensions = await loadExtensionProfiles(nextProfile.role, nextUser.id);

      return {
        profile: nextProfile,
        patientProfile: extensions.patientProfile,
        doctorProfile: extensions.doctorProfile,
        role: nextProfile.role,
      };
    },
    [ensureProfileForUser, loadExtensionProfiles]
  );

  const syncSession = useCallback(
    async (nextSession: Session | null) => {
      profileLoadGenerationRef.current += 1;
      const generation = profileLoadGenerationRef.current;
      setIsLoading(true);

      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setPatientProfile(null);
        setDoctorProfile(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);

      const nextState = await loadProfileState(nextSession.user);
      if (profileLoadGenerationRef.current !== generation) {
        // A newer auth event has superseded us; drop the result instead of
        // overwriting whatever state the newer call already wrote.
        return;
      }
      setProfile(nextState.profile);
      setPatientProfile(nextState.patientProfile);
      setDoctorProfile(nextState.doctorProfile);
      setRole(nextState.role);
      setIsLoading(false);
    },
    [loadProfileState]
  );

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      await syncSession(existingSession);
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearPreviewAccess();
        // Clear the per-device language preference so a shared device does
        // not leak the previous user's selection to the next visitor.
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('ceenaix.lang');
          }
        } catch {
          // localStorage may be disabled (private mode); the sign-out path
          // must not throw.
        }
      }

      void syncSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signInWithPassword = useCallback(async ({ email, password }: PasswordSignInInput) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const signUpWithPassword = useCallback(
    async ({
      email,
      password,
      phone,
      role: nextRole,
      fullName,
      firstName,
      lastName,
      termsAccepted,
    }: PasswordSignUpInput) => {
      try {
        const parsedName = splitFullName(fullName);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: nextRole,
              full_name: fullName.trim(),
              first_name: safeString(firstName) ?? parsedName.firstName,
              last_name: safeString(lastName) ?? parsedName.lastName,
              phone: safeString(phone),
              terms_accepted: termsAccepted,
            },
            emailRedirectTo: buildAuthRedirectUrl('/auth/onboarding'),
          },
        });

        if (!error && data.user && data.user.identities?.length === 0) {
          return { error: new Error('User already registered'), session: null };
        }

        return { error, session: data.session };
      } catch (error) {
        return { error: toError(error), session: null };
      }
    },
    []
  );

  const resendSignupConfirmation = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: buildAuthRedirectUrl('/auth/onboarding'),
        },
      });

      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const requestOtp = useCallback(async ({ phone, shouldCreateUser, data }: OtpRequestInput) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser,
          data,
        },
      });

      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const verifyOtp = useCallback(async (input: VerifyOtpInput) => {
    try {
      if ('phone' in input) {
        const { error } = await supabase.auth.verifyOtp({
          token: input.token,
          phone: input.phone,
          type: input.type,
        });

        return { error };
      }

      const { error } = await supabase.auth.verifyOtp({
        token: input.token,
        email: input.email,
        type: input.type,
      });

      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthRedirectUrl('/auth/forgot-password?mode=recovery'),
      });

      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    profileLoadGenerationRef.current += 1;
    const generation = profileLoadGenerationRef.current;
    const nextState = await loadProfileState(user);
    if (profileLoadGenerationRef.current !== generation) {
      return;
    }
    setProfile(nextState.profile);
    setPatientProfile(nextState.patientProfile);
    setDoctorProfile(nextState.doctorProfile);
    setRole(nextState.role);
  }, [loadProfileState, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      patientProfile,
      doctorProfile,
      role,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      signInWithPassword,
      signUpWithPassword,
      resendSignupConfirmation,
      requestOtp,
      verifyOtp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [
      doctorProfile,
      isLoading,
      patientProfile,
      profile,
      refreshProfile,
      requestOtp,
      requestPasswordReset,
      resendSignupConfirmation,
      role,
      session,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      updatePassword,
      user,
      verifyOtp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

const AuthLoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-ceenai-cyan/5 flex items-center justify-center px-6">
    <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-xl backdrop-blur">
      <div className="h-4 w-28 rounded-full bg-gray-200 animate-pulse" />
      <div className="mt-6 h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />
      <div className="mt-4 h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />
      <div className="mt-8 h-12 w-full rounded-2xl bg-ceenai-cyan/20 animate-pulse" />
    </div>
  </div>
);

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, profile, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/access-denied" replace />;
  }

  if (location.pathname !== '/auth/onboarding' && profile && !profile.profile_completed) {
    return <Navigate to="/auth/onboarding" replace />;
  }

  return <>{children}</>;
};
