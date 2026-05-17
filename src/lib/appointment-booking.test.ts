import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Appointment, BlockedSlot, DoctorAvailability } from '../types';
import {
  buildScheduledAtIso,
  formatDateKey,
  generateAvailableTimeSlots,
} from './appointment-booking';

const availability = (overrides: Partial<DoctorAvailability> = {}): DoctorAvailability => ({
  id: 'avail-1',
  doctor_id: 'doctor-1',
  facility_id: null,
  day_of_week: 1, // Monday
  start_time: '09:00',
  end_time: '12:00',
  slot_duration_minutes: 30,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const blockedSlot = (overrides: Partial<BlockedSlot> = {}): BlockedSlot => ({
  id: 'blocked-1',
  doctor_id: 'doctor-1',
  blocked_date: '2026-05-18',
  start_time: '10:00',
  end_time: '10:30',
  reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const appointmentFor = (date: string, time: string, overrides: Partial<Appointment> = {}): Appointment => {
  const iso = buildScheduledAtIso(new Date(date + 'T00:00:00'), time);
  return {
    id: `appt-${time}`,
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    facility_id: null,
    appointment_type_id: null,
    type: 'in_person',
    status: 'scheduled',
    scheduled_at: iso,
    duration_minutes: 30,
    chief_complaint: null,
    notes: null,
    is_deleted: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Appointment;
};

describe('generateAvailableTimeSlots', () => {
  beforeEach(() => {
    // 2026-05-18 (Monday) 06:00 local — well before the availability window
    // so all slots in the window are "future" for the past-filter test.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T06:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no slots when the doctor has no availability for that weekday', () => {
    const date = new Date('2026-05-19T00:00:00'); // Tuesday
    expect(
      generateAvailableTimeSlots({
        date,
        availabilities: [availability()], // Monday only
        blockedSlots: [],
        appointments: [],
      })
    ).toHaveLength(0);
  });

  it('returns 30-minute slots inside the availability window', () => {
    const date = new Date('2026-05-18T00:00:00');
    const slots = generateAvailableTimeSlots({
      date,
      availabilities: [availability()],
      blockedSlots: [],
      appointments: [],
    });
    expect(slots.map((slot) => slot.startTime)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
  });

  it('excludes slots that overlap a blocked window', () => {
    const date = new Date('2026-05-18T00:00:00');
    const slots = generateAvailableTimeSlots({
      date,
      availabilities: [availability()],
      blockedSlots: [blockedSlot()], // blocks 10:00–10:30
      appointments: [],
    });
    expect(slots.map((slot) => slot.startTime)).not.toContain('10:00');
  });

  it('excludes slots that overlap a scheduled/confirmed appointment', () => {
    const date = new Date('2026-05-18T00:00:00');
    const slots = generateAvailableTimeSlots({
      date,
      availabilities: [availability()],
      blockedSlots: [],
      appointments: [appointmentFor('2026-05-18', '09:30', { status: 'confirmed' })],
    });
    expect(slots.map((slot) => slot.startTime)).not.toContain('09:30');
  });

  it('ignores cancelled appointments when computing availability', () => {
    const date = new Date('2026-05-18T00:00:00');
    const slots = generateAvailableTimeSlots({
      date,
      availabilities: [availability()],
      blockedSlots: [],
      appointments: [appointmentFor('2026-05-18', '09:30', { status: 'cancelled' })],
    });
    expect(slots.map((slot) => slot.startTime)).toContain('09:30');
  });

  it('includes the slot that starts at the current minute (does not over-prune)', () => {
    // Now = 09:00, so the 09:00 slot starts exactly at "now" and must still
    // be bookable.
    vi.setSystemTime(new Date('2026-05-18T09:00:00'));
    const date = new Date('2026-05-18T00:00:00');
    const slots = generateAvailableTimeSlots({
      date,
      availabilities: [availability()],
      blockedSlots: [],
      appointments: [],
    });
    expect(slots.map((slot) => slot.startTime)).toContain('09:00');
  });
});

describe('formatDateKey', () => {
  it('returns a stable yyyy-MM-dd in local time', () => {
    expect(formatDateKey(new Date('2026-05-18T05:00:00'))).toBe('2026-05-18');
  });
});
