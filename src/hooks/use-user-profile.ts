import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { UserProfile } from '../types';

/**
 * Fetches the current user's profile from user_profiles.
 * Returns null when not authenticated.
 */
export function useUserProfile() {
  return useQuery<UserProfile | null>(async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
