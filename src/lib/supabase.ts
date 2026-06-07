import { createClient } from '@supabase/supabase-js';

const normalizeEnvValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  let normalized = value.trim().replace(/\\r/g, '').replace(/\\n/g, '').trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const rawSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseUrl = isValidHttpUrl(rawSupabaseUrl) ? rawSupabaseUrl : '';
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Edge Functions base URL. On Supabase Cloud and on a self-hosted stack served
// behind a single Kong gateway, functions live at `<supabase-url>/functions/v1`,
// which is the safe default below. Some deployments (e.g. the Azure UAE
// self-host runbook) expose the Deno edge runtime on a separate host/domain;
// set VITE_SUPABASE_FUNCTIONS_URL to override the base without touching code.
const rawFunctionsUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL);
const functionsBaseUrl = isValidHttpUrl(rawFunctionsUrl)
  ? stripTrailingSlash(rawFunctionsUrl)
  : `${supabaseUrl}/functions/v1`;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing or invalid Supabase environment variables. Some features may not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

/** Base URL for Supabase Edge Functions (no trailing slash). */
export const SUPABASE_FUNCTIONS_URL = functionsBaseUrl;

/**
 * Build a fully-qualified Edge Function URL from a path.
 * Accepts paths with or without a leading slash, e.g. `edgeFunctionUrl('leads/count')`
 * or `edgeFunctionUrl('/clinic-doctor-invite')`.
 */
export const edgeFunctionUrl = (path: string): string => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${SUPABASE_FUNCTIONS_URL}${suffix}`;
};
