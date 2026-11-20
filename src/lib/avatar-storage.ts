import { supabase } from './supabase';

/**
 * QA-172: profile pictures live in the public 'avatars' bucket under '<userId>/'.
 * Clearing avatar_url alone left the image file there, still open to anyone with the old link,
 * and uploading a different file type (avatar.png after avatar.jpg) left the old one behind.
 * Deletes every file in the user's avatar folder except `keepPath`.
 */
export const removeAvatarFiles = async (userId: string, keepPath?: string): Promise<void> => {
  const { data, error } = await supabase.storage.from('avatars').list(userId, { limit: 100 });
  if (error) {
    throw error;
  }

  const paths = (data ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keepPath);

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage.from('avatars').remove(paths);
  if (removeError) {
    throw removeError;
  }
};
