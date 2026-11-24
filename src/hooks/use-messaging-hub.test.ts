import { act, renderHook, waitFor } from '@testing-library/react';
import { PostgrestError } from '@supabase/postgrest-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { useMessagingHub } from './use-messaging-hub';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

/** Supabase errors are real Error objects (PostgrestError extends Error). */
const dbError = (message: string, code = 'XX000') => new PostgrestError({ message, code, details: '', hint: '' });

const CONVERSATION = {
  id: 'conv-1',
  created_by: 'me',
  participant_ids: ['me', 'other'],
  subject: 'Care conversation',
  created_at: '2026-11-19T08:00:00Z',
  last_message_at: '2026-11-19T09:00:00Z',
};

let rpcResults: Record<string, { data: unknown; error: unknown }>;
let messageInsertError: unknown;
let conversationUpdateError: unknown;
let conversationsLoadError: unknown;

const mockSupabase = () => {
  vi.mocked(supabase.rpc).mockImplementation(((name: string) =>
    Promise.resolve(rpcResults[name] ?? { data: null, error: null })) as never);
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'conversations') {
      const builder = createSupabaseQueryBuilder({
        data: conversationsLoadError ? null : [CONVERSATION],
        error: conversationsLoadError,
      });
      builder.update = vi.fn(() => createSupabaseQueryBuilder({ data: null, error: conversationUpdateError }));
      return builder;
    }
    const builder = createSupabaseQueryBuilder({ data: [], error: null });
    builder.insert = vi.fn(() => createSupabaseQueryBuilder({ data: null, error: messageInsertError }));
    return builder;
  }) as never);
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
  rpcResults = {
    get_conversation_counterparty_profiles: { data: [{ user_id: 'other', full_name: 'Other Person' }], error: null },
  };
  messageInsertError = null;
  conversationUpdateError = null;
  conversationsLoadError = null;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockSupabase();
});

afterEach(async () => {
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});

const loaded = async () => {
  const hook = renderHook(() => useMessagingHub('me', 'conv-1'));
  await waitFor(() => expect(hook.result.current.loadingConversations).toBe(false));
  return hook;
};

describe('useMessagingHub error messages (QA-219)', () => {
  it('shows a plain message, not the database text, when a message cannot be sent', async () => {
    messageInsertError = dbError('new row violates row-level security policy for table "messages"', '42501');
    const { result } = await loaded();

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendMessage('Hello');
    });
    expect(sent).toBe(false);
    expect(result.current.actionError).toBe('Unable to send message.');
  });

  it('says why a conversation cannot be started when the person is not in the care team', async () => {
    rpcResults.get_or_create_direct_conversation = {
      data: null,
      error: dbError('You can only start a conversation with your care team.', '42501'),
    };
    const { result } = await loaded();

    await act(async () => {
      await result.current.ensureDirectConversation('stranger');
    });
    expect(result.current.actionError).toBe('You can only start a conversation with someone in your care team.');
  });

  it('uses a general message for other start failures', async () => {
    rpcResults.get_or_create_direct_conversation = { data: null, error: dbError('connection reset by peer') };
    const { result } = await loaded();

    await act(async () => {
      await result.current.ensureDirectConversation('someone');
    });
    expect(result.current.actionError).toBe('Unable to start this conversation.');
  });

  it('shows the message in Arabic when the portal is in Arabic', async () => {
    await i18n.changeLanguage('ar');
    messageInsertError = dbError('permission denied for table messages', '42501');
    const { result } = await loaded();

    await act(async () => {
      await result.current.sendMessage('مرحبا');
    });
    expect(result.current.actionError).toBe('تعذّر إرسال الرسالة.');
  });

  it('shows no error when the message was sent and only the conversation time could not be updated', async () => {
    conversationUpdateError = dbError('permission denied for table conversations', '42501');
    const { result } = await loaded();

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendMessage('Hello');
    });
    expect(sent).toBe(true);
    expect(result.current.actionError).toBeNull();
  });

  it('keeps the database text out of the conversation list error too', async () => {
    conversationsLoadError = dbError('relation "public.conversations" does not exist', '42P01');
    const { result } = await loaded();
    expect(result.current.conversationError).toBe('Unable to load conversations.');
  });
});
