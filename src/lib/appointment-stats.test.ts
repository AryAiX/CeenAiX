import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from '../types/enums';
import { isOnSchedule, noShowRatePercent, summarizeAppointments } from './appointment-stats';

const rows = (...statuses: AppointmentStatus[]) => statuses.map((status) => ({ status }));

// The six "today" rows from the QA demo data on dev.
const today = rows('completed', 'completed', 'in_progress', 'confirmed', 'scheduled', 'cancelled');

describe('summarizeAppointments', () => {
  it('does not count a cancelled appointment as booked', () => {
    expect(summarizeAppointments(today).booked).toBe(5);
    expect(summarizeAppointments(today).cancelled).toBe(1);
  });

  it('counts an in-progress visit as active only, never also as upcoming', () => {
    const summary = summarizeAppointments(today);
    expect(summary).toMatchObject({ done: 2, active: 1, upcoming: 2 });
  });

  it('keeps the buckets disjoint so they add up to booked', () => {
    const all = rows('scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled', 'completed');
    const s = summarizeAppointments(all);
    expect(s.done + s.active + s.upcoming + s.noShows).toBe(s.booked);
    expect(s.booked + s.cancelled).toBe(all.length);
  });

  it('counts no-shows separately from cancellations', () => {
    const month = rows('completed', 'no_show', 'cancelled', 'scheduled');
    expect(summarizeAppointments(month)).toMatchObject({ noShows: 1, cancelled: 1, booked: 3 });
  });

  it('handles an empty list', () => {
    expect(summarizeAppointments([])).toEqual({
      booked: 0,
      done: 0,
      active: 0,
      upcoming: 0,
      noShows: 0,
      cancelled: 0,
    });
  });
});

describe('noShowRatePercent', () => {
  it('uses booked appointments as the denominator, not cancelled ones', () => {
    // 1 no-show out of 3 booked (the cancellation is excluded) = 33.3%
    expect(noShowRatePercent(summarizeAppointments(rows('completed', 'no_show', 'cancelled', 'scheduled')))).toBe(33.3);
  });

  it('is 0 when nothing is booked', () => {
    expect(noShowRatePercent(summarizeAppointments(rows('cancelled')))).toBe(0);
  });
});

describe('isOnSchedule', () => {
  it('is false only for cancelled', () => {
    expect(isOnSchedule('cancelled')).toBe(false);
    expect(isOnSchedule('no_show')).toBe(true);
    expect(isOnSchedule('in_progress')).toBe(true);
  });
});
