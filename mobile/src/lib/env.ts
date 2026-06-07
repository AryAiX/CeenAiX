// Typed access to the Expo public env vars (analogous to the web app's
// VITE_SUPABASE_* handling in `src/lib/supabase.ts`). Anything prefixed with
// EXPO_PUBLIC_ is inlined at build time by Expo.

const normalize = (value: string | undefined): string => (value ?? '').trim();

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const rawUrl = normalize(process.env.EXPO_PUBLIC_SUPABASE_URL);

export const SUPABASE_URL = isValidHttpUrl(rawUrl) ? rawUrl : '';
export const SUPABASE_ANON_KEY = normalize(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  console.warn(
    '[CeenAiX] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy mobile/.env.example to mobile/.env and fill in the values.'
  );
}
