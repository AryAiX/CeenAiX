import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Card, EmptyState, ErrorState, Pill, Screen, ScreenTitle, SkeletonList, Text, TextField } from '@/components/ui';
import { useConversationList } from '@/data/messaging';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatRelative } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function MessagesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadMessages } = useBadges();
  const list = useOfflineCache(useConversationList(user?.id), user ? `conversations:${user.id}` : null);
  const [search, setSearch] = useState('');
  const { refetch } = list;

  // Unread counts change when a thread is opened; re-sync on focus and when
  // the realtime badge count moves.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch, unreadMessages])
  );

  const conversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = list.data ?? [];
    if (!query) return rows;
    return rows.filter((row) => [row.counterpart.name, row.subject, row.lastMessagePreview].some((value) => value?.toLowerCase().includes(query)));
  }, [list.data, search]);

  return (
    <Screen testID="screen-messages" edgeTop onRefresh={list.refetch} refreshing={list.refreshing} staleSince={list.staleSince}>
      <ScreenTitle
        title={t('patient.messages.title')}
        subtitle={t('patient.messages.conversationCount', {
          count: list.data?.length ?? 0,
        })}
      />
      {(list.data?.length ?? 0) > 3 ? (
        <View style={{ marginBottom: spacing.md }}>
          <TextField
            testID="input-messages-search"
            accessibilityLabel={t('patient.messages.searchPlaceholder')}
            placeholder={t('patient.messages.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}
      {list.loading ? (
        <SkeletonList count={5} height={76} />
      ) : !list.data && list.error ? (
        <ErrorState message={t('patient.messages.loadError')} onRetry={() => void list.refetch()} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState testID="state-empty-messages" icon="chatbubbles-outline" title={t('patient.messages.noneTitle')} body={t('patient.messages.noneBody')} />
      ) : conversations.length === 0 ? (
        <EmptyState
          testID="state-empty-messages-search"
          icon="search"
          title={t('patient.messages.noResultsTitle')}
          body={t('patient.messages.noResultsBody')}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {conversations.map((conversation) => {
            const unread = conversation.unreadCount > 0;
            return (
              <Card
                key={conversation.id}
                testID={`conversation-card-${conversation.id}`}
                accessibilityLabel={`${conversation.counterpart.name}. ${conversation.lastMessagePreview ?? ''}`}
                onPress={() =>
                  router.push({
                    pathname: '/conversation/[id]',
                    params: { id: conversation.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    alignItems: 'center',
                  }}
                >
                  <Avatar name={conversation.counterpart.name} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: spacing.sm,
                      }}
                    >
                      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {conversation.counterpart.name}
                      </Text>
                      <Text variant="micro" color={unread ? 'primary' : 'subtle'}>
                        {formatRelative(conversation.lastMessageAt ?? conversation.createdAt)}
                      </Text>
                    </View>
                    {conversation.subject ? (
                      <Text variant="captionStrong" color="muted" numberOfLines={1}>
                        {conversation.subject}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <Text variant="caption" color={unread ? 'default' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
                        {conversation.lastMessagePreview ?? t('patient.messages.emptyPreview')}
                      </Text>
                      {unread ? (
                        <Pill
                          label={t('patient.messages.unreadCount', {
                            count: conversation.unreadCount,
                          })}
                          tone="brand"
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
