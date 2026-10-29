import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, ErrorState, Screen } from '@/components/ui';
import { WEB_PORTAL_URL } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

// Signed in with a non-patient role (doctor, pharmacy, admin…). The native app
// only serves the patient portal, mirroring the web `/access-denied` guard.
export default function PatientOnlyScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { signOut, profileError, refreshProfile } = useAuth();
  return (
    <Screen testID="screen-patient-only" edgeTop contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('nav.patientPortal')} subtitle={profileError ? undefined : t('m.auth.patientOnly')} />
      <View style={{ gap: spacing.md }}>
        {profileError ? <ErrorState testID="state-profile-error" message={t('m.auth.profileLoadError')} onRetry={() => void refreshProfile()} /> : null}
        {profileError ? null : (
          <Button
            testID="btn-open-web-portal"
            label={t('m.common.comingFromWeb')}
            icon="open-outline"
            fullWidth
            onPress={() => void WebBrowser.openBrowserAsync(WEB_PORTAL_URL)}
          />
        )}
        <Button testID="btn-sign-out" label={t('m.auth.signOut')} variant="secondary" fullWidth onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
