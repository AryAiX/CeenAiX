import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

/**
 * QA-293: rules for the pharmacy profile dialog.
 *
 * The dialog used to save anything (an empty name, an invalid email, phone or website, a closing
 * time before the opening time, any length), and crashed when the stored working hours missed a
 * day or were not in the expected shape.
 */

export const PHARMACY_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type PharmacyDay = (typeof PHARMACY_DAYS)[number];

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export type WorkingHours = Record<PharmacyDay, DayHours>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_DAY: DayHours = { open: '08:00', close: '22:00', closed: false };

/** The stored hours, one entry per day; a missing or broken day gets the default hours. */
export const parseWorkingHours = (stored: unknown): WorkingHours => {
  const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(
    PHARMACY_DAYS.map((day) => {
      const raw = source[day] as Partial<DayHours> | undefined;
      const valid =
        raw &&
        typeof raw === 'object' &&
        typeof raw.open === 'string' &&
        typeof raw.close === 'string' &&
        TIME.test(raw.open) &&
        TIME.test(raw.close);
      return [day, valid ? { open: raw.open, close: raw.close, closed: raw.closed === true } : { ...DEFAULT_DAY }];
    })
  ) as WorkingHours;
};

/** Number of days the pharmacy is open, or null when no hours are stored. */
export const openDaysCount = (stored: unknown): number | null => {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const hours = parseWorkingHours(stored);
  return PHARMACY_DAYS.filter((day) => !hours[day].closed).length;
};

export interface PharmacyDetailsInput {
  display_name: string;
  address: string;
  pharmacist_in_charge: string;
  phone: string;
  email: string;
  website: string;
  emergency_contact: string;
}

/** i18n key under pharmacy.profile.errors, with its values. */
export interface FieldError {
  key: string;
  values?: Record<string, number>;
}

export type PharmacyDetailsErrors = Partial<Record<keyof PharmacyDetailsInput | 'hours', FieldError>> & {
  days?: Partial<Record<PharmacyDay, FieldError>>;
};

export const PHARMACY_NAME_MAX = FORM_FIELD_LIMITS.personName;
export const PHARMACY_WEBSITE_MAX = FORM_FIELD_LIMITS.shortText;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s\-().]+$/;
/** A plain web address, with or without http(s):// (no other schemes such as javascript:). */
const WEBSITE = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/[^\s]*)?$/i;

const phoneError = (value: string): FieldError | undefined => {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '').length;
  return !PHONE.test(value) || digits < 7 || digits > 15 ? { key: 'phoneInvalid' } : undefined;
};

const tooLong = (value: string, max: number): FieldError | undefined =>
  value.length > max ? { key: 'tooLong', values: { max } } : undefined;

export const validatePharmacyDetails = (
  input: PharmacyDetailsInput,
  hours: WorkingHours
): { ok: true; value: PharmacyDetailsInput } | { ok: false; errors: PharmacyDetailsErrors } => {
  const value: PharmacyDetailsInput = {
    display_name: input.display_name.trim().replace(/\s+/g, ' '),
    address: input.address.trim(),
    pharmacist_in_charge: input.pharmacist_in_charge.trim().replace(/\s+/g, ' '),
    phone: input.phone.trim(),
    email: input.email.trim(),
    website: input.website.trim(),
    emergency_contact: input.emergency_contact.trim(),
  };
  const errors: PharmacyDetailsErrors = {};
  if (!value.display_name) errors.display_name = { key: 'nameRequired' };
  else errors.display_name = tooLong(value.display_name, PHARMACY_NAME_MAX);
  errors.address = tooLong(value.address, FORM_FIELD_LIMITS.address);
  errors.pharmacist_in_charge = tooLong(value.pharmacist_in_charge, FORM_FIELD_LIMITS.personName);
  errors.phone = tooLong(value.phone, FORM_FIELD_LIMITS.phone) ?? phoneError(value.phone);
  errors.emergency_contact = tooLong(value.emergency_contact, FORM_FIELD_LIMITS.phone) ?? phoneError(value.emergency_contact);
  errors.email =
    tooLong(value.email, FORM_FIELD_LIMITS.email) ?? (value.email && !EMAIL.test(value.email) ? { key: 'emailInvalid' } : undefined);
  errors.website =
    tooLong(value.website, PHARMACY_WEBSITE_MAX) ??
    (value.website && !WEBSITE.test(value.website) ? { key: 'websiteInvalid' } : undefined);
  const days: Partial<Record<PharmacyDay, FieldError>> = {};
  for (const day of PHARMACY_DAYS) {
    const { open, close, closed } = hours[day];
    if (closed) continue;
    if (!TIME.test(open) || !TIME.test(close)) days[day] = { key: 'timeInvalid' };
    else if (close <= open) days[day] = { key: 'closeBeforeOpen' };
  }
  if (Object.keys(days).length > 0) errors.days = days;
  const hasErrors = Object.entries(errors).some(([, error]) => error !== undefined);
  if (!hasErrors) return { ok: true, value };
  return {
    ok: false,
    errors: Object.fromEntries(Object.entries(errors).filter(([, error]) => error !== undefined)) as PharmacyDetailsErrors,
  };
};
