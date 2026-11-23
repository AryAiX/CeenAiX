import { describe, expect, it } from 'vitest';
import { estimatedVisitFee, parseFeeInput, sumEstimatedFees } from './clinic-visit-fee';

const link = { doctor_user_id: 'd1', consultation_fee: '300', telemedicine_fee: 250, follow_up_fee: 150 };

describe('estimatedVisitFee (QA-195)', () => {
  it('uses the fee that matches the visit', () => {
    expect(estimatedVisitFee(link, { visitType: 'in_person', reason: 'Consultation' })).toBe(300);
    expect(estimatedVisitFee(link, { visitType: 'virtual', reason: 'Telemedicine' })).toBe(250);
    expect(estimatedVisitFee(link, { visitType: 'in_person', reason: 'Follow-up Visit' })).toBe(150);
  });

  it('falls back to the consultation fee when the special fee is not set', () => {
    const onlyConsultation = { doctor_user_id: 'd1', consultation_fee: 300, telemedicine_fee: null, follow_up_fee: null };
    expect(estimatedVisitFee(onlyConsultation, { visitType: 'virtual', reason: 'Telemedicine' })).toBe(300);
    expect(estimatedVisitFee(onlyConsultation, { visitType: 'in_person', reason: 'Follow-up Visit' })).toBe(300);
  });

  it('returns null (shown as —), not 0, when no fee is known', () => {
    expect(estimatedVisitFee(undefined, { visitType: 'in_person', reason: 'Consultation' })).toBeNull();
    expect(estimatedVisitFee({ doctor_user_id: 'd1', consultation_fee: null }, { visitType: 'in_person', reason: 'Consultation' })).toBeNull();
    expect(estimatedVisitFee({ doctor_user_id: 'd1', consultation_fee: 0 }, { visitType: 'in_person', reason: 'Consultation' })).toBe(0);
  });
});

describe('sumEstimatedFees (QA-195)', () => {
  it('adds the known fees and is null only when none is known', () => {
    expect(sumEstimatedFees([300, null, 150])).toBe(450);
    expect(sumEstimatedFees([null, null])).toBeNull();
    expect(sumEstimatedFees([])).toBe(0);
  });
});

describe('parseFeeInput (QA-205)', () => {
  it('reads empty as not set and accepts 0 to 100,000 with up to 2 decimals', () => {
    expect(parseFeeInput('')).toEqual({ ok: true, value: null });
    expect(parseFeeInput('  ')).toEqual({ ok: true, value: null });
    expect(parseFeeInput('0')).toEqual({ ok: true, value: 0 });
    expect(parseFeeInput(' 350 ')).toEqual({ ok: true, value: 350 });
    expect(parseFeeInput('99.95')).toEqual({ ok: true, value: 99.95 });
    expect(parseFeeInput('100000')).toEqual({ ok: true, value: 100000 });
  });

  it('refuses negative, too large, too precise or non-numbers', () => {
    for (const bad of ['-1', '100000.01', '1.234', 'abc', '1e3', '12,5']) {
      expect(parseFeeInput(bad)).toEqual({ ok: false });
    }
  });
});
