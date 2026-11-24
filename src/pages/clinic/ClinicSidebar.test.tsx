import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import type { ClinicPortalMeta } from './ClinicPortal';
import ClinicSidebar from './ClinicSidebar';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const META: ClinicPortalMeta = {
  facilityName: 'QA Test Clinic',
  facilityAddress: 'Dubai',
  dhaLicensed: false,
  userName: 'Abud Tester',
  userRole: 'clinic_admin',
  pendingDoctors: 2,
  todayApptCount: 1,
  todayConfirmedCount: 1,
  todayFees: 300,
  unreadMessages: 3,
  unreadNotifications: 0,
};

const Harness = ({ startCollapsed = false }: { startCollapsed?: boolean }) => {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  return <ClinicSidebar isCollapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} activeTab="messages" meta={META} />;
};

const renderSidebar = (startCollapsed = false) =>
  render(
    <MemoryRouter>
      <Harness startCollapsed={startCollapsed} />
    </MemoryRouter>
  );

let signOut: ReturnType<typeof vi.fn>;

beforeEach(() => {
  signOut = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(useAuth).mockReturnValue({ signOut } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('ClinicSidebar in Arabic and accessibility (QA-241)', () => {
  it('shows the menu, sections, today numbers and Sign Out in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderSidebar();
    const nav = screen.getByRole('navigation', { name: 'قائمة العيادة' });
    for (const label of ['لوحة التحكم', 'الأطباء', 'المواعيد', 'الرسائل', 'الإعدادات']) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).getByText('نظرة عامة')).toBeInTheDocument();
    expect(screen.getByText('اليوم')).toBeInTheDocument();
    expect(screen.getByTestId('clinic-today-appointments')).toHaveTextContent('موعد واحد');
    expect(screen.getByTestId('clinic-today-pending')).toHaveTextContent('طبيبان');
    expect(screen.getByTestId('clinic-nav-badge-messages')).toHaveTextContent('٣');
    expect(screen.getByRole('button', { name: /تسجيل الخروج/ })).toBeInTheDocument();
    for (const english of ['Dashboard', 'OVERVIEW', 'TODAY', 'Sign Out', 'Pending approvals', 'Clinic Portal']) {
      expect(screen.queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('marks the current page', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /Messages/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Dashboard/ })).not.toHaveAttribute('aria-current');
  });

  it('labels the collapse button and every item when only icons show', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse the menu' }));
    expect(screen.getByRole('button', { name: 'Messages (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Expand the menu' }).length).toBeGreaterThan(0);
  });

  it('asks before signing out, starts on Cancel and closes with Escape', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sign Out' });
    expect(dialog).toHaveAccessibleDescription('Are you sure you want to sign out?');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('says so when signing out fails, instead of doing nothing', async () => {
    signOut.mockResolvedValue({ error: new Error('network') });
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Sign Out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Please try again.');
  });
});
