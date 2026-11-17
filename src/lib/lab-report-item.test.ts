import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { hasLabResultValue, labItemDisplayStatus, summarizeLabItemForReport } from './lab-report-item';

const t = ((key: string) => key.replace('patient.labResults.pdf.', '')) as unknown as TFunction;

const item = (overrides: Record<string, unknown>) => ({
  numeric_value: null,
  result_value: null,
  result_unit: null,
  status: 'resulted',
  status_category: 'normal',
  status_label: null,
  is_abnormal: null,
  ...overrides,
}) as Parameters<typeof summarizeLabItemForReport>[0];

describe('summarizeLabItemForReport (QA-069)', () => {
  it('shows Pending, not Normal, for a test still waiting for its result', () => {
    expect(summarizeLabItemForReport(item({ status: 'processing' }), t, 'en')).toEqual({
      value: '',
      status: 'statusPending',
      tone: 'pending',
    });
  });

  it('gives no verdict for a finished test with no value (for example a scan with a written report)', () => {
    expect(summarizeLabItemForReport(item({ status: 'resulted', result_value: '  ' }), t, 'en')).toEqual({
      value: 'noValue',
      status: '',
      tone: 'none',
    });
  });

  it('keeps the value, unit and the lab label for a result in English', () => {
    expect(
      summarizeLabItemForReport(
        item({ numeric_value: 6.1, result_unit: '%', status_category: 'borderline', status_label: 'Prediabetic range' }),
        t,
        'en'
      )
    ).toEqual({ value: '6.1 %', status: 'Prediabetic range', tone: 'abnormal' });
  });

  it('uses the translated category in Arabic and treats elevated as high', () => {
    expect(
      summarizeLabItemForReport(item({ result_value: '128', result_unit: 'mg/dL', status_category: 'elevated', status_label: 'High' }), t, 'ar')
    ).toEqual({ value: '128 mg/dL', status: 'statusHigh', tone: 'abnormal' });
  });

  it('marks a result flagged abnormal even when its category says normal', () => {
    expect(summarizeLabItemForReport(item({ numeric_value: 3, is_abnormal: true }), t, 'en').tone).toBe('abnormal');
  });

  it('knows when a result has a value', () => {
    expect(hasLabResultValue({ numeric_value: 0, result_value: null })).toBe(true);
    expect(hasLabResultValue({ numeric_value: null, result_value: 'Positive' })).toBe(true);
    expect(hasLabResultValue({ numeric_value: null, result_value: ' ' })).toBe(false);
  });
});

describe('labItemDisplayStatus (QA-105)', () => {
  const row = (overrides: Record<string, unknown>) =>
    ({ numeric_value: null, result_value: null, status_category: null, is_abnormal: null, ...overrides }) as Parameters<
      typeof labItemDisplayStatus
    >[0];

  it('shows Pending for a test with no category and no result', () => {
    expect(labItemDisplayStatus(row({}))).toBe('pending');
    expect(labItemDisplayStatus(row({ result_value: '  ', is_abnormal: false }))).toBe('pending');
  });

  it('uses the lab flag when a result has a value but no category', () => {
    expect(labItemDisplayStatus(row({ numeric_value: 7.2, is_abnormal: true }))).toBe('abnormal');
    expect(labItemDisplayStatus(row({ result_value: 'Negative', is_abnormal: false }))).toBe('normal');
    expect(labItemDisplayStatus(row({ numeric_value: 0 }))).toBe('normal');
  });

  it('keeps a category the lab or doctor set', () => {
    expect(labItemDisplayStatus(row({ status_category: 'critical' }))).toBe('critical');
    expect(labItemDisplayStatus(row({ numeric_value: 5, status_category: 'normal' }))).toBe('normal');
    expect(labItemDisplayStatus(row({ numeric_value: 140, status_category: 'elevated' }))).toBe('high');
  });

  it('never shows Normal for a result the lab flagged abnormal', () => {
    expect(labItemDisplayStatus(row({ numeric_value: 9.9, status_category: 'normal', is_abnormal: true }))).toBe('abnormal');
    expect(labItemDisplayStatus(row({ numeric_value: 9.9, status_category: 'borderline', is_abnormal: true }))).toBe(
      'borderline'
    );
  });

  it('prints Abnormal in the PDF for a flagged result with no category', () => {
    expect(
      summarizeLabItemForReport(item({ numeric_value: 7.2, status_category: null, is_abnormal: true }), t, 'en')
    ).toEqual({ value: '7.2', status: 'statusAbnormal', tone: 'abnormal' });
  });
});
