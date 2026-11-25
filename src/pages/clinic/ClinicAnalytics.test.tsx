import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder } from '../../test/supabase-mock';
import { createServerLikeBuilder } from '../../test/supabase-server-like-mock';
import ClinicAnalytics from './ClinicAnalytics';
import { mockScreen } from '../../test/phone-screen';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

type Visit = { id: string; patient_id: string; doctor_id: string; scheduled_at: string; status: string; type: string; chief_complaint: string | null };

type FeeLink = { doctor_user_id: string; consultation_fee: number | null; telemedicine_fee: number | null; follow_up_fee: number | null };

const setup = (
  visits: Visit[],
  doctors: { user_id: string; full_name: string }[],
  feeLinks: FeeLink[] = [],
  doctorProfiles: { user_id: string; specialization: string; consultation_fee: number }[] = []
) => {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'facility_staff') return createSupabaseQueryBuilder({ data: feeLinks, error: null });
    if (table === 'doctor_profiles') return createSupabaseQueryBuilder({ data: doctorProfiles, error: null });
    if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1' }, error: null });
    if (table === 'facilities') return createSupabaseQueryBuilder({ data: { name: 'QA Clinic' }, error: null });
    if (table === 'appointments') return createServerLikeBuilder(visits);
    if (table === 'user_profiles') return createSupabaseQueryBuilder({ data: doctors, error: null });
    return createSupabaseQueryBuilder({ data: [], error: null });
  }) as never);
  render(<ClinicAnalytics />);
};

const kpi = (key: string) => screen.getByTestId(`analytics-kpi-${key}`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T08:00:00Z'));
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' } } as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(supabase.from).mockReset();
});

