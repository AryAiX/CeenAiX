import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicDoctors from './ClinicDoctors';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const link = (id: string, doctor: string, invitation_status: string, is_active: boolean) => ({
  id,
  doctor_user_id: doctor,
  is_available: is_active,
  is_active,
  invitation_status,
  consultation_fee: 300,
  created_at: '2026-10-01T10:00:00Z',
});

const LINKS = [
  link('s-active', 'doc-active', 'accepted', true),
  link('s-pending', 'doc-pending', 'pending', false),
  link('s-invited', 'doc-invited', 'invited', false),
];
const PEOPLE = [
  { user_id: 'doc-active', full_name: 'Dr Active Person', phone: null, email: null },
  { user_id: 'doc-pending', full_name: 'Dr Pending Person', phone: null, email: null },
  { user_id: 'doc-invited', full_name: 'Dr Invited Person', phone: null, email: null },
  { user_id: 'doc-new', full_name: 'Dr New Person', phone: null, email: 'new@example.test' },
];

const setup = (doctorProfiles: unknown[] = [], upcomingVisits: unknown[] = [], links: unknown[] = LINKS) => {
  const calls: Record<string, MockSupabaseQueryBuilder<unknown>[]> = {};
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const data =
      table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
      : table === 'facility_staff' ? links
      : table === 'user_profiles' ? PEOPLE
      : table === 'doctor_profiles' ? doctorProfiles
      : table === 'appointments' ? upcomingVisits
      : [];
    const builder = createSupabaseQueryBuilder({ data, error: null });
    (calls[table] ??= []).push(builder);
    return builder;
  }) as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: 'ok', error: null } as never);
  render(
    <MemoryRouter>
      <ClinicDoctors />
    </MemoryRouter>
  );
  return calls;
};

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement;
const openMenu = (row: HTMLElement) => fireEvent.click(within(row).getAllByRole('button')[1]);
const directLinkWrites = (calls: Record<string, MockSupabaseQueryBuilder<unknown>[]>) =>
  (calls.facility_staff ?? []).filter((b) => b.insert.mock.calls.length > 0 || b.update.mock.calls.length > 0);
