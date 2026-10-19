import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Divider, InlineMessage, KeyValue, ListRow, Screen, Section, SegmentedControl, Text, ToggleRow } from '@/components/ui';
import { normalizePreferences, savePreferences, type PatientPreferences } from '@/data/preferences';
import { changeLanguage, reloadApp, type AppLanguage } from '@/i18n';
import { getAiContextConsent, setAiContextConsent } from '@/lib/ai';
import { haptics } from '@/lib/haptics';
import { ensureNotificationPermission } from '@/lib/push';
import { useAppLock } from '@/providers/app-lock-provider';
import { useAuth } from '@/providers/auth-provider';
import { useTheme, type ThemePreference } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Feedback = { tone: 'success' | 'danger' | 'warning'; message: string } | null;

export default function SettingsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, refreshProfile, requestPasswordReset, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const lock = useAppLock();
  const [prefs, setPrefs] = useState<PatientPreferences>(() => normalizePreferences(profile?.notification_preferences));
  const [aiConsent, setAiConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setPrefs(normalizePreferences(profile?.notification_preferences));
  }, [profile?.notification_preferences]);

  useEffect(() => {
    if (!user) return;
    void getAiContextConsent(user.id).then((value) => setAiConsent(value === 'granted'));
  }, [user]);

  const update = async <K extends keyof PatientPreferences>(key: K, value: PatientPreferences[K]) => {
    if (!user) return;
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setFeedback(null);
    try {
      await savePreferences(user.id, next);
      await refreshProfile();
    } catch (error) {
      setPrefs(previous);
      haptics.error();
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : t('m.common.unexpected') });
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async (enabled: boolean) => {
    if (enabled && !(await ensureNotificationPermission())) {
      setFeedback({ tone: 'warning', message: t('m.settings.pushDenied') });
      return;
    }
    await update('push', enabled);
  };

  const switchLanguage = async (lng: AppLanguage) => {
    if (lng === (i18n.language.startsWith('ar') ? 'ar' : 'en')) return;
    haptics.tap();
    const needsReload = await changeLanguage(lng);
    await update('language', lng);
    if (needsReload) {
      Alert.alert(t('m.settings.reloadTitle'), t('m.settings.reloadBody'), [
        { text: t('m.settings.later'), style: 'cancel' },
        { text: t('m.settings.restart'), onPress: () => void reloadApp() },
      ]);
    }
  };

  const toggleLock = async (enabled: boolean) => {
    const ok = await lock.setEnabled(enabled);
    if (ok) haptics.success();
  };

  const toggleAiConsent = async (enabled: boolean) => {
    if (!user) return;
    setAiConsent(enabled);
    await setAiContextConsent(user.id, enabled ? 'granted' : 'declined');
  };

  const resetPassword = async () => {
    const email = profile?.email ?? user?.email;
    if (!email) {
      setFeedback({ tone: 'warning', message: t('m.settings.noEmail') });
      return;
    }
    const result = await requestPasswordReset(email);
    setFeedback(result.error ? { tone: 'danger', message: result.error.message } : { tone: 'success', message: t('m.settings.resetSent', { email }) });
  };

  const confirmSignOut = () =>
    Alert.alert(t('m.settings.signOut'), t('m.settings.confirmSignOut'), [
      { text: t('m.common.cancel'), style: 'cancel' },
      { text: t('m.settings.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      {feedback ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineMessage tone={feedback.tone} message={feedback.message} />
        </View>
      ) : null}

      <Section
        title={t('patient.settings.accountSummary')}
        style={{ marginTop: 0 }}
        action={{ label: t('patient.settings.actionManageProfile'), onPress: () => router.push('/profile') }}
      >
        <Card>
          <KeyValue label={t('patient.settings.fullName')} value={profile?.full_name} />
          <KeyValue label={t('patient.settings.email')} value={profile?.email ?? user?.email} />
          <KeyValue label={t('patient.settings.phone')} value={profile?.phone ?? user?.phone} />
          <KeyValue label={t('patient.settings.city')} value={profile?.city} />
        </Card>
      </Section>

      <Section title={t('patient.settings.language')}>
        <SegmentedControl<AppLanguage>
          value={i18n.language.startsWith('ar') ? 'ar' : 'en'}
          onChange={(lng) => void switchLanguage(lng)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ar', label: 'العربية' },
          ]}
        />
      </Section>

      <Section title={t('m.settings.appearance')}>
        <SegmentedControl<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: t('m.settings.themeSystem') },
            { value: 'light', label: t('m.settings.themeLight') },
            { value: 'dark', label: t('m.settings.themeDark') },
          ]}
        />
      </Section>

      <Section title={t('patient.settings.sectionNotifications')}>
        <Card>
          <ToggleRow
            label={t('patient.settings.pushNotifications')}
            description={t('patient.settings.pushNotificationsBody')}
            value={prefs.push}
            disabled={saving}
            onChange={(value) => void togglePush(value)}
          />
          <Divider />
          <ToggleRow
            label={t('patient.settings.emailNotifications')}
            description={t('patient.settings.emailNotificationsBody')}
            value={prefs.email}
            disabled={saving}
            onChange={(value) => void update('email', value)}
          />
          <Divider />
          <ToggleRow
            label={t('patient.settings.smsNotifications')}
            description={t('patient.settings.smsNotificationsBody')}
            value={prefs.sms}
            disabled={saving}
            onChange={(value) => void update('sms', value)}
          />
        </Card>
      </Section>

      <Section title={t('patient.settings.sectionPrivacy')}>
        <Card>
          <ToggleRow
            label={t('m.settings.aiConsent')}
            description={t('m.settings.aiConsentBody')}
            value={aiConsent}
            onChange={(value) => void toggleAiConsent(value)}
          />
          <Divider />
          <ToggleRow
            label={t('patient.settings.shareDoctors')}
            description={t('patient.settings.shareDoctorsBody')}
            value={prefs.shareWithDoctors}
            disabled={saving}
            onChange={(value) => void update('shareWithDoctors', value)}
          />
          <Divider />
          <ToggleRow
            label={t('patient.settings.sharePharmacy')}
            description={t('patient.settings.sharePharmacyBody')}
            value={prefs.shareWithPharmacy}
            disabled={saving}
            onChange={(value) => void update('shareWithPharmacy', value)}
          />
          <Divider />
          <ToggleRow
            label={t('patient.settings.shareInsurance')}
            description={t('patient.settings.shareInsuranceBody')}
            value={prefs.shareWithInsurance}
            disabled={saving}
            onChange={(value) => void update('shareWithInsurance', value)}
          />
        </Card>
      </Section>

      <Section title={t('patient.settings.sectionSecurity')}>
        <Card>
          {lock.isAvailable ? (
            <ToggleRow
              label={t('m.settings.biometric', { method: lock.biometryLabel })}
              description={t('m.settings.biometricBody', { method: lock.biometryLabel })}
              value={lock.isEnabled}
              onChange={(value) => void toggleLock(value)}
            />
          ) : (
            <Text variant="caption" color="muted" style={{ paddingVertical: spacing.md }}>
              {t('m.settings.biometricUnavailable')}
            </Text>
          )}
          <Divider />
          <ListRow title={t('m.settings.resetPassword')} icon="key-outline" iconTone="neutral" onPress={() => void resetPassword()} />
        </Card>
      </Section>

      <Section title={t('patient.settings.sectionSupport')}>
        <Card>
          <ListRow title={t('m.settings.messageCareTeam')} icon="chatbubbles-outline" onPress={() => router.navigate('/messages')} />
          <Divider />
          <ListRow
            title={t('m.settings.contactSupport')}
            icon="mail-outline"
            iconTone="info"
            onPress={() => void Linking.openURL('mailto:support@ceenaix.com')}
          />
        </Card>
      </Section>

      <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
        <Button label={t('m.settings.signOut')} icon="log-out-outline" variant="danger" fullWidth onPress={confirmSignOut} />
        <Text variant="micro" color="subtle" align="center">
          {t('m.settings.version', { version: `${Application.nativeApplicationVersion ?? '1.0.0'} (${Application.nativeBuildVersion ?? 'dev'})` })}
        </Text>
      </View>
    </Screen>
  );
}
