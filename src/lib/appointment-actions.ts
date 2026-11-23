import type { AppointmentStatus } from '../types/enums';
import { CLINIC_TIME_ZONE, calendarDayKeyInTimeZone } from './i18n-ui';

/**
 * QA-121: which status changes a doctor may make from the appointment detail page.
 *
 * Before this, In Progress / Completed / No-Show were always clickable, so a doctor could
 * mark a cancelled appointment as completed, mark next week's visit as a no-show, or flip
 * a completed visit to a no-show. Cancel was also offered after the start time had passed.
 *
 * Rules (approved in the doctor QA pass):
 * - Completed, No-Show and Cancelled are final.
 * - A visit on a future day (Dubai calendar) cannot be started or completed yet.
 * - No-Show only once the start time has passed; Cancel only before it.
 * - In Progress can only move on to Completed.
 */

export interface DoctorAppointmentActions {
  canStart: boolean;
  canComplete: boolean;
  canMarkNoShow: boolean;
  canCancel: boolean;
}

type AppointmentLike = { status: AppointmentStatus; scheduled_at: string };

export const getDoctorAppointmentActions = (
  appointment: AppointmentLike,
  now: Date = new Date()
): DoctorAppointmentActions => {
  const isOpen = appointment.status === 'scheduled' || appointment.status === 'confirmed';
  const start = new Date(appointment.scheduled_at);
  const startsOnFutureDay =
    calendarDayKeyInTimeZone(start, CLINIC_TIME_ZONE) > calendarDayKeyInTimeZone(now, CLINIC_TIME_ZONE);
  const hasStarted = start.getTime() <= now.getTime();

  return {
    canStart: isOpen && !startsOnFutureDay,
    canComplete: (isOpen && !startsOnFutureDay) || appointment.status === 'in_progress',
    canMarkNoShow: isOpen && hasStarted,
    canCancel: isOpen && !hasStarted,
  };
};

export const canDoctorSetStatus = (
  appointment: AppointmentLike,
  next: 'in_progress' | 'completed' | 'no_show',
  now: Date = new Date()
) => {
  const actions = getDoctorAppointmentActions(appointment, now);
  if (next === 'in_progress') return actions.canStart;
  if (next === 'completed') return actions.canComplete;
  return actions.canMarkNoShow;
};

/**
 * QA-190: what clinic staff (admin / manager) may do from the clinic Appointments page.
 * Must match public.clinic_set_appointment_status (20261123000001), which enforces the same rules.
 *
 * - Confirm: scheduled, before the start time.
 * - Cancel: scheduled or confirmed, before the start time (patient and doctor are notified).
 * - No-show: scheduled or confirmed, once the start time has passed.
 * - In progress / Completed are the doctor's (they record that the visit happened).
 * - Completed, cancelled and no-show are final.
 */
export interface ClinicAppointmentActions {
  canConfirm: boolean;
  canCancel: boolean;
  canMarkNoShow: boolean;
}

export type ClinicAppointmentStatusChange = 'confirmed' | 'cancelled' | 'no_show';

export const getClinicAppointmentActions = (
  appointment: { status: string; scheduled_at: string },
  now: Date = new Date()
): ClinicAppointmentActions => {
  const isOpen = appointment.status === 'scheduled' || appointment.status === 'confirmed';
  const hasStarted = new Date(appointment.scheduled_at).getTime() <= now.getTime();
  return {
    canConfirm: appointment.status === 'scheduled' && !hasStarted,
    canCancel: isOpen && !hasStarted,
    canMarkNoShow: isOpen && hasStarted,
  };
};
