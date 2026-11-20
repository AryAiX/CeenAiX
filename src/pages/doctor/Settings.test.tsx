import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorSchedule, useUserProfile } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { DoctorSettings } from './Settings';

vi.mock('../../hooks', () => ({ useDoctorSchedule: vi.fn(), useUserProfile: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

type Call = { table: string; op: string; values?: unknown; filters: unknown[] };

let calls: Call[];
let myClinic: Record<string, unknown> | null;
let searchRows: Array<Record<string, unknown>>;
let insertedId: string;

const chainFor = (table: string) => {
  const call: Call = { table, op: 'select', filters: [] };
  calls.push(call);
  const result = () => {
    if (table === 'facility_staff' && call.op === 'select') return { data: myClinic, error: null };
    if (table === 'facility_staff' && call.op === 'insert') return { data: { id: insertedId }, error: null };
    if (table === 'facilities') return { data: searchRows, error: null };
    return { data: null, error: null };
  };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: (values: unknown) => ((call.op = 'insert'), (call.values = values), chain),
    update: (values: unknown) => ((call.op = 'update'), (call.values = values), chain),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    or: (value: unknown) => (call.filters.push(['or', value]), chain),
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
    then: (resolve: (value: unknown) => unknown) => resolve(result()),
  };
  return chain;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/doctor/settings?section=my-clinic']}>
      <DoctorSettings />
    </MemoryRouter>
  );

const notifyCalls = () =>
  vi.mocked(supabase.rpc).mock.calls.filter(([name]) => name === 'notify_clinic_about_doctor_link');

describe('DoctorSettings clinic notifications (QA-175)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    calls = [];
    myClinic = null;
    searchRows = [];
    insertedId = 'staff-new';
    vi.mocked(supabase.from).mockReset().mockImplementation(chainFor as never);
    vi.mocked(supabase.rpc).mockReset().mockResolvedValue({ data: 2, error: null } as never);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doc-1' }, doctorProfile: null } as never);
    vi.mocked(useUserProfile).mockReturnValue({
      data: { full_name: 'Dr. Sara Ali', notification_preferences: {} },
      loading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useDoctorSchedule).mockReturnValue({ data: { availabilities: [] } } as never);
  });

  it('sends a join request, then asks the database to notify the clinic about that request', async () => {
    searchRows = [{ id: 'clinic-a', name: 'Clinic A', city: 'Dubai', facility_type: 'clinic' }];
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Type clinic name…'), { target: { value: 'Clin' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Request to Join' }));

    await waitFor(() => expect(notifyCalls()).toEqual([['notify_clinic_about_doctor_link', { p_staff_id: 'staff-new' }]]));
    expect(calls.find((call) => call.op === 'insert')?.values).toEqual({
      facility_id: 'clinic-a',
      doctor_user_id: 'doc-1',
      is_active: false,
      is_available: false,
      invitation_status: 'pending',
    });
    // The old client-side way (read clinic staff, insert notifications for them) is gone.
    expect(calls.map((call) => call.table)).not.toContain('clinic_portal_members');
    expect(calls.map((call) => call.table)).not.toContain('notifications');
  });

  it('accepting an invitation approves it, then notifies the clinic', async () => {
    myClinic = { id: 'staff-1', facility_id: 'clinic-a', invitation_status: 'invited', facilities: { name: 'Clinic A' } };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Accept Invitation' }));

    await waitFor(() => expect(notifyCalls()).toHaveLength(1));
    const rpcNames = vi.mocked(supabase.rpc).mock.calls.map(([name]) => name);
    expect(rpcNames).toEqual(['approve_doctor_and_link_appointments', 'notify_clinic_about_doctor_link']);
    expect(notifyCalls()[0][1]).toEqual({ p_staff_id: 'staff-1' });
  });

  it('declining an invitation updates the link, then notifies the clinic', async () => {
    myClinic = { id: 'staff-1', facility_id: 'clinic-a', invitation_status: 'invited', facilities: { name: 'Clinic A' } };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(notifyCalls()).toEqual([['notify_clinic_about_doctor_link', { p_staff_id: 'staff-1' }]]));
    expect(calls.find((call) => call.op === 'update')?.values).toEqual({
      invitation_status: 'declined',
      is_active: false,
      is_available: false,
    });
  });

  it('a failed notification does not undo or block the join request', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'down' } } as never);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    searchRows = [{ id: 'clinic-a', name: 'Clinic A', city: 'Dubai', facility_type: 'clinic' }];
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Type clinic name…'), { target: { value: 'Clin' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Request to Join' }));

    expect(await screen.findByText('Join request sent successfully!')).toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
