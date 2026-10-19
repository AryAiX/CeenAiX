import type { LabOrderItem } from '@ceenaix/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  KeyValue,
  Pill,
  Screen,
  Section,
  Skeleton,
  Text,
} from '@/components/ui';
import { usePatientLabResults } from '@/data/web/hooks/use-patient-lab-results';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate, formatDateTime } from '@/lib/format';
import { buildLabReportText, labItemMarker, labItemReference, labItemValue } from '@/lib/lab-format';
import { labItemTone, labStatusTone } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function LabOrderScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const labs = useOfflineCache(usePatientLabResults(user?.id), user ? `labs:${user.id}` : null);
  const order = labs.data?.find((row) => row.id === id) ?? null;

  if (labs.loading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md }}>
          <Skeleton height={120} rounded={radius.xl} />
          <Skeleton height={90} />
          <Skeleton height={90} />
        </View>
      </Screen>
    );
  }
  if (!labs.data && labs.error) {
    return (
      <Screen>
        <ErrorState message={t('patient.labResults.loadError')} onRetry={() => void labs.refetch()} />
      </Screen>
    );
  }
  if (!order) {
    return (
      <Screen>
        <EmptyState icon="flask-outline" title={t('patient.labResults.emptyTitle')} />
      </Screen>
    );
  }

  const releasedAt = order.results_released_at ?? order.ordered_at;
  const share = () => void Share.share({ title: t('m.labs.share'), message: buildLabReportText(order, formatDate(releasedAt)) });

  return (
    <Screen onRefresh={labs.refetch} refreshing={labs.refreshing} staleSince={labs.staleSince}>
      <Stack.Screen
        options={{
          title: order.lab_order_code ?? t('m.appointment.labOrder'),
          headerRight: () => <IconButton name="share-outline" variant="plain" onPress={share} accessibilityLabel={t('m.labs.share')} />,
        }}
      />
      <Card tone="info">
        <Text variant="title">{order.labName ?? t('m.appointment.labOrder')}</Text>
        {order.labCity ? (
          <Text variant="caption" color="muted">
            {[order.labCity, order.labAddress].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md }}>
          <Pill label={t(`shared.labOrderStatus.${order.status}`, { defaultValue: order.status })} tone={labStatusTone(order.status)} />
          {order.reviewStatus === 'reviewed' ? <Pill icon="checkmark-done" label={t('m.labs.reviewed')} tone="success" /> : null}
          {order.normalCount > 0 ? <Pill label={t('patient.labResults.normalCountBadge', { count: order.normalCount })} tone="success" /> : null}
          {order.monitorCount > 0 ? <Pill label={t('patient.labResults.monitorCountBadge', { count: order.monitorCount })} tone="warning" /> : null}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <KeyValue label={t('m.labs.orderedBy')} value={order.doctorName ?? t('patient.labResults.orderedByFallback')} />
        <KeyValue label={t('m.appointment.date')} value={formatDate(order.ordered_at)} />
        {order.sample_collection_at ? <KeyValue label={t('m.labs.collected')} value={formatDateTime(order.sample_collection_at)} /> : null}
        {order.results_released_at ? <KeyValue label={t('m.labs.released')} value={formatDateTime(order.results_released_at)} /> : null}
      </Card>

      {order.overall_comment ? (
        <Section title={t('m.labs.comment')}>
          <Card tone="brand">
            <Text variant="body">{order.overall_comment}</Text>
          </Card>
        </Section>
      ) : null}

      <Section title={t('patient.labResults.testResult')}>
        <View style={{ gap: spacing.sm }}>
          {order.parentItems.map((item) => (
            <LabItemCard key={item.id} item={item} subItems={order.subItemsByParent[item.id] ?? []} />
          ))}
        </View>
      </Section>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        {order.resultedCount > 0 ? (
          <Button
            label={t('patient.labResults.explainWithAi')}
            icon="sparkles"
            variant="secondary"
            fullWidth
            onPress={() => router.navigate({ pathname: '/assistant', params: { prompt: t('m.labs.explainPrompt', { date: formatDate(releasedAt) }) } })}
          />
        ) : null}
        {order.appointment_id ? (
          <Button
            label={t('patient.labResults.openAppointment')}
            icon="calendar-outline"
            variant="ghost"
            fullWidth
            onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: order.appointment_id ?? '' } })}
          />
        ) : null}
        <Button label={t('m.labs.share')} icon="share-outline" variant="ghost" fullWidth onPress={share} />
      </View>
    </Screen>
  );
}

function LabItemCard({ item, subItems }: { item: LabOrderItem; subItems: LabOrderItem[] }): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const tone = labItemTone[item.status_category];
  const value = labItemValue(item);
  const reference = labItemReference(item);
  const marker = labItemMarker(item);
  const hasDetails = Boolean(item.patient_explanation || item.doctor_comment || subItems.length > 0 || item.description);

  return (
    <Card>
      <Pressable
        disabled={!hasDetails}
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityState={hasDetails ? { expanded } : undefined}
        onPress={() => setExpanded((current) => !current)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{item.display_name_long ?? item.test_name}</Text>
            {reference ? (
              <Text variant="caption" color="muted">
                {t('patient.labResults.referenceRange')}: {reference}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text variant="heading" color={value ? tone : 'subtle'}>
              {value || t('patient.labResults.noResultYet')}
            </Text>
            <Pill label={item.status_label ?? t(`m.labs.status.${item.status_category}`)} tone={tone} />
          </View>
        </View>
        {marker != null ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, marginTop: spacing.md }}>
            <View
              style={{
                position: 'absolute',
                start: `${marker}%`,
                top: -3,
                width: 12,
                height: 12,
                marginStart: -6,
                borderRadius: 6,
                backgroundColor: colors.tones[tone].fg,
              }}
            />
          </View>
        ) : null}
        {hasDetails ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
            <Text variant="captionStrong" color="primary">
              {expanded ? t('m.labs.lessDetails') : t('m.labs.moreDetails')}
            </Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
          </View>
        ) : null}
      </Pressable>
      {expanded ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {item.patient_explanation ? (
            <View style={{ gap: 4 }}>
              <Text variant="captionStrong">{t('m.labs.whatItMeans')}</Text>
              <Text variant="caption" color="muted">
                {item.patient_explanation}
              </Text>
            </View>
          ) : item.description ? (
            <Text variant="caption" color="muted">
              {item.description}
            </Text>
          ) : null}
          {item.doctor_comment ? (
            <View style={{ gap: 4 }}>
              <Text variant="captionStrong">{t('patient.labResults.doctorNoteTitle')}</Text>
              <Text variant="caption" color="muted">
                {item.doctor_comment}
              </Text>
            </View>
          ) : null}
          {subItems.map((sub) => (
            <View key={sub.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text variant="caption" style={{ flex: 1 }}>
                {sub.test_name}
              </Text>
              <Text variant="captionStrong" color={labItemTone[sub.status_category]}>
                {labItemValue(sub) || t('patient.labResults.noResultYet')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
