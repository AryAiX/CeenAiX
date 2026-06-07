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
import type { Session, User } from '@supabase/supabase-js';
import type { PatientProfile, UserProfile, UserRole } from '@ceenaix/types';
import { supabase } from '../lib/supabase';

// Native port of the web `src/lib/auth-context.tsx`. Same Supabase session
// model and the same patient/role scoping, but without react-router (route
// guarding is handled by the navigator switching auth vs app stacks).

interface PasswordSignInInput {
  email: string;
  password: string;
}

interface PasswordSignUpInput {
  email: string;
  password: string;
  fullName: string;
  termsAccepted: boolean;
}

interface AuthActionResult {
  error: Error | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  patientProfile: PatientProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithPassword: (input: PasswordSignInInput) => Promise<AuthActionResult>;
  signUpWithPassword: (input: PasswordSignUpInput) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return new Error(value.trim());
  }
  return new Error('Something went wrong. Please try again.');
};

const splitFullName = (fullName: string): { firstName: string | null; lastName: string | null } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

interface ProfileState {
  profile: UserProfile | null;
  patientProfile: PatientProfile | null;
  role: UserRole | null;
}

const EMPTY_PROFILE_STATE: ProfileState = { profile: null, patientProfile: null, role: null };

const ensureProfileForUser = async (nextUser: User): Promise<UserProfile | null> => {
  const metadata = nextUser.user_metadata ?? {};
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    nextUser.email ||
    'CeenAiX User';
  const parsed = splitFullName(fullName);

  const { data: inserted, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: nextUser.id,
      role: 'patient',
      full_name: fullName,
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: nextUser.email ?? null,
      notification_preferences: {},
      profile_completed: false,
      terms_accepted: Boolean(metadata.terms_accepted),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    const duplicate = error.code === '23505' || (error.message?.toLowerCase().includes('duplicate') ?? false);
    if (!duplicate) {
      console.error('Failed to create user profile', error);
      return null;
    }
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', nextUser.id)
      .maybeSingle();
    return (existing as UserProfile | null) ?? null;
  }

  await supabase.from('patient_profiles').insert({ user_id: nextUser.id });
  return (inserted as UserProfile | null) ?? null;
};

const loadProfileState = async (nextUser: User): Promise<ProfileState> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', nextUser.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load user profile', error);
  }

  let profile = (data as UserProfile | null) ?? null;
  if (!profile) {
    profile = await ensureProfileForUser(nextUser);
  }
  if (!profile) {
    return EMPTY_PROFILE_STATE;
  }

  let patientProfile: PatientProfile | null = null;
  if (profile.role === 'patient') {
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', nextUser.id)
      .maybeSingle();
    patientProfile = (patientData as PatientProfile | null) ?? null;
  }

  return { profile, patientProfile, role: profile.role };
};

export const AuthProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const generationRef = useRef(0);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setIsLoading(true);

    if (!nextSession?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setPatientProfile(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    setSession(nextSession);
    setUser(nextSession.user);

    const nextState = await loadProfileState(nextSession.user);
    if (generationRef.current !== generation) {
      return;
    }
    setProfile(nextState.profile);
    setPatientProfile(nextState.patientProfile);
    setRole(nextState.role);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (active) {
        await syncSession(existing);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        void syncSession(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signInWithPassword = useCallback(async ({ email, password }: PasswordSignInInput) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const signUpWithPassword = useCallback(
    async ({ email, password, fullName, termsAccepted }: PasswordSignUpInput) => {
      try {
        const parsed = splitFullName(fullName);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'patient',
              full_name: fullName.trim(),
              first_name: parsed.firstName,
              last_name: parsed.lastName,
              terms_accepted: termsAccepted,
            },
          },
        });
        return { error };
      } catch (error) {
        return { error: toError(error) };
      }
    },
    []
  );

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
    generationRef.current += 1;
    const generation = generationRef.current;
    const nextState = await loadProfileState(user);
    if (generationRef.current !== generation) {
      return;
    }
    setProfile(nextState.profile);
    setPatientProfile(nextState.patientProfile);
    setRole(nextState.role);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      patientProfile,
      role,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      patientProfile,
      role,
      isLoading,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
