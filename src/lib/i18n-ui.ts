import type { TFunction } from 'i18next';

export const CLINIC_TIME_ZONE = 'Asia/Dubai';

const calendarDayKeyInTimeZone = (value: Date | string, timeZone: string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
};

export const isSameCalendarDayInTimeZone = (value: Date | string, reference: Date, timeZone = CLINIC_TIME_ZONE) =>
  calendarDayKeyInTimeZone(value, timeZone) === calendarDayKeyInTimeZone(reference, timeZone);

export const formatRelativeTime = (t: TFunction, value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  // For future timestamps (notifications scheduled ahead, etc.) clamp to "1m ago"
  // rather than reporting nonsense like "-5h ago"
  const diffMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60000));

  if (diffMinutes < 60) {
    return t('shared.time.minutesAgo', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t('shared.time.hoursAgo', { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t('shared.time.daysAgo', { count: diffDays });
};

export const appointmentTypeLabel = (t: TFunction, value: 'in_person' | 'virtual') =>
  value === 'in_person' ? t('shared.appointmentType.inPerson') : t('shared.appointmentType.virtual');

export const appointmentStatusLabel = (t: TFunction, status: string) => {
  const key = `shared.appointmentStatus.${status}`;
  const label = t(key);
  return label === key ? status.replace(/_/g, ' ') : label;
};

export const preVisitStatusLabel = (t: TFunction, status: string) => {
  const key = `shared.preVisitStatus.${status}`;
  const label = t(key);
  return label === key ? status : label;
};

export const prescriptionStatusLabel = (t: TFunction, status: string) => {
  const key = `shared.prescriptionStatus.${status}`;
  const label = t(key);
  return label === key ? status.replace(/_/g, ' ') : label;
};

export const labOrderStatusLabel = (t: TFunction, status: string) => {
  const key = `shared.labOrderStatus.${status}`;
  const label = t(key);
  return label === key ? status.replace(/_/g, ' ') : label;
};

export const calendarWeekdayShort = (t: TFunction) =>
  [
    t('shared.weekdays.sun'),
    t('shared.weekdays.mon'),
    t('shared.weekdays.tue'),
    t('shared.weekdays.wed'),
    t('shared.weekdays.thu'),
    t('shared.weekdays.fri'),
    t('shared.weekdays.sat'),
  ] as const;

export const resolveLocale = (language: string) => (language.startsWith('ar') ? 'ar-AE' : 'en-US');

/** Eastern Arabic-Indic digits (٠١٢…) when the UI language is Arabic */
export const usesArabicEasternNumerals = (language: string): boolean => language.startsWith('ar');

/** Merge Intl date/time options so numeric parts use Eastern Arabic-Indic digits in Arabic UI */
export const dateTimeFormatWithNumerals = (
  language: string,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormatOptions => ({
  ...(options ?? {}),
  ...(usesArabicEasternNumerals(language) ? { numberingSystem: 'arab' as const } : {}),
});

export const appointmentPickerLabel = (language: string, scheduledAt: string): string => {
  const date = new Date(scheduledAt);

  try {
    return new Intl.DateTimeFormat(
      resolveLocale(language),
      dateTimeFormatWithNumerals(language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    ).format(date);
  } catch {
    return date.toLocaleString(resolveLocale(language));
  }
};

/** Format integers for display (calendar day numbers, counts in JSX, etc.) */
export const formatLocaleDigits = (value: number, language: string): string => {
  if (!usesArabicEasternNumerals(language)) {
    return String(value);
  }
  try {
    return new Intl.NumberFormat('ar-AE', { numberingSystem: 'arab' }).format(value);
  } catch {
    return String(value);
  }
};

/** Format decimals (e.g. star ratings) with locale-appropriate digits and separator */
export const formatLocaleDecimal = (
  value: number,
  language: string,
  fractionDigits = 1
): string => {
  if (!usesArabicEasternNumerals(language)) {
    return value.toFixed(fractionDigits);
  }
  try {
    return new Intl.NumberFormat('ar-AE', {
      numberingSystem: 'arab',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
};

const WESTERN_TO_ARABIC_INDIC: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

/** Phone strings: keep + and spacing; map ASCII digits to Eastern Arabic-Indic in Arabic UI */
export const formatLocalePhoneDisplay = (phone: string, language: string): string => {
  if (!usesArabicEasternNumerals(language)) return phone;
  return phone.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_INDIC[d] ?? d);
};
