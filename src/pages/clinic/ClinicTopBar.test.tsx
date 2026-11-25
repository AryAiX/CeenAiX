import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import type { ClinicPortalMeta } from './ClinicPortal';
import ClinicTopBar from './ClinicTopBar';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

let signOut: ReturnType<typeof vi.fn>;
beforeEach(() => {
  signOut = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(useAuth).mockReturnValue({ signOut } as never);
});

const META: ClinicPortalMeta = {
  facilityName: 'QA Test Clinic',
  facilityAddress: 'Dubai',
  dhaLicensed: false,
  userName: 'Abud Tester',
  userRole: 'clinic_admin',
  pendingDoctors: 0,
  todayApptCount: 0,
  todayConfirmedCount: 0,
  todayFees: null,
  unreadMessages: 0,
  unreadNotifications: 3,
};

let landedAt = '';
const Probe = () => {
  landedAt = useLocation().pathname;
  return null;
};

const renderBar = (meta: Partial<ClinicPortalMeta> = {}) =>
  render(
    <MemoryRouter initialEntries={['/clinic/dashboard']}>
      <Routes>
        <Route path="/clinic/dashboard" element={<ClinicTopBar title="Dashboard" subtitle="Overview" meta={{ ...META, ...meta }} />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('ClinicTopBar (QA-240)', () => {
  it('has no search box or dropdown arrow that do nothing', () => {
    renderBar();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();
    // QA-248: the arrow is back, but now it opens a real account menu
    const arrow = document.querySelector('.lucide-chevron-down');
    expect(arrow?.closest('button')).toHaveAttribute('aria-haspopup', 'menu');
  });

  it.each([
    ['clinic_admin', 'Clinic admin'],
    ['clinic_manager', 'Clinic manager'],
    ['clinic_receptionist', 'Receptionist'],
    [null, 'Clinic staff'],
    ['something_else', 'Clinic staff'],
  ])('shows the role %s as "%s"', (role, label) => {
    renderBar({ userRole: role });
    expect(screen.getByTestId('clinic-topbar-role')).toHaveTextContent(label);
    expect(screen.queryByText(/Clinic_admin/)).not.toBeInTheDocument();
  });

  it('labels the bell with the unread count and opens Notifications', () => {
    renderBar();
    const bell = screen.getByRole('button', { name: 'Notifications, 3 unread' });
    fireEvent.click(bell);
    expect(landedAt).toBe('/clinic/notifications');
  });

  it('labels the bell without a count when everything is read', () => {
    renderBar({ unreadNotifications: 0 });
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('shows the role and the bell label in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderBar({ unreadNotifications: 2 });
    expect(screen.getByTestId('clinic-topbar-role')).toHaveTextContent('مسؤول العيادة');
    expect(screen.getByTestId('clinic-topbar-bell')).toHaveAccessibleName('الإشعارات، إشعاران غير مقروءين');
  });
});

describe('ClinicTopBar language toggle (QA-242)', () => {
  it('switches the portal to Arabic and back, and remembers the choice', async () => {
    renderBar();
    const toggle = screen.getByRole('group', { name: 'Language' });
    fireEvent.click(within(toggle).getByRole('button', { name: 'عربي' }));
    await waitFor(() => expect(i18n.language).toBe('ar'));
    expect(window.localStorage.getItem('ceenaix.lang')).toBe('ar');
    expect(screen.getByTestId('clinic-topbar-role')).toHaveTextContent('مسؤول العيادة');
    expect(within(screen.getByRole('group', { name: 'اللغة' })).getByRole('button', { name: 'عربي' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(screen.getByRole('group', { name: 'اللغة' })).getByRole('button', { name: 'EN' }));
    await waitFor(() => expect(i18n.language).toBe('en'));
    expect(screen.getByTestId('clinic-topbar-role')).toHaveTextContent('Clinic admin');
  });
});

describe('ClinicTopBar account menu and sign out (QA-248)', () => {
  it('opens an account menu from the name with Settings and Sign Out', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    const menu = screen.getByRole('menu', { name: 'Account menu' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Settings' }));
    expect(landedAt).toBe('/clinic/settings');
  });

  it('asks first, then signs out and goes to the login page', async () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sign Out' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, Sign Out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(landedAt).toBe('/auth/login'));
  });

  it('keeps the dialog open and says so when signing out fails', async () => {
    signOut.mockResolvedValue({ error: new Error('network') });
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Sign Out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Please try again.');
    expect(screen.getByRole('alertdialog', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('works in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'قائمة الحساب' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'تسجيل الخروج' }));
    expect(screen.getByRole('alertdialog', { name: 'تسجيل الخروج' })).toHaveAttribute('dir', 'rtl');
  });
});
