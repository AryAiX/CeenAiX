import '@/lib/livekit-globals';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootScreen } from '@/components/boot-screen';
import { DialogHost } from '@/components/dialog-host';
import { LockScreen } from '@/components/lock-screen';
import { initI18n } from '@/i18n';
import { webPathToHref } from '@/lib/links';
import { getNotificationUrl } from '@/lib/push';
import { AppLockProvider, useAppLock } from '@/providers/app-lock-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeProvider, useTheme } from '@/theme/theme-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();

const useLastNotificationResponse = Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

function RootNavigator(): React.ReactElement | null {
  const { session, isLoading, isPatient, isRecovering, profile } = useAuth();
  const { isLocked } = useAppLock();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const lastResponse = useLastNotificationResponse();
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

  if (isLoading) return <BootScreen />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
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
      {Platform.OS === 'web' ? <DialogHost /> : null}
    </>
  );
}

// Keeps the phone-first layout readable in a desktop browser; native renders children as-is.
function WebFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 520,
          alignSelf: 'center',
          backgroundColor: colors.background,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout(): React.ReactElement | null {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return <BootScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppLockProvider>
              <WebFrame>
                <RootNavigator />
              </WebFrame>
            </AppLockProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
