import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import { createServerLikeBuilder } from '../../test/supabase-server-like-mock';
import { formatLocaleCurrency } from '../../lib/i18n-ui';
import ClinicDashboard from './ClinicDashboard';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

type Visit = { id: string; status: string; scheduled_at: string; chief_complaint: string | null; patient_id: string; doctor_id: string };
type Link = { id: string; doctor_user_id: string; is_available: boolean; is_active: boolean; consultation_fee: number | null; telemedicine_fee?: number | null; follow_up_fee?: number | null; invitation_status: string };

const setup = ({
  today = [] as Visit[],
  month = [] as Partial<Visit>[],
  links = [] as Link[],
  feeLinks = undefined as Link[] | undefined,
  names = [] as { user_id: string; full_name: string }[],
  settings = {} as Record<string, unknown>,
  pending = [] as { id: string; invitation_status: string }[],
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
      const builder =
        appointmentQueries.length === 0
          ? createSupabaseQueryBuilder({ data: today, error: null })
          : (createServerLikeBuilder(month as Record<string, unknown>[]) as unknown as MockSupabaseQueryBuilder<unknown>);
      appointmentQueries.push(builder);
      return builder;
    }
    if (table === 'facility_staff') {
      staffCalls += 1;
      // 1: active links, 2: pending links, 3: every link's fees
      return createSupabaseQueryBuilder({ data: staffCalls === 1 ? links : staffCalls === 2 ? pending : feeLinks ?? links, error: null });
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

describe('ClinicDashboard estimated fees (QA-235)', () => {
  const money = (value: number) => formatLocaleCurrency(value, 'en').replace(/\s+/g, ' ');
  const link = (doctor_user_id: string, fees: Partial<Link> = {}): Link => ({
    id: `l-${doctor_user_id}`, doctor_user_id, is_available: true, is_active: true,
    consultation_fee: 300, telemedicine_fee: 200, follow_up_fee: 150, invitation_status: 'active', ...fees,
  });
  const done = (id: string, extra: Partial<Visit> & { type?: string } = {}) => ({
    ...visit(id, 'completed'), type: 'in_person', ...extra,
  });

  it('uses the clinic fee for each visit type', async () => {
    setup({
      today: [done('a'), done('b', { type: 'virtual' }), { ...visit('c', 'scheduled'), type: 'in_person' } as Visit],
      month: [done('a'), done('b', { type: 'virtual' }), done('m', { chief_complaint: 'Follow-up Visit', scheduled_at: '2026-11-05T06:00:00Z' })],
      links: [link('d1')],
    });
    expect(await screen.findByTestId('dashboard-kpi-today-fees')).toHaveTextContent(money(500));
    expect(screen.getByTestId('dashboard-kpi-month-fees')).toHaveTextContent(money(650));
    expect(screen.getByTestId('dashboard-kpi-month-fees')).toHaveTextContent("This Month's Estimated Fees");
  });

  it('counts every completed visit this month and shows the full amount', async () => {
    const month = Array.from({ length: 1500 }, (_, i) => ({ ...done(`v${String(i).padStart(4, '0')}`), scheduled_at: '2026-11-10T06:00:00Z' }));
    setup({ month, links: [link('d1')] });
    // 1,500 x 300 (it used to stop at 1,000 visits and round to "AED 300K")
    expect(await screen.findByTestId('dashboard-kpi-month-fees')).toHaveTextContent(money(450000));
  });

  it('keeps the estimate for a doctor who has left the clinic', async () => {
    setup({ today: [done('a')], month: [done('a')], links: [], feeLinks: [link('d1', { is_active: false })] });
    expect(await screen.findByTestId('dashboard-kpi-today-fees')).toHaveTextContent(money(300));
  });

  it('shows "—" when the clinic has set no fee, and calls nothing "revenue"', async () => {
    setup({ today: [done('a')], month: [done('a')], links: [link('d1', { consultation_fee: null, telemedicine_fee: null, follow_up_fee: null })] });
    expect(await screen.findByTestId('dashboard-kpi-today-fees')).toHaveTextContent('—');
    expect(screen.getByTestId('dashboard-fees-note')).toHaveTextContent('Nothing is billed in the app yet.');
    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
  });
});

describe('ClinicDashboard alerts (QA-236)', () => {
  it('never says NABIDH sync is active, even when the old setting is still saved', async () => {
    setup({ today: [visit('a', 'confirmed')], settings: { nabidh: true } });
    await screen.findByTestId('dashboard-total-today');
    expect(screen.queryByText(/NABIDH/)).not.toBeInTheDocument();
    expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument();
  });

  it('does not claim all systems are operational', async () => {
    setup({ today: [visit('a', 'confirmed')] });
    await screen.findByTestId('dashboard-total-today');
    expect(screen.queryByText('All Systems Operational')).not.toBeInTheDocument();
    expect(screen.getByText('No alerts right now.')).toBeInTheDocument();
  });

  it('says doctors are waiting for the clinic\'s approval, with a way to review them', async () => {
    setup({ pending: [{ id: 'l1', invitation_status: 'pending' }, { id: 'l2', invitation_status: 'pending' }, { id: 'l3', invitation_status: 'invited' }] });
    const alert = await screen.findByTestId('dashboard-alert-pending');
    expect(alert).toHaveTextContent('Doctors waiting for your approval');
    expect(alert).toHaveTextContent('2 doctors asked to join your clinic.');
    expect(alert).not.toHaveTextContent('verification');
    expect(within(alert).getByRole('button', { name: 'Review on the Doctors page' })).toBeInTheDocument();
  });
});
