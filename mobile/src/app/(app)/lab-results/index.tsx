import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ErrorState, IconBadge, Pill, Screen, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { usePatientLabResults, type PatientLabOrderRecord, type PatientLabTrendSeries } from '@/data/web/hooks/use-patient-lab-results';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { labItemTone, labStatusTone } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'results' | 'upcoming' | 'trends';

export default function LabResultsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const labs = useOfflineCache(usePatientLabResults(user?.id), user ? `labs:${user.id}` : null);
  const [segment, setSegment] = useState<Segment>('results');
  const { refetch } = labs;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const orders = useMemo(() => labs.data ?? [], [labs.data]);
  const resulted = useMemo(() => orders.filter((order) => !order.isUpcoming), [orders]);
  const upcoming = useMemo(() => orders.filter((order) => order.isUpcoming), [orders]);
  const trends = useMemo(() => {
    const byCode = new Map<string, PatientLabTrendSeries>();
    for (const order of orders) {
      for (const series of Object.values(order.trends)) {
        const existing = byCode.get(series.testCode);
        if (series.points.length >= 2 && (!existing || series.points.length > existing.points.length)) byCode.set(series.testCode, series);
      }
    }
    return [...byCode.values()].sort((left, right) => left.testName.localeCompare(right.testName));
  }, [orders]);

  const list = segment === 'results' ? resulted : upcoming;

  return (
    <Screen testID="screen-lab-results" onRefresh={labs.refetch} refreshing={labs.refreshing} staleSince={labs.staleSince}>
      <SegmentedControl<Segment>
        value={segment}
        onChange={setSegment}
        options={[
          {
            value: 'results',
            label: t('m.labs.results'),
            count: resulted.length,
          },
          {
            value: 'upcoming',
            label: t('m.labs.upcoming'),
            count: upcoming.length,
          },
          { value: 'trends', label: t('m.labs.trends') },
        ]}
      />
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {labs.loading ? (
          <SkeletonList count={4} height={110} />
        ) : !labs.data && labs.error ? (
          <ErrorState message={t('patient.labResults.loadError')} onRetry={() => void labs.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState icon="flask-outline" title={t('patient.labResults.emptyTitle')} body={t('patient.labResults.emptyBody')} />
        ) : segment === 'trends' ? (
          trends.length === 0 ? (
            <EmptyState icon="trending-up-outline" title={t('m.labs.noTrendsTitle')} body={t('m.labs.noTrendsBody')} />
          ) : (
            trends.map((series) => <TrendCard key={series.testCode} series={series} />)
          )
        ) : list.length === 0 ? (
          <EmptyState
            icon={segment === 'upcoming' ? 'time-outline' : 'flask-outline'}
            title={segment === 'upcoming' ? t('patient.labResults.upcomingEmptyTitle') : t('patient.labResults.emptyTitle')}
            body={segment === 'upcoming' ? t('patient.labResults.upcomingEmptyBody') : t('patient.labResults.emptyBody')}
          />
        ) : (
          list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() =>
                router.push({
                  pathname: '/lab-results/[id]',
                  params: { id: order.id },
                })
              }
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function OrderCard({ order, onPress }: { order: PatientLabOrderRecord; onPress: () => void }): React.ReactElement {
  const { t } = useTranslation();
  const due =
    order.isUpcoming && order.daysUntilDue != null
      ? order.daysUntilDue < 0
        ? {
            label: t('m.labs.overdue', { count: Math.abs(order.daysUntilDue) }),
            tone: 'danger' as const,
          }
        : order.daysUntilDue === 0
          ? { label: t('m.labs.dueToday'), tone: 'warning' as const }
          : {
              label: t('m.labs.dueIn', { count: order.daysUntilDue }),
              tone: 'info' as const,
            }
      : null;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <IconBadge name="flask-outline" tone={order.abnormalCount > 0 ? 'warning' : 'info'} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {order.labName ?? order.lab_order_code ?? t('m.appointment.labOrder')}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {t('patient.labResults.orderedOn', {
              date: formatDate(order.ordered_at),
            })}{' '}
            · {order.doctorName ?? t('patient.labResults.orderedByFallback')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginTop: spacing.sm,
            }}
          >
            <Pill
              label={t(`shared.labOrderStatus.${order.status}`, {
                defaultValue: order.status,
              })}
              tone={labStatusTone(order.status)}
            />
            <Pill label={t('m.labs.tests', { count: order.parentItems.length })} tone="neutral" />
            {order.abnormalCount > 0 ? <Pill icon="alert-circle" label={t('patient.labResults.abnormalBadge')} tone="warning" /> : null}
            {!order.isUpcoming && order.abnormalCount === 0 && order.resultedCount > 0 ? (
              <Pill icon="checkmark-circle" label={t('patient.labResults.allNormalBadge')} tone="success" />
            ) : null}
            {due ? <Pill icon="time-outline" label={due.label} tone={due.tone} /> : null}
            {order.isUpcoming && order.fasting_required ? <Pill label={t('m.labs.fasting')} tone="warning" /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function TrendCard({ series }: { series: PatientLabTrendSeries }): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const max = Math.max(...series.points.map((point) => point.value));
  const last = series.points[series.points.length - 1];
  const directionLabel =
    series.direction === 'improving'
      ? t('patient.labResults.trendImproving')
      : series.direction === 'worsening'
        ? t('patient.labResults.trendWorsening')
        : series.direction === 'stable'
          ? t('patient.labResults.trendStable')
          : null;
  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{series.testName}</Text>
          <Text variant="caption" color="muted">
            {t('m.labs.points', { count: series.points.length })}
          </Text>
        </View>
        {directionLabel ? (
          <Pill
            label={series.delta != null ? `${directionLabel} ${series.delta > 0 ? '+' : ''}${series.delta}` : directionLabel}
            tone={series.direction === 'improving' ? 'success' : series.direction === 'worsening' ? 'warning' : 'neutral'}
          />
        ) : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          height: 96,
          marginTop: spacing.md,
        }}
      >
        {series.points.map((point) => (
          <View key={`${point.orderId}-${point.visitDate}`} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text variant="micro" color="muted">
              {point.value}
            </Text>
            <View
              style={{
                width: '70%',
                height: Math.max(6, (point.value / (max || 1)) * 56),
                borderRadius: radius.sm,
                backgroundColor: colors.tones[labItemTone[point.status]].fg,
                opacity: point === last ? 1 : 0.55,
              }}
            />
            <Text variant="micro" color="subtle" numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        ))}
      </View>
      {series.unit ? (
        <Text variant="micro" color="subtle" style={{ marginTop: spacing.xs }}>
          {series.unit}
        </Text>
      ) : null}
    </Card>
  );
}
