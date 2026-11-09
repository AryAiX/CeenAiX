import { describe, expect, it } from 'vitest';
import { validateBloodPressure } from './use-patient-vitals';

describe('validateBloodPressure', () => {
  it('accepts an ordinary reading, the range edges, and a recordable hypertensive reading', () => {
    expect(validateBloodPressure(120, 80)).toBeNull();
    expect(validateBloodPressure(70, 40)).toBeNull();
    expect(validateBloodPressure(250, 150)).toBeNull();
    expect(validateBloodPressure(180, 110)).toBeNull();
  });

  it('rejects systolic values outside the allowed range', () => {
    expect(validateBloodPressure(0, 0)).toBe('systolicRange');
    expect(validateBloodPressure(400, 300)).toBe('systolicRange');
  });

  it('rejects an out-of-range diastolic', () => {
    expect(validateBloodPressure(120, 30)).toBe('diastolicRange');
    expect(validateBloodPressure(180, 160)).toBe('diastolicRange');
  });

  it('rejects a diastolic that is not below systolic', () => {
    expect(validateBloodPressure(80, 120)).toBe('diastolicNotBelowSystolic');
    expect(validateBloodPressure(120, 120)).toBe('diastolicNotBelowSystolic');
  });

  it('rejects NaN and fractional values', () => {
    expect(validateBloodPressure(Number.NaN, 80)).toBe('systolicRange');
    expect(validateBloodPressure(120, Number.NaN)).toBe('diastolicRange');
    expect(validateBloodPressure(120.5, 80)).toBe('systolicRange');
    expect(validateBloodPressure(120, 80.5)).toBe('diastolicRange');
  });
});
