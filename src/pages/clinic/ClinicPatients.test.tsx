import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { formatClinicDate } from '../../lib/clinic-booking-time';
import { supabase } from '../../lib/supabase';
import { installClinicRpc, type PatientFixture } from '../../test/clinic-rpc-mock';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import { createServerLikeBuilder } from '../../test/supabase-server-like-mock';
import { mockScreen } from '../../test/phone-screen';
import ClinicPatients from './ClinicPatients';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

// QA-208: patient functions answered from rpcPatients; other functions return rpcResult
let rpcPatients: PatientFixture[] = [];
let rpcResult: unknown = { data: null, error: null };
const setRpcResult = (value: unknown) => {
  rpcResult = value;
};
beforeEach(() => {
  rpcPatients = [];
  rpcResult = { data: null, error: null };
  installClinicRpc(vi.mocked(supabase.rpc), () => rpcPatients, () => rpcResult);
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-user-1' } } as never);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T08:00:00Z')); // 12:00 Dubai, 23 Nov
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

describe('ClinicPatients booking (QA-191, and the QA-189 time bug on this page)', () => {
  it('books from the patient card in Dubai time through clinic_book_appointment', async () => {
    const calls: Record<string, MockSupabaseQueryBuilder<unknown>[]> = {};
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Test Patient', phone: '+971500000000', email: null, date_of_birth: null }];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members'
          ? { facility_id: 'facility-1' }
          : table === 'appointments'
            ? (calls.appointments?.length ?? 0) === 0
              ? [{ id: 'old', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T05:00:00Z', status: 'completed' }]
              : []
            : table === 'facility_staff'
              ? [
                  { doctor_user_id: 'doctor-1', consultation_fee: 300, invitation_status: 'accepted', is_active: true },
                  { doctor_user_id: 'doctor-p', consultation_fee: 300, invitation_status: 'pending', is_active: true },
                ]
              : table === 'user_profiles'
                ? [
                    { user_id: 'doctor-1', full_name: 'Dr Test Doctor' },
                    { user_id: 'doctor-p', full_name: 'Dr Pending' },
                    { user_id: 'patient-1', full_name: 'Test Patient', phone: '+971500000000', email: null, date_of_birth: null },
                  ]
                : table === 'doctor_availability'
                  ? [{ start_time: '09:00:00', end_time: '10:00:00', slot_duration_minutes: 30 }]
                  : [];
      const builder = createSupabaseQueryBuilder({ data, error: null });
      (calls[table] ??= []).push(builder);
      return builder;
    }) as never);
    setRpcResult({ data: 'appt-new', error: null } as never);

    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByText('Test Patient'));
    fireEvent.click(screen.getByRole('button', { name: /Book Appointment/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Book Appointment' });
    // QA-194: the pending doctor is not offered
    expect(within(within(dialog).getByLabelText('Doctor')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Dr Test Doctor',
    ]);
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-11-24' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: '09:00' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Book Appointment/ }));

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        'clinic_book_appointment',
        expect.objectContaining({ p_patient_id: 'patient-1', p_doctor_id: 'doctor-1', p_scheduled_at: '2026-11-24T05:00:00.000Z' })
      )
    );
    expect(calls.notifications).toBeUndefined();
    expect(calls.appointments.every((b) => b.insert.mock.calls.length === 0)).toBe(true);
  });
});

