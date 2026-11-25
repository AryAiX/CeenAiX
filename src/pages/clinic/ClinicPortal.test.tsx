import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { countUnreadMessages, countUnreadNotifications } from '../../lib/clinic-unread-messages';
import { loadClinicTodayStats } from '../../lib/clinic-dashboard';
import { formatLocaleCurrency } from '../../lib/i18n-ui';
import { announceMessagesRead, announceNotificationsChanged } from '../../lib/notification-events';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicPortal from './ClinicPortal';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../../lib/clinic-unread-messages', () => ({ countUnreadMessages: vi.fn(), countUnreadNotifications: vi.fn() }));
vi.mock('../../lib/clinic-dashboard', () => ({ loadClinicTodayStats: vi.fn() }));
vi.mock('./ClinicDashboard', () => ({ default: () => null }));
vi.mock('./ClinicDoctors', () => ({ default: () => null }));
vi.mock('./ClinicAppointments', () => ({ default: () => null }));
vi.mock('./ClinicPatients', () => ({ default: () => null }));
vi.mock('./ClinicPricing', () => ({ default: () => null }));
vi.mock('./ClinicAnalytics', () => ({ default: () => null }));
vi.mock('./ClinicMessages', () => ({ default: () => null }));
vi.mock('./ClinicNotifications', () => ({ default: () => null }));
vi.mock('./ClinicSettings', () => ({ default: () => null }));
vi.mock('./ClinicTopBar', () => ({
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="topbar">
      {title} | {subtitle}
    </div>
  ),
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' }, signOut: vi.fn() } as never);
  vi.mocked(supabase.from).mockImplementation((() => createSupabaseQueryBuilder({ data: null, error: null })) as never);
  vi.mocked(countUnreadMessages).mockResolvedValue(0);
  vi.mocked(countUnreadNotifications).mockResolvedValue(0);
  vi.mocked(loadClinicTodayStats).mockResolvedValue({ todayApptCount: 0, todayConfirmedCount: 0, todayFees: null, pendingDoctors: 0 });
});

afterEach(() => {
  vi.mocked(countUnreadMessages).mockReset();
  vi.mocked(countUnreadNotifications).mockReset();
});

const renderPortal = () =>
  render(
    <MemoryRouter initialEntries={['/clinic/dashboard']}>
      <ClinicPortal />
    </MemoryRouter>
  );

describe('ClinicPortal unread message badge (QA-220)', () => {
  it('updates the badge when messages are read, and shows no "0" when none are left', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValueOnce(3).mockResolvedValue(0);
    renderPortal();

    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('3');
    act(() => announceMessagesRead());
    await waitFor(() => expect(screen.queryByTestId('clinic-nav-badge-messages')).not.toBeInTheDocument());
    for (const button of screen.getAllByRole('button', { name: /Messages/ })) {
      expect(button).not.toHaveTextContent('0');
    }
  });

  it('counts again when you move to another page', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValueOnce(2).mockResolvedValue(5);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('2');

    fireEvent.click(screen.getAllByRole('button', { name: /Patients/ })[0]);
    await waitFor(() => expect(screen.getByTestId('clinic-nav-badge-messages')).toHaveTextContent('5'));
    expect(countUnreadMessages).toHaveBeenCalledTimes(2);
  });

  it('shows 99+ for large numbers', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValue(1500);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('99+');
  });
});

describe('ClinicPortal unread notification badge (QA-224)', () => {
  it('updates the badge when notifications are marked read or dismissed', async () => {
    vi.mocked(countUnreadNotifications).mockResolvedValueOnce(4).mockResolvedValue(1);
    renderPortal();

    expect(await screen.findByTestId('clinic-nav-badge-notifications')).toHaveTextContent('4');
    act(() => announceNotificationsChanged());
    await waitFor(() => expect(screen.getByTestId('clinic-nav-badge-notifications')).toHaveTextContent('1'));
  });

  it('counts again when you move to another page, and hides the badge at 0', async () => {
    vi.mocked(countUnreadNotifications).mockResolvedValueOnce(2).mockResolvedValue(0);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-notifications')).toHaveTextContent('2');

    fireEvent.click(screen.getAllByRole('button', { name: /Patients/ })[0]);
    await waitFor(() => expect(screen.queryByTestId('clinic-nav-badge-notifications')).not.toBeInTheDocument());
  });
});

