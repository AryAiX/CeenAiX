import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, InlineMessage, Screen, TextField, ToggleRow } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
  };
};

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

// Patient branch of the web `/auth/onboarding` page: same `user_profiles` /
// `patient_profiles` upserts, completing `profile_completed`.
export default function OnboardingScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { user, profile, patientProfile, refreshProfile, signOut } = useAuth();
  const isPhoneManagedByOtp = Boolean(user?.phone && !user?.email);
  const metadataName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? metadataName ?? '',
    email: profile?.email ?? user?.email ?? '',
    phone: profile?.phone ?? user?.phone ?? '',
    city: profile?.city ?? '',
    address: profile?.address ?? '',
    emergencyContactName: patientProfile?.emergency_contact_name ?? '',
    emergencyContactPhone: patientProfile?.emergency_contact_phone ?? '',
    termsAccepted: profile?.terms_accepted ?? Boolean(user?.user_metadata?.terms_accepted),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setError(null);
    if (!user) return setError(t('auth.onboarding.errors.mustSignIn'));
    if (!form.fullName.trim()) return setError(t('auth.onboarding.errors.fullNameRequired'));
    if (!user.email && !form.email.trim()) return setError(t('auth.onboarding.errors.emailRequiredOtp'));
    if (!form.termsAccepted) return setError(t('auth.onboarding.errors.termsRequired'));
    setBusy(true);
    const parsed = splitFullName(form.fullName);
    const { error: profileError } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        role: 'patient',
        full_name: form.fullName.trim(),
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        phone: isPhoneManagedByOtp ? (user.phone ?? profile?.phone ?? null) : form.phone.trim() || null,
        email: user.email ?? (form.email.trim() || null),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        avatar_url: profile?.avatar_url ?? null,
        date_of_birth: profile?.date_of_birth ?? null,
        gender: profile?.gender ?? null,
        emirates_id: profile?.emirates_id ?? null,
        notification_preferences: profile?.notification_preferences ?? {},
        profile_completed: true,
        terms_accepted: form.termsAccepted,
      },
      { onConflict: 'user_id' }
    );
    if (profileError) {
      setBusy(false);
      haptics.error();
      return setError(profileError.message);
    }
    const { error: patientError } = await supabase.from('patient_profiles').upsert(
      {
        user_id: user.id,
        emergency_contact_name: form.emergencyContactName.trim() || null,
        emergency_contact_phone: form.emergencyContactPhone.trim() || null,
        blood_type: patientProfile?.blood_type ?? null,
      },
      { onConflict: 'user_id' }
    );
    if (patientError) {
      setBusy(false);
      haptics.error();
      return setError(patientError.message);
    }
    haptics.success();
    await refreshProfile();
    setBusy(false);
  };

  return (
    <Screen
      testID="screen-onboarding"
      edgeTop
      keyboard
      footer={
        <>
          <Button
            testID="btn-onboarding-save"
            label={busy ? t('auth.onboarding.buttons.saving') : t('auth.onboarding.buttons.save')}
            size="lg"
            fullWidth
            loading={busy}
            onPress={() => void submit()}
          />
          <Button
            testID="btn-onboarding-switch-account"
            label={t('auth.onboarding.buttons.useAnotherAccount')}
            variant="ghost"
            fullWidth
            onPress={() => void signOut()}
          />
        </>
      }
    >
      <BrandHeader title={t('auth.onboarding.title')} subtitle={t('auth.onboarding.description')} />
      <View style={{ gap: spacing.lg }}>
        <TextField
          testID="input-onboarding-name"
          label={t('auth.onboarding.fields.fullName')}
          placeholder={t('auth.onboarding.fields.fullNamePlaceholder')}
          value={form.fullName}
          onChangeText={(value) => update('fullName', value)}
          autoComplete="name"
        />
        <TextField
          testID="input-onboarding-email"
          label={`${t('auth.onboarding.fields.email')}${user?.email ? '' : t('auth.onboarding.fields.emailRequired')}`}
          placeholder={t('auth.onboarding.fields.emailPlaceholder')}
          value={form.email}
          onChangeText={(value) => update('email', value)}
          editable={!user?.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          testID="input-onboarding-phone"
          label={t('auth.onboarding.fields.phone')}
          value={form.phone}
          onChangeText={(value) => update('phone', value)}
          editable={!isPhoneManagedByOtp}
          keyboardType="phone-pad"
        />
        <TextField
          testID="input-onboarding-city"
          label={t('auth.onboarding.fields.city')}
          placeholder={t('auth.onboarding.fields.cityPlaceholder')}
          value={form.city}
          onChangeText={(value) => update('city', value)}
        />
        <TextField
          testID="input-onboarding-address"
          label={t('auth.onboarding.fields.address')}
          placeholder={t('auth.onboarding.fields.addressPlaceholder')}
          value={form.address}
          onChangeText={(value) => update('address', value)}
        />
        <TextField
          testID="input-onboarding-emergency-name"
          label={t('auth.onboarding.fields.emergencyName')}
          placeholder={t('auth.onboarding.fields.emergencyNamePlaceholder')}
          value={form.emergencyContactName}
          onChangeText={(value) => update('emergencyContactName', value)}
        />
        <TextField
          testID="input-onboarding-emergency-phone"
          label={t('auth.onboarding.fields.emergencyPhone')}
          placeholder={t('auth.onboarding.fields.emergencyPhonePlaceholder')}
          value={form.emergencyContactPhone}
          onChangeText={(value) => update('emergencyContactPhone', value)}
          keyboardType="phone-pad"
        />
        <ToggleRow
          testID="toggle-onboarding-terms"
          label={t('auth.onboarding.fields.termsConfirm')}
          value={form.termsAccepted}
          onChange={(value) => update('termsAccepted', value)}
        />
        {error ? <InlineMessage tone="danger" message={error} /> : null}
      </View>
    </Screen>
  );
}
