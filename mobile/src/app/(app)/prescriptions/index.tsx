import { estimateDaysOfSupplyRemaining } from '@ceenaix/shared/medication-schedule';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  InlineMessage,
  Pill,
  ProgressBar,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
  TextField,
  ToggleRow,
} from '@/components/ui';
import { addReportedMedication, removeReportedMedication, useReportedMedications } from '@/data/reported-medications';
import { useMedicationLogs } from '@/data/web/hooks/use-medication-logs';
import { usePatientPrescriptions, type PatientPrescriptionRecord } from '@/data/web/hooks/use-patient-prescriptions';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { prescriptionStatusTone } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'active' | 'past' | 'reported';

export default function PrescriptionsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const prescriptions = useOfflineCache(usePatientPrescriptions(user?.id), user ? `prescriptions:${user.id}` : null);
  const logs = useMedicationLogs(user?.id);
  const [segment, setSegment] = useState<Segment>('active');
  const { refetch } = prescriptions;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const rows = useMemo(() => prescriptions.data ?? [], [prescriptions.data]);
  const active = useMemo(() => rows.filter((row) => row.status === 'active'), [rows]);
  const past = useMemo(() => rows.filter((row) => row.status !== 'active'), [rows]);
  const activeItems = useMemo(() => active.flatMap((row) => row.items), [active]);
  const takenCount = activeItems.filter((item) => logs.takenItemIds.has(item.id)).length;

  const markTaken = async (itemId: string) => {
    haptics.success();
    await logs.markTaken(itemId);
  };

  return (
    <Screen keyboard onRefresh={prescriptions.refetch} refreshing={prescriptions.refreshing} staleSince={prescriptions.staleSince}>
      {activeItems.length > 0 ? (
        <Card tone="success" style={{ marginBottom: spacing.lg }}>
          <Text variant="heading">{t('m.rx.todayTitle')}</Text>
          <Text variant="caption" color="muted" style={{ marginVertical: spacing.xs }}>
            {takenCount === activeItems.length ? t('m.rx.allTaken') : t('m.rx.todayProgress', { taken: takenCount, total: activeItems.length })}
          </Text>
          <ProgressBar value={activeItems.length ? takenCount / activeItems.length : 0} tone="success" />
        </Card>
      ) : null}
      {logs.error ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineMessage tone="danger" message={logs.error} />
        </View>
      ) : null}
      <SegmentedControl<Segment>
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'active', label: t('m.rx.active'), count: active.length },
          { value: 'past', label: t('m.rx.past'), count: past.length },
          { value: 'reported', label: t('m.rx.reported') },
        ]}
      />
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {segment === 'reported' ? (
          <ReportedMedications patientId={user?.id ?? null} />
        ) : prescriptions.loading ? (
          <SkeletonList count={3} height={140} />
        ) : !prescriptions.data && prescriptions.error ? (
          <ErrorState message={t('patient.prescriptions.loadError')} onRetry={() => void prescriptions.refetch()} />
        ) : (segment === 'active' ? active : past).length === 0 ? (
          <EmptyState
            icon="medkit-outline"
            title={segment === 'active' ? t('patient.prescriptions.emptyActiveTitle') : t('m.rx.pastEmptyTitle')}
            body={segment === 'active' ? t('patient.prescriptions.emptyActiveBody') : t('patient.prescriptions.historyEmpty')}
          />
        ) : (
          (segment === 'active' ? active : past).map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              takenIds={logs.takenItemIds}
              onMarkTaken={segment === 'active' ? markTaken : undefined}
              onPress={() => router.push({ pathname: '/prescriptions/[id]', params: { id: prescription.id } })}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function PrescriptionCard({
  prescription,
  takenIds,
  onMarkTaken,
  onPress,
}: {
  prescription: PatientPrescriptionRecord;
  takenIds: Set<string>;
  onMarkTaken?: (itemId: string) => Promise<void>;
  onPress: () => void;
}): React.ReactElement {
  const { t, i18n } = useTranslation();
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {prescription.doctorName} · {formatDate(prescription.prescribed_at)}
          </Text>
        </View>
        <Pill label={t(`shared.prescriptionStatus.${prescription.status}`)} tone={prescriptionStatusTone(prescription.status)} />
      </View>
      {prescription.items.map((item) => {
        const days = estimateDaysOfSupplyRemaining(item.quantity, item.frequency);
        const taken = takenIds.has(item.id);
        const name = i18n.language.startsWith('ar') && item.medication_name_ar ? item.medication_name_ar : item.medication_name;
        return (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
            <IconBadge name="medical-outline" tone={taken ? 'success' : 'brand'} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {name}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={2}>
                {[item.dosage, item.frequency].filter(Boolean).join(' · ') || t('patient.prescriptions.dosagePending')}
              </Text>
              {days != null && onMarkTaken ? (
                <Text variant="micro" color={days <= 7 ? 'warning' : 'subtle'}>
                  {t('m.rx.daysLeft', { count: days })}
                </Text>
              ) : null}
            </View>
            {onMarkTaken ? (
              taken ? (
                <Pill icon="checkmark" label={t('m.rx.taken')} tone="success" />
              ) : (
                <Button label={t('m.rx.markTaken')} size="sm" variant="secondary" onPress={() => void onMarkTaken(item.id)} />
              )
            ) : null}
          </View>
        );
      })}
      {prescription.pharmacyName ? (
        <Text variant="micro" color="subtle" style={{ marginTop: spacing.md }}>
          {t('patient.prescriptions.pharmacyAtName', { name: prescription.pharmacyName })}
        </Text>
      ) : null}
    </Card>
  );
}

function ReportedMedications({ patientId }: { patientId: string | null }): React.ReactElement {
  const { t } = useTranslation();
  const meds = useReportedMedications(patientId);
  const [form, setForm] = useState({ medicationName: '', dosage: '', frequency: '', isCurrent: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!patientId || !form.medicationName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addReportedMedication(patientId, form);
      haptics.success();
      setForm({ medicationName: '', dosage: '', frequency: '', isCurrent: true });
      await meds.refetch();
    } catch (saveError) {
      haptics.error();
      setError(saveError instanceof Error ? saveError.message : t('m.common.unexpected'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string, name: string) => {
    if (!patientId) return;
    Alert.alert(t('m.rx.remove'), t('m.rx.confirmRemove', { name }), [
      { text: t('m.messages.cancel'), style: 'cancel' },
      {
        text: t('m.rx.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeReportedMedication(patientId, id);
            await meds.refetch();
          } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : t('m.common.unexpected'));
          }
        },
      },
    ]);
  };

  return (
    <>
      <Card>
        <Text variant="heading">{t('m.rx.addReported')}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: spacing.md }}>
          {t('m.rx.reportedHint')}
        </Text>
        <View style={{ gap: spacing.md }}>
          <TextField label={t('m.rx.name')} value={form.medicationName} onChangeText={(medicationName) => setForm((current) => ({ ...current, medicationName }))} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('m.rx.dosage')} value={form.dosage} onChangeText={(dosage) => setForm((current) => ({ ...current, dosage }))} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('m.rx.frequency')} value={form.frequency} onChangeText={(frequency) => setForm((current) => ({ ...current, frequency }))} />
            </View>
          </View>
          <ToggleRow label={t('m.rx.current')} value={form.isCurrent} onChange={(isCurrent) => setForm((current) => ({ ...current, isCurrent }))} />
          {error ? <InlineMessage tone="danger" message={error} /> : null}
          <Button label={t('m.rx.save')} icon="add" fullWidth loading={saving} disabled={!form.medicationName.trim()} onPress={() => void save()} />
        </View>
      </Card>
      {meds.loading ? (
        <SkeletonList count={2} height={64} />
      ) : meds.error && !meds.data ? (
        <ErrorState message={meds.error} onRetry={() => void meds.refetch()} />
      ) : (meds.data?.length ?? 0) === 0 ? (
        <EmptyState icon="list-outline" title={t('m.rx.noReportedTitle')} body={t('m.rx.noReportedBody')} />
      ) : (
        meds.data?.map((med) => (
          <Card key={med.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{med.medication_name}</Text>
                <Text variant="caption" color="muted">
                  {[med.dosage, med.frequency].filter(Boolean).join(' · ') || '—'}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Pill
                    label={med.review_status === 'pending_review' ? t('m.rx.pendingReview') : t('m.rx.reviewed')}
                    tone={med.review_status === 'pending_review' ? 'warning' : 'success'}
                  />
                </View>
              </View>
              <Button label={t('m.rx.remove')} size="sm" variant="ghost" onPress={() => remove(med.id, med.medication_name)} />
            </View>
          </Card>
        ))
      )}
    </>
  );
}
