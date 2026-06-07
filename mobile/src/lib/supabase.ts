import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

// React Native equivalent of the web `src/lib/supabase.ts`. Differences:
//   - URL polyfill is required before the client is created (RN has no URL).
//   - Session is persisted in AsyncStorage so the patient stays signed in.
//   - detectSessionInUrl is disabled (no browser address bar on native).
// RLS on the hosted Supabase project remains authoritative for all access.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
