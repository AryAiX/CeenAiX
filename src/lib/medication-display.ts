import type { TFunction } from 'i18next';
import { formatLocaleDecimal, formatLocaleDigits } from './i18n-ui';

const DOSAGE_UNIT_TO_KEY: Record<string, string> = {
  mg: 'medUnitMg',
  mcg: 'medUnitMcg',
  g: 'medUnitG',
  gm: 'medUnitG',
  gram: 'medUnitG',
  grams: 'medUnitG',
  ml: 'medUnitMl',
  l: 'medUnitL',
  meq: 'medUnitMeq',
  mmol: 'medUnitMmol',
  iu: 'medUnitIu',
  unit: 'medUnitUnit',
  units: 'medUnitUnits',
  unt: 'medUnitUnit',
};

const DOSAGE_UNIT_CANONICAL: Record<string, string> = {
  mg: 'MG',
  mcg: 'MCG',
  g: 'G',
  gm: 'G',
  gram: 'G',
  grams: 'G',
  ml: 'ML',
  l: 'L',
  meq: 'MEQ',
  mmol: 'MMOL',
  iu: 'IU',
  unit: 'UNIT',
  units: 'UNITS',
  unt: 'UNIT',
  'ملغ': 'MG',
  'مغ': 'MG',
  'مكغ': 'MCG',
  'ميكروغرام': 'MCG',
  'غ': 'G',
  'غم': 'G',
  'جرام': 'G',
  'غرام': 'G',
  'مل': 'ML',
  'ل': 'L',
  'مكافئ': 'MEQ',
  'ميلي مكافئ': 'MEQ',
  'مليمول': 'MMOL',
  'وحدة': 'UNIT',
  'وحدات': 'UNITS',
  'دولية': 'IU',
};

const DOSAGE_UNIT_PATTERN =
  /(^|[^A-Za-z\u0600-\u06FF])(mg|mcg|g|gm|gram|grams|ml|l|meq|mmol|iu|units?|unt|ملغ|مغ|مكغ|ميكروغرام|غ|غم|جرام|غرام|مل|ل|مكافئ|ميلي مكافئ|مليمول|وحدة|وحدات|دولية)(?=$|[^A-Za-z\u0600-\u06FF])/giu;

const ARABIC_INDIC_TO_WESTERN: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

// Vocabulary-sourced frequencies arrive already localized. This map is the
// fallback for free text, and both wordings resolve to the same leaf.
const FREQUENCY_KEY: Record<string, string> = {
  'once daily': 'onceDaily',
  'once a day': 'onceDaily',
  'twice daily': 'twiceDaily',
  'twice a day': 'twiceDaily',
  'three times daily': 'threeTimesDaily',
  'three times a day': 'threeTimesDaily',
  'four times daily': 'fourTimesDaily',
  'four times a day': 'fourTimesDaily',
  'every 12 hours': 'every12Hours',
  'every 8 hours': 'every8Hours',
  'every 6 hours': 'every6Hours',
  'as needed': 'asNeeded',
  'as needed for pain': 'asNeededPain',
};

function translateFrequency(t: TFunction, raw: string): string | null {
  const leaf = FREQUENCY_KEY[raw.trim().toLowerCase()];
  if (!leaf) return null;
  const key = `patient.dashboard.medFreq.${leaf}`;
  const out = t(key);
  return out === key ? null : out;
}

function translateDuration(t: TFunction, language: string, raw: string): string | null {
  const trimmed = raw.trim();
  const days = trimmed.match(/^(\d+)\s*days?$/i);
  if (days) {
    const n = parseInt(days[1], 10);
    return t('patient.dashboard.medDurationDays', {
      count: formatLocaleDigits(n, language),
    });
  }
  const weeks = trimmed.match(/^(\d+)\s*weeks?$/i);
  if (weeks) {
    const n = parseInt(weeks[1], 10);
    return t('patient.dashboard.medDurationWeeks', {
      count: formatLocaleDigits(n, language),
    });
  }
  return null;
}

const normalizeAsciiDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_TO_WESTERN[digit] ?? digit)
    .replace(/٫/g, '.')
    .replace(/،/g, ',');

const localizeNumericToken = (value: string, language: string) => {
  const normalized = normalizeAsciiDigits(value);
  const numericValue = Number.parseFloat(normalized);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  const fractionalPart = normalized.split('.')[1] ?? '';
  return fractionalPart.length > 0
    ? formatLocaleDecimal(numericValue, language, fractionalPart.length)
    : formatLocaleDigits(numericValue, language);
};

export function normalizeMedicationDosageValue(raw: string): string {
  const normalizedDigits = normalizeAsciiDigits(raw).replace(/\s*\/\s*/g, '/');

  return normalizedDigits
    .replace(DOSAGE_UNIT_PATTERN, (_match, prefix: string, unit: string) => {
      const normalizedUnit = DOSAGE_UNIT_CANONICAL[unit.trim().toLowerCase()] ?? DOSAGE_UNIT_CANONICAL[unit.trim()] ?? unit;
      return `${prefix}${normalizedUnit}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function localizeMedicationDosageValue(
  t: TFunction,
  language: string,
  raw: string | null | undefined
): string | null {
  if (!raw) {
    return null;
  }

  const normalized = normalizeMedicationDosageValue(raw);

  if (!language.startsWith('ar')) {
    return normalized;
  }

  const digitsLocalized = normalized.replace(/\d+(?:\.\d+)?/g, (token) =>
    localizeNumericToken(token, language)
  );

  return digitsLocalized.replace(DOSAGE_UNIT_PATTERN, (match, prefix: string, unit: string) => {
    const key = DOSAGE_UNIT_TO_KEY[unit.trim().toLowerCase()];
    if (!key) {
      return match;
    }

    return `${prefix}${t(`patient.dashboard.${key}`)}`;
  });
}

export type MedicationDetailParts = {
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  /** Pre-joined English fallback from the server layer */
  detail: string;
  /** When set (e.g. from prescription_clinical_vocab), skips client frequency map */
  frequencyFromVocab?: string | null;
  /** When set, skips client duration parsing */
  durationFromVocab?: string | null;
  /** Optional explicit fallback when no dosage/frequency/duration values exist */
  emptyFallback?: string | null;
};

/** Dashboard prescription reminder line: dosage • frequency • duration */
export const formatMedicationDetailLine = (
  t: TFunction,
  language: string,
  row: MedicationDetailParts
): string => {
  const parts: string[] = [];
  if (row.dosage) {
    parts.push(localizeMedicationDosageValue(t, language, row.dosage) ?? row.dosage);
  }
  if (row.frequencyFromVocab) {
    parts.push(row.frequencyFromVocab);
  } else if (row.frequency) {
    parts.push(translateFrequency(t, row.frequency) ?? row.frequency);
  }
  if (row.durationFromVocab) {
    parts.push(row.durationFromVocab);
  } else if (row.duration) {
    parts.push(translateDuration(t, language, row.duration) ?? row.duration);
  }
  if (parts.length > 0) {
    return parts.join(' • ');
  }
  const fallbackEn = 'Active prescription';
  if (row.detail && row.detail !== fallbackEn) {
    return row.detail;
  }
  if (row.emptyFallback !== undefined) {
    return row.emptyFallback ?? '';
  }
  return t('patient.dashboard.medActiveFallback');
};
