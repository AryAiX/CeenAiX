import { describe, expect, it } from 'vitest';
import { doctorsForToday, summariseToday } from './clinic-dashboard';

const v = (status: string, doctor_id = 'd1') => ({ status, doctor_id });

describe('summariseToday (QA-234)', () => {
  it('leaves cancelled visits out of the totals but shows every status in the breakdown', () => {
    const summary = summariseToday([v('completed'), v('confirmed'), v('scheduled'), v('no_show'), v('cancelled', 'd2')]);
    expect(summary.total).toBe(4);
    expect(summary.confirmed).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.breakdown.map((b) => [b.status, b.count])).toEqual([
      ['completed', 1], ['in_progress', 0], ['confirmed', 1], ['scheduled', 1], ['no_show', 1], ['cancelled', 1],
    ]);
    expect(summary.breakdown.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(1);
    expect(Object.fromEntries(summary.perDoctor)).toEqual({ d1: 4 });
  });

  it('is all zero on a day without visits', () => {
    const summary = summariseToday([]);
    expect(summary.total).toBe(0);
    expect(summary.breakdown.every((b) => b.share === 0)).toBe(true);
  });
});

describe('doctorsForToday (QA-234)', () => {
  it('lists the busiest doctors first, then by name, at most 4', () => {
    const doctors = ['Eve', 'Dan', 'Cid', 'Bea', 'Ali'].map((name) => ({ doctorUserId: name.toLowerCase(), name }));
    const rows = doctorsForToday(doctors, new Map([['eve', 3], ['bea', 1]]));
    expect(rows.map((r) => [r.name, r.appts])).toEqual([['Eve', 3], ['Bea', 1], ['Ali', 0], ['Cid', 0]]);
  });
});
