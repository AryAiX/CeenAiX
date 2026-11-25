import { describe, expect, it } from 'vitest';
import {
  buildClinicBookingSlots,
  clinicDateKey,
  clinicDayOfWeek,
  clinicDayRangeUtc,
  clinicTimeOfDay,
  clinicTodayKey,
  clinicWallTimeToUtcIso,
} from './clinic-booking-time';

describe('clinic booking time (QA-189)', () => {
  it('stores a 09:00 clinic booking as 05:00 UTC, not 09:00 UTC', () => {
    expect(clinicWallTimeToUtcIso('2026-11-24', '09:00')).toBe('2026-11-24T05:00:00.000Z');
    expect(clinicWallTimeToUtcIso('2026-11-24', '02:30')).toBe('2026-11-23T22:30:00.000Z');
    expect(() => clinicWallTimeToUtcIso('', '09:00')).toThrow();
  });

  it('reads stored times back as clinic date and clinic time', () => {
    expect(clinicTimeOfDay('2026-11-24T05:00:00Z')).toBe('09:00');
    expect(clinicDateKey('2026-11-24T05:00:00Z')).toBe('2026-11-24');
    // 01:00 Dubai on the 24th is still the 23rd in UTC
    expect(clinicTimeOfDay('2026-11-23T21:00:00Z')).toBe('01:00');
    expect(clinicDateKey('2026-11-23T21:00:00Z')).toBe('2026-11-24');
    expect(clinicTimeOfDay('2026-11-23T20:00:00Z')).toBe('00:00');
  });

  it('uses the Dubai day for "today", also between 00:00 and 04:00 Dubai', () => {
    expect(clinicTodayKey(new Date('2026-11-23T20:30:00Z'))).toBe('2026-11-24');
    expect(clinicTodayKey(new Date('2026-11-24T19:59:00Z'))).toBe('2026-11-24');
  });

  it('gives the UTC range of a clinic day and its weekday', () => {
    expect(clinicDayRangeUtc('2026-11-24')).toEqual({
      startIso: '2026-11-23T20:00:00.000Z',
      endIso: '2026-11-24T19:59:59.999Z',
    });
    expect(clinicDayOfWeek('2026-11-24')).toBe(2); // Tuesday
    expect(clinicDayOfWeek('2026-11-22')).toBe(0); // Sunday
  });
});

describe('buildClinicBookingSlots (QA-189)', () => {
  const availability = [{ start_time: '09:00:00', end_time: '11:00:00', slot_duration_minutes: 30 }];
  const tomorrowNow = new Date('2026-11-23T08:00:00Z'); // 12:00 Dubai on the 23rd

  it('treats a booked 09:30 Dubai visit (05:30 UTC) as taken', () => {
    const slots = buildClinicBookingSlots({
      dateKey: '2026-11-24',
      availability,
      blocked: [],
      booked: [{ scheduled_at: '2026-11-24T05:30:00Z', duration_minutes: 30 }],
      now: tomorrowNow,
    });
    expect(slots).toEqual(['09:00', '10:00', '10:30']);
  });

  it('ignores visits on another clinic day and respects blocked time', () => {
    const slots = buildClinicBookingSlots({
      dateKey: '2026-11-24',
      availability,
      blocked: [{ start_time: '10:00:00', end_time: '11:00:00' }],
      booked: [{ scheduled_at: '2026-11-25T05:00:00Z', duration_minutes: 30 }],
      now: tomorrowNow,
    });
    expect(slots).toEqual(['09:00', '09:30']);
  });

  it('leaves out slots that have already started today', () => {
    const slots = buildClinicBookingSlots({
      dateKey: '2026-11-24',
      availability,
      blocked: [],
      booked: [],
      now: new Date('2026-11-24T05:10:00Z'), // 09:10 Dubai
    });
    expect(slots).toEqual(['09:30', '10:00', '10:30']);
  });

  it('does not repeat a slot when two working windows overlap', () => {
    const slots = buildClinicBookingSlots({
      dateKey: '2026-11-24',
      availability: [
        { start_time: '09:00', end_time: '10:00', slot_duration_minutes: 30 },
        { start_time: '09:30', end_time: '10:30', slot_duration_minutes: 30 },
      ],
      blocked: [],
      booked: [],
      now: tomorrowNow,
    });
    expect(slots).toEqual(['09:00', '09:30', '10:00']);
  });
});
