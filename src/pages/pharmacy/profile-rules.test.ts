import { describe, expect, it } from 'vitest';
import { openDaysCount, parseWorkingHours, validatePharmacyDetails } from './profile-rules';

const details = {
  display_name: '  QA   Pharmacy ',
  address: 'Al Barsha 1',
  pharmacist_in_charge: '',
  phone: '+971 4 123 4567',
  email: 'info@pharmacy.ae',
  website: 'www.pharmacy.ae',
  emergency_contact: '',
};

describe('parseWorkingHours (QA-293)', () => {
  it('fills missing or broken days with the default hours instead of crashing', () => {
    const hours = parseWorkingHours({ Monday: { open: '09:00', close: '17:00', closed: false }, Tuesday: 'closed', Friday: { open: '9am' } });
    expect(hours.Monday).toEqual({ open: '09:00', close: '17:00', closed: false });
    expect(hours.Tuesday).toEqual({ open: '08:00', close: '22:00', closed: false });
    expect(hours.Friday).toEqual({ open: '08:00', close: '22:00', closed: false });
    expect(Object.keys(hours)).toHaveLength(7);
  });

  it('counts the open days, or null when nothing is stored', () => {
    expect(openDaysCount(null)).toBeNull();
    expect(openDaysCount({ Friday: { open: '08:00', close: '22:00', closed: true } })).toBe(6);
  });
});

describe('validatePharmacyDetails (QA-293)', () => {
  const hours = parseWorkingHours(null);

  it('accepts good details and tidies them', () => {
    const result = validatePharmacyDetails(details, hours);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.display_name).toBe('QA Pharmacy');
  });

  it('refuses an empty name, a bad email, phone and website, and a closing time before the opening time', () => {
    const result = validatePharmacyDetails(
      { ...details, display_name: '  ', email: 'not-an-email', phone: '12', website: 'javascript:alert(1)' },
      { ...hours, Monday: { open: '22:00', close: '08:00', closed: false }, Friday: { open: '22:00', close: '08:00', closed: true } }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.display_name?.key).toBe('nameRequired');
    expect(result.errors.email?.key).toBe('emailInvalid');
    expect(result.errors.phone?.key).toBe('phoneInvalid');
    expect(result.errors.website?.key).toBe('websiteInvalid');
    expect(result.errors.days).toEqual({ Monday: { key: 'closeBeforeOpen' } });
  });

  it('refuses too long values', () => {
    const result = validatePharmacyDetails({ ...details, display_name: 'x'.repeat(121) }, hours);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.display_name).toEqual({ key: 'tooLong', values: { max: 120 } });
  });
});
