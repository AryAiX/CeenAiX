import AsyncStorage from '@react-native-async-storage/async-storage';
import arCommon from '@ceenaix/locales/ar/common.json';
import arExtra from '@ceenaix/locales/ar/extra.json';
import arInsurancePage from '@ceenaix/locales/ar/insurancePage.json';
import enCommon from '@ceenaix/locales/en/common.json';
import enExtra from '@ceenaix/locales/en/extra.json';
import enInsurancePage from '@ceenaix/locales/en/insurancePage.json';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n from 'i18next';
import { I18nManager, Platform } from 'react-native';
import { isAppRtl } from '@/lib/rtl';
import { initReactI18next } from 'react-i18next';
import { mobileAr } from './strings/ar';
import { mobileEn } from './strings/en';

// Web portal resources are reused verbatim (same merge as `src/i18n/index.ts`).
// Native-only copy lives under the `m.*` key to avoid colliding with web keys.
export const LOCALE_STORAGE_KEY = 'ceenaix.lang';

export type AppLanguage = 'en' | 'ar';

const deviceLanguage = (): AppLanguage => ((getLocales()[0]?.languageCode ?? 'en').startsWith('ar') ? 'ar' : 'en');

export const isRtlLanguage = (lng: string): boolean => lng.startsWith('ar');

export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const lng: AppLanguage = stored === 'ar' || stored === 'en' ? stored : deviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: {
        common: { ...enCommon, ...enExtra, ...enInsurancePage, m: mobileEn },
      },
      ar: {
        common: { ...arCommon, ...arExtra, ...arInsurancePage, m: mobileAr },
      },
    },
    lng,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== isRtlLanguage(lng)) {
    I18nManager.forceRTL(isRtlLanguage(lng));
  }
  setDocumentDirection(lng);
}

function setDocumentDirection(lng: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.dir = isRtlLanguage(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

/** Switches language; returns true when a reload is needed to flip layout direction. */
export async function changeLanguage(lng: AppLanguage): Promise<boolean> {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng).catch(() => undefined);
  const wantsRtl = isRtlLanguage(lng);
  const wasRtl = isAppRtl();
  setDocumentDirection(lng);
  if (Platform.OS === 'web') return wasRtl !== wantsRtl;
  if (I18nManager.isRTL === wantsRtl) return false;
  I18nManager.forceRTL(wantsRtl);
  return true;
}

export async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // In Expo Go / dev without expo-updates the patient restarts manually.
  }
}

export default i18n;
