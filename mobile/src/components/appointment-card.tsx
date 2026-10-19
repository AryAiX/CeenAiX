import type { Appointment } from '@ceenaix/types';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getTelemedicineJoinWindowStatus } from '@/data/web/lib/telemedicine';
import { formatShortDay, formatTime } from '@/lib/format';
import { appointmentStatusTone, preVisitStatusTone } from '@/lib/status';
import { spacing } from '@/theme/tokens';
import { Avatar, Button, Card, Icon, Pill, Text } from './ui';

interface AppointmentCardProps {
  appointment: Pick<Appointment, 'id' | 'type' | 'status' | 'scheduled_at' | 'duration_minutes' | 'chief_complaint'>;
  doctorName: string;
  specialty?: string | null;
  avatarUrl?: string | null;
  preVisit?: { id: string; status: 'not_started' | 'in_progress' | 'completed' | 'reviewed' } | null;
  now?: number;
}

export function AppointmentCard({ appointment, doctorName, specialty, avatarUrl, preVisit, now = Date.now() }: AppointmentCardProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const joinStatus = getTelemedicineJoinWindowStatus(appointment, now);
  const isVirtual = appointment.type === 'virtual';
  const needsIntake = preVisit && (preVisit.status === 'not_started' || preVisit.status === 'in_progress');

  return (
    <Card onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: appointment.id } })} accessibilityLabel={doctorName}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Avatar name={doctorName} uri={avatarUrl} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {doctorName}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {specialty || t('shared.generalPractice')}
          </Text>
        </View>
        <Pill label={t(`shared.appointmentStatus.${appointment.status}`)} tone={appointmentStatusTone[appointment.status]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="calendar-outline" size={16} />
          <Text variant="captionStrong">{formatShortDay(appointment.scheduled_at)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="time-outline" size={16} />
          <Text variant="captionStrong">{formatTime(appointment.scheduled_at)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name={isVirtual ? 'videocam-outline' : 'business-outline'} size={16} />
          <Text variant="captionStrong">{isVirtual ? t('shared.appointmentType.virtual') : t('shared.appointmentType.inPerson')}</Text>
        </View>
      </View>
      {appointment.chief_complaint ? (
        <Text variant="caption" color="muted" numberOfLines={2} style={{ marginTop: spacing.sm }}>
          {appointment.chief_complaint}
        </Text>
      ) : null}
      {preVisit ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <Text variant="caption" color="muted">
            {t('patient.appointments.preVisitPrefix')}
          </Text>
          <Pill label={t(`shared.preVisitStatus.${preVisit.status}`)} tone={preVisitStatusTone[preVisit.status]} />
        </View>
      ) : null}
      {joinStatus === 'open' || needsIntake ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {joinStatus === 'open' ? (
            <View style={{ flex: 1 }}>
              <Button
                label={t('patient.appointments.joinCall')}
                icon="videocam"
                size="sm"
                fullWidth
                onPress={() => router.push({ pathname: '/visit/[id]', params: { id: appointment.id } })}
              />
            </View>
          ) : null}
          {needsIntake && preVisit ? (
            <View style={{ flex: 1 }}>
              <Button
                label={t('patient.appointments.continueIntake')}
                icon="clipboard-outline"
                size="sm"
                variant="secondary"
                fullWidth
                onPress={() => router.push({ pathname: '/pre-visit/[id]', params: { id: preVisit.id } })}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
