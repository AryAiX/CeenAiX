import { describe, expect, it } from 'vitest';
import {
  arabicNameForForm,
  normalizeServiceCategory,
  serviceSaveErrorKey,
  serviceText,
  validateServiceForm,
} from './clinic-services';

const form = (patch: Partial<Parameters<typeof validateServiceForm>[0]> = {}) => ({
  name: 'Echo',
  nameAr: '',
  category: 'procedure',
  durationMinutes: '30',
  priceAed: '400',
  description: '',
  descriptionAr: '',
  ...patch,
});

describe('normalizeServiceCategory (QA-214)', () => {
  it('stores categories in lowercase, whatever the old page saved', () => {
    expect(normalizeServiceCategory('Consultation')).toBe('consultation');
    expect(normalizeServiceCategory('Follow-up')).toBe('follow_up');
    expect(normalizeServiceCategory(' lab ')).toBe('lab');
    expect(normalizeServiceCategory('')).toBe('consultation');
    expect(normalizeServiceCategory(null)).toBe('consultation');
  });
});

describe('validateServiceForm (QA-214)', () => {
  it('accepts a valid service and tidies the values', () => {
    const result = validateServiceForm(form({ name: '  Echo   Scan ', category: 'Procedure', priceAed: '400.5' }), []);
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Echo Scan',
        nameAr: 'Echo Scan',
        category: 'procedure',
        durationMinutes: 30,
        priceAed: 400.5,
        description: '',
        descriptionAr: '',
      },
    });
  });

  it('accepts a free service (price 0)', () => {
    expect(validateServiceForm(form({ priceAed: '0' }), []).ok).toBe(true);
  });

  it('refuses an empty name, an empty price and a bad duration', () => {
    const result = validateServiceForm(form({ name: '   ', priceAed: '', durationMinutes: '0' }), []);
    expect(result).toEqual({
      ok: false,
      errors: {
        name: { key: 'nameRequired' },
        price: { key: 'priceRequired' },
        duration: { key: 'durationInvalid', values: { min: 5, max: 480 } },
      },
    });
  });

  it.each(['-1', '100001', 'abc', '1.234', '1e3'])('refuses the price %s', price => {
    const result = validateServiceForm(form({ priceAed: price }), []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.price).toEqual({ key: 'priceInvalid', values: { value: 100000 } });
  });

  it.each(['4', '481', '30.5', '', '-30'])('refuses the duration %s', duration => {
    expect(validateServiceForm(form({ durationMinutes: duration }), []).ok).toBe(false);
  });

  it('refuses a name another service already uses, but not the service being edited', () => {
    const existing = [{ id: 's1', name: 'ECHO' }];
    const taken = validateServiceForm(form({ name: 'echo' }), existing);
    expect(taken.ok).toBe(false);
    if (!taken.ok) expect(taken.errors.name).toEqual({ key: 'nameTaken' });
    expect(validateServiceForm(form({ name: 'echo' }), existing, 's1').ok).toBe(true);
  });

  it('refuses names and descriptions that are too long', () => {
    const result = validateServiceForm(form({ name: 'x'.repeat(121), description: 'y'.repeat(501) }), []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toEqual({ key: 'tooLong', values: { value: 120 } });
      expect(result.errors.description).toEqual({ key: 'tooLong', values: { value: 500 } });
    }
  });
});

describe('serviceSaveErrorKey (QA-214)', () => {
  it('maps the database value check to a plain message, everything else to a generic one', () => {
    expect(serviceSaveErrorKey({ code: '23514', message: 'violates check constraint' })).toBe('valuesRejected');
    expect(serviceSaveErrorKey({ code: '42501' })).toBe('saveFailed');
    expect(serviceSaveErrorKey(null)).toBe('saveFailed');
  });
});

describe('Arabic service names (QA-215)', () => {
  it('saves the Arabic name and description that were entered', () => {
    const result = validateServiceForm(form({ nameAr: '  تخطيط   صدى القلب ', descriptionAr: ' فحص بالموجات ' }), []);
    expect(result.ok && result.value).toMatchObject({ name: 'Echo', nameAr: 'تخطيط صدى القلب', descriptionAr: 'فحص بالموجات' });
  });

  it('uses the English name when no Arabic name was entered (name_ar cannot be empty)', () => {
    const result = validateServiceForm(form({ nameAr: '   ' }), []);
    expect(result.ok && result.value.nameAr).toBe('Echo');
  });

  it('refuses an Arabic name or description that is too long', () => {
    const result = validateServiceForm(form({ nameAr: 'س'.repeat(121), descriptionAr: 'ص'.repeat(501) }), []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.nameAr).toEqual({ key: 'tooLong', values: { value: 120 } });
      expect(result.errors.descriptionAr).toEqual({ key: 'tooLong', values: { value: 500 } });
    }
  });

  it('shows a copied English name as empty in the form, a real Arabic name as it is', () => {
    expect(arabicNameForForm({ name: 'ECG', nameAr: 'ECG' })).toBe('');
    expect(arabicNameForForm({ name: 'ECG', nameAr: 'تخطيط القلب' })).toBe('تخطيط القلب');
    expect(arabicNameForForm(undefined)).toBe('');
  });

  it('shows the Arabic name and description in Arabic, falling back to English', () => {
    const service = { name: 'ECG', nameAr: 'تخطيط القلب', description: 'Heart test', descriptionAr: '' };
    expect(serviceText(service, 'ar')).toEqual({ name: 'تخطيط القلب', description: 'Heart test' });
    expect(serviceText(service, 'en')).toEqual({ name: 'ECG', description: 'Heart test' });
    expect(serviceText({ ...service, nameAr: '' }, 'ar').name).toBe('ECG');
  });
});