const expectAction = (doctor: string, action: string) =>
  expect(supabase.rpc).toHaveBeenCalledWith('clinic_doctor_link_action', { p_doctor_user_id: doctor, p_action: action });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-user-1' } } as never);
});
afterEach(() => {
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

describe('ClinicDoctors link actions (QA-199)', () => {
  it('rejects a join request through clinic_doctor_link_action, not a direct update', async () => {
    const calls = setup();
    fireEvent.click(within(await rowOf('Dr Pending Person')).getByTitle('View profile'));
    fireEvent.click(screen.getByRole('button', { name: /Reject Request/ }));
    await waitFor(() => expectAction('doc-pending', 'reject'));
    expect(directLinkWrites(calls)).toEqual([]);
  });

  it('suspends an active doctor through the database function', async () => {
    const calls = setup();
    fireEvent.click(within(await rowOf('Dr Active Person')).getByTitle('View profile'));
    fireEvent.click(screen.getByRole('button', { name: /Suspend Doctor/ }));
    // QA-203: suspending now asks first and goes through clinic_end_doctor_link
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, Suspend' }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_end_doctor_link', {
        p_doctor_user_id: 'doc-active',
        p_action: 'suspend',
        p_cancel_future_visits: false,
      })
    );
    expect(directLinkWrites(calls)).toEqual([]);
  });

  it('cancels an invitation and removes a doctor through the database function', async () => {
    const calls = setup();
    openMenu(await rowOf('Dr Invited Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cancel Invite/ }));
    await waitFor(() => expectAction('doc-invited', 'cancel_invite'));

    openMenu(await rowOf('Dr Active Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remove/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, Remove' }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_end_doctor_link', {
        p_doctor_user_id: 'doc-active',
        p_action: 'remove',
        p_cancel_future_visits: false,
      })
    );
    expect(directLinkWrites(calls)).toEqual([]);
  });

  it('invites a doctor in one database call (no direct insert, no browser-side notification)', async () => {
    const calls = setup();
    await screen.findByText('Dr Active Person');
    fireEvent.click(screen.getByRole('button', { name: /Add Doctor/ }));
    vi.mocked(supabase.rpc).mockImplementation(((name: string) =>
      Promise.resolve(
        name === 'clinic_search_doctors'
          ? { data: [{ user_id: 'doc-new', full_name: 'Dr New Person', specialization: 'Cardiology' }], error: null }
          : { data: 'invited', error: null }
      )) as never);
    fireEvent.change(screen.getByPlaceholderText('Search doctor by name…'), { target: { value: 'New' } });
    const result = (await screen.findAllByText('Dr New Person'))[0].closest('div.flex.items-center.justify-between') as HTMLElement;
    fireEvent.click(within(result).getByRole('button', { name: 'Invite' }));

    await waitFor(() => expectAction('doc-new', 'invite'));
    expect(directLinkWrites(calls)).toEqual([]);
    expect(calls.notifications).toBeUndefined();
  });

  it('the edit popup only changes the fee (no Status field that could skip approval)', async () => {
    const calls = setup();
    openMenu(await rowOf('Dr Pending Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Edit Fee/ }));

    const editPopup = screen.getByText('Edit Doctor').closest('div.rounded-2xl') as HTMLElement;
    expect(within(editPopup).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(editPopup).queryByText('Status')).not.toBeInTheDocument();
    fireEvent.change(within(editPopup).getByLabelText('Consultation fee (AED)'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(directLinkWrites(calls)).toHaveLength(1));
    expect(directLinkWrites(calls)[0].update).toHaveBeenCalledWith({ consultation_fee: 450, telemedicine_fee: null, follow_up_fee: null });
  });

  it('shows a plain message (not the database text) when a change is refused', async () => {
    setup();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'This change is not allowed for this doctor.' },
    } as never);
    fireEvent.click(within(await rowOf('Dr Pending Person')).getByTitle('View profile'));
    fireEvent.click(screen.getByRole('button', { name: /Reject Request/ }));

    expect(
      await screen.findByText(/This change is no longer possible for this doctor. The list has been refreshed./)
    ).toBeInTheDocument();
    expect(screen.queryByText('This change is not allowed for this doctor.')).not.toBeInTheDocument();
  });
});

describe('ClinicDoctors approve (QA-200)', () => {
  it('shows a plain message and refreshes when the request can no longer be approved', async () => {
    const calls = setup();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'This clinic link cannot be approved in its current state.' },
    } as never);
    fireEvent.click(within(await rowOf('Dr Pending Person')).getByTitle('View profile'));
    const loadsBefore = calls.facility_staff.length;
    fireEvent.click(screen.getByRole('button', { name: /Approve Doctor/ }));

    expect(supabase.rpc).toHaveBeenCalledWith('approve_doctor_and_link_appointments', {
      p_staff_id: 's-pending',
      p_facility_id: 'facility-1',
      p_doctor_user_id: 'doc-pending',
    });
    expect(
      await screen.findByText(/This change is no longer possible for this doctor. The list has been refreshed./)
    ).toBeInTheDocument();
    expect(screen.queryByText('This clinic link cannot be approved in its current state.')).not.toBeInTheDocument();
    await waitFor(() => expect(calls.facility_staff.length).toBeGreaterThan(loadsBefore));
  });
});

describe('ClinicDoctors DHA licence status (QA-201)', () => {
  const profiles = [
    { user_id: 'doc-active', specialization: 'Cardiology', license_number: 'DHA-111', dha_license_verified: false, consultation_fee: null },
    { user_id: 'doc-pending', specialization: 'Dermatology', license_number: 'DHA-222', dha_license_verified: true, consultation_fee: null },
  ];

  it('does not call an active doctor "Verified" when the licence is not verified', async () => {
    setup(profiles);
    const row = await rowOf('Dr Active Person');
    expect(within(row).getByText('Not verified')).toBeInTheDocument();
    fireEvent.click(within(row).getByTitle('View profile'));
    expect(screen.getByText('Not verified yet')).toBeInTheDocument();
    expect(screen.queryByText(/Verified & Active/)).not.toBeInTheDocument();
  });

  it('shows a verified licence as verified, whatever the clinic link status', async () => {
    setup(profiles);
    const row = await rowOf('Dr Pending Person');
    expect(within(row).getByText('Verified')).toBeInTheDocument();
    fireEvent.click(within(row).getByTitle('View profile'));
    expect(screen.getByText('Verified by CeenAiX')).toBeInTheDocument();
    expect(screen.queryByText(/Pending Verification/)).not.toBeInTheDocument();
  });
});

