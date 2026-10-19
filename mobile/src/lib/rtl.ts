import { I18nManager, Platform } from 'react-native';

/** react-native-web's I18nManager is inert, so web reads the document direction instead. */
export function isAppRtl(): boolean {
  if (Platform.OS === 'web') return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return I18nManager.isRTL;
}
