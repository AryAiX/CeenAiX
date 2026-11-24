import { MAX_CLINIC_FEE } from './clinic-visit-fee';

/**
 * QA-214: clinic service catalogue (facility_services) rules shared by the Pricing page.
 *
 * Categories are stored in lowercase ("consultation", "follow_up", …). The page used to save the
 * capitalised label ("Consultation", "Follow-up"), so the table held both forms.
 */
export const SERVICE_CATEGORIES = [
  'consultation',
  'follow_up',
  'procedure',
  'telemedicine',
  'lab',
  'imaging',
  'package',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

/** "Consultation" / "Follow-up" / " lab " -> "consultation" / "follow_up" / "lab". Empty -> "consultation". */
export const normalizeServiceCategory = (raw: string | null | undefined): string => {
  const key = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return key || 'consultation';
};

/** Same limits as facility_services_values_chk (QA-213). */
export const MIN_SERVICE_DURATION = 5;
export const MAX_SERVICE_DURATION = 480;
export const MAX_SERVICE_NAME_LENGTH = 120;
export const MAX_SERVICE_DESCRIPTION_LENGTH = 500;

export interface ServiceFormInput {
  name: string;
  category: string;
  durationMinutes: string;
  priceAed: string;
  description: string;
}

export interface ServiceFormValue {
  name: string;
  category: string;
  durationMinutes: number;
  priceAed: number;
  description: string;
}

/** i18n key under clinic.pricingPage.form.errors plus its values. */
export interface ServiceFieldError {
  key: string;
  values?: Record<string, number>;
}

export type ServiceFormErrors = Partial<Record<'name' | 'price' | 'duration' | 'description', ServiceFieldError>>;

export type ServiceFormResult = { ok: true; value: ServiceFormValue } | { ok: false; errors: ServiceFormErrors };

/**
 * QA-214: check the Add / Edit Service form before saving. An empty name, an empty price (it used
 * to be saved as AED 0), a negative / too large / non-numeric price, a duration outside 5–480
 * minutes and a name already used by another service of the clinic are all refused with a message.
 */
export const validateServiceForm = (
  input: ServiceFormInput,
  existing: { id: string; name: string }[],
  editingId?: string
): ServiceFormResult => {
  const errors: ServiceFormErrors = {};
  const name = input.name.trim().replace(/\s+/g, ' ');
  const description = input.description.trim();

  if (!name) {
    errors.name = { key: 'nameRequired' };
  } else if (name.length > MAX_SERVICE_NAME_LENGTH) {
    errors.name = { key: 'tooLong', values: { value: MAX_SERVICE_NAME_LENGTH } };
  } else if (existing.some(s => s.id !== editingId && s.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = { key: 'nameTaken' };
  }

  const priceText = input.priceAed.trim();
  let priceAed = 0;
  if (priceText === '') {
    errors.price = { key: 'priceRequired' };
  } else if (!/^\d+(\.\d{1,2})?$/.test(priceText) || Number(priceText) > MAX_CLINIC_FEE) {
    errors.price = { key: 'priceInvalid', values: { value: MAX_CLINIC_FEE } };
  } else {
    priceAed = Number(priceText);
  }

  const durationText = input.durationMinutes.trim();
  let durationMinutes = 0;
  if (!/^\d+$/.test(durationText) || Number(durationText) < MIN_SERVICE_DURATION || Number(durationText) > MAX_SERVICE_DURATION) {
    errors.duration = { key: 'durationInvalid', values: { min: MIN_SERVICE_DURATION, max: MAX_SERVICE_DURATION } };
  } else {
    durationMinutes = Number(durationText);
  }

  if (description.length > MAX_SERVICE_DESCRIPTION_LENGTH) {
    errors.description = { key: 'tooLong', values: { value: MAX_SERVICE_DESCRIPTION_LENGTH } };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, category: normalizeServiceCategory(input.category), durationMinutes, priceAed, description },
  };
};

/** QA-214: plain message key (clinic.pricingPage.errors.*) for a failed save; never the database text. */
export const serviceSaveErrorKey = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  return code === '23514' ? 'valuesRejected' : 'saveFailed';
};
