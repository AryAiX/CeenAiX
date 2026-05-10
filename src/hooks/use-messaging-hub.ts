import { useCallback, useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import type { Conversation, Message } from '../types';
import {
  buildDirectParticipantIds,
  ConversationListItem,
  getDefaultCareConversationSubject,
  getMessagePreviewText,
  getConversationCounterpartyId,
  isMissingMessagingRpcError,
  trimMessageDraft,
} from '../lib/messaging';
import { supabase } from '../lib/supabase';

const careTeamFallback = () => i18n.t('messaging.careTeamFallback', { defaultValue: 'Care team' });
const errStartConversation = () =>
  i18n.t('messaging.errStartConversation', { defaultValue: 'Unable to start this conversation.' });
const errSendMessage = () =>
  i18n.t('messaging.errSendMessage', { defaultValue: 'Unable to send message.' });
const errLoadConversations = () =>
  i18n.t('messaging.errLoadConversations', { defaultValue: 'Unable to load conversations.' });
const errLoadMessages = () =>
  i18n.t('messaging.errLoadMessages', { defaultValue: 'Unable to load messages.' });

interface UserProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface MessagePreviewRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

interface EnsureConversationResult {
  conversationId: string | null;
  created: boolean;
}

export function useMessagingHub(userId: string | null | undefined, selectedConversationId: string | null) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [working, setWorking] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeConversationId = useMemo(() => {
    if (
      selectedConversationId &&
      conversations.some((conversation) => conversation.id === selectedConversationId)
    ) {
      return selectedConversationId;
    }

    return conversations[0]?.id ?? null;
  }, [conversations, selectedConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setMessages([]);
      setConversationError(null);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    setConversationError(null);

    try {
      const { data: conversationRows, error: conversationsQueryError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (conversationsQueryError) {
        throw conversationsQueryError;
      }

      const safeConversations = (conversationRows ?? []) as Conversation[];
      const conversationIds = safeConversations.map((conversation) => conversation.id);
      const counterpartIds = Array.from(
        new Set(
          safeConversations
            .map((conversation) => getConversationCounterpartyId(conversation, userId))
            .filter((value): value is string => Boolean(value))
        )
      );

      const [{ data: counterpartProfiles, error: counterpartProfilesError }, messagePreviewsResult] =
        await Promise.all([
          counterpartIds.length > 0
            ? supabase
                .from('user_profiles')
                .select('user_id, full_name, email')
                .in('user_id', counterpartIds)
            : Promise.resolve({ data: [] as UserProfileRow[], error: null }),
          conversationIds.length > 0
            ? supabase
                .from('messages')
                .select('id, conversation_id, sender_id, body, sent_at, read_at')
                .in('conversation_id', conversationIds)
                .order('sent_at', { ascending: false })
            : Promise.resolve({ data: [] as MessagePreviewRow[], error: null }),
        ]);

      if (counterpartProfilesError) {
        throw counterpartProfilesError;
      }

      if (messagePreviewsResult.error) {
        throw messagePreviewsResult.error;
      }

      const profileById = new Map(
        (counterpartProfiles ?? []).map((profile) => [
          profile.user_id,
          {
            name: profile.full_name?.trim() || profile.email?.trim() || careTeamFallback(),
            email: profile.email ?? null,
          },
        ])
      );

      const lastMessageByConversationId = new Map<string, MessagePreviewRow>();
      const unreadCountByConversationId = new Map<string, number>();

      for (const preview of (messagePreviewsResult.data ?? []) as MessagePreviewRow[]) {
        if (!lastMessageByConversationId.has(preview.conversation_id)) {
          lastMessageByConversationId.set(preview.conversation_id, preview);
        }

        if (preview.sender_id !== userId && !preview.read_at) {
          unreadCountByConversationId.set(
            preview.conversation_id,
            (unreadCountByConversationId.get(preview.conversation_id) ?? 0) + 1
          );
        }
      }

      const nextConversations = safeConversations
        .map((conversation) => {
          const counterpartId = getConversationCounterpartyId(conversation, userId);
          const counterpart = counterpartId
            ? profileById.get(counterpartId) ?? { name: careTeamFallback(), email: null }
            : { name: careTeamFallback(), email: null };
          const lastMessage = lastMessageByConversationId.get(conversation.id);

          return {
            id: conversation.id,
            subject: conversation.subject,
            createdAt: conversation.created_at,
            lastMessageAt: lastMessage?.sent_at ?? conversation.last_message_at,
            lastMessagePreview: lastMessage ? getMessagePreviewText(lastMessage.body) : null,
            unreadCount: unreadCountByConversationId.get(conversation.id) ?? 0,
            counterpart: {
              id: counterpartId ?? '',
              name: counterpart.name,
              email: counterpart.email,
            },
          };
        })
        .sort((left, right) => {
          const leftTime = new Date(left.lastMessageAt ?? left.createdAt).getTime();
          const rightTime = new Date(right.lastMessageAt ?? right.createdAt).getTime();
          return rightTime - leftTime;
        });

      setConversations(nextConversations);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : errLoadConversations());
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_messages_read', {
        p_conversation_id: conversationId,
      });

      if (error) {
        if (!isMissingMessagingRpcError(error)) {
          console.warn(error.message);
        }
        return;
      }

      await loadConversations();
    },
    [loadConversations]
  );

  const loadMessages = useCallback(
    async (conversationId: string | null) => {
      if (!userId || !conversationId) {
        setMessages([]);
        setThreadError(null);
        setLoadingMessages(false);
        return;
      }

      setLoadingMessages(true);
      setThreadError(null);

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages((data ?? []) as Message[]);
        void markConversationRead(conversationId);
      } catch (error) {
        setThreadError(error instanceof Error ? error.message : errLoadMessages());
      } finally {
        setLoadingMessages(false);
      }
    },
    [markConversationRead, userId]
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  const ensureDirectConversation = useCallback(
    async (otherUserId: string, subject?: string | null): Promise<EnsureConversationResult> => {
      if (!userId || !otherUserId) {
        return {
          conversationId: null,
          created: false,
        };
      }

      setWorking(true);
      setActionError(null);

      try {
        const effectiveSubject = subject?.trim() || getDefaultCareConversationSubject();
        const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
          p_other_user_id: otherUserId,
          p_subject: effectiveSubject,
        });

        if (error && !isMissingMessagingRpcError(error)) {
          throw error;
        }

        if (typeof data === 'string' && data) {
          await loadConversations();
          return {
            conversationId: data,
            created: false,
          };
        }

        const participantIds = buildDirectParticipantIds(userId, otherUserId);

        const { data: existingRows, error: existingRowsError } = await supabase
          .from('conversations')
          .select('id, participant_ids')
          .contains('participant_ids', participantIds)
          .order('created_at', { ascending: true })
          .limit(10);

        if (existingRowsError) {
          throw existingRowsError;
        }

        const existingConversationId =
          existingRows?.find((conversation) => {
            const ids = Array.isArray(conversation.participant_ids) ? conversation.participant_ids : [];
            return ids.length === participantIds.length && participantIds.every((participantId) => ids.includes(participantId));
          })?.id ?? null;

        if (existingConversationId) {
          await loadConversations();
          return {
            conversationId: existingConversationId,
            created: false,
          };
        }

        const { data: insertedConversation, error: insertConversationError } = await supabase
          .from('conversations')
          .insert({
            created_by: userId,
            participant_ids: participantIds,
            subject: effectiveSubject,
            last_message_at: null,
          })
          .select('id')
          .single();

        if (insertConversationError) {
          throw insertConversationError;
        }

        await loadConversations();

        return {
          conversationId: insertedConversation.id,
          created: true,
        };
      } catch (error) {
        setActionError(error instanceof Error ? error.message : errStartConversation());
        return {
          conversationId: null,
          created: false,
        };
      } finally {
        setWorking(false);
      }
    },
    [loadConversations, userId]
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!userId || !activeConversationId) {
        return false;
      }

      const trimmedBody = trimMessageDraft(body);
      if (!trimmedBody) {
        return false;
      }

      setWorking(true);
      setActionError(null);

      try {
        const sentAt = new Date().toISOString();
        const { error: insertMessageError } = await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          sender_id: userId,
          body: trimmedBody,
          sent_at: sentAt,
        });

        if (insertMessageError) {
          throw insertMessageError;
        }

        const { error: updateConversationError } = await supabase
          .from('conversations')
          .update({ last_message_at: sentAt })
          .eq('id', activeConversationId);

        if (updateConversationError) {
          console.warn(updateConversationError.message);
        }

        await Promise.all([loadConversations(), loadMessages(activeConversationId)]);
        return true;
      } catch (error) {
        setActionError(error instanceof Error ? error.message : errSendMessage());
        return false;
      } finally {
        setWorking(false);
      }
    },
    [activeConversationId, loadConversations, loadMessages, userId]
  );

  return {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    working,
    conversationError,
    threadError,
    actionError,
    ensureDirectConversation,
    sendMessage,
    refresh: loadConversations,
  };
}
