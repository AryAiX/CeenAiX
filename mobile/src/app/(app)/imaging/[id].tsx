import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ErrorState, InlineMessage, KeyValue, Pill, Screen, Section, Skeleton, Text } from '@/components/ui';
import { useImagingStudies } from '@/data/web/hooks/use-imaging-studies';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function ImagingStudyScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const imaging = useOfflineCache(useImagingStudies(user?.id, 'patient'), user ? `imaging:${user.id}` : null);
  const study = imaging.data?.find((row) => row.id === id) ?? null;

  if (imaging.loading) {
    return (
      <Screen testID="screen-imaging-detail">
        <View style={{ gap: spacing.md }}>
          <Skeleton height={110} rounded={radius.xl} />
          <Skeleton height={140} />
        </View>
      </Screen>
    );
  }
  if (!imaging.data && imaging.error) {
    return (
      <Screen testID="screen-imaging-detail">
        <ErrorState message={t('patient.imaging.loadError')} onRetry={() => void imaging.refetch()} />
      </Screen>
    );
  }
  if (!study) {
    return (
      <Screen testID="screen-imaging-detail">
        <EmptyState icon="scan-outline" title={t('patient.imaging.emptyTitle')} />
      </Screen>
    );
  }

  const released = study.status === 'released';
  const report = [
    { title: t('patient.imaging.impression'), body: study.impression },
    { title: t('m.imaging.findings'), body: study.findings },
    { title: t('m.imaging.recommendations'), body: study.recommendations },
  ].filter((section): section is { title: string; body: string } => Boolean(section.body?.trim()));

  return (
    <Screen testID="screen-imaging-detail" onRefresh={imaging.refetch} refreshing={imaging.refreshing} staleSince={imaging.staleSince}>
      <Stack.Screen options={{ title: study.modality }} />
      <Card tone="ai">
        <Text variant="title">{study.studyName}</Text>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.xs,
            marginTop: spacing.sm,
          }}
        >
          <Pill label={released ? t('patient.imaging.reviewed') : t('patient.imaging.awaitingReview')} tone={released ? 'success' : 'warning'} />
        </View>
      </Card>

      <Section title={t('patient.imaging.studyDetails')}>
        <Card>
          <KeyValue label={t('patient.imaging.date')} value={formatDate(study.releasedAt ?? study.scheduledAt)} />
          <KeyValue label={t('patient.imaging.facility')} value={study.clinicName || t('patient.imaging.ceenaixRadiology')} />
          <KeyValue label={t('patient.imaging.orderedBy')} value={study.doctorName || t('patient.imaging.careTeam')} />
          <KeyValue label={t('m.imaging.accession')} value={study.accession} />
          {study.room ? <KeyValue label={t('m.imaging.room')} value={study.room} /> : null}
        </Card>
      </Section>

      {study.alerts.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {study.alerts.map((alert) => (
            <InlineMessage key={alert} tone="warning" message={alert} />
          ))}
        </View>
      ) : null}

      {released && report.length > 0 ? (
        report.map((section) => (
          <Section key={section.title} title={section.title}>
            <Card>
              <Text variant="body">{section.body}</Text>
            </Card>
          </Section>
        ))
      ) : (
        <Section title={t('patient.imaging.impression')}>
          <Card>
            <Text variant="body" color="muted">
              {t('patient.imaging.impressionPending')}
            </Text>
          </Card>
        </Section>
      )}

      <Text variant="micro" color="subtle" style={{ marginTop: spacing.xl }}>
        {t('patient.imaging.viewerPlaceholder')}
      </Text>
    </Screen>
  );
}
