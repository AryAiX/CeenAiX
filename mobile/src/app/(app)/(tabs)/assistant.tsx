import { FORM_FIELD_LIMITS } from '@ceenaix/shared/form-field-limits';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { alertDialog } from '@/lib/dialog';
import { AssistantMessage, AssistantThinking, type AssistantChatMessage } from '@/components/assistant-message';
import { AssistantStarter } from '@/components/assistant-starter';
import { Button, Card, ErrorState, Icon, IconButton, InlineMessage, Pill, SkeletonList, Text } from '@/components/ui';
import { usePatientAiChat } from '@/data/web/hooks/use-patient-ai-chat';
import { usePatientDashboard } from '@/data/web/hooks/use-patient-dashboard';
import { usePatientPreVisitAssessments } from '@/data/web/hooks/use-pre-visit';
import {
  applyCanonicalUpdateRequests,
  dismissCanonicalUpdateRequests,
  fetchCanonicalUpdateRequests,
  formatCanonicalValueForReview,
} from '@/data/web/lib/canonical-record-updates';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { useQuery } from '@/hooks/use-query';
import { showActionSheet } from '@/lib/action-sheet';
import {
  getAiContextConsent,
  invokeAiChat,
  removeAiChatAttachments,
  setAiContextConsent,
  uploadAiChatAttachment,
  type AiChatFileAttachment,
  type AiContextConsent,
} from '@/lib/ai';
import { haptics } from '@/lib/haptics';
import { PermissionDeniedError, pickAsset, type AssetSource } from '@/lib/pick-asset';
import type { LocalAsset } from '@/lib/uploads';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const MAX_ATTACHMENTS = 4;

