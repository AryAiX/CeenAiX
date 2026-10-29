import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

const DATA_API = /\/(rest|functions|storage)\/v1\//;
const inFlight = new Set<AbortController>();
let dataSessionOpen = false;

/** Allows data requests (REST, Edge Functions, Storage) for a signed-in session. */
export function openDataSession(): void {
  dataSessionOpen = true;
}

/** Aborts in-flight data requests and refuses new ones until the next sign-in, so screens still unmounting after sign-out can't hit the API anonymously. */
export function closeDataSession(): void {
  dataSessionOpen = false;
  for (const controller of inFlight) controller.abort();
  inFlight.clear();
}

/** postgrest-js returns fetch failures as `{ message: 'AbortError: …' }` instead of throwing them. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.startsWith('AbortError');
}

const signedOutError = () => Object.assign(new Error('Signed out'), { name: 'AbortError' });

const guardedFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!DATA_API.test(url)) return fetch(input, init);
  if (!dataSessionOpen) return Promise.reject(signedOutError());
  const controller = new AbortController();
  init?.signal?.addEventListener('abort', () => controller.abort());
  inFlight.add(controller);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => inFlight.delete(controller));
};

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
  global: { fetch: guardedFetch },
});

// Supabase recommends pausing token refresh while the app is backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
