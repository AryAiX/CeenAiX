import { describe, expect, it, vi } from 'vitest';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { countUnreadMessages } from './clinic-unread-messages';

const client = (conversationIds: string[], countsPerQuery: number[]) => {
  const messageQueries: ReturnType<typeof createSupabaseQueryBuilder>[] = [];
  const from = vi.fn((table: string) => {
    if (table === 'conversations') {
      return createSupabaseQueryBuilder({ data: conversationIds.map(id => ({ id })), error: null });
    }
    const builder = createSupabaseQueryBuilder({ data: null, error: null, count: countsPerQuery[messageQueries.length] ?? 0 });
    messageQueries.push(builder);
    return builder;
  });
  return { client: { from } as never, messageQueries };
};

describe('countUnreadMessages (QA-220)', () => {
  it('counts unread, not deleted messages from other people, without downloading them', async () => {
    const { client: c, messageQueries } = client(['c1', 'c2'], [4]);
    expect(await countUnreadMessages(c, 'me')).toBe(4);
    expect(messageQueries).toHaveLength(1);
    const query = messageQueries[0];
    expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(query.in).toHaveBeenCalledWith('conversation_id', ['c1', 'c2']);
    expect(query.neq).toHaveBeenCalledWith('sender_id', 'me');
    expect(query.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(query.is).toHaveBeenCalledWith('read_at', null);
  });

  it('adds up the counts when there are many conversations (and has no 1,000 limit)', async () => {
    const ids = Array.from({ length: 320 }, (_, i) => `c${i}`);
    const { client: c, messageQueries } = client(ids, [900, 800, 5]);
    expect(await countUnreadMessages(c, 'me')).toBe(1705);
    expect(messageQueries).toHaveLength(3);
    expect(messageQueries[2].in).toHaveBeenCalledWith('conversation_id', ids.slice(300));
  });

  it('is 0 without asking for messages when there are no conversations', async () => {
    const { client: c, messageQueries } = client([], []);
    expect(await countUnreadMessages(c, 'me')).toBe(0);
    expect(messageQueries).toHaveLength(0);
  });
});
