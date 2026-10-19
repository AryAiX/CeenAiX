import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Card, ChoiceChips, DateField, InlineMessage, KeyValue, Screen, Section, Text, TextField } from '@/components/ui';
import {
  removeAvatar,
  saveEmiratesIdSide,
  saveInsuranceDetails,
  savePersonalInfo,
  uploadAvatar,
  uploadInsuranceCardImage,
  type InsuranceDetailsInput,
  type PersonalInfoInput,
} from '@/data/profile';
import { usePatientInsurance } from '@/data/web/hooks/use-patient-insurance';
import { usePatientRecords } from '@/data/web/hooks/use-patient-records';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { showActionSheet } from '@/lib/action-sheet';
import { PermissionDeniedError, pickAsset, type AssetSource } from '@/lib/pick-asset';
import type { LocalAsset } from '@/lib/uploads';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type Feedback = { tone: 'success' | 'danger'; message: string } | null;

export default function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, patientProfile, refreshProfile } = useAuth();
  const records = useOfflineCache(usePatientRecords(user?.id), user ? `records:${user.id}` : null);
  const insurance = useOfflineCache(usePatientInsurance(user?.id), user ? `insurance:${user.id}` : null);
  const plan = insurance.data?.primaryPlan ?? null;
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const personalDefaults = (): PersonalInfoInput => ({
    fullName: profile?.full_name ?? '',
    emiratesId: profile?.emirates_id ?? '',
    dateOfBirth: profile?.date_of_birth ?? '',
    bloodType: patientProfile?.blood_type ?? '',
    emergencyContactName: patientProfile?.emergency_contact_name ?? '',
    emergencyContactPhone: patientProfile?.emergency_contact_phone ?? '',
  });
  const insuranceDefaults = (): InsuranceDetailsInput => ({
    policyNumber: plan?.policyNumber ?? '',
    memberId: plan?.memberId ?? '',
    validFrom: plan?.validFrom ?? '',
    validUntil: plan?.validUntil ?? '',
    cardPhotoUrl: plan?.cardPhotoUrl ?? null,
  });
  const [personal, setPersonal] = useState<PersonalInfoInput>(personalDefaults);
  const [insuranceForm, setInsuranceForm] = useState<InsuranceDetailsInput>(insuranceDefaults);

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    setBusy(key);
    setFeedback(null);
    try {
      await action();
      haptics.success();
      if (success) setFeedback({ tone: 'success', message: success });
    } catch (error) {
      haptics.error();
      const message =
        error instanceof PermissionDeniedError
          ? error.source === 'camera'
            ? t('m.docs.permissionCamera')
            : t('m.docs.permissionLibrary')
          : error instanceof Error
            ? error.message
            : t('m.common.unexpected');
      setFeedback({ tone: 'danger', message });
    } finally {
      setBusy(null);
    }
  };

  const chooseSource = (title: string, onPick: (asset: LocalAsset) => Promise<void>, extra?: { label: string; onPress: () => void }) => {
    const pick = (source: AssetSource) =>
      void run(title, async () => {
        const asset = await pickAsset(source, { allowsEditing: source !== 'files' });
        if (asset) await onPick(asset);
      });
    showActionSheet(title, [
      { label: t('m.docs.camera'), onPress: () => pick('camera') },
      { label: t('m.docs.library'), onPress: () => pick('library') },
      ...(extra ? [{ ...extra, destructive: true }] : []),
    ]);
  };

  const changeAvatar = () => {
    if (!user) return;
    const avatarUrl = profile?.avatar_url;
    chooseSource(
      t('m.profile.changePhoto'),
      async (asset) => {
        await uploadAvatar(user.id, asset);
        await refreshProfile();
      },
      avatarUrl
        ? {
            label: t('m.profile.removePhoto'),
            onPress: () =>
              void run('avatar', async () => {
                await removeAvatar(user.id, avatarUrl);
                await refreshProfile();
              }),
          }
        : undefined
    );
  };

  const captureEmirates = (side: 'front' | 'back') => {
    if (!user) return;
    const title = side === 'front' ? t('m.profile.frontTitle') : t('m.profile.backTitle');
    chooseSource(title, async (asset) => {
      await saveEmiratesIdSide(user.id, side, asset, title);
      setFeedback({ tone: 'success', message: t('m.profile.emiratesSaved') });
    });
  };

  const conditions = records.data?.conditions.map((row) => row.condition_name).join(', ');
  const allergies = records.data?.allergies.map((row) => (row.reaction ? `${row.allergen} (${row.reaction})` : row.allergen)).join(', ');

  return (
    <Screen keyboard onRefresh={() => Promise.all([refreshProfile(), records.refetch(), insurance.refetch()]).then(() => undefined)}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('m.profile.changePhoto')} onPress={changeAvatar}>
          <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={96} />
        </Pressable>
        <Text variant="title" align="center">
          {profile?.full_name || t('patient.profile.addYourName')}
        </Text>
        {profile?.emirates_id ? (
          <Text variant="caption" color="muted">
            {t('patient.profile.idLine', { id: profile.emirates_id })}
          </Text>
        ) : null}
        <Button
          label={t('m.profile.changePhoto')}
          variant="ghost"
          size="sm"
          loading={busy === t('m.profile.changePhoto') || busy === 'avatar'}
          onPress={changeAvatar}
        />
      </View>

      {feedback ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage tone={feedback.tone} message={feedback.message} />
        </View>
      ) : null}

      <Section
        title={t('patient.profile.personalTitle')}
        action={
          editingPersonal
            ? undefined
            : {
                label: t('patient.profile.editProfile'),
                onPress: () => {
                  setPersonal(personalDefaults());
                  setEditingPersonal(true);
                },
              }
        }
      >
        <Card>
          {editingPersonal ? (
            <View style={{ gap: spacing.md }}>
              <TextField
                label={t('patient.profile.fullName')}
                value={personal.fullName}
                onChangeText={(fullName) => setPersonal((v) => ({ ...v, fullName }))}
                textContentType="name"
              />
              <TextField
                label={t('patient.profile.emiratesId')}
                value={personal.emiratesId}
                placeholder={t('patient.profile.phEmiratesId')}
                keyboardType="numbers-and-punctuation"
                onChangeText={(emiratesId) => setPersonal((v) => ({ ...v, emiratesId }))}
              />
              <DateField
                label={t('patient.profile.dob')}
                value={personal.dateOfBirth}
                maximumDate={new Date()}
                onChange={(dateOfBirth) => setPersonal((v) => ({ ...v, dateOfBirth }))}
              />
              <View style={{ gap: 6 }}>
                <Text variant="captionStrong" color="muted">
                  {t('patient.profile.bloodType')}
                </Text>
                <ChoiceChips
                  options={BLOOD_TYPES.map((value) => ({ value, label: value }))}
                  selected={personal.bloodType ? [personal.bloodType as (typeof BLOOD_TYPES)[number]] : []}
                  onToggle={(bloodType) => setPersonal((v) => ({ ...v, bloodType: v.bloodType === bloodType ? '' : bloodType }))}
                />
              </View>
              <TextField
                label={t('patient.profile.emergencyName')}
                value={personal.emergencyContactName}
                placeholder={t('patient.profile.phEmergencyName')}
                onChangeText={(emergencyContactName) => setPersonal((v) => ({ ...v, emergencyContactName }))}
              />
              <TextField
                label={t('patient.profile.emergencyPhone')}
                value={personal.emergencyContactPhone}
                placeholder={t('patient.profile.phEmergencyPhone')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                onChangeText={(emergencyContactPhone) => setPersonal((v) => ({ ...v, emergencyContactPhone }))}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button label={t('m.common.cancel')} variant="secondary" fullWidth onPress={() => setEditingPersonal(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('patient.profile.saveChanges')}
                    fullWidth
                    loading={busy === 'personal'}
                    disabled={!personal.fullName.trim()}
                    onPress={() =>
                      void run(
                        'personal',
                        async () => {
                          if (!user) return;
                          await savePersonalInfo(user.id, personal);
                          await refreshProfile();
                          setEditingPersonal(false);
                        },
                        t('m.profile.saved')
                      )
                    }
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              <KeyValue label={t('patient.profile.fullName')} value={profile?.full_name} />
              <KeyValue label={t('patient.profile.emiratesId')} value={profile?.emirates_id} />
              <KeyValue label={t('patient.profile.dob')} value={profile?.date_of_birth ? formatDate(profile.date_of_birth) : null} />
              <KeyValue label={t('patient.profile.bloodType')} value={patientProfile?.blood_type} />
              <KeyValue label={t('patient.profile.emergencyName')} value={patientProfile?.emergency_contact_name} />
              <KeyValue label={t('patient.profile.emergencyPhone')} value={patientProfile?.emergency_contact_phone} />
            </>
          )}
        </Card>
      </Section>

      <Section title={t('m.profile.healthSummary')} action={{ label: t('m.profile.manageRecords'), onPress: () => router.push('/records') }}>
        <Card>
          <KeyValue label={t('patient.profile.allergies')} value={allergies || t('m.profile.none')} />
          <KeyValue label={t('patient.profile.chronicConditions')} value={conditions || t('m.profile.none')} />
        </Card>
      </Section>

      <Section title={t('patient.profile.emiratesTitle')}>
        <Card>
          <Text variant="caption" color="muted" style={{ marginBottom: spacing.md }}>
            {t('m.profile.emiratesHint')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('m.profile.scanFront')}
                icon="id-card-outline"
                variant="secondary"
                size="sm"
                fullWidth
                loading={busy === t('m.profile.frontTitle')}
                onPress={() => captureEmirates('front')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('m.profile.scanBack')}
                icon="id-card-outline"
                variant="secondary"
                size="sm"
                fullWidth
                loading={busy === t('m.profile.backTitle')}
                onPress={() => captureEmirates('back')}
              />
            </View>
          </View>
        </Card>
      </Section>

      <Section
        title={t('patient.profile.insuranceTitle')}
        action={
          plan && !editingInsurance
            ? {
                label: t('patient.profile.editInsurance'),
                onPress: () => {
                  setInsuranceForm(insuranceDefaults());
                  setEditingInsurance(true);
                },
              }
            : undefined
        }
      >
        <Card>
          {!plan ? (
            <Text variant="caption" color="muted">
              {t('m.profile.noPlanLinked')}
            </Text>
          ) : editingInsurance ? (
            <View style={{ gap: spacing.md }}>
              <KeyValue label={t('patient.profile.insuranceProvider')} value={`${plan.providerCompany} · ${plan.planName}`} />
              <TextField
                label={t('patient.profile.policyNumber')}
                value={insuranceForm.policyNumber}
                onChangeText={(policyNumber) => setInsuranceForm((v) => ({ ...v, policyNumber }))}
              />
              <TextField
                label={t('patient.profile.memberId')}
                value={insuranceForm.memberId}
                onChangeText={(memberId) => setInsuranceForm((v) => ({ ...v, memberId }))}
              />
              <DateField
                label={t('m.profile.validFrom')}
                value={insuranceForm.validFrom}
                onChange={(validFrom) => setInsuranceForm((v) => ({ ...v, validFrom }))}
              />
              <DateField
                label={t('patient.profile.validUntil')}
                value={insuranceForm.validUntil}
                onChange={(validUntil) => setInsuranceForm((v) => ({ ...v, validUntil }))}
              />
              <Button
                label={insuranceForm.cardPhotoUrl ? t('m.profile.cardAttached') : t('m.profile.captureCard')}
                icon={insuranceForm.cardPhotoUrl ? 'checkmark-circle' : 'camera-outline'}
                variant="secondary"
                fullWidth
                loading={busy === t('patient.profile.insuranceCardLabel')}
                onPress={() =>
                  chooseSource(t('patient.profile.insuranceCardLabel'), async (asset) => {
                    if (!user) return;
                    const url = await uploadInsuranceCardImage(user.id, asset);
                    setInsuranceForm((v) => ({ ...v, cardPhotoUrl: url }));
                  })
                }
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button label={t('m.common.cancel')} variant="secondary" fullWidth onPress={() => setEditingInsurance(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('patient.profile.saveChanges')}
                    fullWidth
                    loading={busy === 'insurance'}
                    onPress={() =>
                      void run(
                        'insurance',
                        async () => {
                          await saveInsuranceDetails(plan.id, insuranceForm);
                          await insurance.refetch();
                          setEditingInsurance(false);
                        },
                        t('m.profile.insuranceSaved')
                      )
                    }
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              <KeyValue label={t('patient.profile.insuranceProvider')} value={plan.providerCompany} />
              <KeyValue label={t('patient.profile.coverageType')} value={plan.coverageType} />
              <KeyValue label={t('patient.profile.policyNumber')} value={plan.policyNumber} />
              <KeyValue label={t('patient.profile.memberId')} value={plan.memberId} />
              <KeyValue label={t('patient.profile.validUntil')} value={plan.validUntil ? formatDate(plan.validUntil) : null} />
            </>
          )}
        </Card>
      </Section>
    </Screen>
  );
}
