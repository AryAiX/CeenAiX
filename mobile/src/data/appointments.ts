import type { Appointment } from '@ceenaix/types';
import { useMemo } from 'react';
import { useAppointments } from '@/data/web/hooks/use-appointments';
import { usePatientPreVisitAssessments } from '@/data/web/hooks/use-pre-visit';
import { useQuery } from '@/hooks/use-query';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { supabase } from '@/lib/supabase';

// Mutations and page-level queries mirrored from the web patient
// Appointments / BookAppointment pages (those live inline in the web pages,
// not in shared hooks, so they are reproduced here query-for-query).

export const UPCOMING_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);
export const COMPLETED_STATUSES = new Set(['completed']);
export const CANCELLED_STATUSES = new Set(['cancelled', 'no_show']);

export interface DoctorAppointmentProfile {
  userId: string;
  fullName: string;
  specialty: string | null;
  city: string | null;
  address: string | null;
  avatarUrl: string | null;
}

export async function fetchDoctorProfiles(doctorIds: string[], fallbackName: string): Promise<DoctorAppointmentProfile[]> {
  if (doctorIds.length === 0) return [];
  const [{ data: userProfiles, error: userProfilesError }, { data: doctorProfiles, error: doctorProfilesError }] = await Promise.all([
    supabase.from('user_profiles').select('user_id, full_name, city, address, avatar_url').in('user_id', doctorIds),
    supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
  ]);
  if (userProfilesError) throw userProfilesError;
  if (doctorProfilesError) throw doctorProfilesError;
  const specialtyById = new Map((doctorProfiles ?? []).map((row) => [row.user_id as string, (row.specialization as string | null) ?? null]));
  return (userProfiles ?? []).map((row) => ({
    userId: row.user_id as string,
    fullName: (row.full_name as string | null) ?? fallbackName,
    specialty: specialtyById.get(row.user_id as string) ?? null,
    city: (row.city as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
  }));
}

export function useDoctorProfiles(doctorIds: string[], fallbackName: string) {
  const key = [...doctorIds].sort().join(',');
  return useQuery(() => fetchDoctorProfiles(doctorIds, fallbackName), [key]);
}

export function usePatientAppointmentsList(userId: string | null | undefined, fallbackDoctorName: string) {
  const appointments = useOfflineCache(useAppointments({ role: 'patient', userId: userId ?? '' }), userId ? `appointments:${userId}` : null);
  const preVisit = usePatientPreVisitAssessments(userId);
  const doctorIds = useMemo(() => Array.from(new Set((appointments.data ?? []).map((appointment) => appointment.doctor_id))), [appointments.data]);
  const doctors = useOfflineCache(useDoctorProfiles(doctorIds, fallbackDoctorName), userId ? `appointment-doctors:${userId}` : null);
  const doctorById = useMemo(() => new Map((doctors.data ?? []).map((doctor) => [doctor.userId, doctor])), [doctors.data]);
  const preVisitByAppointmentId = useMemo(() => new Map((preVisit.data ?? []).map((assessment) => [assessment.appointmentId, assessment])), [preVisit.data]);
  return {
    appointments: appointments.data ?? [],
    loading: appointments.loading,
    error: appointments.error,
    staleSince: appointments.staleSince,
    refreshing: appointments.refreshing,
    doctorById,
    preVisitByAppointmentId,
    refetch: async () => {
      await Promise.all([appointments.refetch(), preVisit.refetch(), doctors.refetch()]);
    },
  };
}

export const isUpcomingAppointment = (appointment: Appointment, now = Date.now()) =>
  UPCOMING_STATUSES.has(appointment.status) && new Date(appointment.scheduled_at).getTime() >= now;

async function getDoctorFacilityId(doctorId: string): Promise<string | null> {
  const { data } = await supabase
    .from('facility_staff')
    .select('facility_id')
    .eq('doctor_user_id', doctorId)
    .eq('is_active', true)
    .eq('invitation_status', 'accepted')
    .maybeSingle();
  return (data?.facility_id as string | undefined) ?? null;
}

export async function notifyClinicStaff(facilityId: string, title: string, body: string, actionUrl = '/clinic/appointments') {
  const { data: members } = await supabase.from('clinic_portal_members').select('user_id').eq('facility_id', facilityId).eq('is_active', true);
  if (!members || members.length === 0) return;
  await supabase.from('notifications').insert(
    members.map((member) => ({
      user_id: member.user_id,
      type: 'appointment' as const,
      title,
      body,
      action_url: actionUrl,
    }))
  );
}

const staffDate = (iso: string) => new Date(iso).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
const staffTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });

