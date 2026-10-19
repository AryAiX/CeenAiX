import type { Conversation, Message } from '@ceenaix/types';
import {
  buildDirectParticipantIds,
  getConversationCounterpartyId,
  getDefaultCareConversationSubject,
  getMessagePreviewText,
  isMissingMessagingRpcError,
  trimMessageDraft,
  type ConversationListItem,
} from '@ceenaix/shared/messaging';
import i18n from 'i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@/hooks/use-query';
import { supabase } from '@/lib/supabase';

// The web `useMessagingHub` couples the list with an "active" thread that
// defaults to the first conversation and marks it read on load, and it only
// reloads a thread when the selection changes. On a phone the list and thread
// are separate screens with realtime updates, so this module carries the
// hub's queries (same tables, RPCs, filters and ordering) split per screen.

interface MessagePreviewRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

const careTeamFallback = () => i18n.t('messaging.careTeamFallback', { defaultValue: 'Care team' });

export async function fetchConversationList(userId: string): Promise<ConversationListItem[]> {
  const { data: conversationRows, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const conversations = (conversationRows ?? []) as Conversation[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const counterpartIds = Array.from(
    new Set(conversations.map((conversation) => getConversationCounterpartyId(conversation, userId)).filter((value): value is string => Boolean(value)))
  );
  const [profiles, previews] = await Promise.all([
    counterpartIds.length > 0
      ? supabase.rpc('get_conversation_counterparty_profiles', { p_user_ids: counterpartIds })
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length > 0
      ? supabase
          .from('messages')
          .select('id, conversation_id, sender_id, body, sent_at, read_at')
          .in('conversation_id', conversationIds)
          .order('sent_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error) throw profiles.error;
  if (previews.error) throw previews.error;

  const nameById = new Map(
    ((profiles.data ?? []) as Array<{ user_id: string; full_name: string | null }>).map((profile) => [
      profile.user_id,
      profile.full_name?.trim() || careTeamFallback(),
    ])
  );
  const lastById = new Map<string, MessagePreviewRow>();
  const unreadById = new Map<string, number>();
  for (const preview of (previews.data ?? []) as MessagePreviewRow[]) {
    if (!lastById.has(preview.conversation_id)) lastById.set(preview.conversation_id, preview);
    if (preview.sender_id !== userId && !preview.read_at) {
      unreadById.set(preview.conversation_id, (unreadById.get(preview.conversation_id) ?? 0) + 1);
    }
  }

  return conversations
    .map((conversation) => {
      const counterpartId = getConversationCounterpartyId(conversation, userId);
      const last = lastById.get(conversation.id);
      return {
        id: conversation.id,
        subject: conversation.subject,
        createdAt: conversation.created_at,
        lastMessageAt: last?.sent_at ?? conversation.last_message_at,
        lastMessagePreview: last ? getMessagePreviewText(last.body) : null,
        unreadCount: unreadById.get(conversation.id) ?? 0,
        counterpart: {
          id: counterpartId ?? '',
          name: (counterpartId && nameById.get(counterpartId)) || careTeamFallback(),
          email: null,
        },
      };
    })
    .sort((left, right) => new Date(right.lastMessageAt ?? right.createdAt).getTime() - new Date(left.lastMessageAt ?? left.createdAt).getTime());
}

export function useConversationList(userId: string | null | undefined) {
  return useQuery(() => (userId ? fetchConversationList(userId) : Promise.resolve([])), [userId ?? '']);
}

export function useConversationThread(userId: string | null | undefined, conversationId: string | null | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!userId || !conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setError(null);
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: true });
    if (requestRef.current !== requestId) return;
    if (queryError) {
      setError(queryError.message || i18n.t('messaging.errLoadMessages'));
    } else {
      setMessages((data ?? []) as Message[]);
      const { error: readError } = await supabase.rpc('mark_conversation_messages_read', { p_conversation_id: conversationId });
      if (readError && !isMissingMessagingRpcError(readError)) console.warn(readError.message);
    }
    setLoading(false);
  }, [conversationId, userId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId || !conversationId) return;
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, load, userId]);

  const run = useCallback(
    async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
      setWorking(true);
      setActionError(null);
      try {
        await action();
        await load();
        return true;
      } catch (actionFailure) {
        setActionError(actionFailure instanceof Error ? actionFailure.message : fallback);
        return false;
      } finally {
        setWorking(false);
      }
    },
    [load]
  );

  const send = useCallback(
    (body: string) => {
      const trimmed = trimMessageDraft(body);
      if (!userId || !conversationId || !trimmed) return Promise.resolve(false);
      return run(async () => {
        const sentAt = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('messages')
          .insert({ conversation_id: conversationId, sender_id: userId, body: trimmed, sent_at: sentAt });
        if (insertError) throw insertError;
        const { error: touchError } = await supabase.from('conversations').update({ last_message_at: sentAt }).eq('id', conversationId);
        if (touchError) console.warn(`[messaging] message sent but conversation timestamp update failed: ${touchError.message}`);
      }, i18n.t('messaging.errSendMessage'));
    },
    [conversationId, run, userId]
  );

  const update = useCallback(
    (messageId: string, body: string) => {
      const trimmed = trimMessageDraft(body);
      if (!userId || !trimmed) return Promise.resolve(false);
      return run(async () => {
        const { error: updateError } = await supabase.from('messages').update({ body: trimmed }).eq('id', messageId).eq('sender_id', userId);
        if (updateError) throw updateError;
      }, 'Unable to edit message.');
    },
    [run, userId]
  );

  const remove = useCallback(
    (messageId: string) => {
      if (!userId) return Promise.resolve(false);
      return run(async () => {
        const { error: deleteError } = await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId).eq('sender_id', userId);
        if (deleteError) throw deleteError;
      }, 'Unable to delete message.');
    },
    [run, userId]
  );

  return { messages, loading, error, actionError, working, refetch: load, send, update, remove };
}

/** Same resolution order as the hub's `ensureDirectConversation`: RPC, existing lookup, then insert. */
export async function ensureDirectConversation(userId: string, otherUserId: string, subject?: string | null): Promise<string> {
  const effectiveSubject = subject?.trim() || getDefaultCareConversationSubject();
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user_id: otherUserId,
    p_subject: effectiveSubject,
  });
  if (error && !isMissingMessagingRpcError(error)) throw error;
  if (typeof data === 'string' && data) return data;

  const participantIds = buildDirectParticipantIds(userId, otherUserId);
  const { data: existingRows, error: existingError } = await supabase
    .from('conversations')
    .select('id, participant_ids')
    .contains('participant_ids', participantIds)
    .order('created_at', { ascending: true })
    .limit(10);
  if (existingError) throw existingError;
  const existing = existingRows?.find((conversation) => {
    const ids: string[] = Array.isArray(conversation.participant_ids) ? conversation.participant_ids : [];
    return ids.length === participantIds.length && participantIds.every((id) => ids.includes(id));
  });
  if (existing) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from('conversations')
    .insert({ created_by: userId, participant_ids: participantIds, subject: effectiveSubject, last_message_at: null })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id as string;
}
