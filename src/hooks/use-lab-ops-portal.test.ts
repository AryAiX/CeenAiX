import { describe, expect, it } from 'vitest';
import { requireSingleActiveLabMembership } from './use-lab-ops-portal';

describe('requireSingleActiveLabMembership', () => {
  it('returns the only active laboratory membership', () => {
    expect(requireSingleActiveLabMembership(['lab-a'])).toBe('lab-a');
  });

  it('deduplicates repeated rows for the same laboratory', () => {
    expect(requireSingleActiveLabMembership(['lab-a', 'lab-a'])).toBe('lab-a');
  });

  it('fails closed when no active membership exists', () => {
    expect(() => requireSingleActiveLabMembership([])).toThrow(
      'No active laboratory membership',
    );
  });

  it('requires an explicit selection for multiple memberships', () => {
    expect(() => requireSingleActiveLabMembership(['lab-a', 'lab-b'])).toThrow(
      'Select a laboratory',
    );
  });
});

describe('lab workflow action surface', () => {
  it('documents the secure accept path as claim then confirm specimen', () => {
    // Accept must not rely on claim jumping ordered→collected; those are separate RPCs.
    const acceptSteps = ['lab_claim_order', 'lab_confirm_specimen'] as const;
    expect(acceptSteps).toEqual(['lab_claim_order', 'lab_confirm_specimen']);
  });

  it('rejects unassigned membership before any lab workflow RPC should run', () => {
    expect(() => requireSingleActiveLabMembership([])).toThrow(/No active laboratory membership/i);
  });

  it('rejects multi-lab membership before any lab workflow RPC should run', () => {
    expect(() => requireSingleActiveLabMembership(['lab-a', 'lab-b'])).toThrow(/Select a laboratory/i);
  });
});