describe('ClinicPatients doctor filter (QA-194)', () => {
  it('filters by doctor id, so two doctors with the same name are not mixed up', async () => {
    rpcPatients = [
      { user_id: 'patient-1', full_name: 'First Patient', phone: '+971500000001', email: null, date_of_birth: null },
      { user_id: 'patient-2', full_name: 'Second Patient', phone: '+971500000002', email: null, date_of_birth: null },
    ];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members'
          ? { facility_id: 'facility-1' }
          : table === 'appointments'
            ? [
                { id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T05:00:00Z', status: 'completed' },
                { id: 'a2', patient_id: 'patient-2', doctor_id: 'doctor-2', scheduled_at: '2026-11-02T05:00:00Z', status: 'completed' },
              ]
            : table === 'facility_staff'
              ? [
                  { doctor_user_id: 'doctor-1', consultation_fee: 300, invitation_status: 'accepted', is_active: true },
                  { doctor_user_id: 'doctor-2', consultation_fee: 300, invitation_status: 'accepted', is_active: true },
                ]
              : table === 'user_profiles'
                ? [
                    { user_id: 'doctor-1', full_name: 'Same Name' },
                    { user_id: 'doctor-2', full_name: 'Same Name' },
                    { user_id: 'patient-1', full_name: 'First Patient', phone: '+971500000001', email: null, date_of_birth: null },
                    { user_id: 'patient-2', full_name: 'Second Patient', phone: '+971500000002', email: null, date_of_birth: null },
                  ]
                : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);

    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
    await screen.findByText('First Patient');
    expect(screen.getByText('Second Patient')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('All doctors'), { target: { value: 'doctor-2' } });

    expect(screen.queryByText('First Patient')).not.toBeInTheDocument();
    expect(screen.getByText('Second Patient')).toBeInTheDocument();
  });
});

describe('ClinicPatients long lists (QA-197)', () => {
  it('lists patients whose visits are past the first 1,000 rows, with real names', async () => {
    // 1,200 visits by 300 patients; patients 250-299 only appear after row 1,000
    const visits = Array.from({ length: 1200 }, (_, i) => ({
      id: `a-${String(i).padStart(4, '0')}`,
      patient_id: `patient-${i < 1000 ? i % 250 : 250 + (i % 50)}`,
      doctor_id: 'doctor-1',
      scheduled_at: '2026-11-01T05:00:00Z',
      status: 'completed',
    }));
    const people = [
      { user_id: 'doctor-1', full_name: 'Dr Test Doctor' },
      ...Array.from({ length: 300 }, (_, i) => ({
        user_id: `patient-${i}`,
        full_name: `Patient Number ${i}`,
        phone: `+97150${String(i).padStart(7, '0')}`,
        email: null,
        date_of_birth: null,
      })),
    ];
    rpcPatients = people.filter((p) => p.user_id.startsWith('patient-'));
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'facility-1' }, error: null });
      if (table === 'appointments') return createServerLikeBuilder(visits);
      if (table === 'user_profiles') return createServerLikeBuilder(people);
      if (table === 'facility_staff') {
        return createSupabaseQueryBuilder({
          data: [{ doctor_user_id: 'doctor-1', consultation_fee: 300, invitation_status: 'accepted', is_active: true }],
          error: null,
        });
      }
      return createServerLikeBuilder([]);
    }) as never);

    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );

    expect(await screen.findByText('Patient Number 299')).toBeInTheDocument();
    expect(screen.getByText('Patient Number 0')).toBeInTheDocument();
    expect(screen.queryByText('Unknown Patient')).not.toBeInTheDocument();
  }, 20000);
});

describe('ClinicPatients privacy (QA-208)', () => {
  it('loads patient details through clinic_patient_profiles, never user_profiles', async () => {
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Private Patient', phone: '+971500000009', email: 'p@example.test', date_of_birth: '1990-01-01' }];
    const calls: Record<string, MockSupabaseQueryBuilder<unknown>[]> = {};
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'appointments' ? [{ id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T05:00:00Z', status: 'completed' }]
        : table === 'user_profiles' ? [{ user_id: 'doctor-1', full_name: 'Dr Test Doctor' }]
        : [];
      const builder = createSupabaseQueryBuilder({ data, error: null });
      (calls[table] ??= []).push(builder);
      return builder;
    }) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );

    expect(await screen.findByText('Private Patient')).toBeInTheDocument();
    expect(supabase.rpc).toHaveBeenCalledWith('clinic_patient_profiles', { p_patient_ids: ['patient-1'] });
    const askedIds = (calls.user_profiles ?? []).flatMap((b) => b.in.mock.calls.flatMap(([, ids]) => ids as string[]));
    expect(askedIds).not.toContain('patient-1');
    for (const builder of calls.user_profiles ?? []) {
      for (const [columns] of builder.select.mock.calls) {
        expect(String(columns)).not.toMatch(/date_of_birth|email|emirates|insurance|address/);
      }
    }
  });
});

