import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, Screen } from '@/components/ui';
import { WEB_PORTAL_URL } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

// Signed in with a non-patient role (doctor, pharmacy, admin…). The native app
// only serves the patient portal, mirroring the web `/access-denied` guard.
export default function PatientOnlyScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <Screen edgeTop contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('nav.patientPortal')} subtitle={t('m.auth.patientOnly')} />
      <View style={{ gap: spacing.md }}>
        <Button label={t('m.common.comingFromWeb')} icon="open-outline" fullWidth onPress={() => void WebBrowser.openBrowserAsync(WEB_PORTAL_URL)} />
        <Button label={t('m.auth.signOut')} variant="secondary" fullWidth onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
