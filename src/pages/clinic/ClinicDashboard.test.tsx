import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicDashboard from './ClinicDashboard';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

type Visit = { id: string; status: string; scheduled_at: string; chief_complaint: string | null; patient_id: string; doctor_id: string };
type Link = { id: string; doctor_user_id: string; is_available: boolean; is_active: boolean; consultation_fee: number | null; telemedicine_fee?: number | null; follow_up_fee?: number | null; invitation_status: string };

const setup = ({
  today = [] as Visit[],
  month = [] as Partial<Visit>[],
  links = [] as Link[],
  names = [] as { user_id: string; full_name: string }[],
  settings = {} as Record<string, unknown>,
} = {}) => {
  const appointmentQueries: MockSupabaseQueryBuilder<unknown>[] = [];
  let staffCalls = 0;
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: today.map((visit) => ({ user_id: visit.patient_id, full_name: `Patient ${visit.patient_id}` })),
    error: null,
  } as never);
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1' }, error: null });
    if (table === 'facilities') return createSupabaseQueryBuilder({ data: { settings }, error: null });
    if (table === 'appointments') {
      const builder = createSupabaseQueryBuilder({ data: appointmentQueries.length === 0 ? today : month, error: null });
      appointmentQueries.push(builder);
      return builder;
    }
    if (table === 'facility_staff') {
      staffCalls += 1;
      return createSupabaseQueryBuilder({ data: staffCalls === 1 ? links : [], error: null });
    }
    if (table === 'user_profiles') return createSupabaseQueryBuilder({ data: names, error: null });
    return createSupabaseQueryBuilder({ data: [], error: null });
  }) as never);
  render(
    <MemoryRouter>
      <ClinicDashboard />
    </MemoryRouter>
  );
  return { appointmentQueries };
};

let previousTz: string | undefined;

beforeEach(() => {
  // a browser that is not on Dubai time, at 01:30 on 25 Nov in Dubai (21:30 on 24 Nov UTC)
  previousTz = process.env.TZ;
  process.env.TZ = 'UTC';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T21:30:00Z'));
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' } } as never);
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = previousTz;
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

const visit = (id: string, status: string, scheduled_at = '2026-11-25T05:00:00Z', doctor_id = 'd1'): Visit => ({
  id, status, scheduled_at, chief_complaint: 'Consultation', patient_id: `p-${id}`, doctor_id,
});

describe('ClinicDashboard today (QA-234)', () => {
  it('asks for the clinic\'s today, not the browser\'s', async () => {
    const { appointmentQueries } = setup();
    await screen.findByTestId('dashboard-total-today');
    // 25 Nov in Dubai = 24 Nov 20:00 UTC to 25 Nov 19:59:59.999 UTC
    expect(appointmentQueries[0].gte).toHaveBeenCalledWith('scheduled_at', '2026-11-24T20:00:00.000Z');
    expect(appointmentQueries[0].lte).toHaveBeenCalledWith('scheduled_at', '2026-11-25T19:59:59.999Z');
    // the month starts on 1 Nov in Dubai
    expect(appointmentQueries[1].gte).toHaveBeenCalledWith('scheduled_at', '2026-10-31T20:00:00.000Z');
  });

  it('shows visit times in clinic time', async () => {
    setup({ today: [visit('a', 'confirmed', '2026-11-25T05:00:00Z')] });
    expect(await screen.findByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('05:00')).not.toBeInTheDocument();
  });

  it('leaves cancelled visits out of the totals and labels a no-show correctly', async () => {
    setup({ today: [visit('a', 'completed'), visit('b', 'no_show'), visit('c', 'cancelled')] });
    expect(await screen.findByTestId('dashboard-total-today')).toHaveTextContent('2');
    expect(screen.getByTestId('dashboard-kpi-appointments')).toHaveTextContent('2');
    const noShowRow = screen.getByText('Patient p-b').closest('div.flex') as HTMLElement;
    expect(within(noShowRow).getByText('No-show')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-status-no_show')).toHaveTextContent('1');
    expect(screen.getByTestId('dashboard-status-cancelled')).toHaveTextContent('1');
  });

  it('lists the doctors with visits today first', async () => {
    const links = ['d1', 'd2', 'd3', 'd4', 'd5'].map((id) => ({
      id: `l-${id}`, doctor_user_id: id, is_available: true, is_active: true, consultation_fee: 300, invitation_status: 'active',
    }));
    const names = [
      { user_id: 'd1', full_name: 'Ali One' }, { user_id: 'd2', full_name: 'Bea Two' }, { user_id: 'd3', full_name: 'Cid Three' },
      { user_id: 'd4', full_name: 'Dan Four' }, { user_id: 'd5', full_name: 'Eve Five' },
    ];
    setup({ today: [visit('a', 'confirmed', '2026-11-25T05:00:00Z', 'd5')], links, names });
    const firstDoctor = await screen.findAllByText(/Eve Five/);
    expect(firstDoctor.length).toBeGreaterThan(0);
    expect(screen.queryByText('Dan Four')).not.toBeInTheDocument();
  });
});
