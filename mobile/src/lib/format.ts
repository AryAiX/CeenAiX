import { dateTimeFormatWithNumerals, resolveLocale } from '@ceenaix/shared/i18n-ui';
import i18n from 'i18next';

const lang = (): string => i18n.language || 'en';

const format = (value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(resolveLocale(lang()), dateTimeFormatWithNumerals(lang(), options)).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export const formatDate = (value: string | Date | null | undefined): string => format(value, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateLong = (value: string | Date | null | undefined): string =>
  format(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const formatShortDay = (value: string | Date | null | undefined): string => format(value, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatTime = (value: string | Date | null | undefined): string => format(value, { hour: 'numeric', minute: '2-digit' });

export const formatDateTime = (value: string | Date | null | undefined): string =>
  format(value, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const formatWeekday = (value: Date): string => format(value, { weekday: 'short' });
export const formatDayNumber = (value: Date): string => format(value, { day: 'numeric' });
export const formatMonthYear = (value: Date): string => format(value, { month: 'long', year: 'numeric' });

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
  try {
    return new Intl.NumberFormat(resolveLocale(lang()), {
      ...(lang().startsWith('ar') ? { numberingSystem: 'arab' } : {}),
      ...options,
    }).format(value);
  } catch {
    return String(value);
  }
};

export const formatAed = (value: number | null | undefined): string => (value == null ? '—' : `${formatNumber(Math.round(value))} AED`);

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(Math.round(bytes / 1024))} KB`;
  return `${formatNumber(Number((bytes / (1024 * 1024)).toFixed(1)))} MB`;
};

export const formatRelative = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  try {
    const rtf = new Intl.RelativeTimeFormat(resolveLocale(lang()), { numeric: 'auto' });
    if (abs < 60 * 60_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
    if (abs < 24 * 60 * 60_000) return rtf.format(Math.round(diffMs / (60 * 60_000)), 'hour');
    if (abs < 7 * 24 * 60 * 60_000) return rtf.format(Math.round(diffMs / (24 * 60 * 60_000)), 'day');
  } catch {
    // Fall through to absolute date.
  }
  return formatDate(date);
};

export const initialsOf = (name: string | null | undefined): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'C';

export const humanize = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
