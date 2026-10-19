import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppointmentCard } from '@/components/appointment-card';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  IconButton,
  InlineMessage,
  Screen,
  ScreenTitle,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/components/ui';
import { CANCELLED_STATUSES, isUpcomingAppointment, usePatientAppointmentsList } from '@/data/appointments';
import { useNow } from '@/hooks/use-now';
import { formatNumber, formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'upcoming' | 'past' | 'cancelled';
type TypeFilter = 'all' | 'in_person' | 'virtual';

const BANNERS: Record<string, string> = {
  booked: 'patient.appointments.bannerBooked',
  rescheduled: 'patient.appointments.bannerRescheduled',
  previsit: 'patient.appointments.bannerPreVisit',
  cancelled: 'patient.appointments.cancelSuccess',
};

export default function AppointmentsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { banner } = useLocalSearchParams<{ banner?: string }>();
  const { user } = useAuth();
  const now = useNow(1000);
  const list = usePatientAppointmentsList(user?.id, t('shared.doctor'));
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // `now` ticks every second for the countdown; regroup once a minute.
  const minute = Math.floor(now / 60_000) * 60_000;
  const groups = useMemo(() => {
    const now = minute;
    const filtered = list.appointments.filter((appointment) => typeFilter === 'all' || appointment.type === typeFilter);
    const upcoming = filtered.filter((appointment) => isUpcomingAppointment(appointment, now));
    const cancelled = filtered.filter((appointment) => CANCELLED_STATUSES.has(appointment.status)).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    const past = filtered
      .filter(
        (appointment) =>
          !CANCELLED_STATUSES.has(appointment.status) && !isUpcomingAppointment(appointment, now) && new Date(appointment.scheduled_at).getTime() < now
      )
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    return { upcoming, past, cancelled };
  }, [list.appointments, typeFilter, minute]);

  const nextTeleconsult = groups.upcoming.find(
    (appointment) => appointment.type === 'virtual' && new Date(appointment.scheduled_at).getTime() - now <= 24 * 60 * 60 * 1000
  );
  const visible = groups[segment];
  const bannerKey = banner ? BANNERS[banner] : undefined;

  return (
    <Screen testID="screen-appointments" edgeTop onRefresh={list.refetch} refreshing={list.refreshing} staleSince={list.staleSince}>
      <ScreenTitle
        title={t('patient.appointments.title')}
        right={<IconButton name="add" accessibilityLabel={t('patient.appointments.book')} onPress={() => router.push('/book')} />}
      />
      {bannerKey ? <InlineMessage tone="success" message={t(bannerKey)} /> : null}
      {nextTeleconsult ? (
        <Card tone="brand" style={{ marginTop: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <IconBadge name="videocam" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">
                {t('patient.appointments.teleconsultBannerTitle', {
                  doctor: list.doctorById.get(nextTeleconsult.doctor_id)?.fullName ?? t('shared.doctor'),
                })}
              </Text>
              <Text variant="caption" color="muted">
                {countdown(new Date(nextTeleconsult.scheduled_at).getTime() - now, t)} · {formatTime(nextTeleconsult.scheduled_at)}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button
              label={t('patient.appointments.joinWaitingRoom')}
              icon="videocam"
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/visit/[id]',
                  params: { id: nextTeleconsult.id },
                })
              }
            />
          </View>
        </Card>
      ) : null}
      <View
        style={{
          gap: spacing.sm,
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            {
              value: 'upcoming',
              label: t('patient.appointments.filterUpcoming'),
              count: groups.upcoming.length,
            },
            {
              value: 'past',
              label: t('patient.appointments.filterCompleted'),
              count: groups.past.length,
            },
            {
              value: 'cancelled',
              label: t('patient.appointments.filterCancelled'),
              count: groups.cancelled.length,
            },
          ]}
        />
        <SegmentedControl
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: t('patient.appointments.filterAll') },
            {
              value: 'in_person',
              label: t('patient.appointments.filterInPerson'),
            },
            {
              value: 'virtual',
              label: t('patient.appointments.filterTeleconsult'),
            },
          ]}
        />
      </View>
      {list.loading ? (
        <SkeletonList count={3} height={150} />
      ) : list.error && list.appointments.length === 0 ? (
        <ErrorState message={t('patient.appointments.loadError')} onRetry={() => void list.refetch()} />
      ) : list.appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t('patient.appointments.emptyTitle')}
          body={t('patient.appointments.emptyBody')}
          action={{
            label: t('patient.appointments.book'),
            onPress: () => router.push('/book'),
          }}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={segment === 'upcoming' ? t('patient.appointments.noUpcomingTitle') : t('patient.appointments.noResultsFilters')}
          body={segment === 'upcoming' ? t('patient.appointments.noUpcomingBody') : t('patient.appointments.noResultsFiltersSub')}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {visible.map((appointment) => {
            const doctor = list.doctorById.get(appointment.doctor_id);
            const preVisit = list.preVisitByAppointmentId.get(appointment.id);
            return (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                doctorName={doctor?.fullName ?? t('shared.doctor')}
                specialty={doctor?.specialty}
                avatarUrl={doctor?.avatarUrl}
                preVisit={preVisit ? { id: preVisit.id, status: preVisit.status } : null}
                now={now}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function countdown(diffMs: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (diffMs <= 0) return t('patient.appointments.teleconsultBannerStartingNow');
  const totalMinutes = Math.floor(diffMs / 60_000);
  const time =
    totalMinutes >= 60
      ? `${formatNumber(Math.floor(totalMinutes / 60))}${t('shared.hourShort')} ${formatNumber(totalMinutes % 60)}${t('shared.minuteShort')}`
      : `${formatNumber(totalMinutes)}${t('shared.minuteShort')} ${formatNumber(Math.floor((diffMs % 60_000) / 1000))}${t('shared.secondShort')}`;
  return t('patient.appointments.teleconsultBannerStartsIn', { time });
}
