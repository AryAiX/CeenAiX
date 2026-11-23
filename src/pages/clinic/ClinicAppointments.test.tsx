import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import { createServerLikeBuilder } from '../../test/supabase-server-like-mock';
import ClinicAppointments from './ClinicAppointments';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const DOCTOR = { user_id: 'doctor-1', full_name: 'Dr Test Doctor', phone: null };
const PATIENT = { user_id: 'patient-1', full_name: 'Test Patient', phone: '+971500000000' };

type Builder = MockSupabaseQueryBuilder<unknown>;

/** One mock builder per supabase.from() call, so we can see every query the page made. */
const setupSupabase = ({
  listAppointments = [] as unknown[],
  bookedThatDay = [] as unknown[],
  availability = [{ start_time: '09:00:00', end_time: '10:00:00', slot_duration_minutes: 30 }],
  staff = [{ doctor_user_id: 'doctor-1', consultation_fee: 300, invitation_status: 'accepted', is_active: true }] as unknown[],
  profiles = [DOCTOR, PATIENT] as unknown[],
} = {}) => {
  const calls: Record<string, Builder[]> = {};
  let appointmentCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    let builder: Builder;
    if (table === 'clinic_portal_members') {
      builder = createSupabaseQueryBuilder({ data: { facility_id: 'facility-1' }, error: null });
    } else if (table === 'appointments') {
      appointmentCalls += 1;
      builder = createSupabaseQueryBuilder({ data: appointmentCalls === 1 ? listAppointments : bookedThatDay, error: null });
      builder.single = vi.fn(() => Promise.resolve({ data: { id: 'new-appt' }, error: null }));
    } else if (table === 'user_profiles') {
      builder = createSupabaseQueryBuilder({ data: profiles, error: null });
    } else if (table === 'doctor_profiles') {
      builder = createSupabaseQueryBuilder({ data: [{ user_id: 'doctor-1', specialization: 'Cardiology' }], error: null });
    } else if (table === 'facility_staff') {
      builder = createSupabaseQueryBuilder({ data: staff, error: null });
    } else if (table === 'doctor_availability') {
      builder = createSupabaseQueryBuilder({ data: availability, error: null });
    } else {
      builder = createSupabaseQueryBuilder({ data: [], error: null });
    }
    (calls[table] ??= []).push(builder);
    return builder;
  }) as never);
  return calls;
};

const openBookingForDate = async (dateKey: string) => {
  render(<ClinicAppointments />);
  await screen.findByText('Appointments');
  fireEvent.click(screen.getByRole('button', { name: /Book Appointment/ }));
  fireEvent.change(screen.getByPlaceholderText('Search patient by name…'), { target: { value: 'Test' } });
  fireEvent.click(await screen.findByText('Test Patient', { selector: 'div' }));
  const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: dateKey } });
  return dateInput;
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-user-1' } } as never);
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

