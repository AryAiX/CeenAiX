import { beforeEach, describe, expect, it, vi } from 'vitest';

const results: Record<string, unknown[]> = {};
const calls: Array<{ table: string; filters: Array<[string, string, unknown]> }> = [];

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    const entry = { table, filters: [] as Array<[string, string, unknown]> };
    calls.push(entry);
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => (entry.filters.push(['eq', column, value]), chain),
      in: (column: string, value: unknown) => (entry.filters.push(['in', column, value]), chain),
      order: () => chain,
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: results[table] ?? [], error: null }),
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

import { fetchPatientCareTeam } from './use-patient-care-team';

describe('fetchPatientCareTeam (QA-014)', () => {
  beforeEach(() => {
    calls.length = 0;
    results.appointments = [];
    results.user_profiles = [];
    results.doctor_profiles = [];
  });

  it('lists each doctor once, most recent appointment first, with name and specialty', async () => {
    results.appointments = [
      { doctor_id: 'doc-b', scheduled_at: '2026-11-20T09:00:00Z' },
      { doctor_id: 'doc-a', scheduled_at: '2026-10-01T09:00:00Z' },
      { doctor_id: 'doc-b', scheduled_at: '2026-09-01T09:00:00Z' },
      { doctor_id: null, scheduled_at: '2026-08-01T09:00:00Z' },
    ];
    results.user_profiles = [
      { user_id: 'doc-a', full_name: ' Dr. A ' },
      { user_id: 'doc-b', full_name: null },
    ];
    results.doctor_profiles = [{ user_id: 'doc-a', specialization: 'Cardiology' }];

    await expect(fetchPatientCareTeam('patient-1')).resolves.toEqual([
      { doctorId: 'doc-b', name: null, specialty: null, lastAppointmentAt: '2026-11-20T09:00:00Z' },
      { doctorId: 'doc-a', name: 'Dr. A', specialty: 'Cardiology', lastAppointmentAt: '2026-10-01T09:00:00Z' },
    ]);
    expect(calls[0]).toEqual({
      table: 'appointments',
      filters: [
        ['eq', 'patient_id', 'patient-1'],
        ['eq', 'is_deleted', false],
      ],
    });
  });

  it('returns an empty list without loading profiles when there are no appointments', async () => {
    await expect(fetchPatientCareTeam('patient-1')).resolves.toEqual([]);
    expect(calls.map((call) => call.table)).toEqual(['appointments']);
  });
});
