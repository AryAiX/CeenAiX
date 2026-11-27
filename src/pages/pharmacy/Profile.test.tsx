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
  workingHoursJson: null as unknown,
  logoUrl: null as string | null,
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

describe('PharmacyProfile logo upload (QA-292)', () => {
  const storage = () => {
    const bucket = {
      upload: vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null }),
      getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/storage/v1/object/public/pharmacy-logos/${path}` } })),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.storage.from).mockReturnValue(bucket as never);
    return bucket;
  };
  const pick = async (file: File) => {
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByTestId('logo-input'), file);
  };
  const png = () => new File(['x'], 'my logo.PNG', { type: 'image/png' });

  it('uploads a PNG as a new file in the pharmacy folder, saves the link and removes the old logo', async () => {
    const bucket = storage();
    const profiles = createSupabaseQueryBuilder({ data: [{ organization_id: ORG }], error: null });
    vi.mocked(supabase.from).mockReturnValue(profiles as never);
    showProfile({ logoUrl: `https://cdn.test/storage/v1/object/public/pharmacy-logos/${ORG}/logo-1.png` });
    renderPage();
    await pick(png());
    await vi.waitFor(() => expect(profiles.update).toHaveBeenCalled());
    expect(supabase.storage.from).toHaveBeenCalledWith('pharmacy-logos');
    const [path, , options] = bucket.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${ORG}/logo-\\d+\\.png$`));
    expect(options).toEqual({ contentType: 'image/png', upsert: false });
    expect(profiles.update).toHaveBeenCalledWith({ logo_url: `https://cdn.test/storage/v1/object/public/pharmacy-logos/${path}` });
    expect(profiles.select).toHaveBeenCalledWith('organization_id');
    await vi.waitFor(() => expect(bucket.remove).toHaveBeenCalledWith([`${ORG}/logo-1.png`]));
  });

  it('refuses SVG and other types before uploading', async () => {
    const bucket = storage();
    showProfile();
    renderPage();
    await pick(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.');
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  it('shows a plain message when the upload is refused, not the storage error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bucket = storage();
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });
    showProfile();
    renderPage();
    await pick(png());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not upload the logo. Please try again.');
    expect(screen.queryByText(/Bucket not found/)).toBeNull();
    warn.mockRestore();
  });

  it('says so when the link was not saved (0 rows changed)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    storage();
    vi.mocked(supabase.from).mockReturnValue(createSupabaseQueryBuilder({ data: [], error: null }) as never);
    showProfile();
    renderPage();
    await pick(png());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not upload the logo.');
    warn.mockRestore();
  });

  it('has a keyboard-reachable button with a name', () => {
    showProfile();
    renderPage();
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeInTheDocument();
  });
});

describe('PharmacyProfile saving the details (QA-293)', () => {
  const openDialog = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit pharmacy details' }));
    return user;
  };

  it('does not say "saved" when no row was changed', async () => {
    const profiles = createSupabaseQueryBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(profiles as never);
    showProfile();
    renderPage();
    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('This pharmacy has no profile to update yet. Contact CeenAiX support.')).toBeInTheDocument();
    expect(screen.queryByText(/saved successfully/)).toBeNull();
    expect(profiles.select).toHaveBeenCalledWith('organization_id');
  });

  it('shows a plain message for a database error, not the raw text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.from).mockReturnValue(
      createSupabaseQueryBuilder({ data: null, error: { message: 'new row violates row-level security policy' } }) as never
    );
    showProfile();
    renderPage();
    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Could not save the changes. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/row-level security/)).toBeNull();
    warn.mockRestore();
  });

  it('checks the fields before saving and shows the problems next to them', async () => {
    const profiles = createSupabaseQueryBuilder({ data: [{ organization_id: ORG }], error: null });
    vi.mocked(supabase.from).mockReturnValue(profiles as never);
    showProfile({ displayName: 'QA Test Pharmacy' });
    renderPage();
    const user = await openDialog();
    await user.clear(screen.getByLabelText('Pharmacy Name'));
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByLabelText('Pharmacy Name')).toHaveAccessibleDescription('Enter the pharmacy name.');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address.');
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('refuses a closing time before the opening time', async () => {
    const profiles = createSupabaseQueryBuilder({ data: [{ organization_id: ORG }], error: null });
    vi.mocked(supabase.from).mockReturnValue(profiles as never);
    showProfile({ workingHoursJson: { Monday: { open: '22:00', close: '08:00', closed: false } } });
    renderPage();
    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByTestId('hours-error-Monday')).toHaveTextContent('The closing time must be after the opening time.');
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('opens the dialog even when the stored hours miss days', async () => {
    showProfile({ workingHoursJson: { Monday: { open: '09:00', close: '17:00', closed: false } } });
    renderPage();
    await openDialog();
    expect(screen.getByTestId('hours-Sunday')).toBeInTheDocument();
  });

  it('shows the open days in the page language', async () => {
    showProfile({ workingHoursJson: { Friday: { open: '08:00', close: '22:00', closed: true } } });
    renderPage();
    expect(screen.getByText('Open 6 days a week')).toBeInTheDocument();
    await i18n.changeLanguage('ar');
    expect(await screen.findByText(/مفتوحة/)).toBeInTheDocument();
  });
});

