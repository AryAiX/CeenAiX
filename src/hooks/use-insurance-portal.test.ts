import { describe, expect, it } from 'vitest';
import {
  INSURANCE_PORTAL_DECISION_ACTION_UNAVAILABLE_MESSAGE,
  INSURANCE_PORTAL_DECISION_RPC_NAMES,
  approvePreAuthorization,
  bulkApprovePreAuthorizations,
  requireSingleActiveInsuranceMembership,
  setInsuranceSettingEnabled,
} from './use-insurance-portal';

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
  it('keeps PR #91 decision RPCs disabled until hardened separately', () => {
    expect(INSURANCE_PORTAL_DECISION_RPC_NAMES).toEqual([]);
    expect(INSURANCE_PORTAL_DECISION_RPC_NAMES).not.toContain(
      'insurance_approve_pre_authorization',
    );
    expect(INSURANCE_PORTAL_DECISION_RPC_NAMES).not.toContain('insurance_approve_claim');
  });

  it('fails explicitly before direct browser decision writes can run', async () => {
    await expect(
      approvePreAuthorization('00000000-0000-0000-0000-000000000001', 1000),
    ).rejects.toThrow(INSURANCE_PORTAL_DECISION_ACTION_UNAVAILABLE_MESSAGE);

    await expect(
      bulkApprovePreAuthorizations([
        { id: '00000000-0000-0000-0000-000000000001', requestedAmountAed: 1000 },
      ]),
    ).rejects.toThrow(INSURANCE_PORTAL_DECISION_ACTION_UNAVAILABLE_MESSAGE);

    await expect(
      setInsuranceSettingEnabled('00000000-0000-0000-0000-000000000001', true),
    ).rejects.toThrow(INSURANCE_PORTAL_DECISION_ACTION_UNAVAILABLE_MESSAGE);
  });
});
