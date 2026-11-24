import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicSettings from './ClinicSettings';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const FACILITY = {
  name: 'QA Clinic',
  facility_type: 'clinic',
  license_number: 'DHA-12345',
  phone: '+971500000001',
  email: 'qa@clinic.test',
  address: 'Dubai',
  operating_hours: { mon: '08:00-20:00' },
  settings: { notifAppt: true, nabidh: true },
};

/** facilities: the first call loads the row; later calls (saves) are recorded. */
const setup = (
  { role = 'clinic_admin', facility = FACILITY, saveResult = { data: [{ id: 'f1' }], error: null as unknown } }:
  { role?: string; facility?: Record<string, unknown>; saveResult?: { data: unknown; error: unknown } } = {}
) => {
  const saves: MockSupabaseQueryBuilder<unknown>[] = [];
  let facilityCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1', portal_role: role }, error: null });
    facilityCalls += 1;
    if (facilityCalls === 1) return createSupabaseQueryBuilder({ data: facility, error: null });
    const builder = createSupabaseQueryBuilder(saveResult);
    saves.push(builder);
    return builder;
  }) as never);
  render(<ClinicSettings />);
  return saves;
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' } } as never);
});

afterEach(() => {
  vi.mocked(supabase.from).mockReset();
});

describe('ClinicSettings protected clinic details (QA-230)', () => {
  it('shows the clinic type and DHA licence, but not as boxes the clinic can edit', async () => {
    setup();
    expect(await screen.findByTestId('clinic-license-value')).toHaveTextContent('DHA-12345');
    expect(screen.getByTestId('clinic-type-value')).toHaveTextContent('Clinic');
    expect(screen.queryByDisplayValue('DHA-12345')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('clinic')).not.toBeInTheDocument();
    expect(screen.getAllByText('Managed by CeenAiX. Contact CeenAiX support to change it.')).toHaveLength(2);
  });

  it('does not send the licence or the clinic type when saving clinic details', async () => {
    const saves = setup();
    await screen.findByTestId('clinic-license-value');
    fireEvent.change(screen.getByDisplayValue('+971500000001'), { target: { value: '+971500000002' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(saves).toHaveLength(1));
    const payload = saves[0].update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'QA Clinic', phone: '+971500000002', email: 'qa@clinic.test', address: 'Dubai' });
    expect(payload).not.toHaveProperty('license_number');
    expect(payload).not.toHaveProperty('facility_type');
  });
});

