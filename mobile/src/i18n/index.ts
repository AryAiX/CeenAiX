import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { I18nManager } from 'react-native';
import { initReactI18next } from 'react-i18next';
// Reuse the web app's translation resources directly (no copy) via the
// shared path alias configured in tsconfig + metro.
import enCommon from '@ceenaix/locales/en/common.json';
import arCommon from '@ceenaix/locales/ar/common.json';

export const LOCALE_STORAGE_KEY = 'ceenaix.lang';

// Mobile-only strings (bottom-tab labels, native auth copy) layered on top of
// the shared web `common` namespace.
const mobileEn = {
  mobile: {
    tabs: { home: 'Home', appointments: 'Appointments', records: 'Records', notifications: 'Alerts', profile: 'Profile' },
    auth: {
      loginTitle: 'Welcome back',
      loginSubtitle: 'Sign in to your CeenAiX account',
      signupTitle: 'Create your account',
      signupSubtitle: 'Join CeenAiX as a patient',
      email: 'Email',
      password: 'Password',
      fullName: 'Full name',
      signIn: 'Sign in',
      signUp: 'Create account',
      toSignup: "Don't have an account? Sign up",
      toLogin: 'Already have an account? Sign in',
      terms: 'I agree to the Terms & Privacy Policy',
      signOut: 'Sign out',
    },
    common: { retry: 'Retry', loading: 'Loading…', empty: 'Nothing here yet' },
  },
};

const mobileAr = {
  mobile: {
    tabs: { home: 'الرئيسية', appointments: 'المواعيد', records: 'السجلات', notifications: 'التنبيهات', profile: 'الملف' },
    auth: {
      loginTitle: 'مرحبًا بعودتك',
      loginSubtitle: 'سجّل الدخول إلى حسابك في CeenAiX',
      signupTitle: 'أنشئ حسابك',
      signupSubtitle: 'انضم إلى CeenAiX كمريض',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      fullName: 'الاسم الكامل',
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب',
      toSignup: 'ليس لديك حساب؟ سجّل الآن',
      toLogin: 'لديك حساب بالفعل؟ سجّل الدخول',
      terms: 'أوافق على الشروط وسياسة الخصوصية',
      signOut: 'تسجيل الخروج',
    },
    common: { retry: 'إعادة المحاولة', loading: 'جارٍ التحميل…', empty: 'لا يوجد شيء بعد' },
  },
};

const resolveDeviceLanguage = (): string => {
  const locales = getLocales();
  const tag = locales[0]?.languageCode ?? 'en';
  return tag.startsWith('ar') ? 'ar' : 'en';
};

export const applyDirection = (lng: string): void => {
  const isArabic = lng.startsWith('ar');
  I18nManager.allowRTL(true);
  // forceRTL only takes effect after an app reload on native; calling it keeps
  // the layout direction in sync once the app restarts.
  if (I18nManager.isRTL !== isArabic) {
    I18nManager.forceRTL(isArabic);
  }
};

export const initI18n = async (): Promise<typeof i18n> => {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const lng = stored ?? resolveDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { common: { ...enCommon, ...mobileEn } },
      ar: { common: { ...arCommon, ...mobileAr } },
    },
    lng,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
  });

  applyDirection(lng);
  return i18n;
};

export const setLanguage = async (lng: 'en' | 'ar'): Promise<void> => {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    // Persisting the preference is best-effort.
  }
  applyDirection(lng);
};

export default i18n;
