import type { AppointmentStatus } from '../types/enums';

/**
 * QA-115: single source of truth for how the doctor appointment KPIs bucket statuses.
 *
 * Before this, each counter filtered inline and they disagreed:
 * - totals counted cancelled appointments as if they were still on the schedule;
 * - "upcoming" included in_progress, which was already counted as "active", so the
 *   same visit appeared twice in "done · active · upcoming";
 * - "No-Shows This Month" also counted cancellations.
 *
 * The buckets below are disjoint. Every non-cancelled appointment falls into exactly
 * one of done / active / upcoming / noShows, so they always add up to `booked`.
 */

export interface AppointmentSummary {
  /** On the schedule: everything except cancelled. */
  booked: number;
  /** completed */
  done: number;
  /** in_progress */
  active: number;
  /** scheduled or confirmed: not started yet */
  upcoming: number;
  /** no_show */
  noShows: number;
  /** cancelled: excluded from `booked` */
  cancelled: number;
}

export const isOnSchedule = (status: AppointmentStatus) => status !== 'cancelled';

export const summarizeAppointments = (
  appointments: ReadonlyArray<{ status: AppointmentStatus }>
): AppointmentSummary => {
  const summary: AppointmentSummary = { booked: 0, done: 0, active: 0, upcoming: 0, noShows: 0, cancelled: 0 };

  for (const { status } of appointments) {
    if (status === 'cancelled') {
      summary.cancelled += 1;
      continue;
    }
    summary.booked += 1;
    if (status === 'completed') summary.done += 1;
    else if (status === 'in_progress') summary.active += 1;
    else if (status === 'scheduled' || status === 'confirmed') summary.upcoming += 1;
    else if (status === 'no_show') summary.noShows += 1;
  }

  return summary;
};

/** Share of booked (non-cancelled) appointments the patient did not attend, 0-100, one decimal. */
export const noShowRatePercent = (summary: AppointmentSummary) =>
  summary.booked > 0 ? Math.round((summary.noShows / summary.booked) * 1000) / 10 : 0;
