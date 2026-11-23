import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
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
      builder = createSupabaseQueryBuilder({ data: [DOCTOR, PATIENT], error: null });
    } else if (table === 'doctor_profiles') {
      builder = createSupabaseQueryBuilder({ data: [{ user_id: 'doctor-1', specialization: 'Cardiology' }], error: null });
    } else if (table === 'facility_staff') {
      builder = createSupabaseQueryBuilder({ data: [{ doctor_user_id: 'doctor-1', consultation_fee: 300 }], error: null });
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
    expect(within(row).getByText('2026-11-24')).toBeInTheDocument();
  });

  it('saves a 09:00 booking as 05:00 UTC and checks booked visits in clinic time', async () => {
    vi.setSystemTime(new Date('2026-11-23T20:30:00Z')); // 00:30 Dubai, 24 Nov
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

    await waitFor(() => expect(calls.appointments[2]?.insert).toHaveBeenCalled());
    expect(calls.appointments[2].insert).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_at: '2026-11-24T05:00:00.000Z', doctor_id: 'doctor-1', patient_id: 'patient-1' })
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
