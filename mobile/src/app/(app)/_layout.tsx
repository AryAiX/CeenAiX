import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BadgeProvider } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

// Deep links into a pushed screen still get the tabs underneath, so back always has somewhere to go.
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    headerShown: false,
    contentStyle: { backgroundColor: colors.surface },
  } as const;

  return (
    <BadgeProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: t('m.common.back'),
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="appointment/[id]" options={{ title: '' }} />
        <Stack.Screen name="book" options={{ title: t('patient.appointments.book'), presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="cancel/[id]" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
        <Stack.Screen name="pre-visit/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="visit/[id]" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="conversation/[id]" options={{ title: '' }} />
        <Stack.Screen name="records" options={{ title: t('nav.records') }} />
        <Stack.Screen name="record-form" options={{ ...sheet, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="lab-results/index" options={{ title: t('nav.labResults') }} />
        <Stack.Screen name="lab-results/[id]" options={{ title: '' }} />
        <Stack.Screen name="prescriptions/index" options={{ title: t('nav.prescriptions') }} />
        <Stack.Screen name="prescriptions/[id]" options={{ title: '' }} />
        <Stack.Screen name="pharmacy-picker/[id]" options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }} />
        <Stack.Screen name="imaging/index" options={{ title: t('nav.imagingScans') }} />
        <Stack.Screen name="imaging/[id]" options={{ title: '' }} />
        <Stack.Screen name="documents" options={{ title: t('nav.documents') }} />
        <Stack.Screen name="document-upload" options={{ ...sheet, sheetAllowedDetents: [0.85, 1] }} />
        <Stack.Screen name="insurance" options={{ title: t('nav.insurance') }} />
        <Stack.Screen name="notifications" options={{ title: t('nav.notifications') }} />
        <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
        <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
        <Stack.Screen name="assistant-history" options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }} />
      </Stack>
    </BadgeProvider>
  );
}
