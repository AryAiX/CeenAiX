import type { SupabaseClient } from '@supabase/supabase-js';
import { isCountedVisit } from './clinic-analytics';
import { clinicDayRangeUtc, clinicTodayKey } from './clinic-booking-time';
import { estimatedVisitFee, sumEstimatedFees, type ClinicFeeLink } from './clinic-visit-fee';

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

export interface ClinicTodayStats {
  /** visits today (clinic day), not cancelled */
  todayApptCount: number;
  /** confirmed, in progress or completed */
  todayConfirmedCount: number;
  /** estimated fees of today's completed visits; null when no fee is set */
  todayFees: number | null;
  /** doctors who asked to join and wait for the clinic's approval */
  pendingDoctors: number;
}

/**
 * QA-239: the sidebar's "TODAY" numbers and the Doctors / Appointments badges, counted the same
 * way as the Dashboard (QA-234 / QA-235): the clinic's day, cancelled visits left out, fees from
 * the clinic's own fee for each visit type. The sidebar used to count once at login with the
 * browser's day, cancelled visits and consultation fee only.
 */
export const loadClinicTodayStats = async (client: SupabaseClient, facilityId: string, now: Date = new Date()): Promise<ClinicTodayStats> => {
  const { startIso, endIso } = clinicDayRangeUtc(clinicTodayKey(now));
  const [visitsResult, linksResult, pendingResult] = await Promise.all([
    client
      .from('appointments')
      .select('doctor_id, status, type, chief_complaint')
      .eq('facility_id', facilityId)
      .eq('is_deleted', false)
      .gte('scheduled_at', startIso)
      .lte('scheduled_at', endIso),
    client
      .from('facility_staff')
      .select('doctor_user_id, consultation_fee, telemedicine_fee, follow_up_fee')
      .eq('facility_id', facilityId),
    client
      .from('facility_staff')
      .select('id', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .eq('invitation_status', 'pending'),
  ]);
  if (visitsResult.error) throw visitsResult.error;
  if (linksResult.error) throw linksResult.error;
  if (pendingResult.error) throw pendingResult.error;

  const visits = (visitsResult.data ?? []) as { doctor_id: string; status: string; type: string | null; chief_complaint: string | null }[];
  const links = new Map(((linksResult.data ?? []) as ClinicFeeLink[]).map((link) => [link.doctor_user_id, link]));
  const today = summariseToday(visits);
  return {
    todayApptCount: today.total,
    todayConfirmedCount: today.confirmed,
    todayFees: sumEstimatedFees(
      visits
        .filter((visit) => visit.status === 'completed')
        .map((visit) =>
          estimatedVisitFee(links.get(visit.doctor_id), { visitType: visit.type ?? 'in_person', reason: visit.chief_complaint ?? '' })
        )
    ),
    pendingDoctors: pendingResult.count ?? 0,
  };
};
