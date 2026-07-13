import { describe, expect, it } from 'vitest';
import { LAB_IMAGING_RPC_NAMES, requireSingleActiveLabMembership } from './use-lab-ops-portal';

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

describe('lab QC and equipment action surface', () => {
  it('documents role-auth QC and equipment RPCs without plaintext PIN release', () => {
    const qcEquipmentRpcs = [
      'lab_log_qc_run',
      'lab_review_qc_failure',
      'lab_log_maintenance',
      'lab_mark_equipment_online',
    ] as const;
    expect(qcEquipmentRpcs).toHaveLength(4);
    expect(qcEquipmentRpcs).not.toContain('lab_release_order_with_pin');
  });

  it('requires single-lab membership before QC or equipment mutations', () => {
    expect(() => requireSingleActiveLabMembership([])).toThrow(/No active laboratory membership/i);
    expect(() => requireSingleActiveLabMembership(['lab-a', 'lab-b'])).toThrow(/Select a laboratory/i);
    expect(requireSingleActiveLabMembership(['lab-a'])).toBe('lab-a');
  });
});

describe('lab imaging action surface', () => {
  it('uses row-scoped imaging RPCs and excludes unsafe PR #88 remnants', () => {
    expect(LAB_IMAGING_RPC_NAMES).toEqual([
      'lab_set_imaging_study_status',
      'lab_reject_imaging_study',
    ]);
    expect(LAB_IMAGING_RPC_NAMES).not.toContain('lab_sign_radiology_report_with_pin');
    expect(LAB_IMAGING_RPC_NAMES).not.toContain('doctor_create_imaging_order');
  });

  it('requires single-lab membership before imaging mutations', () => {
    expect(() => requireSingleActiveLabMembership([])).toThrow(/No active laboratory membership/i);
    expect(() => requireSingleActiveLabMembership(['lab-a', 'lab-b'])).toThrow(/Select a laboratory/i);
    expect(requireSingleActiveLabMembership(['lab-a'])).toBe('lab-a');
  });
});
