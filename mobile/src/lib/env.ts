const normalize = (value: string | undefined): string => (value ?? '').trim();

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const rawUrl = normalize(process.env.EXPO_PUBLIC_SUPABASE_URL);

export const SUPABASE_URL = isHttpUrl(rawUrl) ? rawUrl : '';
export const SUPABASE_ANON_KEY = normalize(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const rawWebUrl = normalize(process.env.EXPO_PUBLIC_WEB_URL);
export const WEB_PORTAL_URL = isHttpUrl(rawWebUrl) ? rawWebUrl.replace(/\/+$/, '') : 'https://www.ceenaix.com';