/** `cancel_patient_appointment` RPC + best-effort clinic staff notification (same as web). */
export async function cancelPatientAppointment(appointment: Pick<Appointment, 'id' | 'doctor_id' | 'scheduled_at'>, doctorName: string | null) {
  const { error } = await supabase.rpc('cancel_patient_appointment', { p_appointment_id: appointment.id });
  if (error) throw error;
  try {
    const facilityId = await getDoctorFacilityId(appointment.doctor_id);
    if (facilityId) {
      await notifyClinicStaff(
        facilityId,
        '❌ Appointment Cancelled',
        `A patient cancelled their appointment with ${doctorName ?? 'a doctor'} on ${staffDate(appointment.scheduled_at)} at ${staffTime(appointment.scheduled_at)}.`
      );
    }
  } catch {
    // Notification failure must not block the cancellation.
  }
}

export { getDoctorFacilityId, staffDate, staffTime };

export interface RescheduleSource {
  id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  chief_complaint: string | null;
  notes: string | null;
  status: string;
}

export function useRescheduleSource(appointmentId: string | null | undefined, userId: string | null | undefined) {
  return useQuery<RescheduleSource | null>(async () => {
    if (!appointmentId || !userId) return null;
    const { data, error } = await supabase
      .from('appointments')
      .select('id, doctor_id, scheduled_at, duration_minutes, chief_complaint, notes, status')
      .eq('id', appointmentId)
      .eq('patient_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    return data as RescheduleSource | null;
  }, [appointmentId ?? '', userId ?? '']);
}

export interface BookingSlot {
  iso: string;
  durationMinutes: number;
}

const patientWhen = (iso: string, locale: string) =>
  `${new Date(iso).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}`;

async function notifyStaffBestEffort(doctorId: string, title: string, body: string) {
  try {
    const facilityId = await getDoctorFacilityId(doctorId);
    if (facilityId) await notifyClinicStaff(facilityId, title, body);
  } catch {
    // Staff notifications are best-effort, as on the web.
  }
}

/**
 * Same insert, notifications and pre-visit lookup as web `BookAppointment`
 * `handleBooking` (new booking branch). Returns the appointment id and the
 * pre-visit assessment id when the doctor's template created one.
 */
export async function bookPatientAppointment(args: {
  patientId: string;
  doctor: { userId: string; fullName: string };
  type: 'in_person' | 'virtual';
  slot: BookingSlot;
  chiefComplaint: string;
  notes: string;
  locale: string;
}): Promise<{ appointmentId: string; preVisitAssessmentId: string | null }> {
  const facilityId = await getDoctorFacilityId(args.doctor.userId);
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: args.patientId,
      doctor_id: args.doctor.userId,
      facility_id: facilityId,
      type: args.type,
      status: 'scheduled',
      scheduled_at: args.slot.iso,
      duration_minutes: args.slot.durationMinutes,
      chief_complaint: args.chiefComplaint.trim(),
      notes: args.notes.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  const appointmentId = data.id as string;

  await supabase.from('notifications').insert({
    user_id: args.patientId,
    type: 'appointment',
    title: '📅 Appointment confirmed!',
    body: `Your appointment with ${args.doctor.fullName} has been confirmed for ${patientWhen(args.slot.iso, args.locale)}.`,
    action_url: `/patient/appointments/${appointmentId}`,
  });
  await notifyStaffBestEffort(
    args.doctor.userId,
    '📅 New Appointment Booked',
    `A patient has booked an appointment with ${args.doctor.fullName} on ${staffDate(args.slot.iso)} at ${staffTime(args.slot.iso)}.`
  );

  const { data: assessment, error: assessmentError } = await supabase
    .from('appointment_pre_visit_assessments')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle();
  if (assessmentError) throw assessmentError;
  return { appointmentId, preVisitAssessmentId: (assessment?.id as string | undefined) ?? null };
}

/** `reschedule_patient_appointment` RPC plus the same notifications as the web. */
export async function reschedulePatientAppointment(args: {
  patientId: string;
  appointmentId: string;
  doctor: { userId: string; fullName: string };
  slot: BookingSlot;
  chiefComplaint: string;
  notes: string;
  locale: string;
}): Promise<void> {
  const { error } = await supabase.rpc('reschedule_patient_appointment', {
    p_appointment_id: args.appointmentId,
    p_scheduled_at: args.slot.iso,
    p_duration_minutes: args.slot.durationMinutes,
    p_chief_complaint: args.chiefComplaint.trim(),
    p_notes: args.notes.trim(),
  });
  if (error) throw error;
  await supabase.from('notifications').insert({
    user_id: args.patientId,
    type: 'appointment',
    title: '📅 Appointment rescheduled!',
    body: `Your appointment with ${args.doctor.fullName} has been rescheduled to ${patientWhen(args.slot.iso, args.locale)}.`,
    action_url: `/patient/appointments/${args.appointmentId}`,
  });
  await notifyStaffBestEffort(
    args.doctor.userId,
    '🔄 Appointment Rescheduled',
    `A patient rescheduled their appointment with ${args.doctor.fullName} to ${staffDate(args.slot.iso)} at ${staffTime(args.slot.iso)}.`
  );
}
