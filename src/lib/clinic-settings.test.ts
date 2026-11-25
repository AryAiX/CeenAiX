import { describe, expect, it } from 'vitest';
import { buildOperatingHours, parseOperatingHours, settingsSaveErrorKey, validateClinicInfo, validateHours } from './clinic-settings';

const info = (patch: Partial<Parameters<typeof validateClinicInfo>[0]> = {}) => ({
  name: 'QA Clinic', phone: '+971 4 123 4567', email: 'info@clinic.ae', address: 'Dubai Healthcare City', ...patch,
});

describe('validateClinicInfo (QA-232)', () => {
  it('accepts valid details and tidies them', () => {
    expect(validateClinicInfo(info({ name: '  QA   Clinic ', email: ' info@clinic.ae ' }))).toEqual({
      ok: true,
      value: { name: 'QA Clinic', phone: '+971 4 123 4567', email: 'info@clinic.ae', address: 'Dubai Healthcare City' },
    });
  });

  it('allows an empty phone and email', () => {
    expect(validateClinicInfo(info({ phone: '', email: '' })).ok).toBe(true);
  });

  it('refuses an empty name and address, a bad email and a bad phone', () => {
    expect(validateClinicInfo(info({ name: ' ', address: '', email: 'clinic.ae', phone: 'call us' }))).toEqual({
      ok: false,
      errors: {
        name: { key: 'nameRequired' },
        address: { key: 'addressRequired' },
        email: { key: 'emailInvalid' },
        phone: { key: 'phoneInvalid' },
      },
    });
  });

  it.each(['12345', '+971 4 123 4567 8901 23'])('refuses the phone %s (7 to 15 digits)', (phone) => {
    expect(validateClinicInfo(info({ phone })).ok).toBe(false);
  });
});

describe('parseOperatingHours (QA-232)', () => {
  it('reads the days and hours that were saved', () => {
    expect(parseOperatingHours({ sun: '09:00-17:00', mon: '09:00-17:00' })).toEqual({
      days: ['mon', 'sun'], open: '09:00', close: '17:00', mixed: false,
    });
  });

  it('uses the most common hours and says when days differ (it used to take the first day only)', () => {
    expect(parseOperatingHours({ mon: '09:00-13:00', tue: '08:00-20:00', wed: '08:00-20:00' })).toEqual({
      days: ['mon', 'tue', 'wed'], open: '08:00', close: '20:00', mixed: true,
    });
  });

  it('falls back to Mon–Sat 08:00–20:00 when nothing is saved, and ignores broken values', () => {
    expect(parseOperatingHours(null).days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    expect(parseOperatingHours({}).open).toBe('08:00');
    expect(parseOperatingHours({ mon: 'closed', tue: '25:00-26:00' }).days).toEqual([]);
  });
});

describe('validateHours and buildOperatingHours (QA-232)', () => {
  it('needs at least one day and a closing time after the opening time', () => {
    expect(validateHours([], '08:00', '20:00')).toEqual({ key: 'daysRequired' });
    expect(validateHours(['mon'], '20:00', '08:00')).toEqual({ key: 'hoursOrder' });
    expect(validateHours(['mon'], '08:00', '08:00')).toEqual({ key: 'hoursOrder' });
    expect(validateHours(['mon'], '08:00', '20:00')).toBeNull();
  });

  it('saves the same hours for every selected day, in week order', () => {
    expect(buildOperatingHours(['sun', 'mon'], '09:00', '17:00')).toEqual({ mon: '09:00-17:00', sun: '09:00-17:00' });
  });
});

describe('settingsSaveErrorKey (QA-232)', () => {
  it('never returns the database text', () => {
    expect(settingsSaveErrorKey({ code: '42501', message: 'Only CeenAiX can change …' })).toBe('notAllowed');
    expect(settingsSaveErrorKey({ code: '23502', message: 'null value in column "name"' })).toBe('saveFailed');
  });
});
