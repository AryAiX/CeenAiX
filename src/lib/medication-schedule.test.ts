import { describe, expect, it } from 'vitest';
import { estimateDaysOfSupplyRemaining, estimateDosesPerDay } from './medication-schedule';

describe('estimateDosesPerDay', () => {
  it.each([
    ['BID', 2],
    ['twice daily', 2],
    ['three times a day', 3],
    ['QID', 4],
    ['every 4 hours', 6],
    ['q6h', 4],
    ['every other day', 0.5],
    ['weekly', 1 / 7],
    ['monthly', 1 / 30],
    ['once daily', 1],
    ['nightly', 1],
  ])('parses %s as %s doses/day', (frequency, expected) => {
    expect(estimateDosesPerDay(frequency)).toBeCloseTo(expected, 5);
  });

  it('returns null for unparseable frequencies rather than assuming 1/day', () => {
    expect(estimateDosesPerDay('after meals when tolerated')).toBeNull();
    expect(estimateDosesPerDay(null)).toBeNull();
    expect(estimateDosesPerDay('')).toBeNull();
  });
});

describe('estimateDaysOfSupplyRemaining', () => {
  it('divides quantity by dose count when both are known', () => {
    expect(estimateDaysOfSupplyRemaining(60, 'BID')).toBe(30);
    expect(estimateDaysOfSupplyRemaining(28, 'QID')).toBe(7);
  });

  it('returns null when the frequency is unparseable instead of skewing high', () => {
    expect(estimateDaysOfSupplyRemaining(60, 'as the doctor advises')).toBeNull();
  });

  it('returns null when quantity is missing or non-positive', () => {
    expect(estimateDaysOfSupplyRemaining(null, 'BID')).toBeNull();
    expect(estimateDaysOfSupplyRemaining(0, 'BID')).toBeNull();
  });
});
