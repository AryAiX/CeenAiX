import { PATIENT_RECORD_FIELD_LIMITS } from '@ceenaix/shared/form-field-limits';
import type { AllergySeverity, ConditionStatus } from '@ceenaix/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { alertDialog } from '@/lib/dialog';
import {
  Button,
  DateField,
  ErrorState,
  InlineMessage,
  Screen,
  SegmentedControl,
  Skeleton,
  StickyFooter,
  Text,
  TextField,
  ToggleRow,
  SheetTitle,
} from '@/components/ui';
import {
  saveRecord,
  softDeleteRecord,
  type AllergyInput,
  type ConditionInput,
  type RecordCategory,
  type RecordInput,
  type VaccinationInput,
} from '@/data/records';
import { usePatientRecords, type PatientRecordsData } from '@/data/web/hooks/use-patient-records';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';
import { errorMessage } from '@/lib/errors';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const isCategory = (value: string | undefined): value is RecordCategory => value === 'condition' || value === 'allergy' || value === 'vaccination';

export default function RecordFormSheet(): React.ReactElement {
  const params = useLocalSearchParams<{ category?: string; id?: string }>();
  const { user } = useAuth();
  const records = useOfflineCache(usePatientRecords(user?.id), user ? `records:${user.id}` : null);
  if (params.id && !records.data) {
    return (
      <Screen testID="screen-record-form">
        {records.error ? (
          <ErrorState message={records.error} onRetry={() => void records.refetch()} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={104} />
          </View>
        )}
      </Screen>
    );
  }
  return (
    <RecordForm
      data={records.data}
      onSaved={() => void records.refetch()}
      category={isCategory(params.category) ? params.category : 'condition'}
      recordId={params.id}
    />
  );
}

