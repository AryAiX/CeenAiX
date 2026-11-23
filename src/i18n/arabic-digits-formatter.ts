import type { FormatterModule } from 'i18next';

/**
 * QA-126: i18next 26 replaces `interpolation.format` with its built-in Formatter during init, so
 * the old Arabic-digit hook in index.ts never ran and every {{count}} showed Western digits in
 * Arabic. Registering our own formatter module (with `alwaysFormat: true`) is the supported way.
 *
 * Only real numbers are converted. Strings are left exactly as the caller built them, so
 * clinical codes (LOINC, ICD), IDs, phone numbers and names are never changed.
 */

const NO_GROUPING_KEYS = new Set(['year']);

export const formatInterpolatedValue = (
  value: unknown,
  lng: string | undefined,
  interpolationKey?: string
): unknown => {
  if (typeof lng !== 'string' || !lng.startsWith('ar')) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  try {
    return new Intl.NumberFormat('ar-AE', {
      numberingSystem: 'arab',
      maximumFractionDigits: 20,
      useGrouping: !(interpolationKey && NO_GROUPING_KEYS.has(interpolationKey)),
    }).format(value);
  } catch {
    return value;
  }
};

export const arabicDigitsFormatter: FormatterModule = {
  type: 'formatter',
  init: () => undefined,
  // No named formats (`{{x, number}}`) are used in the locale files; ignore registrations.
  add: () => undefined,
  addCached: () => undefined,
  format: (value, _format, lng, options) =>
    formatInterpolatedValue(value, lng, (options as { interpolationkey?: string } | undefined)?.interpolationkey) as string,
};