describe('PharmacyProfile staff (QA-294)', () => {
  const staff = [
    { id: 's1', fullName: 'Rania Hassan', roleTitle: 'Head Pharmacist', credentialNumber: 'DHA-1', shiftStatus: 'on_shift' },
  ];

  it('asks before removing, and removes only after "Remove"', async () => {
    const user = userEvent.setup();
    const rows = createSupabaseQueryBuilder({ data: [{ id: 's1' }], error: null });
    vi.mocked(supabase.from).mockReturnValue(rows as never);
    showProfile({}, { staff });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Remove Rania Hassan' }));
    expect(rows.delete).not.toHaveBeenCalled();
    const question = screen.getByRole('group', { name: 'Remove Rania Hassan from the staff list?' });
    await user.click(within(question).getByRole('button', { name: 'Keep' }));
    expect(screen.queryByRole('group', { name: /from the staff list/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove Rania Hassan' }));
    await user.click(within(screen.getByRole('group', { name: /from the staff list/ })).getByRole('button', { name: 'Remove' }));
    expect(rows.delete).toHaveBeenCalledTimes(1);
    expect(rows.eq).toHaveBeenCalledWith('id', 's1');
    expect(rows.select).toHaveBeenCalledWith('id');
  });

  it('says so when a removal is refused (0 rows), instead of failing silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    vi.mocked(supabase.from).mockReturnValue(createSupabaseQueryBuilder({ data: [], error: null }) as never);
    showProfile({}, { staff });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Remove Rania Hassan' }));
    await user.click(within(screen.getByRole('group', { name: /from the staff list/ })).getByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove the staff member. Please try again.');
    warn.mockRestore();
  });

  it('says so when a shift change is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const rows = createSupabaseQueryBuilder({ data: null, error: { message: 'permission denied' } });
    vi.mocked(supabase.from).mockReturnValue(rows as never);
    showProfile({}, { staff });
    renderPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Shift for Rania Hassan' }), 'on_call');
    expect(rows.update).toHaveBeenCalledWith({ shift_status: 'on_call' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not change the shift. Please try again.');
    expect(screen.queryByText(/permission denied/)).toBeNull();
    warn.mockRestore();
  });

  it('shows an empty list text that matches the Add Staff button', () => {
    showProfile({}, { staff: [] });
    renderPage();
    expect(screen.getByText('No staff added yet')).toBeInTheDocument();
    expect(screen.queryByText(/once added by an admin/)).toBeNull();
  });

  it('shows the staff list in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showProfile({}, { staff });
    renderPage();
    expect(screen.getByRole('button', { name: 'إضافة موظف' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'تحت الطلب' })).toBeInTheDocument();
  });
});

describe('PharmacyProfile values as stored (QA-295)', () => {
  const field = (label: string) => (screen.getByText(label).parentElement as HTMLElement).textContent?.replace(label, '');

  it('shows "Not on file" for missing details, never the signed-in user, "Pending" or "UAE"', () => {
    showProfile(
      { pharmacistInCharge: null as never, phone: null, email: null, website: null, emergencyContact: null, address: '', operatingHours: '' },
      { organization: { id: ORG, name: 'QA Org', city: null, notes: null } }
    );
    renderPage();
    expect(field('Pharmacist-in-Charge')).toBe('Not on file');
    expect(field('Phone')).toBe('Not on file');
    expect(field('Location')).toBe('Not on file');
    expect(field('Operating Hours')).toBe('Not on file');
    expect(screen.queryByText('Logged In User')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText('UAE')).toBeNull();
  });

  it('counts open prescriptions like Dispensing, and has no "DHA sync" row', () => {
    const line = (id: string, prescriptionId: string, workflowStatus: string) => ({
      id,
      prescriptionId,
      workflowStatus,
      isDispensed: workflowStatus === 'dispensed' || workflowStatus === 'picked_up',
      receivedAt: '2026-11-20T08:00:00Z',
      medication: 'Amoxicillin',
      quantity: 10,
    });
    showProfile(
      { dhaConnected: true },
      {
        pendingPrescriptions: 99,
        lowStockAlerts: 2,
        queue: [
          line('t1', 'rx-1', 'new'),
          line('t2', 'rx-1', 'new'),
          line('t3', 'rx-2', 'on_hold'),
          line('t4', 'rx-3', 'picked_up'),
          line('t5', 'rx-4', 'dispensed'),
          line('t6', 'rx-5', 'cancelled'),
        ],
      }
    );
    renderPage();
    const rows = screen.getAllByTestId('operation-row').map((row) => row.textContent);
    expect(rows).toEqual(['Prescriptions to dispense2', 'Inventory alerts2']);
    expect(screen.queryByText('DHA sync')).toBeNull();
    expect(screen.queryByText(/Live from pharmacy queue/)).toBeNull();
  });
});
