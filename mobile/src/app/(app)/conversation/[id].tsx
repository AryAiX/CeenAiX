import { MESSAGE_DRAFT_MAX_LENGTH, parseMessageBodyParts, type MessageActionKind } from '@ceenaix/shared/messaging';
import type { Message } from '@ceenaix/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { alertDialog } from '@/lib/dialog';
import { EmptyState, ErrorState, Icon, InlineMessage, Skeleton, Text } from '@/components/ui';
import { useConversationList, useConversationThread } from '@/data/messaging';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate, formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { webPathToHref } from '@/lib/links';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const UNDO_MS = 5000;

const ACTION_LABEL_KEYS: Record<MessageActionKind, string> = {
  booking_link: 'doctor.messages.actionLabels.bookingLink',
  appointments_link: 'doctor.messages.actionLabels.appointmentsLink',
  records_link: 'doctor.messages.actionLabels.recordsLink',
};

type Row = { kind: 'message'; message: Message } | { kind: 'day'; key: string; label: string };

export default function ConversationScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { id, draft: draftParam } = useLocalSearchParams<{
    id: string;
    draft?: string;
  }>();
  const { user } = useAuth();
  const { refresh: refreshBadges } = useBadges();
  const thread = useConversationThread(user?.id, id);
  const list = useOfflineCache(useConversationList(user?.id), user ? `conversations:${user.id}` : null);
  const conversation = list.data?.find((row) => row.id === id) ?? null;
  const [draft, setDraft] = useState(draftParam ?? '');
  const [editing, setEditing] = useState<Message | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const { messages, loading } = thread;

  useEffect(() => {
    if (!loading) void refreshBadges();
  }, [loading, messages.length, refreshBadges]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

  const rows = useMemo<Row[]>(() => {
    const visible = messages.filter((message) => message.id !== pendingDelete);
    const out: Row[] = [];
    let lastDay = '';
    for (const message of visible) {
      const day = new Date(message.sent_at).toDateString();
      if (day !== lastDay) {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 86_400_000);
        const label =
          day === today.toDateString() ? t('m.messages.today') : day === yesterday.toDateString() ? t('m.messages.yesterday') : formatDate(message.sent_at);
        out.push({ kind: 'day', key: `day-${day}`, label });
        lastDay = day;
      }
      out.push({ kind: 'message', message });
    }
    return out.reverse();
  }, [messages, pendingDelete, t]);

  const submit = async () => {
    const body = draft;
    if (!body.trim() || thread.working) return;
    haptics.tap();
    const ok = editing ? await thread.update(editing.id, body) : await thread.send(body);
    if (ok) {
      setDraft('');
      setEditing(null);
    } else {
      haptics.error();
    }
  };

  const scheduleDelete = (message: Message) => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      if (pendingDelete) void thread.remove(pendingDelete);
    }
    haptics.warning();
    setPendingDelete(message.id);
    undoTimer.current = setTimeout(() => {
      undoTimer.current = null;
      void thread.remove(message.id).finally(() => setPendingDelete(null));
    }, UNDO_MS);
  };

  const undoDelete = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setPendingDelete(null);
    haptics.tap();
  };

  const openActions = (message: Message) => {
    if (message.sender_id !== user?.id) return;
    haptics.tap();
    alertDialog(formatTime(message.sent_at), undefined, [
      {
        text: t('m.messages.edit'),
        onPress: () => {
          setEditing(message);
          setDraft(message.body);
          inputRef.current?.focus();
        },
      },
      {
        text: t('m.messages.delete'),
        style: 'destructive',
        onPress: () => scheduleDelete(message),
      },
      { text: t('m.messages.cancel'), style: 'cancel' },
    ]);
  };

  const renderBody = (message: Message, own: boolean) => {
    const parts = parseMessageBodyParts(message.body);
    return parts.map((part, index) => {
      if (part.type === 'text') {
        return (
          <Text key={`text-${index}`} variant="body" style={{ color: own ? colors.primaryText : colors.text }}>
            {part.value}
          </Text>
        );
      }
      const href = webPathToHref(part.action.href);
      return (
        <Pressable
          key={`${part.action.kind}-${index}`}
          accessibilityRole="link"
          disabled={!href}
          onPress={() => href && router.push(href)}
          style={[styles.actionChip, { borderColor: own ? colors.primaryText : colors.primary }]}
        >
          <Icon name="open-outline" size={14} color={own ? colors.primaryText : colors.primary} />
          <Text variant="captionStrong" style={{ color: own ? colors.primaryText : colors.primary }}>
            {t(ACTION_LABEL_KEYS[part.action.kind])}
          </Text>
        </Pressable>
      );
    });
  };

  const header = (
    <Stack.Screen
      options={{
        title: conversation?.counterpart.name ?? t('patient.messages.title'),
      }}
    />
  );

  if (thread.loading) {
    return (
      <View
        testID="screen-conversation"
        style={[
          styles.flex,
          {
            backgroundColor: colors.background,
            padding: spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        {header}
        <Skeleton height={56} width="70%" rounded={radius.lg} />
        <Skeleton height={56} width="60%" rounded={radius.lg} style={{ alignSelf: 'flex-end' }} />
        <Skeleton height={80} width="75%" rounded={radius.lg} />
      </View>
    );
  }

  if (thread.error && messages.length === 0) {
    return (
      <View testID="screen-conversation" style={[styles.flex, { backgroundColor: colors.background, padding: spacing.lg }]}>
        {header}
        <ErrorState message={t('patient.messages.threadError')} onRetry={() => void thread.refetch()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      testID="screen-conversation"
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {header}
      <FlatList
        inverted
        data={rows}
        keyExtractor={(row) => (row.kind === 'day' ? row.key : row.message.id)}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.sm,
          flexGrow: 1,
        }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View
            style={{
              transform: [{ scaleY: -1 }],
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <EmptyState
              testID="state-empty-thread"
              icon="chatbubble-ellipses-outline"
              title={t('patient.messages.threadEmptyTitle')}
              body={t('patient.messages.threadEmptyBody')}
            />
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            return (
              <Text variant="micro" color="subtle" align="center" style={{ marginVertical: spacing.sm }}>
                {item.label}
              </Text>
            );
          }
          const message = item.message;
          const own = message.sender_id === user?.id;
          return (
            <Pressable
              testID={own ? 'chat-message-own' : 'chat-message-other'}
              onLongPress={() => openActions(message)}
              delayLongPress={300}
              accessibilityHint={own ? t('m.messages.edit') : undefined}
              style={[
                styles.bubble,
                own
                  ? {
                      alignSelf: 'flex-end',
                      backgroundColor: colors.primary,
                      borderBottomEndRadius: 4,
                    }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderBottomStartRadius: 4,
                    },
              ]}
            >
              {renderBody(message, own)}
              <Text
                variant="micro"
                style={{
                  color: own ? colors.primaryText : colors.textSubtle,
                  opacity: 0.8,
                  alignSelf: 'flex-end',
                }}
              >
                {formatTime(message.sent_at)}
                {own && message.read_at ? '  ✓✓' : ''}
              </Text>
            </Pressable>
          );
        }}
      />

      {pendingDelete ? (
        <View style={[styles.undo, { backgroundColor: colors.text }]}>
          <Text variant="caption" style={{ color: colors.background, flex: 1 }}>
            {t('m.messages.deleted')}
          </Text>
          <Pressable testID="btn-undo-delete" accessibilityRole="button" onPress={undoDelete} hitSlop={8}>
            <Text variant="captionStrong" style={{ color: colors.accent }}>
              {t('m.messages.undo')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {thread.actionError ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <InlineMessage tone="danger" message={thread.actionError} />
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        {editing ? (
          <View style={styles.editBar}>
            <Icon name="create-outline" size={16} color={colors.primary} />
            <Text variant="captionStrong" color="primary" style={{ flex: 1 }}>
              {t('m.messages.editing')}
            </Text>
            <Pressable
              testID="btn-cancel-edit"
              accessibilityRole="button"
              accessibilityLabel={t('m.messages.cancel')}
              hitSlop={10}
              onPress={() => {
                setEditing(null);
                setDraft('');
              }}
            >
              <Icon name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
          }}
        >
          <TextInput
            testID="input-message"
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={MESSAGE_DRAFT_MAX_LENGTH}
            placeholder={t('patient.messages.composerPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel={t('patient.messages.composerLabel')}
            style={[typography.body, styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
          <Pressable
            testID="btn-send-message"
            accessibilityRole="button"
            accessibilityLabel={editing ? t('m.messages.save') : t('patient.messages.send')}
            disabled={!draft.trim() || thread.working}
            onPress={() => void submit()}
            style={[
              styles.send,
              {
                backgroundColor: colors.primary,
                opacity: !draft.trim() || thread.working ? 0.4 : 1,
              },
            ]}
          >
            <Icon name={editing ? 'checkmark' : 'arrow-up'} size={22} color={colors.primaryText} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  input: {
    flex: 1,
    maxHeight: 140,
    minHeight: 44,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
