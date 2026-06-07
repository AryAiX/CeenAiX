import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { LoadingScreen } from './src/components/ui';
import { AuthProvider } from './src/context/auth-context';
import i18n, { initI18n } from './src/i18n';
import { registerForPushNotificationsAsync } from './src/lib/push';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App(): React.ReactElement {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      await initI18n();
      if (active) {
        setReady(true);
      }
      // Fire-and-forget push registration stub (no-op without permissions).
      void registerForPushNotificationsAsync();
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
