import type { Session, User } from '@supabase/supabase-js';
import type { PatientProfile, UserProfile, UserRole } from '@ceenaix/types';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearQueryCache } from '@/lib/query-cache';
import { supabase } from '@/lib/supabase';

interface AuthResult {
  error: Error | null;
}

interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  termsAccepted: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  patientProfile: PatientProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isPatient: boolean;
  isRecovering: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult & { needsConfirmation: boolean }>;
  requestPhoneOtp: (phone: string, createAccount: { fullName: string } | null) => Promise<AuthResult>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  completeRecovery: (code: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(typeof value === 'string' && value ? value : 'Something went wrong.');

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
  };
};

const ensureProfile = async (user: User): Promise<UserProfile | null> => {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = str(metadata.full_name) ?? user.email ?? user.phone ?? 'CeenAiX patient';
  const parsed = splitName(fullName);
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      role: 'patient',
      full_name: fullName,
      first_name: str(metadata.first_name) ?? parsed.firstName,
      last_name: str(metadata.last_name) ?? parsed.lastName,
      phone: str(user.phone) ?? str(metadata.phone),
      email: user.email ?? null,
      notification_preferences: {},
      profile_completed: false,
      terms_accepted: Boolean(metadata.terms_accepted),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code !== '23505') return null;
    const { data: existing } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
    return (existing as UserProfile | null) ?? null;
  }
  const { error: patientError } = await supabase.from('patient_profiles').insert({ user_id: user.id });
  if (patientError && patientError.code !== '23505') {
    console.warn('[auth] Failed to create patient profile', patientError.message);
  }
  return (data as UserProfile | null) ?? null;
};

const loadProfiles = async (user: User) => {
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
  const profile = ((data as UserProfile | null) ?? null) || (await ensureProfile(user));
  if (!profile) return { profile: null, patientProfile: null, role: null };
  let patientProfile: PatientProfile | null = null;
  if (profile.role === 'patient') {
    const { data: patient } = await supabase.from('patient_profiles').select('*').eq('user_id', user.id).maybeSingle();
    patientProfile = (patient as PatientProfile | null) ?? null;
  }
  return { profile, patientProfile, role: profile.role };
};

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const generation = useRef(0);

  const sync = useCallback(async (next: Session | null) => {
    const current = ++generation.current;
    if (!next?.user) {
      setSession(null);
      setProfile(null);
      setPatientProfile(null);
      setRole(null);
      setIsLoading(false);
      return;
    }
    setSession(next);
    const state = await loadProfiles(next.user);
    if (current !== generation.current) return;
    setProfile(state.profile);
    setPatientProfile(state.patientProfile);
    setRole(state.role);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) void sync(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true);
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(next);
        return;
      }
      void sync(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [sync]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    try {
      const parsed = splitName(input.fullName);
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            role: 'patient',
            full_name: input.fullName.trim(),
            first_name: parsed.firstName,
            last_name: parsed.lastName,
            phone: str(input.phone),
            terms_accepted: input.termsAccepted,
          },
          emailRedirectTo: Linking.createURL('/'),
        },
      });
      if (!error && data.user && data.user.identities?.length === 0) {
        return { error: new Error('User already registered'), needsConfirmation: false };
      }
      return { error, needsConfirmation: !error && !data.session };
    } catch (error) {
      return { error: toError(error), needsConfirmation: false };
    }
  }, []);

  const requestPhoneOtp = useCallback(async (phone: string, createAccount: { fullName: string } | null) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: Boolean(createAccount),
          data: createAccount
            ? { role: 'patient', full_name: createAccount.fullName.trim(), phone, ...splitName(createAccount.fullName) }
            : undefined,
        },
      });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('/reset-password'),
      });
      return { error };
    } catch (error) {
      return { error: toError(error) };
    }
  }, []);

  const completeRecovery = useCallback(async (code: string) => {
    try {
      setIsRecovering(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setIsRecovering(false);
      return { error };
    } catch (error) {
      setIsRecovering(false);
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

  const finishRecovery = useCallback(() => setIsRecovering(false), []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      await clearQueryCache();
      setIsRecovering(false);
      await sync(null);
    }
  }, [sync]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const current = ++generation.current;
    const state = await loadProfiles(session.user);
    if (current !== generation.current) return;
    setProfile(state.profile);
    setPatientProfile(state.patientProfile);
    setRole(state.role);
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      patientProfile,
      role,
      isLoading,
      isPatient: Boolean(session?.user) && role === 'patient',
      isRecovering,
      signInWithPassword,
      signUp,
      requestPhoneOtp,
      verifyPhoneOtp,
      requestPasswordReset,
      completeRecovery,
      updatePassword,
      finishRecovery,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      patientProfile,
      role,
      isLoading,
      isRecovering,
      signInWithPassword,
      signUp,
      requestPhoneOtp,
      verifyPhoneOtp,
      requestPasswordReset,
      completeRecovery,
      updatePassword,
      finishRecovery,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