describe('ClinicAppointments clinic time (QA-189)', () => {
  it('lists a 09:00 Dubai visit as 09:00 under "Today", also just after midnight Dubai', async () => {
    vi.setSystemTime(new Date('2026-11-23T20:30:00Z')); // 00:30 Dubai, 24 Nov
    setupSupabase({
      listAppointments: [
        {
          id: 'appt-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          scheduled_at: '2026-11-24T05:00:00Z',
          status: 'scheduled',
          type: 'in_person',
          chief_complaint: 'Consultation',
          notes: null,
          duration_minutes: 30,
          created_at: '2026-11-23T10:00:00Z',
          updated_at: '2026-11-23T10:00:00Z',
        },
      ],
    });
    render(<ClinicAppointments />);
    const row = (await screen.findByText('Test Patient')).closest('tr') as HTMLElement;
    expect(within(row).getByText('09:00')).toBeInTheDocument();
    expect(within(row).getByText('Nov 24, 2026')).toBeInTheDocument();
  });

  it('saves a 09:00 booking as 05:00 UTC and checks booked visits in clinic time', async () => {
    vi.setSystemTime(new Date('2026-11-23T20:30:00Z')); // 00:30 Dubai, 24 Nov
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'new-appt', error: null } as never);
    const calls = setupSupabase({
      // 09:30 Dubai is already booked
      bookedThatDay: [{ scheduled_at: '2026-11-24T05:30:00Z', duration_minutes: 30 }],
    });
    const dateInput = await openBookingForDate('2026-11-24');
    expect(dateInput.min).toBe('2026-11-24');

    const slot = await screen.findByRole('button', { name: '09:00' });
    expect(screen.queryByRole('button', { name: '09:30' })).not.toBeInTheDocument();

    const slotQuery = calls.appointments[1];
    expect(slotQuery.gte).toHaveBeenCalledWith('scheduled_at', '2026-11-23T20:00:00.000Z');
    expect(slotQuery.lte).toHaveBeenCalledWith('scheduled_at', '2026-11-24T19:59:59.999Z');

    fireEvent.click(slot);
    const bookButtons = screen.getAllByRole('button', { name: /Book Appointment/ });
    fireEvent.click(bookButtons[bookButtons.length - 1]);

    // QA-191: booked through clinic_book_appointment (one transaction), not a direct insert
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        'clinic_book_appointment',
        expect.objectContaining({ p_scheduled_at: '2026-11-24T05:00:00.000Z', p_doctor_id: 'doctor-1', p_patient_id: 'patient-1' })
      )
    );
  });

  it('does not offer slots that have already started today', async () => {
    vi.setSystemTime(new Date('2026-11-24T05:10:00Z')); // 09:10 Dubai
    setupSupabase();
    await openBookingForDate('2026-11-24');
    expect(await screen.findByRole('button', { name: '09:30' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument();
  });
});

describe('ClinicAppointments status rules (QA-190)', () => {
  const visit = (id: string, scheduled_at: string, status: string) => ({
    id,
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    scheduled_at,
    status,
    type: 'in_person',
    chief_complaint: `Visit ${id}`,
    notes: null,
    duration_minutes: 30,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  });

  // 08:00 Dubai on 24 Nov; all three visits are today (Dubai).
  const setupToday = () => {
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z'));
    return setupSupabase({
      listAppointments: [
        visit('future', '2026-11-24T05:00:00Z', 'scheduled'), // 09:00, not started
        visit('started', '2026-11-24T03:00:00Z', 'confirmed'), // 07:00, start time passed
        visit('done', '2026-11-24T02:00:00Z', 'completed'), // 06:00, final
      ],
    });
  };
  const rowFor = async (id: string) => (await screen.findByText(`Visit ${id}`)).closest('tr') as HTMLElement;

  it('only offers the allowed actions and never Completed / In Progress', async () => {
    setupToday();
    render(<ClinicAppointments />);

    const future = await rowFor('future');
    expect(within(future).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(future).getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(within(future).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(future).queryByRole('button', { name: 'No-show' })).not.toBeInTheDocument();

    const started = await rowFor('started');
    expect(within(started).getByRole('button', { name: 'No-show' })).toBeInTheDocument();
    expect(within(started).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(within(started).queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();

    const done = await rowFor('done');
    expect(within(done).queryByRole('button')).not.toBeInTheDocument();
    expect(within(done).queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('confirms through the database function, not a direct update', async () => {
    const calls = setupToday();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'confirmed', error: null } as never);
    render(<ClinicAppointments />);

    fireEvent.click(within(await rowFor('future')).getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_set_appointment_status', {
        p_appointment_id: 'future',
        p_status: 'confirmed',
        p_reason: null,
      })
    );
    expect(calls.appointments.some((builder) => builder.update.mock.calls.length > 0)).toBe(false);
    await waitFor(() => expect(within(screen.getByText('Visit future').closest('tr') as HTMLElement).getAllByText('Confirmed').length).toBeGreaterThan(0));
  });

  it('cancels with a reason and says the patient and doctor will be notified', async () => {
    setupToday();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'cancelled', error: null } as never);
    render(<ClinicAppointments />);

    fireEvent.click(within(await rowFor('future')).getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel appointment' });
    expect(within(dialog).getByText('The patient and the doctor will be notified.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: '  Doctor on leave  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel appointment' }));

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_set_appointment_status', {
        p_appointment_id: 'future',
        p_status: 'cancelled',
        p_reason: 'Doctor on leave',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a plain message (not the database text) when the change is refused', async () => {
    setupToday();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'This status change is not allowed.' },
    } as never);
    render(<ClinicAppointments />);

    fireEvent.click(within(await rowFor('started')).getByRole('button', { name: 'No-show' }));

    expect(
      await screen.findByText('This change is no longer possible for this appointment. The list has been refreshed.')
    ).toBeInTheDocument();
    expect(screen.queryByText('This status change is not allowed.')).not.toBeInTheDocument();
  });
});

describe('ClinicAppointments doctor lists (QA-194)', () => {
  const visit = (id: string, doctorId: string) => ({
    id,
    patient_id: 'patient-1',
    doctor_id: doctorId,
    scheduled_at: '2026-11-24T05:00:00Z',
    status: 'scheduled',
    type: 'in_person',
    chief_complaint: `Visit ${id}`,
    notes: null,
    duration_minutes: 30,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  });
  const link = (doctorId: string, invitation_status: string) => ({
    doctor_user_id: doctorId,
    consultation_fee: 300,
    invitation_status,
    is_active: true,
  });

  it('only offers accepted / active doctors in the booking popup', async () => {
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z'));
    setupSupabase({
      staff: [link('doctor-1', 'accepted'), link('doctor-p', 'pending'), link('doctor-i', 'invited'), link('doctor-a', 'active')],
      profiles: [
        DOCTOR,
        PATIENT,
        { user_id: 'doctor-p', full_name: 'Dr Pending', phone: null },
        { user_id: 'doctor-i', full_name: 'Dr Invited', phone: null },
        { user_id: 'doctor-a', full_name: 'Dr Active', phone: null },
      ],
    });
    render(<ClinicAppointments />);
    await screen.findByText('Appointments');
    fireEvent.click(screen.getByRole('button', { name: /Book Appointment/ }));

    const doctorSelect = within(screen.getByRole('dialog')).getByLabelText('Doctor');
    const names = within(doctorSelect).getAllByRole('option').map((option) => option.textContent);
    expect(names).toEqual(['Dr Test Doctor', 'Dr Active']);
  });

  it('filters by doctor id, so two doctors with the same name are not mixed up', async () => {
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z'));
    setupSupabase({
      listAppointments: [visit('one', 'doctor-1'), visit('two', 'doctor-2')],
      staff: [link('doctor-1', 'accepted'), link('doctor-2', 'accepted')],
      profiles: [
        { user_id: 'doctor-1', full_name: 'Dr Same Name', phone: null },
        { user_id: 'doctor-2', full_name: 'Dr Same Name', phone: null },
        PATIENT,
      ],
    });
    render(<ClinicAppointments />);
    await screen.findByText('Visit one');
    expect(screen.getByText('Visit two')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('All doctors'), { target: { value: 'doctor-2' } });

    expect(screen.queryByText('Visit one')).not.toBeInTheDocument();
    expect(screen.getByText('Visit two')).toBeInTheDocument();
  });
});

describe('ClinicAppointments estimated prices (QA-195)', () => {
  const visit = (id: string, doctorId: string, extra: Record<string, unknown> = {}) => ({
    id,
    patient_id: 'patient-1',
    doctor_id: doctorId,
    scheduled_at: '2026-11-24T03:00:00Z', // 07:00 Dubai, today
    status: 'completed',
    type: 'in_person',
    chief_complaint: 'Consultation',
    notes: null,
    duration_minutes: 30,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    ...extra,
  });
  const plain = (value: string | null | undefined) => (value ?? '').replace(/\u00a0/g, ' ');
  const priceCell = async (id: string) => {
    const row = (await screen.findByText(`Patient ${id}`)).closest('tr') as HTMLElement;
    return plain(row.querySelectorAll('td')[4].textContent);
  };

  it('uses the fee for the kind of visit, keeps fees of doctors who left, and shows — when none is set', async () => {
    vi.setSystemTime(new Date('2026-11-24T08:00:00Z')); // 12:00 Dubai
    setupSupabase({
      listAppointments: [
        visit('consult', 'doctor-1', { patient_id: 'p-consult' }),
        visit('tele', 'doctor-1', { patient_id: 'p-tele', type: 'virtual', chief_complaint: 'Telemedicine' }),
        visit('follow', 'doctor-1', { patient_id: 'p-follow', chief_complaint: 'Follow-up Visit', status: 'scheduled' }),
        visit('left', 'doctor-left', { patient_id: 'p-left' }),
        visit('nofee', 'doctor-nofee', { patient_id: 'p-nofee' }),
      ],
      staff: [
        { doctor_user_id: 'doctor-1', consultation_fee: 300, telemedicine_fee: 250, follow_up_fee: 150, invitation_status: 'accepted', is_active: true },
        { doctor_user_id: 'doctor-left', consultation_fee: 400, invitation_status: 'removed', is_active: false },
        { doctor_user_id: 'doctor-nofee', consultation_fee: null, invitation_status: 'accepted', is_active: true },
      ],
      profiles: ['consult', 'tele', 'follow', 'left', 'nofee'].map((id) => ({ user_id: `p-${id}`, full_name: `Patient ${id}`, phone: null })),
    });
    render(<ClinicAppointments />);

    expect(await priceCell('consult')).toBe('AED 300');
    expect(await priceCell('tele')).toBe('AED 250');
    expect(await priceCell('follow')).toBe('AED 150');
    expect(await priceCell('left')).toBe('AED 400');
    expect(await priceCell('nofee')).toBe('—');
  });

  it('labels revenue as an estimate of completed visits today', async () => {
    vi.setSystemTime(new Date('2026-11-24T08:00:00Z'));
    setupSupabase({
      listAppointments: [
        visit('a', 'doctor-1', { patient_id: 'p-a' }),
        visit('b', 'doctor-1', { patient_id: 'p-b', type: 'virtual', chief_complaint: 'Telemedicine' }),
        visit('c', 'doctor-1', { patient_id: 'p-c', status: 'scheduled' }),
      ],
      staff: [{ doctor_user_id: 'doctor-1', consultation_fee: 300, telemedicine_fee: 250, invitation_status: 'accepted', is_active: true }],
      profiles: ['a', 'b', 'c'].map((id) => ({ user_id: `p-${id}`, full_name: `Patient ${id}`, phone: null })),
    });
    render(<ClinicAppointments />);

    const label = await screen.findByText('Est. revenue today (completed)');
    expect(plain(label.previousElementSibling?.textContent)).toBe('AED 550');
    expect(screen.getByText(/Prices and revenue are estimates from the clinic.s current fee list/)).toBeInTheDocument();
    expect(screen.getByText('Est. price')).toBeInTheDocument();
  });
});

describe('ClinicAppointments rescheduled badge (QA-196)', () => {
  it('does not call a visit "Rescheduled" just because it was changed later (e.g. confirmed)', async () => {
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z'));
    setupSupabase({
      listAppointments: [
        {
          id: 'confirmed-later',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          scheduled_at: '2026-11-24T05:00:00Z',
          status: 'confirmed',
          type: 'in_person',
          chief_complaint: 'Consultation',
          notes: null,
          duration_minutes: 30,
          created_at: '2026-11-20T10:00:00Z',
          updated_at: '2026-11-21T09:00:00Z', // confirmed a day after booking; time never changed
        },
      ],
    });
    render(<ClinicAppointments />);
    await screen.findByText('Test Patient');
    expect(screen.queryByText(/Rescheduled/)).not.toBeInTheDocument();
  });
});

describe('ClinicAppointments long lists (QA-197)', () => {
  it('shows all 1,200 visits of today with real names (no silent 1,000-row cut, no failed name lookup)', async () => {
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z'));
    const visits = Array.from({ length: 1200 }, (_, i) => ({
      id: `appt-${String(i).padStart(4, '0')}`,
      patient_id: `patient-${i % 300}`,
      doctor_id: 'doctor-1',
      scheduled_at: '2026-11-24T05:00:00Z',
      status: 'scheduled',
      type: 'in_person',
      chief_complaint: 'Consultation',
      notes: null,
      duration_minutes: 30,
      created_at: '2026-11-20T10:00:00Z',
      updated_at: '2026-11-20T10:00:00Z',
    }));
    const people = [
      { user_id: 'doctor-1', full_name: 'Dr Test Doctor', phone: null },
      ...Array.from({ length: 300 }, (_, i) => ({ user_id: `patient-${i}`, full_name: `Patient Number ${i}`, phone: null })),
    ];
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

    render(<ClinicAppointments />);

    const totalLabel = await screen.findByText("Today's Total");
    expect(totalLabel.previousElementSibling?.textContent).toBe('1200');
    expect(screen.queryByText('Unknown Patient')).not.toBeInTheDocument();
    expect(screen.getAllByText('Patient Number 299').length).toBe(4);
    expect(screen.queryByText('Showing the most recent 20,000 appointments.')).not.toBeInTheDocument();
  }, 20000);
});

describe('ClinicAppointments in Arabic (QA-198)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const followUp = {
    id: 'ar-visit',
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    scheduled_at: '2026-11-24T05:00:00Z', // 09:00 Dubai
    status: 'confirmed',
    type: 'in_person',
    chief_complaint: 'Follow-up Visit',
    notes: null,
    duration_minutes: 30,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  };

  it('shows the page, table and actions in Arabic with Arabic digits', async () => {
    await i18n.changeLanguage('ar');
    vi.setSystemTime(new Date('2026-11-24T04:00:00Z')); // 08:00 Dubai
    setupSupabase({ listAppointments: [followUp] });
    render(<ClinicAppointments />);

    expect(await screen.findByRole('heading', { name: 'المواعيد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حجز موعد' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'التاريخ والوقت' })).toBeInTheDocument();
    expect(screen.getByText('إجمالي اليوم').previousElementSibling?.textContent).toBe('١');

    const row = screen.getByText('Test Patient').closest('tr') as HTMLElement;
    expect(within(row).getByText('٠٩:٠٠')).toBeInTheDocument();
    expect(within(row).getByText('زيارة متابعة')).toBeInTheDocument();
    expect(within(row).getByText('مؤكد')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
    expect(row.querySelectorAll('td')[4].textContent).toContain('٣٠٠');

    const english = ['Appointments', 'Book Appointment', 'Date & Time', "Today's Total", 'Confirmed', 'Follow-up Visit', 'Cancel', 'All'];
    for (const text of english) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });

  it('shows a plain Arabic message, not the database text, when loading fails', async () => {
    await i18n.changeLanguage('ar');
    vi.mocked(supabase.from).mockImplementation(((table: string) =>
      table === 'clinic_portal_members'
        ? createSupabaseQueryBuilder({ data: null, error: { code: '42P01', message: 'relation "x" does not exist' } })
        : createSupabaseQueryBuilder({ data: [], error: null })) as never);
    render(<ClinicAppointments />);

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل المواعيد. يُرجى المحاولة مرة أخرى.');
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
  });

  it('books in Arabic: right-to-left popup, Arabic slot times, same saved time', async () => {
    await i18n.changeLanguage('ar');
    vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'new-appt', error: null } as never);
    setupSupabase();
    render(<ClinicAppointments />);
    fireEvent.click(await screen.findByRole('button', { name: 'حجز موعد' }));

    const dialog = screen.getByRole('dialog', { name: 'حجز موعد' });
    expect(dialog).toHaveAttribute('dir', 'rtl');
    fireEvent.change(within(dialog).getByLabelText('اسم المريض'), { target: { value: 'Test' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /Test Patient/ }));
    fireEvent.change(within(dialog).getByLabelText('التاريخ'), { target: { value: '2026-11-24' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: '٠٩:٠٠' }));
    const bookButtons = within(dialog).getAllByRole('button', { name: 'حجز موعد' });
    fireEvent.click(bookButtons[bookButtons.length - 1]);

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        'clinic_book_appointment',
        expect.objectContaining({ p_scheduled_at: '2026-11-24T05:00:00.000Z', p_chief_complaint: 'Consultation' })
      )
    );
  });
});
