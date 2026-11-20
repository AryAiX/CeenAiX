import { describe, expect, it } from 'vitest';
import { labResultSeverity, labResultValueText, needsCriticalReview } from './lab-severity';

const item = (overrides: Partial<Parameters<typeof labResultSeverity>[0]> = {}) => ({
  numeric_value: null,
  result_value: '6.5',
  status_category: null,
  is_abnormal: false,
  flag: null,
  ...overrides,
});

describe('lab result severity (QA-142)', () => {
  it('only calls a result critical when the lab marked it critical', () => {
    expect(labResultSeverity(item({ flag: 'HH' }))).toBe('critical');
    expect(labResultSeverity(item({ flag: 'LL' }))).toBe('critical');
    expect(labResultSeverity(item({ status_category: 'critical' }))).toBe('critical');
  });

  it('treats other out-of-range results as abnormal, not critical', () => {
    expect(labResultSeverity(item({ is_abnormal: true }))).toBe('abnormal');
    expect(labResultSeverity(item({ flag: 'H' }))).toBe('abnormal');
    expect(labResultSeverity(item({ status_category: 'high' }))).toBe('abnormal');
    expect(labResultSeverity(item({ status_category: 'borderline' }))).toBe('abnormal');
  });

  it('keeps normal and not-yet-resulted tests out of both', () => {
    expect(labResultSeverity(item())).toBe('normal');
    expect(labResultSeverity(item({ result_value: null, is_abnormal: true }))).toBe('pending');
  });

  it('stops asking for review once the order is reviewed', () => {
    const items = [item({ flag: 'HH' })];
    expect(needsCriticalReview({ status: 'resulted', items })).toBe(true);
    expect(needsCriticalReview({ status: 'reviewed', items })).toBe(false);
    expect(needsCriticalReview({ status: 'resulted', items: [item({ is_abnormal: true })] })).toBe(false);
  });

  it('shows the stored value, text first, then the number', () => {
    expect(labResultValueText({ result_value: '7.2', numeric_value: null, result_unit: '%' })).toBe('7.2 %');
    expect(labResultValueText({ result_value: null, numeric_value: 120, result_unit: 'mg/dL' })).toBe('120 mg/dL');
    expect(labResultValueText({ result_value: null, numeric_value: null, result_unit: 'mg/dL' })).toBe('mg/dL');
  });
});
