import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  settings: {},
};

/** facilities: the first call loads the row; later calls (saves) are recorded. */
const setup = () => {
  const saves: MockSupabaseQueryBuilder<unknown>[] = [];
  let facilityCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'f1' }, error: null });
    facilityCalls += 1;
    if (facilityCalls === 1) return createSupabaseQueryBuilder({ data: FACILITY, error: null });
    const builder = createSupabaseQueryBuilder({ data: null, error: null });
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
    expect(screen.getByTestId('clinic-type-value')).toHaveTextContent('clinic');
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