export default function AssistantScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string; session?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const chat = usePatientAiChat(user?.id, selectedSessionId);
  const dashboard = useOfflineCache(usePatientDashboard(user?.id, i18n.language), user ? `dashboard:${user.id}:${i18n.language}` : null);
  const assessments = usePatientPreVisitAssessments(user?.id);

  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<LocalAsset[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Narrower than isSending: the reply has not rendered yet (isSending also covers the history refetch).
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [consent, setConsent] = useState<AiContextConsent>('unset');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [applyingUpdates, setApplyingUpdates] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  const firstName = useMemo(() => {
    const fromProfile = profile?.first_name?.trim() || profile?.full_name?.trim().split(/\s+/)[0];
    return fromProfile || user?.email?.split('@')[0] || '';
  }, [profile?.first_name, profile?.full_name, user?.email]);

  useFocusEffect(
    useCallback(() => {
      if (user) void getAiContextConsent(user.id).then(setConsent);
    }, [user])
  );

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Deep links: `/assistant?prompt=` prefills the composer (e.g. "Explain
  // with AI" from a lab report); `?session=` opens a thread from history.
  useEffect(() => {
    if (!params.prompt) return;
    setInput(params.prompt);
    router.setParams({ prompt: undefined });
    inputRef.current?.focus();
  }, [params.prompt, router]);

  useEffect(() => {
    if (!params.session) return;
    setSelectedSessionId(params.session === 'new' ? null : params.session);
    setSendError(null);
    router.setParams({ session: undefined });
  }, [params.session, router]);

  // Same thread-switch handling as the web chat: clear the transcript on a
  // real session switch, but keep optimistic messages while a send assigns a
  // brand-new session id.
  const lastSelectedSession = useRef<string | null>(null);
  useEffect(() => {
    if (isSending) {
      lastSelectedSession.current = selectedSessionId;
      return;
    }
    if (selectedSessionId === null) {
      setMessages([]);
      lastSelectedSession.current = null;
      return;
    }
    if (lastSelectedSession.current === selectedSessionId) return;
    lastSelectedSession.current = selectedSessionId;
    setMessages([]);
  }, [isSending, selectedSessionId]);

  useEffect(() => {
    if (chat.loading || isSending || selectedSessionId === null) return;
    if (chat.data?.sessionId !== selectedSessionId) return;
    setMessages(chat.data.messages);
  }, [chat.data, chat.loading, isSending, selectedSessionId]);

  const updates = useQuery(
    async () =>
      user
        ? fetchCanonicalUpdateRequests({
            patientId: user.id,
            sourceKind: 'ai_chat_message',
            status: 'pending',
          })
        : [],
    [user?.id ?? '', selectedSessionId ?? '']
  );
  const pendingUpdates = useMemo(() => {
    if (!selectedSessionId) return [];
    const userMessageIds = new Set(messages.filter((message) => message.role === 'user').map((message) => message.id));
    return (updates.data ?? []).filter((update) => userMessageIds.has(update.sourceRecordId) || update.metadata.sessionId === selectedSessionId);
  }, [messages, selectedSessionId, updates.data]);

  const outstandingPreVisit = (assessments.data ?? []).find((assessment) => assessment.status === 'not_started' || assessment.status === 'in_progress') ?? null;

  const chooseConsent = async (granted: boolean) => {
    if (!user) return;
    const value = granted ? 'granted' : 'declined';
    await setAiContextConsent(user.id, value);
    setConsent(value);
    haptics.tap();
  };

  const promptConsent = () =>
    alertDialog(t('m.assistant.consentTitle'), t('m.assistant.consentBody'), [
      {
        text: t('m.assistant.notNow'),
        style: 'cancel',
        onPress: () => void chooseConsent(false),
      },
      { text: t('m.assistant.allow'), onPress: () => void chooseConsent(true) },
    ]);

  const startNewChat = () => {
    const reset = () => {
      setSelectedSessionId(null);
      setMessages([]);
      setInput('');
      setPendingFiles([]);
      setSendError(null);
      setUpdateFeedback(null);
    };
    if (messages.length === 0) {
      reset();
      return;
    }
    alertDialog(t('patient.aiChat.clearChat'), t('patient.aiChat.clearChatConfirm'), [
      { text: t('m.common.cancel'), style: 'cancel' },
      { text: t('patient.aiChat.newChat'), onPress: reset },
    ]);
  };

  const addAttachment = () => {
    if (pendingFiles.length >= MAX_ATTACHMENTS) {
      setSendError(t('m.assistant.attachmentLimit'));
      return;
    }
    const pick = (source: AssetSource) =>
      void (async () => {
        try {
          const asset = await pickAsset(source);
          if (!asset) return;
          if (asset.size > 10 * 1024 * 1024) {
            setSendError(
              t('ai.errors.attachmentTooLarge', {
                defaultValue: 'Attachments must be 10 MB or smaller.',
              })
            );
            return;
          }
          setSendError(null);
          setPendingFiles((current) => [...current, asset].slice(0, MAX_ATTACHMENTS));
        } catch (error) {
          setSendError(
            error instanceof PermissionDeniedError
              ? error.source === 'camera'
                ? t('m.docs.permissionCamera')
                : t('m.docs.permissionLibrary')
              : error instanceof Error
                ? error.message
                : t('m.common.unexpected')
          );
        }
      })();
    showActionSheet(t('patient.aiChat.attach'), [
      { label: t('m.docs.camera'), onPress: () => pick('camera') },
      { label: t('m.docs.library'), onPress: () => pick('library') },
      { label: t('m.docs.files'), onPress: () => pick('files') },
    ]);
  };

  const send = async (submitted?: string) => {
    const next = (submitted ?? input).trim();
    if (!user) {
      setSendError(t('patient.aiChat.signInError'));
      return;
    }
    if (!next || isSending) return;

    let uploaded: AiChatFileAttachment[] = [];
    let invoked = false;
    const filesBeforeSend = pendingFiles;
    try {
      setSendError(null);
      setIsSending(true);
      setAwaitingReply(true);
      haptics.tap();
      uploaded = filesBeforeSend.length > 0 ? await Promise.all(filesBeforeSend.map((file) => uploadAiChatAttachment(user.id, file))) : [];
      setMessages((current) => [
        ...current,
        {
          id: `temp-user-${Date.now()}`,
          role: 'user',
          content: next,
          createdAt: new Date().toISOString(),
          attachments: uploaded,
        },
      ]);
      setInput('');
      setPendingFiles([]);

      const response = await invokeAiChat({
        message: next,
        sessionId: selectedSessionId,
        attachments: uploaded,
        usePatientContext: consent === 'granted',
        mode: 'chat',
      });
      invoked = true;
      setSelectedSessionId(response.sessionId);
      setUpdateFeedback(null);
      setMessages((current) => [
        ...current,
        {
          id: response.assistantMessage.id,
          role: 'assistant',
          content: response.assistantMessage.content,
          createdAt: response.assistantMessage.createdAt,
          attachments: response.assistantMessage.attachments,
        },
      ]);
      setAwaitingReply(false);
      haptics.success();
      await chat.refetch();
      await updates.refetch();
    } catch (error) {
      haptics.error();
      setSendError(error instanceof Error ? error.message : t('patient.aiChat.sendError'));
      setMessages((current) => current.filter((message) => !message.id.startsWith('temp-user-')));
      if (!submitted) setInput(next);
      setPendingFiles(filesBeforeSend);
      if (!invoked && uploaded.length > 0) await removeAiChatAttachments(uploaded);
    } finally {
      setAwaitingReply(false);
      setIsSending(false);
    }
  };

  const resolveUpdates = async (apply: boolean) => {
    try {
      setApplyingUpdates(true);
      setUpdateFeedback(null);
      const ids = pendingUpdates.map((update) => update.id);
      if (apply) await applyCanonicalUpdateRequests(ids);
      else await dismissCanonicalUpdateRequests(ids);
      setUpdateFeedback(apply ? t('patient.aiChat.recordUpdateOk') : t('patient.aiChat.dismissed'));
      if (apply) haptics.success();
      await updates.refetch();
    } catch (error) {
      setUpdateFeedback(error instanceof Error ? error.message : apply ? t('patient.aiChat.recordUpdateFail') : t('patient.aiChat.dismissFail'));
    } finally {
      setApplyingUpdates(false);
    }
  };

  const showStarter = selectedSessionId === null && messages.length === 0 && !isSending;
  const loadingThread = selectedSessionId !== null && chat.loading && messages.length === 0;
  const threadError = selectedSessionId !== null && Boolean(chat.error) && messages.length === 0;
  const rows = useMemo(() => [...messages].reverse(), [messages]);
  const canSend = input.trim().length > 0 && !isSending;

  const listFooter = (
    <View style={{ gap: spacing.md }}>
      {awaitingReply ? <AssistantThinking /> : null}
      {pendingUpdates.length > 0 ? (
        <Card testID="card-record-updates" tone="ai">
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{t('patient.aiChat.reviewUpdatesTitle')}</Text>
            <Text variant="caption" color="muted">
              {t('patient.aiChat.reviewUpdatesBody')}
            </Text>
            {pendingUpdates.map((update) => (
              <View key={update.id} style={{ gap: 2 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Text variant="captionStrong" style={{ flex: 1 }}>
                    {update.displayLabel}
                  </Text>
                  <Pill
                    tone={update.requiresDoctorReview ? 'warning' : 'ai'}
                    label={update.requiresDoctorReview ? t('patient.aiChat.badgeDoctorReview') : t('patient.aiChat.badgeUpdateRecord')}
                  />
                </View>
                <Text variant="caption" color="muted">
                  {t('patient.aiChat.fieldCurrent')}: {formatCanonicalValueForReview(update.currentValue)}
                </Text>
                <Text variant="caption">
                  {t('patient.aiChat.fieldNew')}: {formatCanonicalValueForReview(update.proposedValue)}
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                testID="btn-apply-updates"
                label={t('patient.aiChat.applyUpdates')}
                variant="ai"
                size="sm"
                loading={applyingUpdates}
                onPress={() => void resolveUpdates(true)}
              />
              <Button
                testID="btn-dismiss-updates"
                label={t('patient.aiChat.notNow')}
                variant="ghost"
                size="sm"
                disabled={applyingUpdates}
                onPress={() => void resolveUpdates(false)}
              />
            </View>
          </View>
        </Card>
      ) : null}
      {updateFeedback ? <InlineMessage tone="info" message={updateFeedback} /> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      testID="screen-assistant"
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" accessibilityRole="header">
            {t('patient.aiChat.heroBrand')}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {t('patient.aiChat.heroSubtitle')}
          </Text>
        </View>
        <IconButton
          testID="btn-assistant-history"
          name="time-outline"
          variant="plain"
          accessibilityLabel={t('m.assistant.history')}
          onPress={() => router.push('/assistant-history')}
        />
        <IconButton testID="btn-new-chat" name="create-outline" variant="plain" accessibilityLabel={t('patient.aiChat.newChat')} onPress={startNewChat} />
      </View>

      {showStarter ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <AssistantStarter
            firstName={firstName}
            dashboard={dashboard.data}
            consentUnset={consent === 'unset'}
            onConsent={(granted) => void chooseConsent(granted)}
            onPrompt={(prompt) => void send(prompt)}
            preVisitId={outstandingPreVisit?.id ?? null}
          />
        </ScrollView>
      ) : loadingThread ? (
        <View style={[styles.flex, { padding: spacing.lg }]}>
          <SkeletonList count={3} height={96} />
        </View>
      ) : threadError ? (
        <View style={[styles.flex, { padding: spacing.lg }]}>
          <ErrorState message={t('patient.aiChat.loadHistoryError')} onRetry={() => void chat.refetch()} />
        </View>
      ) : (
        <FlatList
          inverted
          style={styles.flex}
          data={rows}
          keyExtractor={(message) => message.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listFooter}
          renderItem={({ item }) => <AssistantMessage message={item} firstName={firstName} />}
        />
      )}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        {sendError ? <InlineMessage tone="danger" message={sendError} /> : null}
        <Pressable testID="btn-ai-context" accessibilityRole="button" onPress={promptConsent} style={styles.contextRow} hitSlop={6}>
          <Icon
            name={consent === 'granted' ? 'shield-checkmark' : 'shield-outline'}
            size={14}
            color={consent === 'granted' ? colors.tones.ai.fg : colors.textSubtle}
          />
          <Text variant="micro" color={consent === 'granted' ? 'ai' : 'subtle'} style={{ flex: 1 }}>
            {consent === 'granted' ? t('m.assistant.contextOn') : t('m.assistant.contextOff')}
          </Text>
          <Text variant="micro" color="primary">
            {t('m.assistant.change')}
          </Text>
        </Pressable>
        {pendingFiles.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {pendingFiles.map((file, index) => (
              <Pressable
                key={`${file.uri}-${index}`}
                testID={`attachment-chip-${index}`}
                accessibilityRole="button"
                accessibilityLabel={t('m.assistant.removeAttachment', {
                  name: file.name,
                })}
                onPress={() => setPendingFiles((current) => current.filter((_, position) => position !== index))}
                style={[styles.fileChip, { backgroundColor: colors.surfaceMuted }]}
              >
                <Icon name="document-attach-outline" size={14} />
                <Text variant="caption" numberOfLines={1} style={{ maxWidth: 160 }}>
                  {file.name}
                </Text>
                <Icon name="close" size={14} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.inputRow}>
          <Pressable
            testID="btn-attach"
            accessibilityRole="button"
            accessibilityLabel={t('patient.aiChat.attach')}
            onPress={addAttachment}
            disabled={isSending}
            style={[styles.roundButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Icon name="add" size={22} color={colors.text} />
          </Pressable>
          <TextInput
            testID="input-assistant-message"
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={FORM_FIELD_LIMITS.chatMessage}
            placeholder={t('patient.aiChat.inputPh')}
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel={t('patient.aiChat.inputSrOnly')}
            style={[typography.body, styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
          <Pressable
            testID="btn-send-message"
            accessibilityRole="button"
            accessibilityLabel={t('patient.aiChat.send')}
            disabled={!canSend}
            onPress={() => void send()}
            style={[
              styles.roundButton,
              {
                backgroundColor: colors.tones.ai.fg,
                opacity: canSend ? 1 : 0.4,
              },
            ]}
          >
            <Icon name="arrow-up" size={22} color={colors.primaryText} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 140,
    minHeight: 44,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
