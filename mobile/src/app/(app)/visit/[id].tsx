import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, IconButton, InlineMessage, KeyValue, Screen, SkeletonList, Text } from '@/components/ui';
import { usePatientAppointmentDetail } from '@/data/web/hooks/use-patient-appointment-detail';
import { getTelemedicineJoinWindowStatus, requestTelemedicineToken, type TelemedicineTokenResponse } from '@/data/web/lib/telemedicine';
import { useNow } from '@/hooks/use-now';
import { formatDateLong, formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { isWebRtcAvailable } from '@/lib/livekit-globals';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type VisitStageComponent = typeof import('@/components/visit-stage').VisitStage;

// Lobby + LiveKit room for a virtual appointment. The token comes from the
// `telemedicine-token` Edge Function (same as web); the join window
// (10 min before → duration + 15 min) is the shared web helper.
export default function VisitScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const detail = usePatientAppointmentDetail(user?.id, id);
  const now = useNow(30_000);
  const [session, setSession] = useState<TelemedicineTokenResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webRtc = isWebRtcAvailable();
  const VisitStage = useMemo<VisitStageComponent | null>(
    () => (webRtc ? (require('@/components/visit-stage') as typeof import('@/components/visit-stage')).VisitStage : null),
    [webRtc]
  );

  const appointment = detail.data?.appointment ?? null;
  const doctorName = detail.data?.doctorProfile?.fullName ?? t('m.visit.yourDoctor');
  const joinStatus = appointment ? getTelemedicineJoinWindowStatus(appointment, now) : 'inactive';

  const join = async () => {
    if (!appointment) return;
    setJoining(true);
    setError(null);
    try {
      setSession(await requestTelemedicineToken(appointment.id));
      haptics.success();
    } catch (joinError) {
      haptics.error();
      setError(joinError instanceof Error ? joinError.message : t('m.common.unexpected'));
    } finally {
      setJoining(false);
    }
  };

  if (session && VisitStage) {
    return (
      <VisitStage
        session={session}
        counterpartName={doctorName}
        onLeave={() => setSession(null)}
        onError={(message) => {
          setSession(null);
          setError(t('m.visit.connectionError', { message }));
        }}
      />
    );
  }

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
      }}
    >
      <IconButton name="close" variant="plain" accessibilityLabel={t('m.common.close')} onPress={() => router.back()} />
      <Text variant="heading" style={{ flex: 1 }} accessibilityRole="header">
        {t('m.visit.title')}
      </Text>
    </View>
  );

  if (!webRtc) {
    return (
      <Screen testID="screen-visit" edgeTop>
        {header}
        <EmptyState icon="videocam-off-outline" title={t('m.visit.unavailableTitle')} body={t('m.visit.unavailableBody')} />
      </Screen>
    );
  }

  if (detail.loading && !detail.data) {
    return (
      <Screen testID="screen-visit" edgeTop>
        {header}
        <SkeletonList count={2} height={140} />
      </Screen>
    );
  }

  if (!appointment) {
    return (
      <Screen testID="screen-visit" edgeTop>
        {header}
        {detail.error ? (
          <ErrorState message={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <EmptyState icon="videocam-outline" title={t('m.visit.notFoundTitle')} body={t('m.visit.notFoundBody')} />
        )}
      </Screen>
    );
  }

  const canJoin = joinStatus === 'open';

  return (
    <Screen
      testID="screen-visit"
      edgeTop
      footer={
        <Button
          label={joining ? t('m.visit.joining') : canJoin ? t('m.visit.join') : t('m.visit.unavailable')}
          icon="videocam"
          size="lg"
          fullWidth
          loading={joining}
          disabled={!canJoin || joining}
          onPress={() => void join()}
        />
      }
    >
      {header}
      <View
        style={{
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.xl,
        }}
      >
        <Avatar name={doctorName} size={88} />
        <Text variant="title" align="center">
          {doctorName}
        </Text>
        {detail.data?.doctorProfile?.specialty ? (
          <Text variant="body" color="muted" align="center">
            {detail.data.doctorProfile.specialty}
          </Text>
        ) : null}
      </View>
      <Card>
        <KeyValue label={t('m.visit.date')} value={formatDateLong(appointment.scheduled_at)} />
        <KeyValue label={t('m.visit.time')} value={formatTime(appointment.scheduled_at)} />
        <KeyValue
          label={t('m.visit.duration')}
          value={t('shared.minutesUnit', {
            count: appointment.duration_minutes,
          })}
        />
      </Card>
      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <InlineMessage tone={canJoin ? 'success' : 'info'} message={t(`m.visit.status_${joinStatus}`)} />
        {error ? <InlineMessage tone="danger" message={error} /> : null}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            alignItems: 'center',
          }}
        >
          <Icon name="shield-checkmark-outline" size={16} />
          <Text variant="caption" color="muted" style={{ flex: 1 }}>
            {t('m.visit.privacy')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