function RecordForm({
  data,
  onSaved,
  category,
  recordId,
}: {
  data: PatientRecordsData | null;
  onSaved: () => void;
  category: RecordCategory;
  recordId: string | undefined;
}): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const params = { id: recordId };

  const existingCondition = category === 'condition' ? data?.conditions.find((row) => row.id === params.id) : undefined;
  const existingAllergy = category === 'allergy' ? data?.allergies.find((row) => row.id === params.id) : undefined;
  const existingVaccination = category === 'vaccination' ? data?.vaccinations.find((row) => row.id === params.id) : undefined;
  const editing = Boolean(params.id);

  const [condition, setCondition] = useState<ConditionInput>({
    conditionName: existingCondition?.condition_name ?? '',
    icdCode: existingCondition?.icd_code ?? '',
    diagnosedDate: existingCondition?.diagnosed_date ?? '',
    status: existingCondition?.status ?? 'active',
    notes: existingCondition?.notes ?? '',
  });
  const [allergy, setAllergy] = useState<AllergyInput>({
    allergen: existingAllergy?.allergen ?? '',
    severity: existingAllergy?.severity ?? 'mild',
    reaction: existingAllergy?.reaction ?? '',
    confirmedByDoctor: existingAllergy?.confirmed_by_doctor ?? false,
  });
  const [vaccination, setVaccination] = useState<Omit<VaccinationInput, 'doseNumber'> & { doseNumber: string }>({
    vaccineName: existingVaccination?.vaccine_name ?? '',
    doseNumber: existingVaccination?.dose_number?.toString() ?? '',
    administeredDate: existingVaccination?.administered_date ?? '',
    administeredBy: existingVaccination?.administered_by ?? '',
    nextDoseDue: existingVaccination?.next_dose_due ?? '',
  });
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title =
    category === 'condition' ? t('patient.records.addCondition') : category === 'allergy' ? t('patient.records.addAllergy') : t('patient.records.addVax');
  const categoryLabel =
    category === 'condition'
      ? t('patient.records.categoryCondition')
      : category === 'allergy'
        ? t('patient.records.categoryAllergy')
        : t('patient.records.categoryVax');

  const buildInput = (): RecordInput | string => {
    const required = (field: string) => t('m.records.required', { field });
    if (category === 'condition') return condition.conditionName.trim() ? { category, values: condition } : required(t('patient.records.conditionName'));
    if (category === 'allergy') return allergy.allergen.trim() ? { category, values: allergy } : required(t('patient.records.allergen'));
    if (!vaccination.vaccineName.trim()) return required(t('patient.records.vaccineName'));
    const dose = vaccination.doseNumber.trim() ? Number(vaccination.doseNumber) : null;
    if (dose !== null && (!Number.isInteger(dose) || dose <= 0 || dose > PATIENT_RECORD_FIELD_LIMITS.doseNumberMax)) {
      return t('patient.records.errDoseNumber');
    }
    return { category, values: { ...vaccination, doseNumber: dose } };
  };

  const submit = async () => {
    if (!user) return;
    const input = buildInput();
    if (typeof input === 'string') {
      haptics.error();
      setError(input);
      return;
    }
    setBusy('save');
    setError(null);
    try {
      await saveRecord(user.id, input, params.id);
      haptics.success();
      onSaved();
      router.back();
    } catch (saveError) {
      haptics.error();
      setError(errorMessage(saveError, t('m.common.unexpected')));
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    if (!user || !params.id) return;
    const recordId = params.id;
    alertDialog(t('patient.records.remove'), t('m.records.confirmRemove', { category: categoryLabel }), [
      { text: t('patient.records.cancel'), style: 'cancel' },
      {
        text: t('patient.records.remove'),
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await softDeleteRecord(user.id, category, recordId);
            haptics.success();
            onSaved();
            router.back();
          } catch (deleteError) {
            haptics.error();
            setError(errorMessage(deleteError, t('m.common.unexpected')));
            setBusy(null);
          }
        },
      },
    ]);
  };

  const saveLabel =
    category === 'condition' ? t('patient.records.saveCondition') : category === 'allergy' ? t('patient.records.saveAllergy') : t('patient.records.saveVax');

  return (
    <Screen
      testID="screen-record-form"
      keyboard
      footer={
        <StickyFooter>
          <Button
            testID="btn-save-record"
            label={busy === 'save' ? t('patient.records.saving') : saveLabel}
            size="lg"
            fullWidth
            loading={busy === 'save'}
            disabled={busy !== null}
            onPress={() => void submit()}
          />
          {editing ? (
            <Button
              testID="btn-remove-record"
              label={busy === 'delete' ? t('patient.records.removing') : t('patient.records.remove')}
              variant="ghost"
              fullWidth
              disabled={busy !== null}
              onPress={confirmDelete}
            />
          ) : null}
        </StickyFooter>
      }
    >
      <Stack.Screen options={{ title: editing ? categoryLabel : title }} />
      <View style={{ gap: spacing.lg }}>
        <SheetTitle title={editing ? categoryLabel : title} />
        {!editing ? (
          <Text variant="caption" color="muted">
            {category === 'condition'
              ? t('patient.records.addConditionSub')
              : category === 'allergy'
                ? t('patient.records.addAllergySub')
                : t('patient.records.addVaxSub')}
          </Text>
        ) : null}

        {category === 'condition' ? (
          <>
            <TextField
              testID="input-condition-name"
              label={`${t('patient.records.conditionName')} *`}
              value={condition.conditionName}
              maxLength={PATIENT_RECORD_FIELD_LIMITS.conditionName}
              onChangeText={(conditionName) => setCondition((current) => ({ ...current, conditionName }))}
              autoFocus={!editing}
            />
            <TextField
              testID="input-condition-icd"
              label={t('patient.records.icdCode')}
              value={condition.icdCode}
              maxLength={PATIENT_RECORD_FIELD_LIMITS.icdCode}
              autoCapitalize="characters"
              onChangeText={(icdCode) => setCondition((current) => ({ ...current, icdCode }))}
            />
            <DateField
              testID="input-condition-date"
              label={t('patient.records.diagnosedDate')}
              value={condition.diagnosedDate}
              maximumDate={new Date()}
              onChange={(diagnosedDate) => setCondition((current) => ({ ...current, diagnosedDate }))}
            />
            <View style={{ gap: 6 }}>
              <Text variant="captionStrong" color="muted">
                {t('patient.records.status')}
              </Text>
              <SegmentedControl<ConditionStatus>
                testID="segment-condition-status"
                value={condition.status}
                onChange={(status) => setCondition((current) => ({ ...current, status }))}
                options={[
                  { value: 'active', label: t('patient.records.statusActive') },
                  {
                    value: 'chronic',
                    label: t('patient.records.statusChronic'),
                  },
                  {
                    value: 'resolved',
                    label: t('patient.records.statusResolved'),
                  },
                ]}
              />
            </View>
            <TextField
              testID="input-condition-notes"
              label={t('patient.records.notes')}
              value={condition.notes}
              multiline
              maxLength={PATIENT_RECORD_FIELD_LIMITS.notes}
              onChangeText={(notes) => setCondition((current) => ({ ...current, notes }))}
            />
          </>
        ) : category === 'allergy' ? (
          <>
            <TextField
              testID="input-allergen"
              label={`${t('patient.records.allergen')} *`}
              value={allergy.allergen}
              maxLength={PATIENT_RECORD_FIELD_LIMITS.allergen}
              onChangeText={(allergen) => setAllergy((current) => ({ ...current, allergen }))}
              autoFocus={!editing}
            />
            <View style={{ gap: 6 }}>
              <Text variant="captionStrong" color="muted">
                {t('patient.records.severity')}
              </Text>
              <SegmentedControl<AllergySeverity>
                testID="segment-allergy-severity"
                value={allergy.severity}
                onChange={(severity) => setAllergy((current) => ({ ...current, severity }))}
                options={[
                  { value: 'mild', label: t('patient.records.severityMild') },
                  {
                    value: 'moderate',
                    label: t('patient.records.severityModerate'),
                  },
                  {
                    value: 'severe',
                    label: t('patient.records.severitySevere'),
                  },
                ]}
              />
            </View>
            <TextField
              testID="input-allergy-reaction"
              label={t('patient.records.reaction')}
              value={allergy.reaction}
              multiline
              maxLength={PATIENT_RECORD_FIELD_LIMITS.reaction}
              onChangeText={(reaction) => setAllergy((current) => ({ ...current, reaction }))}
            />
            <ToggleRow
              testID="toggle-allergy-confirmed"
              label={t('patient.records.confirmAllergyDoctor')}
              value={allergy.confirmedByDoctor}
              onChange={(confirmedByDoctor) => setAllergy((current) => ({ ...current, confirmedByDoctor }))}
            />
          </>
        ) : (
          <>
            <TextField
              testID="input-vaccine-name"
              label={`${t('patient.records.vaccineName')} *`}
              value={vaccination.vaccineName}
              maxLength={PATIENT_RECORD_FIELD_LIMITS.vaccineName}
              onChangeText={(vaccineName) => setVaccination((current) => ({ ...current, vaccineName }))}
              autoFocus={!editing}
            />
            <TextField
              testID="input-vaccine-dose"
              label={t('patient.records.doseNumber')}
              value={vaccination.doseNumber}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={(doseNumber) =>
                setVaccination((current) => ({
                  ...current,
                  doseNumber: doseNumber.replace(/[^0-9]/g, ''),
                }))
              }
            />
            <DateField
              testID="input-vaccine-date"
              label={t('patient.records.administeredDate')}
              value={vaccination.administeredDate}
              maximumDate={new Date()}
              onChange={(administeredDate) => setVaccination((current) => ({ ...current, administeredDate }))}
            />
            <TextField
              testID="input-vaccine-administered-by"
              label={t('patient.records.administeredBy')}
              value={vaccination.administeredBy}
              maxLength={PATIENT_RECORD_FIELD_LIMITS.administeredBy}
              onChangeText={(administeredBy) => setVaccination((current) => ({ ...current, administeredBy }))}
            />
            <DateField
              testID="input-vaccine-next-dose"
              label={t('patient.records.nextDose')}
              value={vaccination.nextDoseDue}
              onChange={(nextDoseDue) => setVaccination((current) => ({ ...current, nextDoseDue }))}
            />
          </>
        )}
        {error ? <InlineMessage tone="danger" message={error} /> : null}
      </View>
    </Screen>
  );
}
