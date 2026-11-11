import { formatLocaleDigits } from './i18n-ui';

/** "1 doctor" / "3 doctors", and the Arabic singular, dual and plural forms. */
export const careTeamCountLabel = (count: number, language: string): string => {
  const digits = formatLocaleDigits(count, language);
  if (!language.toLowerCase().startsWith('ar')) return count === 1 ? '1 doctor' : `${digits} doctors`;
  if (count === 1) return 'طبيب واحد';
  if (count === 2) return 'طبيبان';
  if (count >= 3 && count <= 10) return `${digits} أطباء`;
  return `${digits} طبيبًا`;
};
