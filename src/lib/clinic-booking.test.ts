import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import i18n from '../i18n';
import {
  appointmentTypeForReason,
  doctorFilterOptions,
  isBookableClinicDoctor,
  bookClinicAppointment,
  clinicBookingErrorKey,
  isClinicSlotUnavailable,
} from './clinic-booking';

describe('clinic booking helper (QA-191)', () => {
  it('sends one clinic_book_appointment call with the Dubai time as UTC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'appt-1', error: null });
    const result = await bookClinicAppointment({ rpc } as unknown as SupabaseClient, {
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      date: '2026-11-24',
      time: '09:00',
      reason: 'Follow-up Visit',
      notes: '   ',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('clinic_book_appointment', {
      p_doctor_id: 'doctor-1',
      p_patient_id: 'patient-1',
      p_scheduled_at: '2026-11-24T05:00:00.000Z',
      p_type: 'in_person',
      p_chief_complaint: 'Follow-up Visit',
      p_notes: null,
    });
    expect(result).toEqual({ id: 'appt-1', scheduledAt: '2026-11-24T05:00:00.000Z' });
  });

  it('throws the database error so the popup can explain it', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: '23P01', message: 'x' } });
    await expect(
      bookClinicAppointment({ rpc } as unknown as SupabaseClient, {
        doctorId: 'd', patientId: 'p', date: '2026-11-24', time: '09:00', reason: 'Consultation', notes: '',
      })
    ).rejects.toMatchObject({ code: '23P01' });
  });

  it('maps telemedicine to a virtual visit', () => {
    expect(appointmentTypeForReason('Telemedicine')).toBe('virtual');
    expect(appointmentTypeForReason('Consultation')).toBe('in_person');
  });

  it('gives plain messages and knows when to reload the slots', () => {
    const message = (err: unknown) => i18n.t(clinicBookingErrorKey(err), { lng: 'en' });
    expect(message({ code: '23P01', message: 'This time slot is already booked.' })).toBe(
      'This time was just booked. The free slots have been refreshed; please choose another.'
    );
    expect(message({ code: '42501' })).toBe('Only clinic admins and managers can book appointments.');
    expect(message({ code: 'P0002' })).toBe('This doctor or patient can no longer be booked at this clinic.');
    expect(message(new Error('boom'))).toBe('Could not book the appointment. Please try again.');
    expect(isClinicSlotUnavailable({ code: '23P01' })).toBe(true);
    expect(isClinicSlotUnavailable({ code: '22023' })).toBe(true);
    expect(isClinicSlotUnavailable({ code: '42501' })).toBe(false);
  });
});

describe('clinic doctor lists (QA-194)', () => {
  it('only accepted / active, still-active links can be booked', () => {
    expect(isBookableClinicDoctor({ is_active: true, invitation_status: 'accepted' })).toBe(true);
    expect(isBookableClinicDoctor({ is_active: true, invitation_status: 'active' })).toBe(true);
    for (const status of ['pending', 'invited', 'declined', 'cancelled', 'removed', null]) {
      expect(isBookableClinicDoctor({ is_active: true, invitation_status: status })).toBe(false);
    }
    expect(isBookableClinicDoctor({ is_active: false, invitation_status: 'accepted' })).toBe(false);
  });

  it('builds filter choices by id, without repeats, sorted by name', () => {
    expect(
      doctorFilterOptions([
        { id: 'd2', name: 'Dr B' },
        { id: 'd1', name: 'Dr A' },
        { id: 'd2', name: 'Dr B' },
        { id: 'd3', name: 'Dr A' },
        { id: '', name: 'Nobody' },
      ])
    ).toEqual([
      { id: 'd1', name: 'Dr A' },
      { id: 'd3', name: 'Dr A' },
      { id: 'd2', name: 'Dr B' },
    ]);
  });
});
