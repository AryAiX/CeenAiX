import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { hasLabResultValue, summarizeLabItemForReport } from './lab-report-item';

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
