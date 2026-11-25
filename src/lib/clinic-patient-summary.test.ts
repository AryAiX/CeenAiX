import { describe, expect, it } from 'vitest';
import { countUpcomingVisits, isInCurrentClinicMonth, summarisePatientVisits } from './clinic-patient-summary';

const NOW = new Date('2026-11-23T08:00:00Z');
const v = (doctor_id: string, scheduled_at: string, status: string) => ({ doctor_id, scheduled_at, status });

describe('summarisePatientVisits (QA-209)', () => {
  it('uses the latest COMPLETED visit as last visit, not a future or cancelled booking', () => {
    const summary = summarisePatientVisits(
      [
        v('doc-a', '2026-11-01T05:00:00Z', 'completed'),
        v('doc-a', '2026-10-01T05:00:00Z', 'completed'),
        v('doc-b', '2026-11-20T05:00:00Z', 'cancelled'),
        v('doc-c', '2026-11-22T05:00:00Z', 'no_show'),
        v('doc-d', '2026-12-01T05:00:00Z', 'scheduled'),
        v('doc-e', '2026-12-05T05:00:00Z', 'confirmed'),
      ],
      NOW
    );
    expect(summary).toEqual({
      lastVisitAt: '2026-11-01T05:00:00Z',
      nextVisitAt: '2026-12-01T05:00:00Z',
      completedVisits: 2,
      primaryDoctorId: 'doc-a',
    });
  });

  it('falls back to the doctor of the next visit when nothing is completed yet', () => {
    expect(summarisePatientVisits([v('doc-d', '2026-12-01T05:00:00Z', 'scheduled')], NOW)).toEqual({
      lastVisitAt: null,
      nextVisitAt: '2026-12-01T05:00:00Z',
      completedVisits: 0,
      primaryDoctorId: 'doc-d',
    });
  });

  it('a past visit still marked scheduled is neither last nor next', () => {
    expect(summarisePatientVisits([v('doc-a', '2026-11-22T05:00:00Z', 'scheduled')], NOW)).toMatchObject({
      lastVisitAt: null,
      nextVisitAt: null,
    });
  });
});

describe('clinic month and upcoming count (QA-209)', () => {
  it('uses the Dubai month (00:30 Dubai on 1 Dec is December)', () => {
    const firstOfDecDubai = new Date('2026-11-30T20:30:00Z');
    expect(isInCurrentClinicMonth('2026-11-30T20:15:00Z', firstOfDecDubai)).toBe(true); // 00:15 Dubai 1 Dec
    expect(isInCurrentClinicMonth('2026-11-30T19:00:00Z', firstOfDecDubai)).toBe(false); // 23:00 Dubai 30 Nov
    expect(isInCurrentClinicMonth(null, NOW)).toBe(false);
  });

  it('counts only scheduled / confirmed visits that have not started', () => {
    expect(
      countUpcomingVisits(
        [
          v('a', '2026-12-01T05:00:00Z', 'scheduled'),
          v('a', '2026-12-02T05:00:00Z', 'confirmed'),
          v('a', '2026-12-03T05:00:00Z', 'cancelled'),
          v('a', '2026-11-01T05:00:00Z', 'completed'),
          v('a', '2026-11-22T05:00:00Z', 'scheduled'),
        ],
        NOW
      )
    ).toBe(2);
  });
});