describe('ClinicDoctors invite search privacy (QA-202)', () => {
  it('searches through clinic_search_doctors and shows no email of other doctors', async () => {
    const calls = setup();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ user_id: 'doc-new', full_name: 'Dr New Person', specialization: 'Cardiology' }],
      error: null,
    } as never);
    await screen.findByText('Dr Active Person');
    const profileReadsBefore = calls.user_profiles.length;
    fireEvent.click(screen.getByRole('button', { name: /Add Doctor/ }));
    fireEvent.change(screen.getByPlaceholderText('Search doctor by name…'), { target: { value: 'New' } });

    expect(await screen.findByText('Cardiology')).toBeInTheDocument();
    expect(supabase.rpc).toHaveBeenCalledWith('clinic_search_doctors', { p_query: 'New' });
    expect(calls.user_profiles.length).toBe(profileReadsBefore);
    expect(screen.queryByText(/new@example\.test/)).not.toBeInTheDocument();
  });
});

describe('ClinicDoctors upcoming visits on suspend / remove (QA-203)', () => {
  const upcoming = [
    { id: 'v1', patient_id: 'patient-a', scheduled_at: '2030-01-10T05:00:00Z' },
    { id: 'v2', patient_id: 'patient-b', scheduled_at: '2030-01-11T06:30:00Z' },
  ];

  it('lists the doctor\'s upcoming visits before removing, and can cancel them with the removal', async () => {
    const calls = setup([], upcoming);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { status: 'removed', cancelled_visits: 2 }, error: null } as never);
    openMenu(await rowOf('Dr Active Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remove/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Remove Doctor' });
    expect(await within(dialog).findByText(/2 upcoming visits are still booked/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Jan 10, 2030 09:00/)).toBeInTheDocument();
    const visitQuery = calls.appointments[calls.appointments.length - 1];
    expect(visitQuery.eq).toHaveBeenCalledWith('doctor_id', 'doc-active');
    expect(visitQuery.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);

    fireEvent.click(within(dialog).getByRole('button', { name: /Remove and cancel these visits/ }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_end_doctor_link', {
        p_doctor_user_id: 'doc-active',
        p_action: 'remove',
        p_cancel_future_visits: true,
      })
    );
    expect(await screen.findByText(/2 upcoming visits were cancelled and the patients were notified/)).toBeInTheDocument();
  });

  it('can suspend and keep the visits, and Back changes nothing', async () => {
    setup([], upcoming);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { status: 'suspended', cancelled_visits: 0 }, error: null } as never);
    fireEvent.click(within(await rowOf('Dr Active Person')).getByTitle('View profile'));
    fireEvent.click(screen.getByRole('button', { name: /Suspend Doctor/ }));

    let dialog = await screen.findByRole('dialog', { name: 'Suspend Doctor' });
    await within(dialog).findByText(/2 upcoming visits are still booked/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(supabase.rpc).not.toHaveBeenCalledWith('clinic_end_doctor_link', expect.anything());

    fireEvent.click(within(await rowOf('Dr Active Person')).getByTitle('View profile'));
    fireEvent.click(screen.getByRole('button', { name: /Suspend Doctor/ }));
    dialog = await screen.findByRole('dialog', { name: 'Suspend Doctor' });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Suspend and keep the visits' }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('clinic_end_doctor_link', {
        p_doctor_user_id: 'doc-active',
        p_action: 'suspend',
        p_cancel_future_visits: false,
      })
    );
  });
});

