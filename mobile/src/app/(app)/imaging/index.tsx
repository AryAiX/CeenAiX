import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ErrorState, IconBadge, IconButton, Pill, Screen, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { useImagingStudies, type ImagingStudyRecord } from '@/data/web/hooks/use-imaging-studies';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'reports' | 'scheduled';

const imagingDate = (study: ImagingStudyRecord): string | null => study.releasedAt ?? study.scheduledAt;

export default function ImagingScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const imaging = useOfflineCache(useImagingStudies(user?.id, 'patient'), user ? `imaging:${user.id}` : null);
  const [segment, setSegment] = useState<Segment>('reports');

  const studies = useMemo(
    () => [...(imaging.data ?? [])].sort((left, right) => new Date(imagingDate(right) ?? 0).getTime() - new Date(imagingDate(left) ?? 0).getTime()),
    [imaging.data]
  );
  const released = studies.filter((study) => study.status === 'released');
  const scheduled = studies.filter((study) => study.status !== 'released');
  const list = segment === 'reports' ? released : scheduled;

  const shareAll = () => {
    const lines = [
      `${t('patient.imaging.title')} — ${formatDate(new Date())}`,
      '',
      ...studies.map((study) =>
        [
          `• ${study.modality} ${study.studyName}`.trim(),
          `  ${t('patient.imaging.date')}: ${formatDate(imagingDate(study))}`,
          `  ${t('patient.imaging.facility')}: ${study.clinicName || t('patient.imaging.ceenaixRadiology')}`,
          `  ${study.status === 'released' ? t('patient.imaging.reviewed') : t('patient.imaging.awaitingReview')}`,
        ].join('\n')
      ),
    ];
    void Share.share({
      title: t('patient.imaging.title'),
      message: lines.join('\n'),
    });
  };

  return (
    <Screen testID="screen-imaging" onRefresh={imaging.refetch} refreshing={imaging.refreshing} staleSince={imaging.staleSince}>
      <Stack.Screen
        options={{
          headerRight: () =>
            studies.length > 0 ? (
              <IconButton
                testID="btn-share-imaging"
                name="share-outline"
                variant="plain"
                onPress={shareAll}
                accessibilityLabel={t('patient.imaging.shareStudies')}
              />
            ) : null,
        }}
      />
      <SegmentedControl<Segment>
        testID="segment-imaging"
        value={segment}
        onChange={setSegment}
        options={[
          {
            value: 'reports',
            label: t('patient.imaging.tabReports'),
            count: released.length,
          },
          {
            value: 'scheduled',
            label: t('patient.imaging.tabScheduled'),
            count: scheduled.length,
          },
        ]}
      />
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {imaging.loading ? (
          <SkeletonList count={3} height={96} />
        ) : !imaging.data && imaging.error ? (
          <ErrorState message={t('patient.imaging.loadError')} onRetry={() => void imaging.refetch()} />
        ) : studies.length === 0 ? (
          <EmptyState testID="state-empty-imaging" icon="scan-outline" title={t('patient.imaging.emptyTitle')} body={t('patient.imaging.emptyBody')} />
        ) : list.length === 0 ? (
          <EmptyState
            testID="state-empty-imaging-segment"
            icon="calendar-outline"
            title={segment === 'scheduled' ? t('patient.imaging.noScheduledTitle') : t('patient.imaging.emptyTitle')}
            body={segment === 'scheduled' ? t('patient.imaging.noScheduledBody') : undefined}
          />
        ) : (
          list.map((study) => {
            const followUp = study.status === 'released' && (study.alerts.length > 0 || Boolean(study.recommendations));
            return (
              <Card
                testID={`imaging-card-${study.id}`}
                key={study.id}
                onPress={() =>
                  router.push({
                    pathname: '/imaging/[id]',
                    params: { id: study.id },
                  })
                }
              >
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <IconBadge name="scan-outline" tone="ai" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {study.modality} · {study.studyName}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      {formatDate(imagingDate(study))} · {study.clinicName || t('patient.imaging.ceenaixRadiology')}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: spacing.xs,
                        marginTop: spacing.sm,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Pill
                        label={study.status === 'released' ? t('patient.imaging.reviewed') : t('patient.imaging.awaitingReview')}
                        tone={study.status === 'released' ? 'success' : 'warning'}
                      />
                      {followUp ? <Pill icon="alert-circle" label={t('patient.imaging.finding.monitor')} tone="warning" /> : null}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
