import '@/lib/livekit-globals';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockScreen } from '@/components/lock-screen';
import { initI18n } from '@/i18n';
import { webPathToHref } from '@/lib/links';
import { getNotificationUrl } from '@/lib/push';
import { AppLockProvider, useAppLock } from '@/providers/app-lock-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeProvider, useTheme } from '@/theme/theme-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();

function RootNavigator(): React.ReactElement | null {
  const { session, isLoading, isPatient, isRecovering, profile } = useAuth();
  const { isLocked } = useAppLock();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  const signedIn = Boolean(session);
  const needsOnboarding = isPatient && profile !== null && !profile.profile_completed;
  const inApp = isPatient && !needsOnboarding && !isRecovering;

  useEffect(() => {
    if (!inApp || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    const href = webPathToHref(getNotificationUrl(lastResponse));
    if (href) router.push(href);
  }, [inApp, lastResponse, router]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !isPatient && !isRecovering}>
          <Stack.Screen name="patient-only" />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding && !isRecovering}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
      </Stack>
      {isLocked ? <LockScreen /> : null}
    </>
  );
}

export default function RootLayout(): React.ReactElement | null {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppLockProvider>
              <RootNavigator />
            </AppLockProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