describe('ClinicPatients last visit and counts (QA-209)', () => {
  it('shows the last completed visit, the next visit and completed counts — not future or cancelled bookings', async () => {
    vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Visit Patient', phone: '+971500000001', email: null, date_of_birth: null }];
    const visits = [
      { id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T05:00:00Z', status: 'completed' },
      { id: 'a2', patient_id: 'patient-1', doctor_id: 'doctor-2', scheduled_at: '2026-11-20T05:00:00Z', status: 'cancelled' },
      { id: 'a3', patient_id: 'patient-1', doctor_id: 'doctor-2', scheduled_at: '2026-12-01T05:00:00Z', status: 'scheduled' },
    ];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'appointments' ? visits
        : table === 'user_profiles' ? [{ user_id: 'doctor-1', full_name: 'First Doctor' }, { user_id: 'doctor-2', full_name: 'Second Doctor' }]
        : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );

    const row = (await screen.findByText('Visit Patient')).closest('tr') as HTMLElement;
    const cells = row.querySelectorAll('td');
    expect(cells[3].textContent).toBe('Dr. First Doctor'); // doctor of the completed visit
    expect(cells[4].textContent).toBe('Nov 1, 2026'); // last COMPLETED visit
    expect(cells[5].textContent).toBe('Dec 1, 2026'); // next visit
    expect(cells[6].textContent).toBe('1'); // completed visits only

    expect(screen.getByText('Upcoming Visits').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Visited This Month').previousElementSibling?.textContent).toBe('1');
  });
});

describe('ClinicPatients patient card (QA-210)', () => {
  it('shows each visit in clinic time with the doctor and reason, and no "Clinical Summary"', async () => {
    vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Card Patient', phone: '+971500000001', email: null, date_of_birth: null }];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'appointments'
          ? [{ id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T21:30:00Z', status: 'completed', chief_complaint: 'Follow-up Visit' }]
          : table === 'user_profiles' ? [{ user_id: 'doctor-1', full_name: 'First Doctor' }]
          : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );

    const patientName = await screen.findByText('Card Patient');
    expect(screen.getByText('1 patient with visits at this clinic')).toBeInTheDocument();
    fireEvent.click(patientName);

    // 21:30 UTC on 1 Nov is 01:30 Dubai on 2 Nov
    const history = screen.getByText('Appointment History').parentElement as HTMLElement;
    expect(within(history).getByText('Nov 2, 2026', { exact: false })).toBeInTheDocument();
    expect(within(history).getByText('01:30')).toBeInTheDocument();
    expect(within(history).getByText('Dr. First Doctor · Follow-up Visit')).toBeInTheDocument();
    expect(screen.getByText('Visit Summary')).toBeInTheDocument();
    expect(screen.queryByText('Clinical Summary')).not.toBeInTheDocument();
    expect(screen.queryByText(/registered patients/)).not.toBeInTheDocument();
  });
});

describe('ClinicPatients in Arabic and from the keyboard (QA-211)', () => {
  const mockCardData = () => {
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Card Patient', phone: '+971500000001', email: 'card@example.test', date_of_birth: '1990-03-15' }];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'appointments'
          ? [
              { id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T21:30:00Z', status: 'completed', chief_complaint: 'Follow-up Visit' },
              { id: 'a2', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-12-01T05:00:00Z', status: 'scheduled', chief_complaint: 'Consultation' },
            ]
          : table === 'user_profiles' ? [{ user_id: 'doctor-1', full_name: 'First Doctor' }]
          : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
  };

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the page, table and counts in Arabic with Arabic digits and dates', async () => {
    await i18n.changeLanguage('ar');
    mockCardData();

    expect(await screen.findByRole('heading', { name: 'المرضى' })).toBeInTheDocument();
    expect(screen.getByText('مريض واحد لديه زيارات في هذه العيادة')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'تاريخ الميلاد' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'البحث عن المرضى' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'التصفية حسب الطبيب' })).toBeInTheDocument();

    const row = screen.getByRole('button', { name: 'فتح ملف Card Patient' }).closest('tr') as HTMLElement;
    const cells = row.querySelectorAll('td');
    expect(cells[2].textContent).toBe(formatClinicDate('1990-03-15', 'ar'));
    expect(cells[3].textContent).toBe('د. First Doctor');
    expect(cells[4].textContent).toBe(formatClinicDate('2026-11-01T21:30:00Z', 'ar'));
    expect(cells[4].textContent).toMatch(/[٠-٩]/);
    expect(cells[6].textContent).toBe('١');
    expect(within(cells[1]).getByText('card@example.test')).toHaveAttribute('dir', 'ltr');

    for (const english of ['Patients', 'Total Patients', 'Upcoming Visits', 'Date of Birth', 'Dr. First Doctor']) {
      expect(screen.queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('shows the patient card in Arabic, right to left, with translated statuses and reasons', async () => {
    await i18n.changeLanguage('ar');
    mockCardData();
    fireEvent.click(await screen.findByRole('button', { name: 'فتح ملف Card Patient' }));

    const dialog = await screen.findByRole('dialog', { name: 'Card Patient' });
    expect(dialog).toHaveAttribute('dir', 'rtl');
    expect(within(dialog).getByText('ملخص الزيارات')).toBeInTheDocument();
    expect(within(dialog).getByText('سجل المواعيد')).toBeInTheDocument();
    expect(within(dialog).getByText('د. First Doctor · زيارة متابعة')).toBeInTheDocument();
    expect(within(dialog).getByText('٠١:٣٠')).toBeInTheDocument();
    expect(within(dialog).getByText(i18n.t('shared.appointmentStatus.completed'))).toBeInTheDocument();
    for (const english of ['Patient Profile', 'Appointment History', 'Completed', 'Send Message', 'Book Appointment']) {
      expect(within(dialog).queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('opens a patient with the keyboard and closes the card with Escape', async () => {
    const user = userEvent.setup();
    mockCardData();
    const open = await screen.findByRole('button', { name: 'Open Card Patient' });

    open.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Card Patient' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a plain Arabic message, not the database text, when loading fails', async () => {
    await i18n.changeLanguage('ar');
    vi.mocked(supabase.from).mockImplementation(((table: string) =>
      table === 'clinic_portal_members'
        ? createSupabaseQueryBuilder({ data: null, error: { code: '42P01', message: 'relation "x" does not exist' } })
        : createSupabaseQueryBuilder({ data: [], error: null })) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذّر تحميل المرضى. يُرجى المحاولة مرة أخرى.');
    expect(within(alert).getByRole('button', { name: i18n.t('clinic.actions.retry') })).toBeInTheDocument();
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
  });
});

describe('ClinicPatients on a phone (QA-249)', () => {
  let restore: () => void = () => undefined;
  afterEach(() => restore());

  it('shows a card per patient with doctor, visits and dates, and opens the patient from it', async () => {
    restore = mockScreen(true);
    rpcPatients = [{ user_id: 'patient-1', full_name: 'Card Patient', phone: '+971500000001', email: null, date_of_birth: null }];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'appointments'
          ? [
              { id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-10T06:00:00Z', status: 'completed', chief_complaint: 'Consultation' },
              { id: 'a2', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-28T06:00:00Z', status: 'scheduled', chief_complaint: 'Consultation' },
            ]
          : table === 'user_profiles' ? [{ user_id: 'doctor-1', full_name: 'First Doctor' }]
          : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
    const cards = await screen.findByTestId('clinic-patient-cards');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const open = within(cards).getByRole('button', { name: 'Open Card Patient' });
    expect(open).toHaveTextContent('Dr. First Doctor');
    expect(open).toHaveTextContent(formatClinicDate('2026-11-10T06:00:00Z', 'en'));
    expect(open).toHaveTextContent(formatClinicDate('2026-11-28T06:00:00Z', 'en'));
    fireEvent.click(open);
    expect(await screen.findByText('Appointment History')).toBeInTheDocument();
  });
});
