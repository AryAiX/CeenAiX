import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorSchedule, useUserProfile } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { DoctorSettings } from './Settings';

vi.mock('../../hooks', () => ({ useDoctorSchedule: vi.fn(), useUserProfile: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../../components/AccountSecurityPanel', () => ({
  AccountSecurityPanel: () => <div data-testid="account-security-panel">security panel</div>,
}));

type Call = { table: string; op: string; values?: unknown; filters: unknown[] };

let calls: Call[];
let myClinic: Record<string, unknown> | null;
let searchRows: Array<Record<string, unknown>>;
let extraLinks: Array<Record<string, unknown>>;
let searchResult: (() => Promise<unknown>) | null;
let insertedId: string;

const chainFor = (table: string) => {
  const call: Call = { table, op: 'select', filters: [] };
  calls.push(call);
  const result = () => {
    if (table === 'facility_staff' && call.op === 'select') return { data: [...(myClinic ? [myClinic] : []), ...extraLinks], error: null };
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
    then: (resolve: (value: unknown) => unknown) =>
      table === 'facilities' && searchResult ? searchResult().then(resolve) : resolve(result()),
  };
  return chain;
};

const renderPage = (path = '/doctor/settings?section=my-clinic') =>
  render(
    <MemoryRouter initialEntries={[path]}>
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
    extraLinks = [];
    searchResult = null;
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

describe('DoctorSettings sections (QA-177)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    calls = [];
    myClinic = { id: 'staff-1', facility_id: 'clinic-a', invitation_status: 'active', facilities: { name: 'Clinic A', name_en: null } };
    searchRows = [];
    extraLinks = [];
    searchResult = null;
    vi.mocked(supabase.from).mockReset().mockImplementation(chainFor as never);
    vi.mocked(supabase.rpc).mockReset().mockResolvedValue({ data: null, error: null } as never);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doc-1', email: 'doc@test.com' }, doctorProfile: { dha_license_verified: false } } as never);
    vi.mocked(useUserProfile).mockReturnValue({
      data: { full_name: 'Dr. Sara Ali', email: 'sara@test.com', created_at: '2026-02-10T08:00:00Z', notification_preferences: {} },
      loading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useDoctorSchedule).mockReturnValue({ data: { availabilities: [] } } as never);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const open = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

  it('opens on General with the account summary and links', async () => {
    renderPage('/doctor/settings');

    const general = await screen.findByTestId('settings-general');
    expect(general).toHaveTextContent('Dr. Sara Ali');
    expect(general).toHaveTextContent('sara@test.com');
    expect(general).toHaveTextContent('Doctor');
    expect(general).toHaveTextContent('Pending');
    await waitFor(() => expect(general).toHaveTextContent('Clinic A'));
    expect(general).toHaveTextContent('February 2026');
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/doctor/profile');
    expect(screen.getByRole('link', { name: 'Manage schedule' })).toHaveAttribute('href', '/doctor/schedule');
  });

  it('no section shows the old developer note any more', () => {
    renderPage('/doctor/settings');
    for (const name of ['General', 'My Clinic', 'Appearance', 'Notifications', 'Dashboard', 'Clinical tools', 'Labs & imaging', 'Privacy', 'Security', 'Language', 'Integrations', 'Help']) {
      open(name);
      expect(screen.queryByText(/reserved for real profile/)).not.toBeInTheDocument();
    }
  });

  it('shows a Coming soon card with what is planned for the 6 sections that need new features', () => {
    renderPage('/doctor/settings');
    const planned: Record<string, string> = {
      Appearance: 'light or dark mode',
      Dashboard: 'which cards appear on your dashboard',
      'Clinical tools': 'default prescription and lab order settings',
      'Labs & imaging': 'preferred labs and imaging centers',
      Privacy: 'what patients see on your public card',
      Integrations: 'connect your calendar',
    };
    for (const [name, text] of Object.entries(planned)) {
      open(name);
      const card = screen.getByTestId('settings-coming-soon');
      expect(card).toHaveTextContent('Coming soon');
      expect(card).toHaveTextContent(text);
    }
  });

  it('Security shows the password and account panel', () => {
    renderPage('/doctor/settings');
    open('Security');
    expect(screen.getByTestId('account-security-panel')).toBeInTheDocument();
  });

  it('Language switches the portal language', async () => {
    renderPage('/doctor/settings');
    open('Language');
    expect(screen.getByText('Portal language')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^(AR|ع|العربية|Arabic)/i }));
    await waitFor(() => expect(i18n.language).toBe('ar'));
  });

  it('Help shows the support email and the privacy policy', () => {
    renderPage('/doctor/settings');
    open('Help');
    expect(screen.getByRole('link', { name: 'support@ceenaix.com' })).toHaveAttribute('href', 'mailto:support@ceenaix.com');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  });

  it('opens the section named in the link', () => {
    renderPage('/doctor/settings?section=security');
    expect(screen.getByTestId('account-security-panel')).toBeInTheDocument();
  });

  it('an unknown ?section= link falls back to General', async () => {
    renderPage('/doctor/settings?section=nonsense');
    expect(await screen.findByTestId('settings-general')).toBeInTheDocument();
  });

  it('shows the Coming soon card in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage('/doctor/settings?section=appearance');
    const card = screen.getByTestId('settings-coming-soon');
    expect(within(card).getByText('قريبًا')).toBeInTheDocument();
    expect(card).toHaveTextContent('الوضع الفاتح أو الداكن');
  });
});

