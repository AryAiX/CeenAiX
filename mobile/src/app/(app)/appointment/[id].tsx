import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AiGeneratedTag, Avatar, Button, Card, EmptyState, ErrorState, InlineMessage, KeyValue, Pill, Screen, Section, Skeleton, Text } from '@/components/ui';
import { UPCOMING_STATUSES } from '@/data/appointments';
import { ensureDirectConversation } from '@/data/messaging';
import { usePatientAppointmentDetail } from '@/data/web/hooks/use-patient-appointment-detail';
import { getTelemedicineJoinWindowStatus } from '@/data/web/lib/telemedicine';
import { useNow } from '@/hooks/use-now';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate, formatDateLong, formatShortDay, formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { appointmentStatusTone, labStatusTone, preVisitStatusTone, prescriptionStatusTone } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

export default function AppointmentDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const now = useNow();
  const detail = useOfflineCache(usePatientAppointmentDetail(user?.id, id), user && id ? `appointment:${user.id}:${id}` : null);
  const [messaging, setMessaging] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const data = detail.data;

  if (detail.loading) {
    return (
      <Screen testID="screen-appointment-detail">
        <View style={{ gap: spacing.lg }}>
          <Skeleton height={140} rounded={radius.xl} />
          <Skeleton height={200} rounded={radius.xl} />
          <Skeleton height={120} rounded={radius.xl} />
        </View>
      </Screen>
    );
  }
  if (!data && detail.error) {
    return (
      <Screen testID="screen-appointment-detail">
        <ErrorState message={detail.error} onRetry={() => void detail.refetch()} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen testID="screen-appointment-detail">
        <EmptyState
          icon="calendar-outline"
          title={t('m.appointment.notFoundTitle')}
          body={t('m.appointment.notFoundBody')}
          action={{
            label: t('patient.appointments.title'),
            onPress: () => router.replace('/appointments'),
          }}
        />
      </Screen>
    );
  }

  const { appointment, doctorProfile: doctor, preVisitAssessment, preVisitSummary, consultationNote } = data;
  const scheduledMs = new Date(appointment.scheduled_at).getTime();
  const isUpcoming = UPCOMING_STATUSES.has(appointment.status) && scheduledMs >= now;
  const isCancellable = (appointment.status === 'scheduled' || appointment.status === 'confirmed') && scheduledMs > now;
  const joinStatus = getTelemedicineJoinWindowStatus(appointment, now);
  const doctorName = doctor?.fullName ?? t('shared.doctor');
  const facility = [doctor?.city, doctor?.address].filter(Boolean).join(' – ');
  const summaryPoints = textList(preVisitSummary?.key_points);
  const riskFlags = textList(preVisitSummary?.risk_flags);

  const messageDoctor = async () => {
    if (!user) return;
    setMessaging(true);
    setActionError(null);
    try {
      const conversationId = await ensureDirectConversation(user.id, appointment.doctor_id, t('patient.messages.defaultSubject'));
      const draft = t(isUpcoming ? 'm.appointment.regarding' : 'm.appointment.followingUp', {
        date: formatShortDay(appointment.scheduled_at),
        time: formatTime(appointment.scheduled_at),
      });
      router.push({
        pathname: '/conversation/[id]',
        params: { id: conversationId, draft },
      });
    } catch (error) {
      haptics.error();
      setActionError(error instanceof Error ? error.message : t('messaging.errStartConversation'));
    } finally {
      setMessaging(false);
    }
  };

  const openDirections = () => {
    const query = encodeURIComponent(facility);
    void Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${query}` : `geo:0,0?q=${query}`);
  };

  return (
    <Screen testID="screen-appointment-detail" onRefresh={detail.refetch} refreshing={detail.refreshing} staleSince={detail.staleSince}>
      <Stack.Screen options={{ title: formatDate(appointment.scheduled_at) }} />
      <Card tone="brand">
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            alignItems: 'center',
          }}
        >
          <Avatar name={doctorName} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title" numberOfLines={2}>
              {doctorName}
            </Text>
            <Text variant="caption" color="muted">
              {doctor?.specialty ?? t('shared.careVisit')}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <Pill label={t(`shared.appointmentStatus.${appointment.status}`)} tone={appointmentStatusTone[appointment.status]} />
          <Pill
            icon={appointment.type === 'virtual' ? 'videocam' : 'business'}
            label={appointment.type === 'virtual' ? t('patient.appointments.filterTeleconsult') : t('patient.appointments.filterInPerson')}
            tone="info"
          />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label={t('m.appointment.date')} value={formatDateLong(appointment.scheduled_at)} />
        <KeyValue
          label={t('m.appointment.time')}
          value={`${formatTime(appointment.scheduled_at)} · ${t('shared.minutesUnit', { count: appointment.duration_minutes })}`}
        />
        <KeyValue
          label={t('m.appointment.location')}
          value={appointment.type === 'virtual' ? t('patient.appointments.filterTeleconsult') : facility || t('shared.clinicPending')}
        />
        <KeyValue label={t('m.appointment.reason')} value={appointment.chief_complaint ?? t('m.appointment.notProvided')} />
        {appointment.notes ? (
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            <Text variant="captionStrong">{t('patient.appointments.preparationNotes')}</Text>
            <Text variant="caption" color="muted">
              {appointment.notes}
            </Text>
          </View>
        ) : null}
      </Card>

      {actionError ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage tone="danger" message={actionError} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {appointment.type === 'virtual' && joinStatus !== 'not_virtual' && joinStatus !== 'inactive' ? (
          <>
            <Button
              label={t('patient.appointments.joinCall')}
              icon="videocam"
              size="lg"
              fullWidth
              disabled={joinStatus !== 'open'}
              onPress={() =>
                router.push({
                  pathname: '/visit/[id]',
                  params: { id: appointment.id },
                })
              }
            />
            {joinStatus === 'too_early' ? (
              <Text variant="caption" color="muted" align="center">
                {t('m.appointment.joinOpensAt', {
                  time: formatTime(new Date(scheduledMs - 10 * 60_000)),
                })}
              </Text>
            ) : joinStatus === 'ended' ? (
              <Text variant="caption" color="muted" align="center">
                {t('m.appointment.joinEnded')}
              </Text>
            ) : null}
          </>
        ) : null}
        {preVisitAssessment ? (
          <Button
            label={
              preVisitAssessment.status === 'completed' || preVisitAssessment.status === 'reviewed'
                ? t('patient.appointments.reviewIntake')
                : t('patient.appointments.continueIntake')
            }
            icon="clipboard-outline"
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/pre-visit/[id]',
                params: { id: preVisitAssessment.id },
              })
            }
          />
        ) : null}
        {appointment.type === 'in_person' && facility && isUpcoming ? (
          <Button label={t('m.appointment.directions')} icon="navigate-outline" variant="secondary" fullWidth onPress={openDirections} />
        ) : null}
        {isUpcoming ? (
          <Button
            label={t('patient.appointments.reschedule')}
            icon="calendar-outline"
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/book',
                params: { reschedule: appointment.id },
              })
            }
          />
        ) : null}
        {appointment.status !== 'cancelled' && appointment.status !== 'no_show' ? (
          <Button
            label={isUpcoming ? t('patient.messages.messageDoctor') : t('patient.messages.followUpDoctor')}
            icon="chatbubble-outline"
            variant="secondary"
            fullWidth
            loading={messaging}
            onPress={() => void messageDoctor()}
          />
        ) : null}
        {isCancellable ? (
          <Button
            label={t('patient.appointments.cancel')}
            icon="close-circle-outline"
            variant="danger"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/cancel/[id]',
                params: { id: appointment.id },
              })
            }
          />
        ) : null}
      </View>

      <Section title={t('m.appointment.preVisit')}>
        <Card>
          {preVisitAssessment ? (
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Text variant="captionStrong">{t('patient.appointments.preVisitPrefix')}</Text>
                <Pill label={t(`shared.preVisitStatus.${preVisitAssessment.status}`)} tone={preVisitStatusTone[preVisitAssessment.status]} />
              </View>
              {preVisitSummary?.summary_text ? (
                <>
                  <AiGeneratedTag />
                  <Text variant="body">{preVisitSummary.summary_text}</Text>
                </>
              ) : null}
              {summaryPoints.slice(0, 4).map((point) => (
                <Text key={point} variant="caption" color="muted">
                  • {point}
                </Text>
              ))}
              {riskFlags.length > 0 ? <InlineMessage tone="warning" message={riskFlags.slice(0, 3).join(', ')} /> : null}
            </View>
          ) : (
            <Text variant="caption" color="muted">
              {t('m.appointment.noPreVisit')}
            </Text>
          )}
        </Card>
      </Section>

      <Section title={t('m.appointment.visitNote')}>
        <Card>
          {consultationNote && (consultationNote.assessment || consultationNote.plan) ? (
            <View style={{ gap: spacing.md }}>
              {(
                [
                  [t('m.appointment.assessment'), consultationNote.assessment],
                  [t('m.appointment.plan'), consultationNote.plan],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <View key={label} style={{ gap: 4 }}>
                    <Text variant="bodyStrong">{label}</Text>
                    <Text variant="body" color="muted">
                      {value}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          ) : (
            <Text variant="caption" color="muted">
              {t('m.appointment.noVisitNote')}
            </Text>
          )}
        </Card>
      </Section>

      <Section title={t('m.appointment.prescriptions')}>
        {data.prescriptions.length === 0 ? (
          <Card>
            <Text variant="caption" color="muted">
              {t('m.appointment.noPrescriptions')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {data.prescriptions.map((prescription) => (
              <Card
                key={prescription.id}
                onPress={() =>
                  router.push({
                    pathname: '/prescriptions/[id]',
                    params: { id: prescription.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Pill label={t(`shared.prescriptionStatus.${prescription.status}`)} tone={prescriptionStatusTone(prescription.status)} />
                  <Text variant="micro" color="subtle">
                    {formatDate(prescription.prescribed_at)}
                  </Text>
                </View>
                {prescription.items.map((item) => (
                  <View key={item.id} style={{ marginTop: spacing.sm }}>
                    <Text variant="bodyStrong">{item.medication_name}</Text>
                    <Text variant="caption" color="muted">
                      {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}
      </Section>

      <Section title={t('m.appointment.labOrders')}>
        {data.labOrders.length === 0 ? (
          <Card>
            <Text variant="caption" color="muted">
              {t('m.appointment.noLabOrders')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {data.labOrders.map((order) => (
              <Card
                key={order.id}
                onPress={() =>
                  router.push({
                    pathname: '/lab-results/[id]',
                    params: { id: order.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text variant="bodyStrong">{order.lab_order_code ?? t('m.appointment.labOrder')}</Text>
                  <Pill
                    label={t(`shared.labOrderStatus.${order.status}`, {
                      defaultValue: order.status,
                    })}
                    tone={labStatusTone(order.status)}
                  />
                </View>
                {order.items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: spacing.sm,
                      gap: spacing.md,
                    }}
                  >
                    <Text variant="caption" style={{ flex: 1 }}>
                      {item.test_name}
                    </Text>
                    <Text variant="captionStrong" color={item.is_abnormal ? 'danger' : 'muted'}>
                      {item.result_value ? `${item.result_value}${item.result_unit ? ` ${item.result_unit}` : ''}` : t('m.appointment.pending')}
                    </Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}
