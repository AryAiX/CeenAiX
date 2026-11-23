import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { arabicDigitsFormatter } from './arabic-digits-formatter';
import arCommon from '../locales/ar/common.json';
import arExtra from '../locales/ar/extra.json';
import arInsurancePage from '../locales/ar/insurancePage.json';
import enCommon from '../locales/en/common.json';
import enExtra from '../locales/en/extra.json';
import enInsurancePage from '../locales/en/insurancePage.json';

const enMerged = { ...enCommon, ...enExtra, ...enInsurancePage };
const arMerged = { ...arCommon, ...arExtra, ...arInsurancePage };

export const LOCALE_STORAGE_KEY = 'ceenaix.lang';

const applyDocumentLanguage = (lng: string) => {
  const isArabic = lng.startsWith('ar');
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
};

const initialLng =
  typeof localStorage !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) ?? 'en' : 'en';

void i18n.use(arabicDigitsFormatter).use(initReactI18next).init({
  resources: {
    en: { common: enMerged },
    ar: { common: arMerged },
  },
  lng: initialLng,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false,
    // QA-126: run every {{value}} through arabicDigitsFormatter (numbers → Arabic digits in Arabic).
    alwaysFormat: true,
  },
});

applyDocumentLanguage(i18n.language);

i18n.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  }
  applyDocumentLanguage(lng);
});

export default i18n;
