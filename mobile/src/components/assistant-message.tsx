import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MarkdownText } from '@/components/markdown-text';
import { contentDirection } from '@/lib/rtl';
import { AiGeneratedTag, Icon, Pill, Text } from '@/components/ui';
import { showActionSheet } from '@/lib/action-sheet';
import { getAssistantMetadata, getFileAttachments, type AiChatStoredAttachment } from '@/lib/ai';
import { formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { webPathToHref } from '@/lib/links';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments: AiChatStoredAttachment[];
}

export function AssistantMessage({ message, firstName }: { message: AssistantChatMessage; firstName: string }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const own = message.role === 'user';
  const files = getFileAttachments(message.attachments);
  const metadata = getAssistantMetadata(message.attachments);
  const evidence =
    metadata?.usedPatientContext && metadata.evidence.length > 0
      ? Array.from(new Set(metadata.evidence.map((item) => item.title.trim()).filter(Boolean))).slice(0, 3)
      : [];
  const actions = (metadata?.suggestedActions ?? [])
    .map((action) => ({ label: action.label, href: webPathToHref(action.href) }))
    .filter((action) => action.href !== null);

  const openActions = () => {
    haptics.tap();
    showActionSheet(t('m.assistant.messageActions'), [
      {
        label: t('m.assistant.copy'),
        onPress: () => {
          void Clipboard.setStringAsync(message.content).then(() => haptics.success());
        },
      },
      { label: t('m.assistant.share'), onPress: () => void Share.share({ message: message.content }) },
    ]);
  };

  if (own) {
    return (
      <Pressable testID="chat-message-user" onLongPress={openActions} delayLongPress={300} style={[styles.userBubble, { backgroundColor: colors.primary }]}>
        {files.map((file) => (
          <View key={file.path} style={styles.fileRow}>
            <Icon name="attach" size={14} color={colors.primaryText} />
            <Text variant="caption" numberOfLines={1} style={{ color: colors.primaryText, flexShrink: 1 }}>
              {file.fileName}
            </Text>
          </View>
        ))}
        <Text variant="body" style={{ color: colors.primaryText, writingDirection: contentDirection(message.content) }} selectable>
          {message.content}
        </Text>
        <Text variant="micro" style={{ color: colors.primaryText, opacity: 0.75, alignSelf: 'flex-end' }}>
          {formatTime(message.createdAt)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="chat-message-assistant"
      onLongPress={openActions}
      delayLongPress={300}
      style={[styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <AiGeneratedTag />
        {metadata?.usedPatientContext ? (
          <Text variant="micro" color="ai" numberOfLines={1} style={{ flexShrink: 1 }}>
            {t('patient.aiChat.personalizedFor', { name: firstName })}
          </Text>
        ) : null}
      </View>
      <MarkdownText>{message.content}</MarkdownText>
      {evidence.length > 0 ? (
        <View style={styles.wrap}>
          {evidence.map((label) => (
            <Pill key={label} tone="neutral" icon="document-text-outline" label={t('patient.aiChat.usedPrefix', { label })} />
          ))}
        </View>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.wrap}>
          {actions.map((action, index) => (
            <Pressable
              key={action.label}
              testID={`chat-action-${index}`}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                haptics.tap();
                if (action.href) router.push(action.href);
              }}
              style={({ pressed }) => [styles.action, { borderColor: colors.tones.ai.fg, opacity: pressed ? 0.6 : 1 }]}
            >
              <Text variant="captionStrong" color="ai">
                {action.label}
              </Text>
              <Icon name="arrow-forward" size={14} color={colors.tones.ai.fg} flipRtl />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text variant="micro" color="subtle">
        {t('patient.aiChat.disclaimer')} · {formatTime(message.createdAt)}
      </Text>
    </Pressable>
  );
}

export function AssistantThinking(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.assistantBubble, styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Icon name="sparkles" size={16} color={colors.tones.ai.fg} />
      <Text variant="caption" color="muted">
        {t('patient.aiChat.thinking')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: radius.lg,
    borderBottomEndRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  assistantBubble: { alignSelf: 'stretch', borderWidth: 1, borderRadius: radius.lg, borderBottomStartRadius: 4, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
});
