import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

// Same hosted project and RLS as the web portal. PKCE is used so email links
// (password recovery) come back to the app as `ceenaix://reset-password?code=`.
export const supabase = createClient(SUPABASE_URL || 'https://invalid.localhost', SUPABASE_ANON_KEY || 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Supabase recommends pausing token refresh while the app is backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
