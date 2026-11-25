import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { useClinicMessageDoctors, useClinicMessagePatients } from './use-clinic-message-contacts';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const LINKS = [
  { doctor_user_id: 'd-active', is_active: true, invitation_status: 'active' },
  { doctor_user_id: 'd-accepted', is_active: true, invitation_status: 'accepted' },
  { doctor_user_id: 'd-pending', is_active: true, invitation_status: 'pending' },
  { doctor_user_id: 'd-suspended', is_active: false, invitation_status: 'active' },
  { doctor_user_id: 'd-removed', is_active: false, invitation_status: 'removed' },
];

const mockTables = (profiles: { user_id: string; full_name: string | null }[]) => {
  const builders: Record<string, ReturnType<typeof createSupabaseQueryBuilder>> = {
    clinic_portal_members: createSupabaseQueryBuilder({ data: { facility_id: 'facility-1' }, error: null }),
    facility_staff: createSupabaseQueryBuilder({ data: LINKS, error: null }),
    user_profiles: createSupabaseQueryBuilder({ data: profiles, error: null }),
  };
  vi.mocked(supabase.from).mockImplementation(((table: string) => builders[table]) as never);
  return builders;
};

afterEach(() => {
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
  vi.restoreAllMocks();
});

describe('useClinicMessageDoctors (QA-218)', () => {
  it('lists only doctors with an accepted or active link, sorted by name', async () => {
    const builders = mockTables([
      { user_id: 'd-active', full_name: 'Zaid Omar' },
      { user_id: 'd-accepted', full_name: 'Amal Hassan' },
    ]);
    const { result } = renderHook(() => useClinicMessageDoctors('clinic-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([
      { id: 'd-accepted', name: 'Amal Hassan' },
      { id: 'd-active', name: 'Zaid Omar' },
    ]);
    expect(builders.facility_staff.eq).toHaveBeenCalledWith('facility_id', 'facility-1');
    expect(builders.user_profiles.in).toHaveBeenCalledWith('user_id', ['d-active', 'd-accepted']);
  });

  it('loads nothing while the picker is closed', () => {
    const { result } = renderHook(() => useClinicMessageDoctors(null));
    expect(result.current).toEqual({ data: [], loading: false, error: false });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports an error instead of an empty list when loading fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.from).mockImplementation(
      (() => createSupabaseQueryBuilder({ data: null, error: { message: 'boom' } })) as never
    );
    const { result } = renderHook(() => useClinicMessageDoctors('clinic-1'));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useClinicMessagePatients (QA-218)', () => {
  it('does not search below 2 characters', async () => {
    const { result } = renderHook(() => useClinicMessagePatients(' a '));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('searches the clinic\'s patients through clinic_search_patients', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { user_id: 'p1', full_name: 'Amal Hassan', phone: null },
        { user_id: 'p2', full_name: null, phone: '+971500000000' },
      ],
      error: null,
    } as never);
    const { result } = renderHook(() => useClinicMessagePatients('Amal'));

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'p1', name: 'Amal Hassan' }]));
    expect(supabase.rpc).toHaveBeenCalledWith('clinic_search_patients', { p_query: 'Amal' });
  });

  it('reports an error when the search fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
    const { result } = renderHook(() => useClinicMessagePatients('Amal'));
    await waitFor(() => expect(result.current.error).toBe(true));
  });
});
