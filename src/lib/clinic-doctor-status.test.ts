import { describe, expect, it } from 'vitest';
import { clinicDoctorActions, clinicDoctorStatus } from './clinic-doctor-status';

describe('clinicDoctorStatus (QA-204)', () => {
  it('treats admin-linked ("active") doctors like accepted ones', () => {
    expect(clinicDoctorStatus('active', true)).toBe('active');
    expect(clinicDoctorStatus('accepted', true)).toBe('active');
    expect(clinicDoctorStatus('accepted', false)).toBe('inactive');
  });

  it('keeps suspended, pending, invited and declined as they are', () => {
    expect(clinicDoctorStatus('suspended', false)).toBe('suspended');
    expect(clinicDoctorStatus('pending', false)).toBe('pending');
    expect(clinicDoctorStatus('invited', false)).toBe('invited');
    expect(clinicDoctorStatus('declined', false)).toBe('declined');
    expect(clinicDoctorStatus(null, true)).toBe('inactive');
  });
});

describe('clinicDoctorActions (QA-204)', () => {
  it('matches the database rules (QA-199 / QA-203)', () => {
    expect(clinicDoctorActions('suspended')).toMatchObject({ canReactivate: true, canSuspend: false, canRemove: true });
    expect(clinicDoctorActions('active')).toMatchObject({ canSuspend: true, canReactivate: false, canRemove: true });
    expect(clinicDoctorActions('pending')).toMatchObject({ canApprove: true, canReject: true, canRemove: false });
    expect(clinicDoctorActions('invited')).toMatchObject({ canCancelInvite: true, canRemove: false, canEditFee: false });
    expect(clinicDoctorActions('declined')).toMatchObject({ canInviteAgain: true, canRemove: false, canEditFee: false });
  });
});
