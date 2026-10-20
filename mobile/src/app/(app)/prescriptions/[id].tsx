import { estimateDaysOfSupplyRemaining } from '@ceenaix/shared/medication-schedule';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, ErrorState, InlineMessage, KeyValue, Pill, Screen, Section, Skeleton, Text } from '@/components/ui';
import { ensureDirectConversation } from '@/data/messaging';
import {
  getPatientPrescriptionPharmacyContact,
  markPatientPrescriptionPickedUp,
  usePatientPrescriptions,
  type PatientPrescriptionRecord,
} from '@/data/web/hooks/use-patient-prescriptions';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { prescriptionStatusTone } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import type { Tone } from '@/theme/tokens';
import { radius, spacing } from '@/theme/tokens';
import { errorMessage } from '@/lib/errors';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

function usePharmacyCopy(status: PatientPrescriptionRecord['pharmacyStatus']): { title: string; body: string; tone: Tone } | null {
  const { t } = useTranslation();
  switch (status) {
    case 'dispensed':
      return {
        title: t('patient.prescriptions.pharmacyStatusDispensedTitle'),
        body: t('patient.prescriptions.pharmacyStatusDispensedBody'),
        tone: 'success',
      };
    case 'in_progress':
      return {
        title: t('patient.prescriptions.pharmacyStatusInProgressTitle'),
        body: t('patient.prescriptions.pharmacyStatusInProgressBody'),
        tone: 'info',
      };
    case 'on_hold':
      return {
        title: t('patient.prescriptions.pharmacyStatusOnHoldTitle'),
        body: t('patient.prescriptions.pharmacyStatusOnHoldBody'),
        tone: 'warning',
      };
    case 'cancelled':
      return {
        title: t('patient.prescriptions.pharmacyStatusCancelledTitle'),
        body: t('patient.prescriptions.pharmacyStatusCancelledBody'),
        tone: 'danger',
      };
    case 'picked_up':
      return {
        title: t('m.rx.pickedUpTitle'),
        body: t('m.rx.pickedUpBody'),
        tone: 'success',
      };
    case 'new':
      return {
        title: t('patient.prescriptions.pharmacyStatusNewTitle'),
        body: t('patient.prescriptions.pharmacyStatusNewBody'),
        tone: 'info',
      };
    default:
      return null;
  }
}