describe('ClinicAnalytics counts (QA-226)', () => {
  it('counts every visit, not just the first 1,000', async () => {
    const visits = Array.from({ length: 2500 }, (_, i) => ({
      id: `v${String(i).padStart(4, '0')}`,
      patient_id: `p${i}`,
      doctor_id: 'd1',
      scheduled_at: '2026-11-10T06:00:00Z',
      status: 'completed',
      type: 'in_person',
      chief_complaint: 'Consultation',
    }));
    setup(visits, [{ user_id: 'd1', full_name: 'Sara Ali' }]);
    await screen.findByTestId('analytics-kpi-appointments');
    expect(kpi('appointments')).toHaveTextContent('2,500');
  });

  it('leaves cancelled visits out and does not count future bookings as active patients', async () => {
    setup(
      [
        { id: 'a', patient_id: 'p1', doctor_id: 'd1', scheduled_at: '2026-11-10T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint: null },
        { id: 'b', patient_id: 'p2', doctor_id: 'd1', scheduled_at: '2026-11-11T06:00:00Z', status: 'cancelled', type: 'in_person', chief_complaint: null },
        { id: 'c', patient_id: 'p3', doctor_id: 'd1', scheduled_at: '2026-12-01T06:00:00Z', status: 'scheduled', type: 'in_person', chief_complaint: null },
      ],
      [{ user_id: 'd1', full_name: 'Sara Ali' }]
    );
    await screen.findByTestId('analytics-kpi-appointments');
    expect(kpi('appointments')).toHaveTextContent('2');
    expect(kpi('patients')).toHaveTextContent('1');
  });

  it('shows two doctors with the same name as separate rows, without a duplicate-key warning', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setup(
      [
        { id: 'a', patient_id: 'p1', doctor_id: 'd1', scheduled_at: '2026-11-10T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint: null },
        { id: 'b', patient_id: 'p2', doctor_id: 'd2', scheduled_at: '2026-11-11T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint: null },
        { id: 'c', patient_id: 'p3', doctor_id: 'd2', scheduled_at: '2026-11-12T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint: null },
      ],
      [
        { user_id: 'd1', full_name: 'Omar Khalid' },
        { user_id: 'd2', full_name: 'Omar Khalid' },
      ]
    );
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => within(row).getAllByRole('cell')[2].textContent)).toEqual(['2', '1']);
    expect(consoleError.mock.calls.some((call) => String(call[0]).includes('same key'))).toBe(false);
    consoleError.mockRestore();
  });

  it('counts a visit just after midnight in Dubai in the right month, whatever the browser time zone', async () => {
    const previousTz = process.env.TZ;
    process.env.TZ = 'UTC'; // a browser not set to Dubai time
    onTestFinished(() => {
      process.env.TZ = previousTz;
    });
    setup(
      [{ id: 'a', patient_id: 'p1', doctor_id: 'd1', scheduled_at: '2026-10-31T21:30:00Z', status: 'completed', type: 'in_person', chief_complaint: null }],
      [{ user_id: 'd1', full_name: 'Sara Ali' }]
    );
    const nov = (await screen.findByText('Nov')).parentElement as HTMLElement;
    const oct = screen.getByText('Oct').parentElement as HTMLElement;
    expect(nov).toHaveTextContent('1');
    expect(oct).toHaveTextContent('0');
  });
});

describe('ClinicAnalytics estimated fees (QA-227)', () => {
  const v = (id: string, scheduled_at: string, status: string, type: string, chief_complaint: string): Visit => ({
    id, patient_id: `p-${id}`, doctor_id: 'd1', scheduled_at, status, type, chief_complaint,
  });
  const FEES: FeeLink = { doctor_user_id: 'd1', consultation_fee: 300, telemedicine_fee: 200, follow_up_fee: 150 };

  it('uses the clinic fee for each visit type, like the Appointments page', async () => {
    setup(
      [
        v('a', '2026-11-10T06:00:00Z', 'completed', 'in_person', 'Consultation'),
        v('b', '2026-11-11T06:00:00Z', 'completed', 'virtual', 'Consultation'),
        v('c', '2026-11-12T06:00:00Z', 'completed', 'in_person', 'Follow-up Visit'),
        v('d', '2026-11-26T06:00:00Z', 'scheduled', 'in_person', 'Consultation'),
        v('e', '2026-10-20T06:00:00Z', 'completed', 'in_person', 'Consultation'),
      ],
      [{ user_id: 'd1', full_name: 'Sara Ali' }],
      [FEES]
    );
    const card = await screen.findByTestId('analytics-kpi-revenue');
    // this month's completed visits: 300 + 200 + 150 (it used to be 3 x 300 = 900)
    expect(card).toHaveTextContent(/AED\s*650/);
    expect(card).toHaveTextContent('Estimated Fees');
    expect(card).toHaveTextContent('Completed visits this month');
    // the doctor's column covers all completed visits: 650 + 300 (October)
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('950');
  });

  it('does not fall back to the doctor\'s private fee when the clinic has set none', async () => {
    setup(
      [v('a', '2026-11-10T06:00:00Z', 'completed', 'in_person', 'Consultation')],
      [{ user_id: 'd1', full_name: 'Sara Ali' }],
      [{ doctor_user_id: 'd1', consultation_fee: null, telemedicine_fee: null, follow_up_fee: null }],
      [{ user_id: 'd1', specialization: 'Cardiology', consultation_fee: 500 }]
    );
    const card = await screen.findByTestId('analytics-kpi-revenue');
    expect(card).toHaveTextContent('—');
    expect(card).not.toHaveTextContent('500');
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('—');
  });

  it('says the fees are estimates and calls nothing "revenue"', async () => {
    setup([v('a', '2026-11-10T06:00:00Z', 'completed', 'in_person', 'Consultation')], [{ user_id: 'd1', full_name: 'Sara Ali' }], [FEES]);
    expect(await screen.findByTestId('analytics-fees-note')).toHaveTextContent('Nothing is billed in the app yet.');
    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estimated Fees (AED)' })).toBeInTheDocument();
  });
});

describe('ClinicAnalytics visit reasons (QA-228)', () => {
  const v = (id: string, chief_complaint: string | null): Visit => ({
    id, patient_id: `p-${id}`, doctor_id: 'd1', scheduled_at: '2026-11-10T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint,
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows standard reasons and "Other", never the text patients typed', async () => {
    setup(
      [v('a', 'Consultation'), v('b', 'Consultation'), v('c', 'Severe chest pain since Monday, please help'), v('d', 'Follow-up Visit')],
      [{ user_id: 'd1', full_name: 'Sara Ali' }]
    );
    expect(await screen.findByText('Appointments by Visit Reason')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Visit')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.queryByText(/chest pain/)).not.toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows the reasons in Arabic', async () => {
    await i18n.changeLanguage('ar');
    setup([v('a', 'Follow-up Visit'), v('b', 'my own words')], [{ user_id: 'd1', full_name: 'Sara Ali' }]);
    expect(await screen.findByText('المواعيد حسب سبب الزيارة')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('clinic.visitReasons.followUp'))).toBeInTheDocument();
    expect(screen.getByText('أخرى')).toBeInTheDocument();
  });
});

describe('ClinicAnalytics placeholders, Arabic and accessibility (QA-229)', () => {
  const v = (id: string, scheduled_at: string, chief_complaint = 'Consultation'): Visit => ({
    id, patient_id: `p-${id}`, doctor_id: 'd1', scheduled_at, status: 'completed', type: 'in_person', chief_complaint,
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('has no rating placeholder and no growth arrows', async () => {
    setup([v('a', '2026-11-10T06:00:00Z')], [{ user_id: 'd1', full_name: 'Sara Ali' }]);
    await screen.findByTestId('analytics-kpi-appointments');
    expect(screen.queryByText(/Rating/)).not.toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analytics-kpi-rating')).not.toBeInTheDocument();
    expect(document.querySelector('.lucide-arrow-up-right')).toBeNull();
    expect(within(screen.getByRole('table')).getAllByRole('columnheader')).toHaveLength(4);
  });

  it('describes the monthly chart for screen readers', async () => {
    setup([v('a', '2026-11-10T06:00:00Z'), v('b', '2026-11-11T06:00:00Z'), v('c', '2026-09-01T06:00:00Z')], [{ user_id: 'd1', full_name: 'Sara Ali' }]);
    expect(await screen.findByRole('img', { name: 'Appointments per month: Jun 0, Jul 0, Aug 0, Sep 1, Oct 0, Nov 2' })).toBeInTheDocument();
  });

  it('shows the page in Arabic, with Arabic digits, months and percentages', async () => {
    await i18n.changeLanguage('ar');
    setup([v('a', '2026-11-10T06:00:00Z'), v('b', '2026-11-11T06:00:00Z', 'Follow-up Visit')], [{ user_id: 'd1', full_name: 'Sara Ali' }]);

    expect(await screen.findByRole('heading', { name: 'التحليلات' })).toBeInTheDocument();
    expect(screen.getByText('نظرة عامة على أداء QA Clinic')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-kpi-appointments')).toHaveTextContent('٢');
    expect(screen.getByTestId('analytics-kpi-appointments')).toHaveTextContent('إجمالي المواعيد');
    const novInArabic = new Intl.DateTimeFormat('ar-AE', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1)));
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(`${novInArabic} ٢`);
    const fiftyPercent = new Intl.NumberFormat('ar-AE', { style: 'percent', numberingSystem: 'arab' }).format(0.5);
    expect(fiftyPercent).toContain('٥٠٪');
    expect(screen.getAllByText(fiftyPercent).length).toBe(2);
    expect(screen.getByRole('columnheader', { name: 'الطبيب' })).toBeInTheDocument();
    for (const english of ['Analytics', 'Total Appointments', 'Active Patients', 'Doctor Performance', 'Monthly Appointments', 'Nov']) {
      expect(screen.queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('shows a plain message, not the database text, when loading fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.from).mockImplementation(
      (() => createSupabaseQueryBuilder({ data: null, error: new Error('permission denied for table clinic_portal_members') })) as never
    );
    render(<ClinicAnalytics />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load analytics. Please try again.');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText(/permission denied/)).not.toBeInTheDocument();
  });
});

describe('ClinicAnalytics on a phone (QA-249)', () => {
  let restore: () => void = () => undefined;
  afterEach(() => restore());

  it('shows the doctor list as cards with visits and estimated fees', async () => {
    restore = mockScreen(true);
    setup(
      [{ id: 'a', patient_id: 'p1', doctor_id: 'd1', scheduled_at: '2026-11-10T06:00:00Z', status: 'completed', type: 'in_person', chief_complaint: 'Consultation' }],
      [{ user_id: 'd1', full_name: 'Sara Ali' }],
      [{ doctor_user_id: 'd1', consultation_fee: 300, telemedicine_fee: null, follow_up_fee: null }]
    );
    const cards = await screen.findByTestId('clinic-analytics-doctor-cards');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = within(cards).getByText('Sara Ali').closest('li') as HTMLElement;
    expect(within(card).getByText('Appointments')).toBeInTheDocument();
    expect(within(card).getByText('300')).toBeInTheDocument();
  });
});
