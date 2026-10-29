import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useAuth } from './auth-provider';

// Biometric re-unlock: when enabled, the app locks after being in the
// background longer than LOCK_AFTER_MS and requires Face ID / fingerprint
// (or the device passcode) to show health data again.
const STORAGE_KEY = 'ceenaix.biometricLock';
const LOCK_AFTER_MS = 60_000;

interface AppLockContextValue {
  isLocked: boolean;
  isEnabled: boolean;
  isAvailable: boolean;
  biometryLabel: string;
  unlock: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { isPatient } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState('Biometrics');
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    // Biometric lock is native-only; on web the app never locks.
    if (Platform.OS === 'web') {
      hydrated.current = true;
      return;
    }
    void (async () => {
      const [hasHardware, enrolled, types, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      const available = hasHardware && enrolled;
      setIsAvailable(available);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometryLabel('Face ID');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometryLabel('Fingerprint');
      const enabled = available && stored === 'true';
      setIsEnabled(enabled);
      if (enabled && !hydrated.current) setIsLocked(true);
      hydrated.current = true;
    })();
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        if (isEnabled && Date.now() - backgroundedAt.current > LOCK_AFTER_MS) setIsLocked(true);
        backgroundedAt.current = null;
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [isEnabled]);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock CeenAiX',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    if (result.success) setIsLocked(false);
    return result.success;
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (!isAvailable) return false;
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable app lock',
        });
        if (!result.success) return false;
      }
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
      setIsEnabled(enabled);
      return true;
    },
    [isAvailable]
  );

  const value = useMemo<AppLockContextValue>(
    () => ({
      isLocked: isLocked && isEnabled && isPatient,
      isEnabled,
      isAvailable,
      biometryLabel,
      unlock,
      setEnabled,
    }),
    [biometryLabel, isAvailable, isEnabled, isLocked, isPatient, setEnabled, unlock]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within AppLockProvider');
  return context;
}
