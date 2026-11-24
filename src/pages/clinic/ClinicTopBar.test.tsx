import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import type { ClinicPortalMeta } from './ClinicPortal';
import ClinicTopBar from './ClinicTopBar';

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
    expect(document.querySelector('.lucide-chevron-down')).toBeNull();
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