describe('DoctorSettings clinic search (QA-178)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    calls = [];
    myClinic = null;
    searchRows = [];
    extraLinks = [];
    searchResult = null;
    insertedId = 'staff-new';
    vi.mocked(supabase.from).mockReset().mockImplementation(chainFor as never);
    vi.mocked(supabase.rpc).mockReset().mockResolvedValue({ data: 1, error: null } as never);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doc-1' }, doctorProfile: null } as never);
    vi.mocked(useUserProfile).mockReturnValue({
      data: { full_name: 'Dr. Sara Ali', notification_preferences: {} },
      loading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useDoctorSchedule).mockReturnValue({ data: { availabilities: [] } } as never);
  });

  const type = (value: string) =>
    fireEvent.change(screen.getByPlaceholderText('Type clinic name…'), { target: { value } });

  it('puts commas and brackets inside a quoted filter instead of breaking it', async () => {
    searchRows = [{ id: 'c1', name: "St. Mary's (Dubai), Main", city: 'Dubai', facility_type: 'clinic' }];
    renderPage();
    type("St. Mary's (Dubai), M");

    expect(await screen.findByText("St. Mary's (Dubai), Main")).toBeInTheDocument();
    const filter = (calls.find((call) => call.table === 'facilities')?.filters as unknown[][]).find(([op]) => op === 'or');
    expect(filter).toEqual(['or', `name.ilike."%St. Mary's (Dubai), M%",name_en.ilike."%St. Mary's (Dubai), M%"`]);
  });

  it('shows only the newest search when an older answer arrives late', async () => {
    let releaseFirst: (value: unknown) => void = () => undefined;
    const answers = [
      () => new Promise((resolve) => (releaseFirst = resolve)),
      () => Promise.resolve({ data: [{ id: 'c2', name: 'Clinic Beta', city: 'Dubai', facility_type: 'clinic' }], error: null }),
    ];
    let index = 0;
    searchResult = () => answers[index++]();
    renderPage();

    type('Cl');
    type('Clinic B');
    expect(await screen.findByText('Clinic Beta')).toBeInTheDocument();

    releaseFirst({ data: [{ id: 'c1', name: 'Old Clinic Alpha', city: 'Dubai', facility_type: 'clinic' }], error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('Old Clinic Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Clinic Beta')).toBeInTheDocument();
  });

  it('says so when the search fails instead of "no clinics found"', async () => {
    searchResult = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();
    type('Clinic');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't search clinics. Please try again.");
    expect(screen.queryByText(/No clinics found/)).not.toBeInTheDocument();
  });

  it('shows the existing status for a clinic the doctor already has a link with', async () => {
    myClinic = { id: 'staff-1', facility_id: 'c1', invitation_status: 'rejected', facilities: { name: 'Clinic One' } };
    extraLinks = [{ id: 'staff-0', facility_id: 'c3', invitation_status: 'declined', facilities: { name: 'Clinic Three' } }];
    searchRows = [
      { id: 'c1', name: 'Clinic One', city: 'Dubai', facility_type: 'clinic' },
      { id: 'c2', name: 'Clinic Two', city: 'Dubai', facility_type: 'clinic' },
      { id: 'c3', name: 'Clinic Three', city: 'Dubai', facility_type: 'clinic' },
    ];
    renderPage();
    type('Clinic');

    await screen.findByText('Clinic Two');
    const statuses = screen.getAllByTestId('clinic-link-status').map((item) => item.textContent);
    expect(statuses).toEqual(['Request declined by clinic', 'You declined']);
    expect(screen.getAllByRole('button', { name: 'Request to Join' })).toHaveLength(1);
  });

  it('shows a clear message when the join request fails', async () => {
    searchRows = [{ id: 'c2', name: 'Clinic Two', city: 'Dubai', facility_type: 'clinic' }];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const chain = chainFor(table) as Record<string, unknown>;
      return {
        ...chain,
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'duplicate key value violates unique constraint' } }) }),
        }),
      };
    }) as never);
    renderPage();
    type('Clinic');
    fireEvent.click(await screen.findByRole('button', { name: 'Request to Join' }));

    expect(await screen.findByText("Couldn't send the join request. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).not.toBeInTheDocument();
  });
});