describe('ClinicPortal clinic name, subtitles and DHA badge (QA-238)', () => {
  const withClinic = (dha_status: string | null) =>
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1', portal_role: 'clinic_admin' }, error: null });
      if (table === 'facilities') return createSupabaseQueryBuilder({ data: { name: 'QA Test Clinic', address: 'Dubai', dha_status }, error: null });
      return createSupabaseQueryBuilder({ data: null, error: null });
    }) as never);

  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <ClinicPortal />
      </MemoryRouter>
    );

  it('does not claim the clinic is DHA licensed unless CeenAiX recorded it', async () => {
    withClinic(null);
    renderAt('/clinic/dashboard');
    expect((await screen.findAllByText('QA Test Clinic')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('clinic-dha-badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/DHA Licensed/i)).not.toBeInTheDocument();
  });

  it('shows the badge when the clinic is recorded as licensed', async () => {
    withClinic('licensed');
    renderAt('/clinic/dashboard');
    expect(await screen.findByTestId('clinic-dha-badge')).toHaveTextContent('DHA licensed ✓');
  });

  it('uses the clinic\'s own name on the Dashboard, not "Al Noor Medical Center"', async () => {
    withClinic(null);
    renderAt('/clinic/dashboard');
    await waitFor(() => expect(screen.getByTestId('topbar')).toHaveTextContent('Dashboard | Overview of QA Test Clinic'));
    expect(screen.queryByText(/Al Noor/)).not.toBeInTheDocument();
  });

  it.each([
    ['/clinic/pricing', 'Your services and their standard prices', /consultation fees/i],
    ['/clinic/analytics', 'Visits and estimated fees', /revenue/i],
    ['/clinic/patients', 'Patients with visits at your clinic', /registered/i],
  ])('describes %s accurately', async (path, subtitle, wrong) => {
    withClinic(null);
    renderAt(path);
    expect(await screen.findByTestId('topbar')).toHaveTextContent(subtitle);
    expect(screen.getByTestId('topbar')).not.toHaveTextContent(wrong);
  });
});

describe('ClinicPortal sidebar "TODAY" numbers (QA-239)', () => {
  const stats = (todayApptCount: number, pendingDoctors: number, todayFees: number | null = 500) => ({
    todayApptCount, todayConfirmedCount: todayApptCount, todayFees, pendingDoctors,
  });

  beforeEach(() => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1', portal_role: 'clinic_admin' }, error: null });
      if (table === 'facilities') return createSupabaseQueryBuilder({ data: { name: 'QA Test Clinic', address: 'Dubai', dha_status: null }, error: null });
      return createSupabaseQueryBuilder({ data: null, error: null });
    }) as never);
  });

  afterEach(() => {
    vi.mocked(loadClinicTodayStats).mockReset();
  });

  const renderPortalAt = (path = '/clinic/dashboard') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <ClinicPortal />
      </MemoryRouter>
    );

  it('shows estimated fees, not "Revenue"', async () => {
    vi.mocked(loadClinicTodayStats).mockResolvedValue(stats(2, 0, 500));
    renderPortalAt();
    expect(await screen.findByText(formatLocaleCurrency(500, 'en').replace(/\s+/g, ' '))).toBeInTheDocument();
    expect(screen.getByText('Estimated fees')).toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
  });

  it('updates the Appointments and Doctors badges when you move to another page', async () => {
    vi.mocked(loadClinicTodayStats).mockResolvedValueOnce(stats(2, 1)).mockResolvedValue(stats(3, 0));
    renderPortalAt('/clinic/doctors');
    expect(await screen.findByTestId('clinic-nav-badge-appointments')).toHaveTextContent('2');
    expect(screen.getByTestId('clinic-nav-badge-doctors')).toHaveTextContent('1');

    fireEvent.click(screen.getAllByRole('button', { name: /Patients/ })[0]);
    await waitFor(() => expect(screen.getByTestId('clinic-nav-badge-appointments')).toHaveTextContent('3'));
    expect(screen.queryByTestId('clinic-nav-badge-doctors')).not.toBeInTheDocument();
    expect(loadClinicTodayStats).toHaveBeenCalledWith(expect.anything(), 'f1');
  });

  it('shows "—" when the clinic has set no fee', async () => {
    vi.mocked(loadClinicTodayStats).mockResolvedValue(stats(1, 0, null));
    renderPortalAt();
    const label = await screen.findByText('Estimated fees');
    expect(label.parentElement).toHaveTextContent('—');
  });
});

