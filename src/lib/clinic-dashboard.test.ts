import { describe, expect, it, vi } from 'vitest';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { doctorsForToday, loadClinicTodayStats, summariseToday } from './clinic-dashboard';

const v = (status: string, doctor_id = 'd1') => ({ status, doctor_id });

describe('summariseToday (QA-234)', () => {
  it('leaves cancelled visits out of the totals but shows every status in the breakdown', () => {
    const summary = summariseToday([v('completed'), v('confirmed'), v('scheduled'), v('no_show'), v('cancelled', 'd2')]);
    expect(summary.total).toBe(4);
    expect(summary.confirmed).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.breakdown.map((b) => [b.status, b.count])).toEqual([
      ['completed', 1], ['in_progress', 0], ['confirmed', 1], ['scheduled', 1], ['no_show', 1], ['cancelled', 1],
    ]);
    expect(summary.breakdown.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(1);
    expect(Object.fromEntries(summary.perDoctor)).toEqual({ d1: 4 });
  });

  it('is all zero on a day without visits', () => {
    const summary = summariseToday([]);
    expect(summary.total).toBe(0);
    expect(summary.breakdown.every((b) => b.share === 0)).toBe(true);
  });
});

describe('doctorsForToday (QA-234)', () => {
  it('lists the busiest doctors first, then by name, at most 4', () => {
    const doctors = ['Eve', 'Dan', 'Cid', 'Bea', 'Ali'].map((name) => ({ doctorUserId: name.toLowerCase(), name }));
    const rows = doctorsForToday(doctors, new Map([['eve', 3], ['bea', 1]]));
    expect(rows.map((r) => [r.name, r.appts])).toEqual([['Eve', 3], ['Bea', 1], ['Ali', 0], ['Cid', 0]]);
  });
});

describe('loadClinicTodayStats (QA-239)', () => {
  const clientWith = (visits: unknown[], links: unknown[], pending: number) => {
    const builders: ReturnType<typeof createSupabaseQueryBuilder>[] = [];
    let staffCalls = 0;
    const from = vi.fn((table: string) => {
      let builder;
      if (table === 'appointments') builder = createSupabaseQueryBuilder({ data: visits, error: null });
      else {
        staffCalls += 1;
        builder = staffCalls === 1
          ? createSupabaseQueryBuilder({ data: links, error: null })
          : createSupabaseQueryBuilder({ data: null, error: null, count: pending });
      }
      builders.push(builder);
      return builder;
    });
    return { client: { from } as never, builders };
  };

  it('counts the clinic\'s today like the Dashboard: no cancelled visits, fees per visit type', async () => {
    const { client, builders } = clientWith(
      [
        { doctor_id: 'd1', status: 'completed', type: 'in_person', chief_complaint: 'Consultation' },
        { doctor_id: 'd1', status: 'completed', type: 'virtual', chief_complaint: 'Consultation' },
        { doctor_id: 'd1', status: 'confirmed', type: 'in_person', chief_complaint: 'Follow-up Visit' },
        { doctor_id: 'd1', status: 'cancelled', type: 'in_person', chief_complaint: 'Consultation' },
      ],
      [{ doctor_user_id: 'd1', consultation_fee: 300, telemedicine_fee: 200, follow_up_fee: 150 }],
      2
    );
    // 01:30 on 25 Nov in Dubai
    const stats = await loadClinicTodayStats(client, 'f1', new Date('2026-11-24T21:30:00Z'));
    expect(stats).toEqual({ todayApptCount: 3, todayConfirmedCount: 3, todayFees: 500, pendingDoctors: 2 });
    expect(builders[0].gte).toHaveBeenCalledWith('scheduled_at', '2026-11-24T20:00:00.000Z');
    expect(builders[0].lte).toHaveBeenCalledWith('scheduled_at', '2026-11-25T19:59:59.999Z');
    expect(builders[2].eq).toHaveBeenCalledWith('invitation_status', 'pending');
  });

  it('has no fee estimate when the clinic has set no fee', async () => {
    const { client } = clientWith(
      [{ doctor_id: 'd1', status: 'completed', type: 'in_person', chief_complaint: 'Consultation' }],
      [{ doctor_user_id: 'd1', consultation_fee: null }],
      0
    );
    expect((await loadClinicTodayStats(client, 'f1')).todayFees).toBeNull();
  });
});