describe('ClinicDoctors statuses (QA-204)', () => {
  const links = [
    link('s-admin', 'doc-admin', 'active', true),
    link('s-susp', 'doc-susp', 'suspended', false),
    link('s-declined', 'doc-declined', 'declined', false),
  ];
  const people = [
    { user_id: 'doc-admin', full_name: 'Dr Admin Linked', phone: null, email: null },
    { user_id: 'doc-susp', full_name: 'Dr Suspended Person', phone: null, email: null },
    { user_id: 'doc-declined', full_name: 'Dr Declined Person', phone: null, email: null },
  ];
  const render3 = () => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'facility_staff' ? links
        : table === 'user_profiles' ? people
        : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'accepted', error: null } as never);
    render(
      <MemoryRouter>
        <ClinicDoctors />
      </MemoryRouter>
    );
  };

  it('shows admin-linked doctors as Active and counts them', async () => {
    render3();
    const row = await rowOf('Dr Admin Linked');
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active (1)' })).toBeInTheDocument();
  });

  it('shows suspended doctors as Suspended and lets the clinic re-activate them', async () => {
    render3();
    const row = await rowOf('Dr Suspended Person');
    expect(within(row).getByText('Suspended')).toBeInTheDocument();
    openMenu(row);
    fireEvent.click(screen.getByRole('menuitem', { name: /Re-activate/ }));
    await waitFor(() => expectAction('doc-susp', 'reactivate'));
    expect(await within(await rowOf('Dr Suspended Person')).findByText('Active')).toBeInTheDocument();
  });

  it('lets the clinic invite a doctor again after they declined', async () => {
    render3();
    await rowOf('Dr Declined Person');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ user_id: 'doc-declined', full_name: 'Dr Declined Person', specialization: 'Cardiology' }],
      error: null,
    } as never);
    fireEvent.click(screen.getByRole('button', { name: /Add Doctor/ }));
    fireEvent.change(screen.getByPlaceholderText('Search doctor by name…'), { target: { value: 'Declined' } });
    expect(await screen.findByRole('button', { name: 'Invite' })).toBeInTheDocument();
    expect(screen.queryByText('Already in Clinic')).not.toBeInTheDocument();
  });
});

describe('ClinicDoctors fee edit (QA-205)', () => {
  const openEdit = async () => {
    openMenu(await rowOf('Dr Active Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Edit Fee/ }));
    return screen.getByText('Edit Doctor').closest('div.rounded-2xl') as HTMLElement;
  };

  it('edits all three fees and keeps an empty fee as "not set" (not AED 0)', async () => {
    const calls = setup();
    const popup = await openEdit();
    expect(within(popup).getByLabelText('Consultation fee (AED)')).toHaveValue('300');
    fireEvent.change(within(popup).getByLabelText('Consultation fee (AED)'), { target: { value: '' } });
    fireEvent.change(within(popup).getByLabelText('Telemedicine fee (AED)'), { target: { value: '250.50' } });
    fireEvent.change(within(popup).getByLabelText('Follow-up fee (AED)'), { target: { value: '150' } });
    fireEvent.click(within(popup).getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(directLinkWrites(calls)).toHaveLength(1));
    expect(directLinkWrites(calls)[0].update).toHaveBeenCalledWith({
      consultation_fee: null,
      telemedicine_fee: 250.5,
      follow_up_fee: 150,
    });
  });

  it.each(['-50', 'abc', '100001', '12.345'])('refuses "%s" and saves nothing', async (value) => {
    const calls = setup();
    const popup = await openEdit();
    fireEvent.change(within(popup).getByLabelText('Follow-up fee (AED)'), { target: { value } });
    fireEvent.click(within(popup).getByRole('button', { name: /Save Changes/ }));

    expect(await within(popup).findByRole('alert')).toHaveTextContent('from 0 to 100,000 AED');
    expect(directLinkWrites(calls)).toEqual([]);
  });
});

describe('ClinicDoctors counts (QA-206)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the Dubai day for "Today", exact totals (not cut at 1,000) and leaves cancelled visits out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T21:00:00Z')); // 01:00 Dubai, 24 Nov
    const appointmentQueries: MockSupabaseQueryBuilder<unknown>[] = [];
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'appointments') {
        const builder = createSupabaseQueryBuilder({ data: [{ doctor_id: 'doc-active' }], error: null, count: 1500 });
        appointmentQueries.push(builder);
        return builder;
      }
      const data =
        table === 'clinic_portal_members' ? { facility_id: 'facility-1' }
        : table === 'facility_staff' ? [link('s-active', 'doc-active', 'accepted', true)]
        : table === 'user_profiles' ? PEOPLE
        : [];
      return createSupabaseQueryBuilder({ data, error: null });
    }) as never);
    render(
      <MemoryRouter>
        <ClinicDoctors />
      </MemoryRouter>
    );

    const row = await rowOf('Dr Active Person');
    const cells = row.querySelectorAll('td');
    expect(cells[3].textContent).toBe('1'); // today
    expect(cells[4].textContent).toBe('1500'); // total, from the exact count

    const todayQuery = appointmentQueries.find((q) => q.gte.mock.calls.length > 0)!;
    expect(todayQuery.gte).toHaveBeenCalledWith('scheduled_at', '2026-11-23T20:00:00.000Z');
    expect(todayQuery.lte).toHaveBeenCalledWith('scheduled_at', '2026-11-24T19:59:59.999Z');
    for (const query of appointmentQueries) {
      expect(query.neq).toHaveBeenCalledWith('status', 'cancelled');
    }
    expect(screen.getByText('With visits today')).toBeInTheDocument();
    expect(screen.queryByText('Today on Duty')).not.toBeInTheDocument();
  });
});

