import { isCountedVisit } from './clinic-analytics';

/**
 * QA-234: today's numbers on the clinic Dashboard.
 *
 * "Today" is the clinic's day (Dubai), not the browser's. Cancelled visits are not counted as
 * appointments; the status breakdown lists every status (no-shows and cancellations were missing,
 * and a no-show was labelled "Scheduled").
 */
export const DASHBOARD_STATUSES = ['completed', 'in_progress', 'confirmed', 'scheduled', 'no_show', 'cancelled'] as const;

export interface DashboardVisit {
  status: string;
  doctor_id: string;
}

export interface TodaySummary {
  /** visits today that were not cancelled */
  total: number;
  /** confirmed, in progress or completed */
  confirmed: number;
  /** booked but not confirmed yet */
  pending: number;
  /** every status, in a fixed order, with its share of all visits today (cancelled included) */
  breakdown: { status: (typeof DASHBOARD_STATUSES)[number]; count: number; share: number }[];
  /** visits today (not cancelled) per doctor id */
  perDoctor: Map<string, number>;
}

export const summariseToday = (visits: DashboardVisit[]): TodaySummary => {
  const counted = visits.filter(isCountedVisit);
  const perDoctor = new Map<string, number>();
  for (const visit of counted) perDoctor.set(visit.doctor_id, (perDoctor.get(visit.doctor_id) ?? 0) + 1);
  return {
    total: counted.length,
    confirmed: counted.filter((v) => ['confirmed', 'in_progress', 'completed'].includes(v.status)).length,
    pending: counted.filter((v) => v.status === 'scheduled').length,
    breakdown: DASHBOARD_STATUSES.map((status) => {
      const count = visits.filter((v) => v.status === status).length;
      return { status, count, share: visits.length ? count / visits.length : 0 };
    }),
    perDoctor,
  };
};

/** QA-234: the doctors shown on the Dashboard: busiest today first, then by name. */
export const doctorsForToday = <T extends { doctorUserId: string; name: string }>(
  doctors: T[],
  perDoctor: Map<string, number>,
  limit = 4
): (T & { appts: number })[] =>
  doctors
    .map((doctor) => ({ ...doctor, appts: perDoctor.get(doctor.doctorUserId) ?? 0 }))
    .sort((a, b) => b.appts - a.appts || a.name.localeCompare(b.name))
    .slice(0, limit);
