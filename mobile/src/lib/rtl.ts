import { I18nManager, Platform } from 'react-native';

/** react-native-web's I18nManager is inert, so web reads the document direction instead. */
export function isAppRtl(): boolean {
  if (Platform.OS === 'web') return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return I18nManager.isRTL;
}

const STRONG_CHAR = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]|[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Direction of free text (messages, AI replies) from its first strong character, so English stays LTR inside an Arabic UI and vice versa. */
export function contentDirection(text: string): 'ltr' | 'rtl' {
  const strong = STRONG_CHAR.exec(text)?.[0];
  if (!strong) return isAppRtl() ? 'rtl' : 'ltr';
  return RTL_CHAR.test(strong) ? 'rtl' : 'ltr';
}
