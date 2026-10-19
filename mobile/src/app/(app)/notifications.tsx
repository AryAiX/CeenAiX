import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Notification } from '@ceenaix/types';
import { Card, EmptyState, ErrorState, IconBadge, InlineMessage, Screen, Section, SegmentedControl, SkeletonList, Text, type IconName } from '@/components/ui';
import { markAllNotificationsRead, markNotificationRead } from '@/data/notifications';
import { usePatientNotifications, type PatientDerivedNotification } from '@/data/web/hooks/use-patient-notifications';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatRelative } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { webPathToHref } from '@/lib/links';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';
import type { Tone } from '@/theme/tokens';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Filter = 'all' | 'unread';

const TYPE_ICON: Record<string, { icon: IconName; tone: Tone }> = {
  appointment: { icon: 'calendar-outline', tone: 'brand' },
  medication: { icon: 'medkit-outline', tone: 'success' },
  message: { icon: 'chatbubble-outline', tone: 'info' },
  lab_result: { icon: 'flask-outline', tone: 'ai' },
  system: { icon: 'information-circle-outline', tone: 'neutral' },
};

const DERIVED_ICON: Record<PatientDerivedNotification['kind'], { icon: IconName; tone: Tone }> = {
  message: TYPE_ICON.message,
  upcoming_appointment: TYPE_ICON.appointment,
  lab_result: TYPE_ICON.lab_result,
};

export default function NotificationsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshBadges } = useBadges();
  const notifications = useOfflineCache(usePatientNotifications(user?.id), user ? `notifications:${user.id}` : null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refetch } = notifications;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const stored = useMemo(() => notifications.data?.notifications ?? [], [notifications.data?.notifications]);
  const derived = notifications.data?.derivedNotifications ?? [];
  const unread = stored.filter((row) => !row.is_read).length;
  const visible = filter === 'unread' ? stored.filter((row) => !row.is_read) : stored;

  const sync = async () => {
    await Promise.all([notifications.refetch(), refreshBadges()]);
  };

  const openNotification = async (row: Notification) => {
    if (!user) return;
    if (!row.is_read) {
      try {
        await markNotificationRead(user.id, row.id);
        void sync();
      } catch (markError) {
        setError(markError instanceof Error ? markError.message : t('m.common.unexpected'));
      }
    }
    const href = webPathToHref(row.action_url);
    if (href) router.push(href);
  };

  const markAll = async () => {
    if (!user || unread === 0) return;
    setBusy(true);
    setError(null);
    try {
      await markAllNotificationsRead(user.id);
      haptics.success();
      await sync();
    } catch (markError) {
      haptics.error();
      setError(markError instanceof Error ? markError.message : t('m.common.unexpected'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={sync} refreshing={notifications.refreshing} staleSince={notifications.staleSince}>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => void markAll()} disabled={busy} hitSlop={8}>
                <Text variant="captionStrong" color="primary">
                  {t('patient.notifications.markAllRead')}
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      {error ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineMessage tone="danger" message={error} />
        </View>
      ) : null}
      {notifications.loading ? (
        <SkeletonList count={5} height={72} />
      ) : !notifications.data && notifications.error ? (
        <ErrorState message={t('patient.notifications.loadError')} onRetry={() => void notifications.refetch()} />
      ) : (
        <>
          {derived.length > 0 ? (
            <Section title={t('patient.notifications.liveAttention')} style={{ marginTop: 0 }}>
              <View style={{ gap: spacing.sm }}>
                {derived.map((item) => {
                  const href = webPathToHref(item.actionUrl);
                  return (
                    <Card key={item.id} tone={DERIVED_ICON[item.kind].tone} onPress={href ? () => router.push(href) : undefined}>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <IconBadge name={DERIVED_ICON[item.kind].icon} tone={DERIVED_ICON[item.kind].tone} size={36} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyStrong">{item.title}</Text>
                          <Text variant="caption" color="muted" numberOfLines={2}>
                            {item.body}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </Section>
          ) : null}

          <Section title={t('patient.notifications.logTitle')} style={derived.length === 0 ? { marginTop: 0 } : undefined}>
            <SegmentedControl<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('patient.documents.filterAll') },
                { value: 'unread', label: t('patient.notifications.unreadBadge'), count: unread },
              ]}
            />
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {visible.length === 0 ? (
                <EmptyState icon="notifications-off-outline" title={t('patient.notifications.emptyLog')} />
              ) : (
                visible.map((row) => {
                  const style = TYPE_ICON[row.type] ?? TYPE_ICON.system;
                  return (
                    <Card key={row.id} onPress={() => void openNotification(row)} accessibilityLabel={row.title}>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <IconBadge name={style.icon} tone={style.tone} size={36} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                            <Text variant={row.is_read ? 'body' : 'bodyStrong'} style={{ flex: 1 }} numberOfLines={2}>
                              {row.title}
                            </Text>
                            {!row.is_read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} /> : null}
                          </View>
                          {row.body ? (
                            <Text variant="caption" color="muted" numberOfLines={3}>
                              {row.body}
                            </Text>
                          ) : null}
                          <Text variant="micro" color="subtle">
                            {formatRelative(row.created_at)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}
