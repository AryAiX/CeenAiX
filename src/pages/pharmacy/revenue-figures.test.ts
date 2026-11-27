// QA-279: Revenue figures by what they say, using Dubai dates.
process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';
import { summarizeRevenue } from './revenue-figures';

const claim = (status: 'paid' | 'review' | 'pending' | 'denied', amountAed: number, paidAt: string | null = null) => ({
  status,
  amountAed,
  paidAt,
});

describe('summarizeRevenue (QA-279)', () => {
  it('counts paid claims by their Dubai paid date, and keeps outstanding and denied apart', () => {
    const figures = summarizeRevenue(
      [
        // 27 Nov 2026 01:00 in Dubai (still 26 Nov in UTC and New York): paid today.
        claim('paid', 100, '2026-11-26T21:00:00Z'),
        claim('paid', 300, '2026-11-27T08:00:00Z'),
        // 26 Nov in Dubai: this month, not today.
        claim('paid', 200, '2026-11-26T10:00:00Z'),
        // October: neither.
        claim('paid', 999, '2026-10-30T10:00:00Z'),
        // Paid but no paid date: not counted.
        claim('paid', 50, null),
        claim('pending', 120),
        claim('review', 80),
        claim('review', 40),
        claim('denied', 70),
      ],
      '2026-11-27'
    );
    expect(figures.paidToday).toEqual({ amount: 400, count: 2 });
    expect(figures.paidThisMonth).toEqual({ amount: 600, count: 3, average: 200 });
    expect(figures.outstanding).toEqual({ amount: 240, count: 3, inReview: 2 });
    expect(figures.denied).toEqual({ amount: 70, count: 1 });
  });

  it('shows zeros with no claims', () => {
    expect(summarizeRevenue([], '2026-11-27')).toEqual({
      paidToday: { amount: 0, count: 0 },
      paidThisMonth: { amount: 0, count: 0, average: 0 },
      outstanding: { amount: 0, count: 0, inReview: 0 },
      denied: { amount: 0, count: 0 },
    });
  });
});
