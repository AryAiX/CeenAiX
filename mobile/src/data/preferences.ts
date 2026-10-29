import { supabase } from '@/lib/supabase';

// Same `user_profiles.notification_preferences` shape and defaults as web
// `src/pages/patient/Settings.tsx`.

export interface PatientPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  shareWithDoctors: boolean;
  shareWithPharmacy: boolean;
  shareWithInsurance: boolean;
  language: string;
  largeText: boolean;
  highContrast: boolean;
}

export const DEFAULT_PREFERENCES: PatientPreferences = {
  email: true,
  sms: true,
  push: true,
  shareWithDoctors: true,
  shareWithPharmacy: true,
  shareWithInsurance: false,
  language: 'en',
  largeText: false,
  highContrast: false,
};

export function normalizePreferences(value: unknown): PatientPreferences {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const flag = (key: keyof PatientPreferences) => {
    const current = raw[key];
    return typeof current === 'boolean' ? current : (DEFAULT_PREFERENCES[key] as boolean);
  };
  return {
    email: flag('email'),
    sms: flag('sms'),
    push: flag('push'),
    shareWithDoctors: flag('shareWithDoctors'),
    shareWithPharmacy: flag('shareWithPharmacy'),
    shareWithInsurance: flag('shareWithInsurance'),
    language: typeof raw.language === 'string' ? raw.language : DEFAULT_PREFERENCES.language,
    largeText: flag('largeText'),
    highContrast: flag('highContrast'),
  };
}

export async function savePreferences(userId: string, preferences: PatientPreferences): Promise<void> {
  const { error } = await supabase.from('user_profiles').update({ notification_preferences: preferences }).eq('user_id', userId);
  if (error) throw error;
}
