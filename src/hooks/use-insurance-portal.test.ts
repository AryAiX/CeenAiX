import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  INSURANCE_PORTAL_DECISION_RPC_NAMES,
  adjudicateInsuranceClaim,
  approvePreAuthorization,
  bulkApprovePreAuthorizations,
  denyPreAuthorization,
  requireSingleActiveInsuranceMembership,
  setInsuranceSettingEnabled,
  updateInsuranceFraudAlertStatus,
} from './use-insurance-portal';

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

describe('requireSingleActiveInsuranceMembership', () => {
  const now = new Date('2026-07-13T00:00:00.000Z');

  it('returns the only active insurance organization membership', () => {
    expect(
      requireSingleActiveInsuranceMembership(
        [{ organization_id: 'insurance-a', ends_at: null }],
        now,
      ),
    ).toBe('insurance-a');
  });

  it('treats future-ended memberships as active', () => {
    expect(
      requireSingleActiveInsuranceMembership(
        [{ organization_id: 'insurance-a', ends_at: '2026-07-14T00:00:00.000Z' }],
        now,
      ),
    ).toBe('insurance-a');
  });

  it('deduplicates repeated rows for the same organization', () => {
    expect(
      requireSingleActiveInsuranceMembership(
        [
          { organization_id: 'insurance-a', ends_at: null },
          { organization_id: 'insurance-a', ends_at: null },
        ],
        now,
      ),
    ).toBe('insurance-a');
  });

  it('fails closed when no active membership exists', () => {
    expect(() =>
      requireSingleActiveInsuranceMembership(
        [{ organization_id: 'insurance-a', ends_at: '2026-07-12T00:00:00.000Z' }],
        now,
      ),
    ).toThrow('No active insurance organization membership');
  });

  it('requires an explicit selector for multiple active memberships', () => {
    expect(() =>
      requireSingleActiveInsuranceMembership(
        [
          { organization_id: 'insurance-a', ends_at: null },
          { organization_id: 'insurance-b', ends_at: null },
        ],
        now,
      ),
    ).toThrow('Select an insurance organization');
  });
});

describe('insurance portal mutation surface', () => {
  it('uses hardened decision RPCs for insurance writes', () => {
    expect(INSURANCE_PORTAL_DECISION_RPC_NAMES).toEqual([
      'insurance_decide_pre_authorization',
      'insurance_adjudicate_claim',
      'insurance_update_fraud_alert_status',
      'insurance_set_setting_enabled',
    ]);
  });

  it('approves pre-authorizations through the decision RPC', async () => {
    await approvePreAuthorization('00000000-0000-0000-0000-000000000001', 1000);

    expect(rpcMock).toHaveBeenCalledWith('insurance_decide_pre_authorization', {
      p_pre_authorization_id: '00000000-0000-0000-0000-000000000001',
      p_decision: 'approve',
      p_approved_amount_aed: 1000,
      p_decision_note: 'Approved by insurance officer',
    });
  });

  it('supports deny, bulk approve, claim, fraud, and settings RPC actions', async () => {
    await denyPreAuthorization('00000000-0000-0000-0000-000000000001');
    await bulkApprovePreAuthorizations([
      { id: '00000000-0000-0000-0000-000000000002', requestedAmountAed: 2000 },
    ]);
    await adjudicateInsuranceClaim('00000000-0000-0000-0000-000000000003', 'review');
    await updateInsuranceFraudAlertStatus('00000000-0000-0000-0000-000000000004', 'resolved');
    await setInsuranceSettingEnabled('00000000-0000-0000-0000-000000000005', true);

    expect(rpcMock).toHaveBeenCalledWith('insurance_decide_pre_authorization', {
      p_pre_authorization_id: '00000000-0000-0000-0000-000000000001',
      p_decision: 'deny',
      p_approved_amount_aed: 0,
      p_decision_note: 'Denied by insurance officer',
    });
    expect(rpcMock).toHaveBeenCalledWith('insurance_adjudicate_claim', {
      p_claim_id: '00000000-0000-0000-0000-000000000003',
      p_decision: 'review',
      p_adjudication_note: null,
    });
    expect(rpcMock).toHaveBeenCalledWith('insurance_update_fraud_alert_status', {
      p_alert_id: '00000000-0000-0000-0000-000000000004',
      p_status: 'resolved',
      p_resolution_note: null,
    });
    expect(rpcMock).toHaveBeenCalledWith('insurance_set_setting_enabled', {
      p_setting_id: '00000000-0000-0000-0000-000000000005',
      p_enabled: true,
    });
  });
});