export default function PrescriptionDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, sent } = useLocalSearchParams<{ id: string; sent?: string }>();
  const { user } = useAuth();
  const prescriptions = useOfflineCache(usePatientPrescriptions(user?.id), user ? `prescriptions:${user.id}` : null);
  const prescription = prescriptions.data?.find((row) => row.id === id) ?? null;
  const copy = usePharmacyCopy(prescription?.pharmacyStatus ?? null);
  const [busy, setBusy] = useState<'pickup' | 'pharmacy' | 'doctor' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (prescriptions.loading) {
    return (
      <Screen testID="screen-prescription-detail">
        <View style={{ gap: spacing.md }}>
          <Skeleton height={110} rounded={radius.xl} />
          <Skeleton height={160} />
        </View>
      </Screen>
    );
  }
  if (!prescriptions.data && prescriptions.error) {
    return (
      <Screen testID="screen-prescription-detail">
        <ErrorState message={t('patient.prescriptions.loadError')} onRetry={() => void prescriptions.refetch()} />
      </Screen>
    );
  }
  if (!prescription) {
    return (
      <Screen testID="screen-prescription-detail">
        <EmptyState testID="state-empty-prescription" icon="medkit-outline" title={t('patient.prescriptions.emptyActiveTitle')} />
      </Screen>
    );
  }

  const run = async (kind: 'pickup' | 'pharmacy' | 'doctor', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      haptics.error();
      setError(errorMessage(actionError, t('m.common.unexpected')));
    } finally {
      setBusy(null);
    }
  };

  const openThread = async (otherUserId: string) => {
    if (!user) return;
    const conversationId = await ensureDirectConversation(user.id, otherUserId, t('patient.messages.defaultSubject'));
    router.push({
      pathname: '/conversation/[id]',
      params: { id: conversationId },
    });
  };

  const isActive = prescription.status === 'active';
  const canSend = isActive && !prescription.pharmacyOrganizationId && prescription.pharmacyStatus !== 'picked_up';
  const canPickUp = isActive && prescription.pharmacyStatus === 'dispensed';

  return (
    <Screen testID="screen-prescription-detail" onRefresh={prescriptions.refetch} refreshing={prescriptions.refreshing} staleSince={prescriptions.staleSince}>
      <Stack.Screen options={{ title: formatDate(prescription.prescribed_at) }} />
      <Card tone="brand">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="title">{prescription.doctorName}</Text>
            {prescription.doctorSpecialty ? (
              <Text variant="caption" color="muted">
                {prescription.doctorSpecialty}
              </Text>
            ) : null}
          </View>
          <Pill label={t(`shared.prescriptionStatus.${prescription.status}`)} tone={prescriptionStatusTone(prescription.status)} />
        </View>
      </Card>

      {sent ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage
            tone="success"
            message={t('m.rx.sentToPharmacy', {
              name: prescription.pharmacyName ?? '',
            })}
          />
        </View>
      ) : null}
      {copy && isActive ? (
        <Card tone={copy.tone} style={{ marginTop: spacing.md }}>
          <Text variant="bodyStrong">{copy.title}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
            {copy.body}
          </Text>
          {prescription.pharmacyName ? (
            <Text variant="captionStrong" style={{ marginTop: spacing.sm }}>
              {t('patient.prescriptions.pharmacyAtName', {
                name: prescription.pharmacyName,
              })}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Section title={t('patient.prescriptions.medItems')}>
        <View style={{ gap: spacing.sm }}>
          {prescription.items.map((item) => {
            const days = estimateDaysOfSupplyRemaining(item.quantity, item.frequency);
            return (
              <Card testID={`prescription-item-${item.id}`} key={item.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {i18n.language.startsWith('ar') && item.medication_name_ar ? item.medication_name_ar : item.medication_name}
                  </Text>
                  <Pill
                    label={item.is_dispensed ? t('patient.prescriptions.dispensed') : t('patient.prescriptions.pendingItem')}
                    tone={item.is_dispensed ? 'success' : 'warning'}
                  />
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <KeyValue label={t('m.rx.dosage')} value={item.dosage} />
                  <KeyValue label={t('m.rx.frequency')} value={item.frequency} />
                  <KeyValue label={t('m.appointment.duration')} value={item.duration} />
                  {item.quantity != null ? <KeyValue label={t('m.rx.quantity')} value={String(item.quantity)} /> : null}
                  {days != null && isActive ? (
                    <KeyValue label={t('patient.prescriptions.refillStatusHeading')} value={t('m.rx.daysLeft', { count: days })} />
                  ) : null}
                </View>
                {item.instructions ? (
                  <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
                    {item.instructions}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </View>
      </Section>

      {error ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage tone="danger" message={error} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        {canSend ? (
          <Button
            testID="btn-send-to-pharmacy"
            label={t('patient.prescriptions.sendToPharmacy')}
            icon="storefront-outline"
            size="lg"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/pharmacy-picker/[id]',
                params: { id: prescription.id },
              })
            }
          />
        ) : null}
        {canPickUp ? (
          <Button
            testID="btn-mark-picked-up"
            label={t('m.rx.markPickedUp')}
            icon="bag-check-outline"
            size="lg"
            fullWidth
            loading={busy === 'pickup'}
            onPress={() =>
              void run('pickup', async () => {
                await markPatientPrescriptionPickedUp(
                  prescription.id,
                  prescription.items.map((item) => item.id)
                );
                haptics.success();
                await prescriptions.refetch();
              })
            }
          />
        ) : null}
        {prescription.pharmacyOrganizationId ? (
          <Button
            testID="btn-message-pharmacy"
            label={t('m.rx.messagePharmacy')}
            icon="chatbubble-outline"
            variant="secondary"
            fullWidth
            loading={busy === 'pharmacy'}
            onPress={() =>
              void run('pharmacy', async () => {
                const contact = await getPatientPrescriptionPharmacyContact(prescription.id);
                if (!contact?.user_id) throw new Error(t('m.rx.noPharmacyContact'));
                await openThread(contact.user_id);
              })
            }
          />
        ) : null}
        <Button
          testID="btn-message-prescriber"
          label={t('patient.messages.messagePrescriber')}
          icon="chatbubble-ellipses-outline"
          variant="secondary"
          fullWidth
          loading={busy === 'doctor'}
          onPress={() => void run('doctor', () => openThread(prescription.doctor_id))}
        />
        {prescription.appointment_id ? (
          <Button
            testID="btn-open-appointment"
            label={t('patient.labResults.openAppointment')}
            icon="calendar-outline"
            variant="ghost"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/appointment/[id]',
                params: { id: prescription.appointment_id ?? '' },
              })
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}
