import { getLocales } from 'expo-localization';

const en = {
  offlineTitle: 'You are offline',
  offlineBody: 'CeenAiX needs an internet connection. Check your connection and try again.',
  retry: 'Try again',
  lockedTitle: 'CeenAiX is locked',
  lockedBody: 'Unlock to see your health information.',
  unlock: 'Unlock',
  unlockPrompt: 'Unlock CeenAiX',
  saveFileFailedTitle: 'Could not open the file',
  saveFileFailedBody: 'Please try again. If it keeps happening, open CeenAiX in your browser to download it.',
};

type Strings = typeof en;

const ar: Strings = {
  offlineTitle: 'أنت غير متصل',
  offlineBody: 'يحتاج CeenAiX إلى اتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.',
  retry: 'حاول مرة أخرى',
  lockedTitle: 'CeenAiX مقفل',
  lockedBody: 'افتح القفل لعرض معلوماتك الصحية.',
  unlock: 'فتح القفل',
  unlockPrompt: 'افتح CeenAiX',
  saveFileFailedTitle: 'تعذّر فتح الملف',
  saveFileFailedBody: 'يُرجى المحاولة مرة أخرى. إذا تكرر ذلك، افتح CeenAiX في المتصفح لتنزيله.',
};

export const isArabic = (getLocales()[0]?.languageCode ?? 'en').startsWith('ar');

export const strings: Strings = isArabic ? ar : en;