describe('ClinicDoctors in Arabic (QA-207)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the page, table, statuses and menu in Arabic with Arabic digits', async () => {
    await i18n.changeLanguage('ar');
    setup([{ user_id: 'doc-active', specialization: 'Cardiology', license_number: 'DHA-111', dha_license_verified: true, consultation_fee: null }]);

    expect(await screen.findByRole('heading', { name: 'الأطباء' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إضافة طبيب/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'رخصة هيئة الصحة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الكل (٣)' })).toBeInTheDocument();
    expect(screen.getByText('طبيب واحد بانتظار الموافقة')).toBeInTheDocument();

    const row = await rowOf('Dr Active Person');
    expect(within(row).getByText('نشط')).toBeInTheDocument();
    expect(within(row).getByText('موثّقة')).toBeInTheDocument();
    expect(row.querySelectorAll('td')[5].textContent).toContain('٣٠٠');

    fireEvent.click(within(row).getByRole('button', { name: 'إجراءات أخرى لـ Dr Active Person' }));
    expect(screen.getByRole('menuitem', { name: /تعديل الرسوم/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /إزالة/ })).toBeInTheDocument();

    for (const english of ['Doctors', 'Add Doctor', 'Active', 'Pending', 'Verified', 'Edit Fee', 'Remove']) {
      expect(screen.queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('shows the upcoming-visits dialog in Arabic, right to left', async () => {
    await i18n.changeLanguage('ar');
    setup([], [{ id: 'v1', patient_id: 'patient-a', scheduled_at: '2030-01-10T05:00:00Z' }]);
    openMenu(await rowOf('Dr Active Person'));
    fireEvent.click(screen.getByRole('menuitem', { name: /إزالة/ }));

    const dialog = await screen.findByRole('dialog', { name: 'إزالة الطبيب' });
    expect(dialog).toHaveAttribute('dir', 'rtl');
    expect(await within(dialog).findByText('لا تزال زيارة قادمة واحدة محجوزة مع هذا الطبيب:')).toBeInTheDocument();
    expect(within(dialog).getByText(/٠٩:٠٠/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'رجوع' })).toBeInTheDocument();
  });

  it('shows a plain Arabic message, not the database text, when loading fails', async () => {
    await i18n.changeLanguage('ar');
    vi.mocked(supabase.from).mockImplementation(((table: string) =>
      table === 'clinic_portal_members'
        ? createSupabaseQueryBuilder({ data: null, error: { code: '42P01', message: 'relation "x" does not exist' } })
        : createSupabaseQueryBuilder({ data: [], error: null })) as never);
    render(
      <MemoryRouter>
        <ClinicDoctors />
      </MemoryRouter>
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل الأطباء. يُرجى المحاولة مرة أخرى.');
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
  });
});
