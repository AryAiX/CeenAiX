import type { SupabaseClient } from '@supabase/supabase-js';

/** Conversation ids per count query, so a long list does not make the request URL too long. */
const CHUNK_SIZE = 150;

/**
 * QA-220: messages sent to this user that are not read yet, across all of their conversations.
 * Uses count queries (the old code downloaded the rows, which stops at 1,000) and skips deleted
 * messages, like the doctor portal (use-doctor-portal-chrome).
 */
export const countUnreadMessages = async (client: SupabaseClient, userId: string): Promise<number> => {
  const { data: conversations, error: conversationsError } = await client
    .from('conversations')
    .select('id')
    .or(`created_by.eq.${userId},participant_ids.cs.["${userId}"]`);
  if (conversationsError) throw conversationsError;

  const ids = ((conversations ?? []) as { id: string }[]).map((conversation) => conversation.id);
  let total = 0;
  for (let start = 0; start < ids.length; start += CHUNK_SIZE) {
    const { count, error } = await client
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids.slice(start, start + CHUNK_SIZE))
      .neq('sender_id', userId)
      .eq('is_deleted', false)
      .is('read_at', null);
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
};
