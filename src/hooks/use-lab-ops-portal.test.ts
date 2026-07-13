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