describe('ClinicPortal direction and mobile menu (QA-241)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('turns the whole portal right to left in Arabic, with an Arabic mobile menu', async () => {
    await i18n.changeLanguage('ar');
    const { container } = render(
      <MemoryRouter initialEntries={['/clinic/pricing']}>
        <ClinicPortal />
      </MemoryRouter>
    );
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
    const menus = screen.getAllByRole('navigation', { name: 'قائمة العيادة' });
    expect(menus).toHaveLength(2);
    const mobile = menus.find((menu) => menu.className.includes('lg:hidden')) as HTMLElement;
    expect(within(mobile).getByRole('button', { name: 'الأسعار والخدمات' })).toHaveAttribute('aria-current', 'page');
    expect(within(mobile).queryByText('Pricing')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('topbar')).toHaveTextContent('الأسعار والخدمات'));
  });
});

describe('ClinicPortal language toggle on every page (QA-242)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('can switch language on the Messages page, which has no top bar', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/clinic/messages']}>
        <ClinicPortal />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('topbar')).not.toBeInTheDocument();
    // the sidebar (desktop) and the menu row (phones) each have one
    const toggles = screen.getAllByRole('group', { name: 'Language' });
    expect(toggles).toHaveLength(2);
    fireEvent.click(within(toggles[0]).getByRole('button', { name: 'عربي' }));
    await waitFor(() => expect(container.firstElementChild).toHaveAttribute('dir', 'rtl'));
    expect(screen.getAllByRole('group', { name: 'اللغة' })).toHaveLength(2);
  });

  it('shows the toggle in the top bar and sidebar on other pages', async () => {
    render(
      <MemoryRouter initialEntries={['/clinic/dashboard']}>
        <ClinicPortal />
      </MemoryRouter>
    );
    // the top bar is stubbed in these tests, so 1 here (sidebar) + the real top bar (ClinicTopBar.test)
    expect(screen.getAllByRole('group', { name: 'Language' })).toHaveLength(1);
    expect(screen.getByTestId('clinic-sidebar-language')).toBeInTheDocument();
  });
});

describe('ClinicPortal single scroll bar (QA-245)', () => {
  it('keeps hidden labels inside the scrolling page area, so the page itself never scrolls', () => {
    const { container } = renderPortal();
    // an sr-only label is position: absolute; without a positioned box around it the browser placed
    // it against the whole page, which grew the page (second scroll bar + empty white area)
    expect(container.firstElementChild).toHaveClass('relative', 'h-screen', 'overflow-hidden');
    expect(screen.getByRole('main')).toHaveClass('relative', 'overflow-y-auto');
  });
});

describe('ClinicPortal phone menu language toggle (QA-247)', () => {
  const phoneMenu = () =>
    screen.getAllByRole('navigation', { name: 'Clinic menu' }).find((menu) => menu.className.includes('lg:hidden')) as HTMLElement;

  it('does not repeat the toggle in the phone menu when the top bar already has it', () => {
    renderPortal();
    expect(within(phoneMenu()).queryByRole('group', { name: 'Language' })).not.toBeInTheDocument();
  });

  it('keeps it in the phone menu on Messages, which has no top bar', () => {
    render(
      <MemoryRouter initialEntries={['/clinic/messages']}>
        <ClinicPortal />
      </MemoryRouter>
    );
    expect(within(phoneMenu()).getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });
});

describe('ClinicPortal sign out on phones (QA-248)', () => {
  it('offers Sign Out in the phone menu on Messages, which has no top bar', () => {
    render(
      <MemoryRouter initialEntries={['/clinic/messages']}>
        <ClinicPortal />
      </MemoryRouter>
    );
    const phoneMenu = screen.getAllByRole('navigation', { name: 'Clinic menu' }).find((menu) => menu.className.includes('lg:hidden')) as HTMLElement;
    fireEvent.click(within(phoneMenu).getByRole('button', { name: 'Sign Out' }));
    expect(screen.getByRole('alertdialog', { name: 'Sign Out' })).toBeInTheDocument();
  });
});