describe('ClinicSettings without false claims (QA-231)', () => {
  it('does not say NABIDH sync is active and has no switches that do nothing', async () => {
    setup();
    await screen.findByTestId('clinic-license-value');
    expect(screen.queryByText(/NABIDH sync is active/)).not.toBeInTheDocument();
    expect(screen.queryByText(/records are being submitted/)).not.toBeInTheDocument();
    for (const label of ['Appointment reminders', 'Payment confirmations', 'License expiry alerts', 'Enable NABIDH data sync']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Save Notifications|Save NABIDH Settings/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-not-available')).toHaveTextContent('Nothing is sent to NABIDH from the clinic portal.');
  });

  it('never writes the old notification and NABIDH settings', async () => {
    const saves = setup();
    await screen.findByTestId('clinic-license-value');
    const saveButtons = screen.getAllByRole('button', { name: /^Save/ });
    for (const button of saveButtons) fireEvent.click(button);
    await waitFor(() => expect(saves).toHaveLength(saveButtons.length));
    for (const save of saves) {
      expect(save.update.mock.calls[0][0]).not.toHaveProperty('settings');
    }
  });
});

describe('ClinicSettings saving (QA-232)', () => {
  it('refuses an empty name and a bad email, with a message under each field, and saves nothing', async () => {
    const saves = setup();
    await screen.findByTestId('clinic-license-value');
    fireEvent.change(screen.getByLabelText('Clinic Name'), { target: { value: ' ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Enter the clinic name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address, such as info@clinic.ae.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(saves).toHaveLength(0);
  });

  it('refuses a closing time before the opening time', async () => {
    const saves = setup();
    await screen.findByTestId('clinic-license-value');
    fireEvent.change(screen.getByLabelText('Closing Time'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Hours/ }));

    expect(await screen.findByText('The closing time must be after the opening time.')).toBeInTheDocument();
    expect(saves).toHaveLength(0);
  });

  it('refuses saving with no working day', async () => {
    const saves = setup({ facility: { ...FACILITY, operating_hours: { mon: '08:00-20:00' } } });
    await screen.findByTestId('clinic-license-value');
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Hours/ }));
    expect(await screen.findByText('Choose at least one working day.')).toBeInTheDocument();
    expect(saves).toHaveLength(0);
  });

  it('shows the saved message next to the button that was pressed', async () => {
    setup();
    await screen.findByTestId('clinic-license-value');
    fireEvent.click(screen.getByRole('button', { name: /Save Hours/ }));
    expect(await screen.findByTestId('settings-hours-feedback')).toHaveTextContent('Working hours saved.');
    expect(screen.queryByTestId('settings-info-feedback')).not.toBeInTheDocument();
  });

  it('does not say "saved" when the database changed nothing', async () => {
    setup({ saveResult: { data: [], error: null } });
    await screen.findByTestId('clinic-license-value');
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByTestId('settings-info-feedback')).toHaveTextContent('Only the clinic admin can change these settings.');
    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });

  it('shows a plain message, not the database text, when saving fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setup({ saveResult: { data: null, error: { code: '23502', message: 'null value in column "address" violates not-null constraint' } } });
    await screen.findByTestId('clinic-license-value');
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save. Please try again.');
    expect(screen.queryByText(/not-null/)).not.toBeInTheDocument();
  });

  it('shows the page read-only to a clinic manager, who cannot save', async () => {
    setup({ role: 'clinic_manager' });
    expect(await screen.findByTestId('settings-read-only')).toHaveTextContent('Only the clinic admin can change these settings.');
    expect(screen.getByLabelText('Clinic Name')).toBeDisabled();
    expect(screen.getByLabelText('Opening Time')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument();
  });

  it('reads the most common saved hours, not just the first day\'s', async () => {
    setup({ facility: { ...FACILITY, operating_hours: { mon: '09:00-13:00', tue: '08:00-20:00', wed: '08:00-20:00' } } });
    await screen.findByTestId('clinic-license-value');
    expect(screen.getByLabelText('Opening Time')).toHaveValue('08:00');
    expect(screen.getByLabelText('Closing Time')).toHaveValue('20:00');
    expect(screen.getByTestId('settings-mixed-hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thu' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('ClinicSettings in Arabic and layout (QA-233)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the page in Arabic, right to left, with Arabic day names', async () => {
    await i18n.changeLanguage('ar');
    setup();
    expect(await screen.findByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'معلومات العيادة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ساعات العمل' })).toBeInTheDocument();
    expect(screen.getByLabelText('اسم العيادة')).toHaveValue('QA Clinic');
    expect(screen.getByLabelText('وقت الافتتاح')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('clinic-type-value')).toHaveTextContent('عيادة');
    const days = screen.getByRole('group', { name: 'أيام العمل' });
    expect(days).toHaveTextContent('إثنين');
    expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الإعدادات' }).closest('[dir]')).toHaveAttribute('dir', 'rtl');
    for (const english of ['Settings', 'Clinic Information', 'Working Hours', 'Clinic Name', 'Save Changes', 'Save Hours', 'Mon']) {
      expect(screen.queryByText(english)).not.toBeInTheDocument();
    }
  });

  it('keeps email and phone left to right and stacks the fields on small screens', async () => {
    setup();
    await screen.findByTestId('clinic-license-value');
    expect(screen.getByLabelText('Email')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('dir', 'ltr');
    const grid = screen.getByLabelText('Clinic Name').closest('div.grid') as HTMLElement;
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
  });
});
