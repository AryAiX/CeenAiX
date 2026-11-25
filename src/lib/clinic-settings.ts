/**
 * QA-232: rules for the clinic Settings page.
 *
 * The clinic details and working hours are shown to the public (Find a Clinic). The page used to
 * save anything: an empty name, an invalid email or phone, no working days, or a closing time
 * before the opening time. It also read only the first day's hours when loading.
 */

export const CLINIC_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type ClinicDayKey = (typeof CLINIC_DAY_KEYS)[number];

export const MAX_CLINIC_NAME_LENGTH = 120;

/** i18n key under clinic.settingsPage.errors and its values */
export interface SettingsFieldError {
  key: string;
  values?: Record<string, number>;
}

export interface ClinicInfoInput {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export type ClinicInfoErrors = Partial<Record<keyof ClinicInfoInput, SettingsFieldError>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** digits with optional +, spaces, dashes, dots or brackets; 7 to 15 digits */
const PHONE = /^\+?[\d\s\-().]+$/;

export const validateClinicInfo = (
  input: ClinicInfoInput
): { ok: true; value: ClinicInfoInput } | { ok: false; errors: ClinicInfoErrors } => {
  const value = {
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
  };
  const errors: ClinicInfoErrors = {};
  if (!value.name) errors.name = { key: 'nameRequired' };
  else if (value.name.length > MAX_CLINIC_NAME_LENGTH) errors.name = { key: 'tooLong', values: { value: MAX_CLINIC_NAME_LENGTH } };
  if (!value.address) errors.address = { key: 'addressRequired' };
  if (value.email && !EMAIL.test(value.email)) errors.email = { key: 'emailInvalid' };
  if (value.phone) {
    const digits = value.phone.replace(/\D/g, '').length;
    if (!PHONE.test(value.phone) || digits < 7 || digits > 15) errors.phone = { key: 'phoneInvalid' };
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
};

export interface ClinicHours {
  days: ClinicDayKey[];
  open: string;
  close: string;
  /** the saved hours differ between days (saving sets the same hours for every selected day) */
  mixed: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Read facilities.operating_hours ({ mon: "08:00-20:00", … }). Falls back to Mon–Sat 08:00–20:00. */
export const parseOperatingHours = (hours: unknown): ClinicHours => {
  const fallback: ClinicHours = { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], open: '08:00', close: '20:00', mixed: false };
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return fallback;
  const entries = CLINIC_DAY_KEYS.flatMap((day) => {
    const raw = (hours as Record<string, unknown>)[day];
    if (typeof raw !== 'string') return [];
    const [open, close] = raw.split('-').map((part) => part.trim());
    return TIME.test(open ?? '') && TIME.test(close ?? '') ? [{ day, open, close }] : [];
  });
  if (entries.length === 0) {
    return Object.keys(hours).length === 0 ? fallback : { ...fallback, days: [] };
  }
  // the most common hours (the first day's used to win, whatever the others said)
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(`${entry.open}-${entry.close}`, (counts.get(`${entry.open}-${entry.close}`) ?? 0) + 1);
  const [common] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [open, close] = common.split('-');
  return { days: entries.map((entry) => entry.day), open, close, mixed: counts.size > 1 };
};

export const validateHours = (days: ClinicDayKey[], open: string, close: string): SettingsFieldError | null => {
  if (days.length === 0) return { key: 'daysRequired' };
  if (!TIME.test(open) || !TIME.test(close) || open >= close) return { key: 'hoursOrder' };
  return null;
};

export const buildOperatingHours = (days: ClinicDayKey[], open: string, close: string): Record<string, string> =>
  Object.fromEntries(CLINIC_DAY_KEYS.filter((day) => days.includes(day)).map((day) => [day, `${open}-${close}`]));

/** Plain message key (clinic.settingsPage.errors.*) for a failed save; never the database text. */
export const settingsSaveErrorKey = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  return code === '42501' ? 'notAllowed' : 'saveFailed';
};
