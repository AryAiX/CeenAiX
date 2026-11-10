import { describe, expect, it } from 'vitest';
import { hasArabicLetters, startsRightToLeft } from './pdf-report';

describe('PDF text direction (QA-069)', () => {
  it('detects Arabic letters', () => {
    expect(hasArabicLetters('فيتامين د')).toBe(true);
    expect(hasArabicLetters('LAB-2026-001 ٣')).toBe(true);
    expect(hasArabicLetters('HbA1c 6.1 %')).toBe(false);
  });

  it('lets the first Arabic or English letter decide the direction, like dir="auto"', () => {
    expect(startsRightToLeft('فيتامين ب12')).toBe(true);
    expect(startsRightToLeft('وصفة طبية — Atorvastatin')).toBe(true);
    expect(startsRightToLeft('HbA1c is improving. تحسّن السكر')).toBe(false);
    expect(startsRightToLeft('Dr. أحمد')).toBe(false);
    expect(startsRightToLeft('6.1 %')).toBe(false);
  });
});
