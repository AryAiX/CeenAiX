import { describe, expect, it } from 'vitest';
import { isInClinicMonth, summariseClinicVisits, type AnalyticsVisit } from './clinic-analytics';

// 24 Nov 2026, 12:00 in Dubai (UTC+4)
const NOW = new Date('2026-11-24T08:00:00Z');
let seq = 0;
const visit = (scheduled_at: string, status = 'completed', patient_id = 'p1', doctor_id = 'd1'): AnalyticsVisit => ({
  id: `v${(seq += 1)}`,
  patient_id,
  doctor_id,
  scheduled_at,
  status,
});

describe('summariseClinicVisits (QA-226)', () => {
  it('leaves cancelled visits out of every count', () => {
    const summary = summariseClinicVisits(
      [visit('2026-11-10T06:00:00Z'), visit('2026-11-11T06:00:00Z', 'cancelled', 'p2', 'd2')],
      NOW
    );
    expect(summary.totalAppointments).toBe(1);
    expect(summary.activePatients).toBe(1);
    expect(summary.months[summary.months.length - 1]).toEqual({ key: '2026-11', count: 1 });
    expect(summary.perDoctor.get('d2')).toBeUndefined();
  });

  it('counts a missed visit as an appointment, but not as an active patient', () => {
    const summary = summariseClinicVisits([visit('2026-11-10T06:00:00Z', 'no_show')], NOW);
    expect(summary.totalAppointments).toBe(1);
    expect(summary.activePatients).toBe(0);
  });

  it('does not count future bookings or visits older than 90 days as active patients', () => {
    const summary = summariseClinicVisits(
      [
        visit('2026-12-01T06:00:00Z', 'scheduled', 'future'),
        visit('2026-08-01T06:00:00Z', 'completed', 'old'),
        visit('2026-09-01T06:00:00Z', 'completed', 'recent'),
      ],
      NOW
    );
    expect(summary.activePatients).toBe(1);
  });

  it('puts visits in the clinic month, not the browser month', () => {
    // 31 Oct 21:30 UTC is 1 Nov 01:30 in Dubai
    const summary = summariseClinicVisits([visit('2026-10-31T21:30:00Z')], NOW);
    expect(summary.months.map((m) => m.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(summary.months.find((m) => m.key === '2026-11')?.count).toBe(1);
    expect(summary.months.find((m) => m.key === '2026-10')?.count).toBe(0);
  });

  it('builds the last 6 months across a new year', () => {
    const summary = summariseClinicVisits([], new Date('2027-01-15T08:00:00Z'));
    expect(summary.months.map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  });

  it('counts visits per doctor id', () => {
    const summary = summariseClinicVisits(
      [visit('2026-11-01T06:00:00Z', 'completed', 'p1', 'd1'), visit('2026-11-02T06:00:00Z', 'scheduled', 'p2', 'd1'), visit('2026-11-03T06:00:00Z', 'completed', 'p3', 'd2')],
      NOW
    );
    expect(Object.fromEntries(summary.perDoctor)).toEqual({ d1: 2, d2: 1 });
  });
});

describe('isInClinicMonth (QA-226)', () => {
  it('uses the clinic calendar', () => {
    expect(isInClinicMonth('2026-10-31T21:30:00Z', NOW)).toBe(true);
    expect(isInClinicMonth('2026-10-31T19:00:00Z', NOW)).toBe(false);
  });
});
