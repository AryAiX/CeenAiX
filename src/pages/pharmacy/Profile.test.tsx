// The browser here is NOT in Dubai (and west of UTC).
process.env.TZ = 'America/New_York';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { createSupabaseQueryBuilder } from '../../test/supabase-mock';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) => (
    <div>
      <header data-testid="shell-header">
        <span>{title}</span>
        <span>{subtitle}</span>
      </header>
      {children}
    </div>
  ),
}));
vi.mock('../../hooks', () => ({ usePharmacyPrescriptionQueue: vi.fn(), usePharmacyUnreadMessages: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { PharmacyProfile } from './Profile';

const ORG = '00000000-0000-0000-0000-00000000aa01';

const baseProfile = {
  displayName: 'QA Test Pharmacy',
  licenseNumber: '',
  licenseValidUntil: null as string | null,
  address: 'Al Barsha 1',
  operatingHours: '',
  pharmacistInCharge: 'Test Pharmacist',
  phone: null,
  email: null,
  website: null,
  emergencyContact: null,
  dhaConnected: false,
  nabidhConnected: false,
  workingHoursJson: null,
  logoUrl: null,
};

const showProfile = (profile: Partial<typeof baseProfile> | null = {}, extra: Record<string, unknown> = {}) =>
  vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
    data: {
      organization: { id: ORG, name: 'QA Org', city: 'Dubai', notes: 'Free text notes about the pharmacy' },
      profile: profile === null ? null : { ...baseProfile, ...profile },
      staff: [],
      pendingPrescriptions: 0,
      lowStockAlerts: 0,
      queue: [],
      ...extra,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);

const renderPage = () =>
  render(
    <MemoryRouter>
      <PharmacyProfile />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ profile: { full_name: 'Logged In User' }, user: { email: 'me@test.com' } } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('PharmacyProfile licence and DHA status (QA-291)', () => {
  it('shows the stored status, not an always-on "DHA Licensed" badge', () => {
    showProfile({ dhaConnected: false, nabidhConnected: false });
    renderPage();
    expect(screen.getByTestId('badge-dha')).toHaveTextContent('DHA licence not confirmed');
    expect(screen.getByTestId('badge-nabidh')).toHaveTextContent('NABIDH not connected');
    expect(document.body.textContent).not.toContain('✅');
    expect(screen.queryByText('CeenAiX ePrescription')).toBeNull();
  });

  it('shows "DHA Licensed" when an administrator has confirmed it', () => {
    showProfile({ dhaConnected: true, nabidhConnected: true });
    renderPage();
    expect(screen.getByTestId('badge-dha')).toHaveTextContent('DHA Licensed');
    expect(screen.getByTestId('badge-nabidh')).toHaveTextContent('NABIDH Connected');
  });

  it('shows "Not on file" for a missing licence (never the organization notes) and the expiry as a Dubai date', () => {
    showProfile({ licenseNumber: '', licenseValidUntil: '2027-03-31' });
    renderPage();
    expect(screen.queryByText(/Free text notes/)).toBeNull();
    const licence = screen.getByText('DHA License').parentElement as HTMLElement;
    expect(within(licence).getByText('Not on file')).toBeInTheDocument();
    const valid = screen.getByText('License Valid Until').parentElement as HTMLElement;
    expect(within(valid).getByText('Mar 31, 2027')).toBeInTheDocument();
  });

  it('cannot change the licence or the DHA / NABIDH status in the edit dialog, and does not send them', async () => {
    const user = userEvent.setup();
    const profiles = createSupabaseQueryBuilder({ data: [{ organization_id: ORG }], error: null });
    vi.mocked(supabase.from).mockReturnValue(profiles as never);
    showProfile({ licenseNumber: 'DHA-P-1', dhaConnected: true });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Edit pharmacy details' }));
    expect(screen.queryByText('DHA License Number')).toBeNull();
    expect(screen.queryByText('NABIDH Connected', { selector: 'div' })).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('set by a CeenAiX administrator');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(profiles.update).toHaveBeenCalledTimes(1);
    const sent = vi.mocked(profiles.update).mock.calls[0][0] as Record<string, unknown>;
    for (const key of ['license_number', 'license_valid_until', 'dha_connected', 'nabidh_connected']) {
      expect(sent).not.toHaveProperty(key);
    }
  });

  it('shows the status in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showProfile();
    renderPage();
    expect(screen.getByTestId('badge-dha')).toHaveTextContent('ترخيص DHA غير مؤكد');
  });
});
