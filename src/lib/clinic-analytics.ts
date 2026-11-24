import { clinicDateKey, clinicTodayKey } from './clinic-booking-time';

/**
 * QA-226: the numbers on the clinic Analytics page.
 *
 * The page used to count every visit, including cancelled ones, bucket months by the browser's
 * clock, count future bookings as "active patients in the last 90 days", and only ever see the
 * first 1,000 visits (the page now reads them all in pages).
 */
export interface AnalyticsVisit {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  status: string;
}

/** Cancelled visits did not happen and are not counted anywhere on the page. */
export const isCountedVisit = (visit: { status: string }) => visit.status !== 'cancelled';

/** A visit that took place (it is in the past and was neither cancelled nor missed). */
const isAttendedPastVisit = (visit: AnalyticsVisit, now: Date) =>
  visit.status !== 'cancelled' && visit.status !== 'no_show' && new Date(visit.scheduled_at).getTime() <= now.getTime();

export const ACTIVE_PATIENT_DAYS = 90;
export const CHART_MONTHS = 6;

/** "YYYY-MM" of the clinic month `offset` months from the clinic month of `now`. */
const clinicMonthKey = (now: Date, offset: number): string => {
  const [year, month] = clinicTodayKey(now).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export interface ClinicVisitSummary {
  /** visits that were not cancelled, all time */
  totalAppointments: number;
  /** patients with a visit that took place in the last 90 days */
  activePatients: number;
  /** last 6 clinic months, oldest first: "YYYY-MM" and the number of visits (not cancelled) */
  months: { key: string; count: number }[];
  /** visits (not cancelled) per doctor id */
  perDoctor: Map<string, number>;
}

export const summariseClinicVisits = (visits: AnalyticsVisit[], now: Date = new Date()): ClinicVisitSummary => {
  const counted = visits.filter(isCountedVisit);

  const since = now.getTime() - ACTIVE_PATIENT_DAYS * 24 * 60 * 60 * 1000;
  const activePatients = new Set(
    counted
      .filter((visit) => isAttendedPastVisit(visit, now) && new Date(visit.scheduled_at).getTime() >= since)
      .map((visit) => visit.patient_id)
  ).size;

  const months = Array.from({ length: CHART_MONTHS }, (_, index) => ({
    key: clinicMonthKey(now, index - (CHART_MONTHS - 1)),
    count: 0,
  }));
  const monthIndex = new Map(months.map((month, index) => [month.key, index]));

  const perDoctor = new Map<string, number>();
  for (const visit of counted) {
    const index = monthIndex.get(clinicDateKey(visit.scheduled_at).slice(0, 7));
    if (index !== undefined) months[index].count += 1;
    perDoctor.set(visit.doctor_id, (perDoctor.get(visit.doctor_id) ?? 0) + 1);
  }

  return { totalAppointments: counted.length, activePatients, months, perDoctor };
};

/** Is the visit in the current clinic month? */
export const isInClinicMonth = (scheduledAt: string, now: Date = new Date()) =>
  clinicDateKey(scheduledAt).slice(0, 7) === clinicTodayKey(now).slice(0, 7);
