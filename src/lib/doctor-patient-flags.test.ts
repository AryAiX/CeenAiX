import i18next, { type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import arExtra from '../locales/ar/extra.json';
import enExtra from '../locales/en/extra.json';
import type { DoctorPatientFlag, DoctorPatientSummary } from '../hooks/use-doctor-patients';
import { firstAllergyLabel, flagClasses, flagIcon, flagLabel } from './doctor-patient-flags';

let tEn: TFunction;
let tAr: TFunction;

beforeAll(async () => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { common: enExtra }, ar: { common: arExtra } },
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  tEn = instance.getFixedT('en');
  tAr = instance.getFixedT('ar');
});

const severe: DoctorPatientFlag = { kind: 'allergy', allergen: 'Penicillin', severity: 'severe' };
const mild: DoctorPatientFlag = { kind: 'allergy', allergen: 'Latex', severity: 'mild' };
const noSeverity: DoctorPatientFlag = { kind: 'allergy', allergen: 'Dust', severity: null };

describe('doctor patient flags (QA-131)', () => {
  it('labels every flag kind in English', () => {
    expect(flagLabel(tEn, severe)).toBe('Allergy: Penicillin (Severe)');
    expect(flagLabel(tEn, noSeverity)).toBe('Allergy: Dust');
    expect(flagLabel(tEn, { kind: 'inSession' })).toBe('In session');
    expect(flagLabel(tEn, { kind: 'priorNoShow' })).toBe('Prior no-show');
    expect(flagLabel(tEn, { kind: 'newPatient' })).toBe('New patient');
  });

  it('labels flags in Arabic, including the severity word', () => {
    expect(flagLabel(tAr, severe)).toBe('حساسية: Penicillin (شديد)');
    expect(flagLabel(tAr, { kind: 'newPatient' })).toBe('مريض جديد');
  });

  it('keeps the severe-allergy alert style based on the severity field, not the text', () => {
    expect(flagClasses(severe)).toContain('animate-pulse');
    expect(flagClasses(mild)).not.toContain('animate-pulse');
    expect(flagClasses({ kind: 'priorNoShow' })).toContain('amber');
  });

  it('shows the warning icon for allergies and a dot for in-session', () => {
    expect(flagIcon(mild)).toBe('⚠️ ');
    expect(flagIcon({ kind: 'inSession' })).toBe('● ');
    expect(flagIcon({ kind: 'newPatient' })).toBe('');
  });

  it('returns the first allergy without the prefix, or null', () => {
    const patient = { flags: [{ kind: 'newPatient' }, mild, severe] } as DoctorPatientSummary;
    expect(firstAllergyLabel(tAr, patient)).toBe('Latex (خفيف)');
    expect(firstAllergyLabel(tEn, { flags: [] as DoctorPatientFlag[] } as DoctorPatientSummary)).toBeNull();
  });
});
