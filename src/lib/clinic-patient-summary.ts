import { clinicDateKey, clinicTodayKey } from './clinic-booking-time';

/**
 * QA-209: what the clinic Patients page shows about a patient's visits.
 *
 * Before, "Last Visit" and "Primary Doctor" came from the patient's latest booking of any kind,
 * so a visit next week or a cancelled one showed as their last visit; counts included cancelled
 * visits and no-shows, and "this month" used the browser's month.
 *
 * Now:
 *   * last visit  = latest COMPLETED visit;
 *   * next visit  = earliest scheduled / confirmed visit that has not started yet;
 *   * visits      = number of completed visits;
 *   * primary doctor = doctor of the last completed visit, else of the next visit.
 */
export interface VisitRow {
  doctor_id: string;
  scheduled_at: string;
  status: string;
}

export interface PatientVisitSummary {
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  completedVisits: number;
  primaryDoctorId: string | null;
}

export const summarisePatientVisits = (visits: VisitRow[], now: Date = new Date()): PatientVisitSummary => {
  const nowMs = now.getTime();
  const completed = visits
    .filter((v) => v.status === 'completed')
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const upcoming = visits
    .filter((v) => (v.status === 'scheduled' || v.status === 'confirmed') && new Date(v.scheduled_at).getTime() > nowMs)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return {
    lastVisitAt: completed[0]?.scheduled_at ?? null,
    nextVisitAt: upcoming[0]?.scheduled_at ?? null,
    completedVisits: completed.length,
    primaryDoctorId: completed[0]?.doctor_id ?? upcoming[0]?.doctor_id ?? null,
  };
};

/** True when the timestamp falls in the current clinic (Dubai) month. */
export const isInCurrentClinicMonth = (iso: string | null, now: Date = new Date()) =>
  iso !== null && clinicDateKey(iso).slice(0, 7) === clinicTodayKey(now).slice(0, 7);

/** Upcoming open visits (scheduled / confirmed, not started yet). */
export const countUpcomingVisits = (visits: VisitRow[], now: Date = new Date()) =>
  visits.filter((v) => (v.status === 'scheduled' || v.status === 'confirmed') && new Date(v.scheduled_at).getTime() > now.getTime()).length;
