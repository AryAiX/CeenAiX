import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from '../types/enums';
import { canDoctorSetStatus, getDoctorAppointmentActions } from './appointment-actions';

// 19 Nov 2026, 12:00 in Dubai (UTC+4).
const NOW = new Date('2026-11-19T08:00:00Z');

const at = (status: AppointmentStatus, scheduledAtUtc: string) => ({ status, scheduled_at: scheduledAtUtc });

describe('getDoctorAppointmentActions', () => {
  it('scheduled later today: can start, complete and cancel, but not a no-show yet', () => {
    expect(getDoctorAppointmentActions(at('scheduled', '2026-11-19T10:00:00Z'), NOW)).toEqual({
      canStart: true,
      canComplete: true,
      canMarkNoShow: false,
      canCancel: true,
    });
  });

  it('confirmed earlier today: can start, complete or mark no-show, but no longer cancel', () => {
    expect(getDoctorAppointmentActions(at('confirmed', '2026-11-19T05:00:00Z'), NOW)).toEqual({
      canStart: true,
      canComplete: true,
      canMarkNoShow: true,
      canCancel: false,
    });
  });

  it('next week: cannot be started, completed or marked no-show; can be cancelled', () => {
    expect(getDoctorAppointmentActions(at('scheduled', '2026-11-26T06:00:00Z'), NOW)).toEqual({
      canStart: false,
      canComplete: false,
      canMarkNoShow: false,
      canCancel: true,
    });
  });

  it('in progress: can only be completed', () => {
    expect(getDoctorAppointmentActions(at('in_progress', '2026-11-19T07:30:00Z'), NOW)).toEqual({
      canStart: false,
      canComplete: true,
      canMarkNoShow: false,
      canCancel: false,
    });
  });

  it.each(['completed', 'no_show', 'cancelled'] as const)('%s is final', (status) => {
    expect(getDoctorAppointmentActions(at(status, '2026-11-19T05:00:00Z'), NOW)).toEqual({
      canStart: false,
      canComplete: false,
      canMarkNoShow: false,
      canCancel: false,
    });
  });

  it('uses the Dubai calendar day, not UTC', () => {
    // 23:30 in Dubai on 19 Nov; the visit is at 00:30 Dubai on 20 Nov (still 19 Nov in UTC).
    const lateEvening = new Date('2026-11-19T19:30:00Z');
    const justAfterMidnightDubai = at('scheduled', '2026-11-19T20:30:00Z');
    expect(getDoctorAppointmentActions(justAfterMidnightDubai, lateEvening).canStart).toBe(false);
    expect(getDoctorAppointmentActions(justAfterMidnightDubai, lateEvening).canCancel).toBe(true);
  });
});

describe('canDoctorSetStatus', () => {
  it('blocks completing a cancelled appointment', () => {
    expect(canDoctorSetStatus(at('cancelled', '2026-11-19T05:00:00Z'), 'completed', NOW)).toBe(false);
  });

  it('blocks a no-show before the start time', () => {
    expect(canDoctorSetStatus(at('scheduled', '2026-11-19T10:00:00Z'), 'no_show', NOW)).toBe(false);
  });

  it('allows completing an in-progress visit', () => {
    expect(canDoctorSetStatus(at('in_progress', '2026-11-19T07:30:00Z'), 'completed', NOW)).toBe(true);
  });
});
