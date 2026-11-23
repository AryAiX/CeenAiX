import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicBookAppointmentModal from './ClinicBookAppointmentModal';

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const DOCTORS = [{ userId: 'doctor-1', name: 'Dr Test Doctor', specialty: 'Cardiology', consultationFee: 300 }];
const PATIENT = { userId: 'patient-1', fullName: 'Test Patient', phone: '+971500000000' };

const setupSupabase = () => {
  const calls: Record<string, MockSupabaseQueryBuilder<unknown>[]> = {};
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const data =
      table === 'doctor_availability'
        ? [{ start_time: '09:00:00', end_time: '10:00:00', slot_duration_minutes: 30 }]
        : table === 'user_profiles'
          ? [{ user_id: PATIENT.userId, full_name: PATIENT.fullName, phone: PATIENT.phone }]
          : [];
    const builder = createSupabaseQueryBuilder({ data, error: null });
    (calls[table] ??= []).push(builder);
    return builder;
  }) as never);
  return calls;
};

const pickSlot = async (time: string) => {
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-24' } });
  fireEvent.click(await screen.findByRole('button', { name: time }));
};
const bookButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: /Book Appointment|Booking…/ });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T08:00:00Z')); // 12:00 Dubai, 23 Nov
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

describe('ClinicBookAppointmentModal (QA-191)', () => {
  it('books in one database call, stays open while saving, then reports the new appointment', async () => {
    const calls = setupSupabase();
    let finish: (value: unknown) => void = () => {};
    vi.mocked(supabase.rpc).mockReturnValue(new Promise((resolve) => { finish = resolve; }) as never);
    const onBooked = vi.fn();
    const onClose = vi.fn();
    render(<ClinicBookAppointmentModal doctors={DOCTORS} fixedPatient={PATIENT} onClose={onClose} onBooked={onBooked} />);

    fireEvent.change(screen.getByLabelText('Appointment Type'), { target: { value: 'Telemedicine' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '  bring reports  ' } });
    await pickSlot('09:30');
    fireEvent.click(bookButton());

    expect(await screen.findByRole('button', { name: /Booking…/ })).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(supabase.rpc).toHaveBeenCalledWith('clinic_book_appointment', {
      p_doctor_id: 'doctor-1',
      p_patient_id: 'patient-1',
      p_scheduled_at: '2026-11-24T05:30:00.000Z',
      p_type: 'virtual',
      p_chief_complaint: 'Telemedicine',
      p_notes: 'bring reports',
    });
    // no direct writes: no appointment insert, no separate notification insert
    expect(calls.notifications).toBeUndefined();
    expect((calls.appointments ?? []).every((b) => b.insert.mock.calls.length === 0)).toBe(true);

    finish({ data: 'appt-new', error: null });
    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(onBooked.mock.calls[0][0]).toMatchObject({
      id: 'appt-new',
      scheduledAt: '2026-11-24T05:30:00.000Z',
      date: '2026-11-24',
      time: '09:30',
      patient: PATIENT,
      reason: 'Telemedicine',
      notes: 'bring reports',
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('when the slot was just taken: stays open, explains, and reloads the free slots', async () => {
    const calls = setupSupabase();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '23P01', message: 'This time slot is already booked.' },
    } as never);
    const onBooked = vi.fn();
    const onClose = vi.fn();
    render(<ClinicBookAppointmentModal doctors={DOCTORS} fixedPatient={PATIENT} onClose={onClose} onBooked={onBooked} />);

    await pickSlot('09:00');
    const slotQueriesBefore = calls.appointments.length;
    fireEvent.click(bookButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This time was just booked. The free slots have been refreshed; please choose another.'
    );
    expect(screen.queryByText('This time slot is already booked.')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onBooked).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(calls.appointments.length).toBe(slotQueriesBefore + 1));
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets staff search for a patient when none is fixed', async () => {
    setupSupabase();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'appt-new', error: null } as never);
    const onBooked = vi.fn();
    render(<ClinicBookAppointmentModal doctors={DOCTORS} onClose={vi.fn()} onBooked={onBooked} />);

    fireEvent.click(bookButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Please search and select a patient from the list.');
    expect(supabase.rpc).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Patient Name'), { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Patient', { selector: 'div' }));
    await pickSlot('09:00');
    fireEvent.click(bookButton());
    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ p_patient_id: 'patient-1', p_scheduled_at: '2026-11-24T05:00:00.000Z' });
  });
});

describe('ClinicBookAppointmentModal patient search note (QA-192)', () => {
  it('explains that only returning patients can be found, and what new patients can do', async () => {
    vi.mocked(supabase.from).mockImplementation((() => createSupabaseQueryBuilder({ data: [], error: null })) as never);
    render(<ClinicBookAppointmentModal doctors={DOCTORS} onClose={vi.fn()} onBooked={vi.fn()} />);

    const search = screen.getByLabelText('Patient Name');
    expect(search).toHaveAccessibleDescription('Only patients who have visited this clinic before are shown.');

    fireEvent.change(search, { target: { value: 'Nobody' } });
    expect(
      await screen.findByText("No patients found. New patients can book this clinic's doctors in the CeenAiX app.")
    ).toBeInTheDocument();
  });

  it('does not show the search note when booking from a patient card', () => {
    setupSupabase();
    render(<ClinicBookAppointmentModal doctors={DOCTORS} fixedPatient={PATIENT} onClose={vi.fn()} onBooked={vi.fn()} />);
    expect(screen.queryByText('Only patients who have visited this clinic before are shown.')).not.toBeInTheDocument();
  });
});
