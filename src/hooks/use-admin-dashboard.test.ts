import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  setAdminInsurancePlanActive,
  updateAdminUserAccountStatus,
  updateAdminUserRole,
  upsertAdminInsurancePlan,
} from './use-admin-dashboard';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const rpcMock = vi.mocked(supabase.rpc);

beforeEach(() => {
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: null, error: null, count: null, status: 200, statusText: 'OK' });
});

describe('admin mutation RPC helpers', () => {
  it('updates account lifecycle status through the audited RPC', async () => {
    await updateAdminUserAccountStatus('user-1', 'suspended');

    expect(rpcMock).toHaveBeenCalledWith('admin_update_user_account_status', {
      p_user_id: 'user-1',
      p_account_status: 'suspended',
    });
  });

  it('updates roles through the audited role RPC', async () => {
    await updateAdminUserRole('user-1', 'facility_admin');

    expect(rpcMock).toHaveBeenCalledWith('admin_update_user_role', {
      p_user_id: 'user-1',
      p_role: 'facility_admin',
    });
  });

  it('creates or updates insurance plans through admin plan RPCs', async () => {
    await upsertAdminInsurancePlan({
      planId: 'plan-1',
      name: 'Enhanced',
      providerCompany: 'Daman',
      coverageType: 'Gold',
      annualLimit: 100000,
      coPayPercentage: 20,
      networkType: 'UAE',
      isActive: true,
    });
    await setAdminInsurancePlanActive('plan-1', false);

    expect(rpcMock).toHaveBeenCalledWith('admin_upsert_insurance_plan', {
      p_plan_id: 'plan-1',
      p_name: 'Enhanced',
      p_provider_company: 'Daman',
      p_coverage_type: 'Gold',
      p_annual_limit: 100000,
      p_co_pay_percentage: 20,
      p_network_type: 'UAE',
      p_is_active: true,
    });
    expect(rpcMock).toHaveBeenCalledWith('admin_set_insurance_plan_active', {
      p_plan_id: 'plan-1',
      p_is_active: false,
    });
  });
});
