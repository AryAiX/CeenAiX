import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicPatients from './ClinicPatients';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

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
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members'
          ? { facility_id: 'facility-1' }
          : table === 'appointments'
            ? (calls.appointments?.length ?? 0) === 0
              ? [{ id: 'old', patient_id: 'patient-1', doctor_id: 'doctor-1', scheduled_at: '2026-11-01T05:00:00Z', status: 'completed' }]
              : []
            : table === 'facility_staff'
              ? [{ doctor_user_id: 'doctor-1', consultation_fee: 300 }]
              : table === 'user_profiles'
                ? [
                    { user_id: 'doctor-1', full_name: 'Dr Test Doctor' },
                    { user_id: 'patient-1', full_name: 'Test Patient', phone: '+971500000000', email: null, date_of_birth: null },
                  ]
                : table === 'doctor_availability'
                  ? [{ start_time: '09:00:00', end_time: '10:00:00', slot_duration_minutes: 30 }]
                  : [];
      const builder = createSupabaseQueryBuilder({ data, error: null });
      (calls[table] ??= []).push(builder);
      return builder;
    }) as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'appt-new', error: null } as never);

    render(
      <MemoryRouter>
        <ClinicPatients />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByText('Test Patient'));
    fireEvent.click(screen.getByRole('button', { name: /Book Appointment/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Book Appointment' });
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
