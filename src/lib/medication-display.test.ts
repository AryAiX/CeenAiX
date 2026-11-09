import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  formatMedicationDetailLine,
  localizeMedicationDosageValue,
  normalizeMedicationDosageValue,
} from './medication-display';

const fakeT = ((key: string, options?: Record<string, unknown>) => {
  const count = options?.count;
  const dictionary: Record<string, string> = {
    'patient.dashboard.medUnitMg': 'ملغ',
    'patient.dashboard.medUnitMcg': 'مكغ',
    'patient.dashboard.medUnitG': 'غ',
    'patient.dashboard.medUnitMl': 'مل',
    'patient.dashboard.medUnitL': 'ل',
    'patient.dashboard.medUnitMeq': 'ملي مكافئ',
    'patient.dashboard.medUnitMmol': 'مليمول',
    'patient.dashboard.medUnitIu': 'وحدة دولية',
    'patient.dashboard.medUnitUnit': 'وحدة',
    'patient.dashboard.medUnitUnits': 'وحدات',
    'patient.dashboard.medFreq.onceDaily': 'مرة يومياً',
    'patient.dashboard.medFreq.twiceDaily': 'مرتان يومياً',
    'patient.dashboard.medFreq.threeTimesDaily': 'ثلاث مرات يومياً',
    'patient.dashboard.medFreq.fourTimesDaily': 'أربع مرات يومياً',
    'patient.dashboard.medDurationDays': `${count ?? ''} يوماً`.trim(),
    'patient.dashboard.medActiveFallback': 'وصفة طبية نشطة',
  };

  return dictionary[key] ?? key;
}) as TFunction;

describe('medication attribute localization', () => {
  it('normalizes Arabic dosage input into canonical storage format', () => {
    expect(normalizeMedicationDosageValue('١٠٠ ملغ')).toBe('100 MG');
    expect(normalizeMedicationDosageValue('10 ملغ / مل')).toBe('10 MG/ML');
  });

  it('localizes dosage values for Arabic UI', () => {
    expect(localizeMedicationDosageValue(fakeT, 'ar', '100 MG')).toBe('١٠٠ ملغ');
    expect(localizeMedicationDosageValue(fakeT, 'ar', '10 MG/ML')).toBe('١٠ ملغ/مل');
  });

  it('formats medication detail lines with localized dosage, frequency, and duration', () => {
    expect(
      formatMedicationDetailLine(fakeT, 'ar', {
        dosage: '100 MG',
        frequency: 'once daily',
        duration: '7 days',
        detail: '',
      })
    ).toBe('١٠٠ ملغ • مرة يومياً • ٧ يوماً');
  });

  it('localizes free-text "a day" frequencies for Arabic, regardless of case', () => {
    const line = (frequency: string) =>
      formatMedicationDetailLine(fakeT, 'ar', {
        dosage: null,
        frequency,
        duration: null,
        detail: '',
      });

    expect(line('once a day')).toBe('مرة يومياً');
    expect(line('twice a day')).toBe('مرتان يومياً');
    expect(line('Three times a day')).toBe('ثلاث مرات يومياً');
    expect(line('four times a day')).toBe('أربع مرات يومياً');
  });

  it('returns an unrecognised frequency unchanged', () => {
    expect(
      formatMedicationDetailLine(fakeT, 'ar', {
        dosage: null,
        frequency: 'every other Tuesday',
        duration: null,
        detail: '',
      })
    ).toBe('every other Tuesday');
  });
});
