import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ErrorState, IconBadge, SkeletonList, Text } from '@/components/ui';
import { usePatientAiChat } from '@/data/web/hooks/use-patient-ai-chat';
import { formatRelative } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function AssistantHistorySheet(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const chat = usePatientAiChat(user?.id, null);
  const sessions = chat.data?.sessions ?? [];

  const open = (session: string) => {
    haptics.tap();
    router.dismissTo({ pathname: '/assistant', params: { session } });
  };

  return (
    <ScrollView testID="screen-assistant-history" contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
      <Text variant="title" style={{ marginBottom: 2 }}>
        {t('patient.aiChat.chats')}
      </Text>
      <Text variant="caption" color="muted" style={{ marginBottom: spacing.md }}>
        {t('patient.aiChat.chatsSub')}
      </Text>
      <Card onPress={() => open('new')} tone="ai" accessibilityLabel={t('patient.aiChat.newChat')}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <IconBadge name="create-outline" tone="ai" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('patient.aiChat.newChat')}</Text>
            <Text variant="caption" color="muted">
              {t('patient.aiChat.newChatSub')}
            </Text>
          </View>
        </View>
      </Card>
      {chat.loading ? (
        <SkeletonList count={4} height={72} />
      ) : chat.error ? (
        <ErrorState message={t('patient.aiChat.loadHistoryError')} onRetry={() => void chat.refetch()} />
      ) : sessions.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title={t('patient.aiChat.noChats')} />
      ) : (
        sessions.map((session) => (
          <Card key={session.id} onPress={() => open(session.id)} accessibilityLabel={session.preview}>
            <Text variant="micro" color="subtle">
              {formatRelative(session.lastMessageAt)}
            </Text>
            <Text variant="body" numberOfLines={2} style={{ marginTop: 2 }}>
              {session.preview}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
