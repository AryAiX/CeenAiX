import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Icon, InlineMessage, Skeleton, Text, TextField } from '@/components/ui';
import { cancelPatientAppointment } from '@/data/appointments';
import { usePatientAppointmentDetail } from '@/data/web/hooks/use-patient-appointment-detail';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatShortDay, formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const REASONS = ['schedule', 'better', 'another', 'personal', 'other'] as const;
type Reason = (typeof REASONS)[number];

// Native sheet replacing the web cancel modal (same reason list; the reason
// is a UX confirmation step only — `cancel_patient_appointment` takes the id).
export default function CancelAppointmentSheet(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { refresh } = useBadges();
  const detail = useOfflineCache(usePatientAppointmentDetail(user?.id, id), user && id ? `appointment:${user.id}:${id}` : null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appointment = detail.data?.appointment;
  const canSubmit = reason !== null && (reason !== 'other' || other.trim().length > 0) && Boolean(appointment);

  const submit = async () => {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      await cancelPatientAppointment(appointment, detail.data?.doctorProfile?.fullName ?? null);
      haptics.success();
      void refresh();
      router.dismissTo({ pathname: '/appointments', params: { banner: 'cancelled' } });
    } catch (cancelError) {
      haptics.error();
      setError(cancelError instanceof Error ? cancelError.message : t('m.common.unexpected'));
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Text variant="title">{t('m.appointment.cancelTitle')}</Text>
      {appointment ? (
        <Text variant="body" color="muted">
          {detail.data?.doctorProfile?.fullName ?? t('shared.doctor')} · {formatShortDay(appointment.scheduled_at)} · {formatTime(appointment.scheduled_at)}
        </Text>
      ) : (
        <Skeleton height={18} width="70%" />
      )}
      <Text variant="caption" color="muted">
        {t('m.appointment.cancelBody')}
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {REASONS.map((value) => {
          const selected = reason === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.tap();
                setReason(value);
              }}
              style={[
                styles.option,
                { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface },
              ]}
            >
              <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} color={selected ? colors.primary : colors.textSubtle} />
              <Text variant="bodyStrong">{t(`m.appointment.reasons.${value}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {reason === 'other' ? <TextField label={t('m.appointment.cancelReasonOther')} value={other} onChangeText={setOther} multiline /> : null}
      {error ? <InlineMessage tone="danger" message={error} /> : null}
      <Button label={t('m.appointment.confirmCancel')} variant="danger" size="lg" fullWidth loading={busy} disabled={!canSubmit} onPress={() => void submit()} />
      <Button label={t('m.appointment.keep')} variant="ghost" fullWidth onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
});
