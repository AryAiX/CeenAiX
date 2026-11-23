import type { SupabaseClient } from '@supabase/supabase-js';
import { clinicWallTimeToUtcIso } from './clinic-booking-time';

/**
 * QA-191: clinic bookings go through public.clinic_book_appointment (20261123000002), which
 * checks the slot again (working hours, blocked time, any overlapping visit of the doctor at
 * any clinic), saves the appointment and notifies the patient and the doctor in one transaction.
 * Used by both the clinic Appointments page and the clinic Patients page.
 */

export const CLINIC_APPOINTMENT_REASONS = [
  'Consultation',
  'Follow-up Visit',
  'General Checkup',
  'Diabetes Management',
  'Lab Results Review',
  'Radiology Review',
  'Specialist Referral',
  'Telemedicine',
] as const;

/**
 * QA-194: only doctors whose clinic link is accepted / active can be booked
 * (same rule as clinic_book_appointment). Pending, invited, declined or removed links are not offered.
 */
export const CLINIC_BOOKABLE_DOCTOR_STATUSES = ['accepted', 'active'] as const;

export const isBookableClinicDoctor = (link: { is_active?: boolean | null; invitation_status?: string | null }) =>
  link.is_active !== false &&
  (CLINIC_BOOKABLE_DOCTOR_STATUSES as readonly string[]).includes(link.invitation_status ?? '');

/** QA-194: doctor filter choices by doctor id (two doctors can share a name), sorted by name. */
export const doctorFilterOptions = (doctors: { id: string; name: string }[]) => {
  const byId = new Map<string, string>();
  for (const doctor of doctors) {
    if (doctor.id && !byId.has(doctor.id)) byId.set(doctor.id, doctor.name);
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
};

export const appointmentTypeForReason = (reason: string): 'in_person' | 'virtual' =>
  reason === 'Telemedicine' ? 'virtual' : 'in_person';

export interface ClinicBookingInput {
  doctorId: string;
  patientId: string;
  /** Clinic (Dubai) date, YYYY-MM-DD */
  date: string;
  /** Clinic (Dubai) start time, HH:MM */
  time: string;
  reason: string;
  notes: string;
}

export const bookClinicAppointment = async (client: SupabaseClient, input: ClinicBookingInput) => {
  const scheduledAt = clinicWallTimeToUtcIso(input.date, input.time);
  const { data, error } = await client.rpc('clinic_book_appointment', {
    p_doctor_id: input.doctorId,
    p_patient_id: input.patientId,
    p_scheduled_at: scheduledAt,
    p_type: appointmentTypeForReason(input.reason),
    p_chief_complaint: input.reason,
    p_notes: input.notes.trim() ? input.notes.trim() : null,
  });
  if (error) throw error;
  return { id: data as string, scheduledAt };
};

const errorCode = (err: unknown) => (err as { code?: string } | null)?.code;

/** The chosen slot was taken or is no longer bookable: reload the slots and pick again. */
export const isClinicSlotUnavailable = (err: unknown) => {
  const code = errorCode(err);
  return code === '23P01' || code === '22023';
};

/** Plain message for a refused booking (never the raw database text). */
export const clinicBookingErrorMessage = (err: unknown): string => {
  switch (errorCode(err)) {
    case '23P01':
      return 'This time was just booked. The free slots have been refreshed; please choose another.';
    case '22023':
      return 'This time is no longer available. The free slots have been refreshed; please choose another.';
    case 'P0002':
      return 'This doctor or patient can no longer be booked at this clinic.';
    case '42501':
      return 'Only clinic admins and managers can book appointments.';
    default:
      return 'Could not book the appointment. Please try again.';
  }
};
