import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { UserProfile } from '../types';

/**
 * Fetches the current user's profile from user_profiles.
 * Returns null when not authenticated.
 */
export function useUserProfile() {
  return useQuery<UserProfile | null>(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      // Surface the auth error so callers can distinguish "no profile" from
      // "couldn't reach the auth server" — previously this was swallowed and
      // the UI happily rendered a logged-out state instead of a retry.
      throw authError;
    }
    const user = authData.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }, []);
}
