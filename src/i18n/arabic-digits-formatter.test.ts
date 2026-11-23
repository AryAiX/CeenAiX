import { afterEach, describe, expect, it } from 'vitest';
import i18n from './index';
import { formatInterpolatedValue } from './arabic-digits-formatter';

const plain = (text: string) => text.replace(/[‎‏؜]/g, '');

describe('Arabic digits in translated text (QA-126)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows {{count}} with Arabic digits in Arabic', async () => {
    i18n.addResource('ar', 'common', 'qa126.items_other', '{{count}} عنصر');
    i18n.addResource('ar', 'common', 'qa126.items_few', '{{count}} عناصر');
    i18n.addResource('ar', 'common', 'qa126.items_many', '{{count}} عنصرًا');
    await i18n.changeLanguage('ar');
    expect(plain(i18n.t('qa126.items', { count: 5 }))).toBe('٥ عناصر');
    expect(plain(i18n.t('qa126.items', { count: 1250 }))).toBe('١٬٢٥٠ عنصرًا');
  });

  it('keeps Western digits in English', async () => {
    i18n.addResource('en', 'common', 'qa126.items_other', '{{count}} items');
    await i18n.changeLanguage('en');
    expect(i18n.t('qa126.items', { count: 5 })).toBe('5 items');
  });

  it('works for a real app string', async () => {
    await i18n.changeLanguage('ar');
    // doctor.shell.today.appointments_few = "{{value}} مواعيد" — value given as a number.
    expect(plain(i18n.t('doctor.shell.today.appointments', { count: 3, value: 3 }))).toBe('٣ مواعيد');
  });

  it('never changes strings, so clinical codes and IDs stay as they are', async () => {
    i18n.addResource('ar', 'common', 'qa126.code', 'رمز {{code}}');
    await i18n.changeLanguage('ar');
    expect(i18n.t('qa126.code', { code: '2345-7' })).toBe('رمز 2345-7');
    expect(i18n.t('qa126.code', { code: '12345' })).toBe('رمز 12345');
  });

  it('does not add a thousands separator to a year', () => {
    expect(formatInterpolatedValue(2026, 'ar', 'year')).toBe('٢٠٢٦');
    expect(formatInterpolatedValue(2026, 'ar', 'count')).toBe('٢٬٠٢٦');
  });

  it('leaves decimals, missing values and non-numbers alone where it should', () => {
    expect(formatInterpolatedValue(4.5, 'ar')).toBe('٤٫٥');
    expect(formatInterpolatedValue(undefined, 'ar')).toBeUndefined();
    expect(formatInterpolatedValue(Number.NaN, 'ar')).toBeNaN();
    expect(formatInterpolatedValue(7, 'en')).toBe(7);
  });
});
