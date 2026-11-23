/**
 * QA-204: how a doctor's clinic link is shown on the clinic Doctors page, and what the clinic may
 * do with it. Must match clinic_doctor_link_action / clinic_end_doctor_link (QA-199 / QA-203).
 *
 * Before, only 'accepted' + active counted as Active: doctors linked by an admin ('active') showed
 * as Inactive, and suspended doctors showed as Inactive after a reload with no way back.
 */
export type ClinicDoctorStatus = 'active' | 'pending' | 'invited' | 'declined' | 'inactive' | 'suspended';

export const clinicDoctorStatus = (invitationStatus: string | null | undefined, isActive: boolean | null | undefined): ClinicDoctorStatus => {
  switch (invitationStatus) {
    case 'accepted':
    case 'active':
      return isActive ? 'active' : 'inactive';
    case 'suspended':
      return 'suspended';
    case 'pending':
      return 'pending';
    case 'invited':
      return 'invited';
    case 'declined':
      return 'declined';
    default:
      return 'inactive';
  }
};

/** Actions the clinic may offer for a doctor in this state. */
export const clinicDoctorActions = (status: ClinicDoctorStatus) => ({
  canApprove: status === 'pending',
  canReject: status === 'pending',
  canCancelInvite: status === 'invited',
  canSuspend: status === 'active',
  canReactivate: status === 'suspended',
  canRemove: status === 'active' || status === 'suspended' || status === 'inactive',
  canEditFee: status === 'active' || status === 'suspended' || status === 'inactive' || status === 'pending',
  /** A declined invitation can be sent again; any other doctor on the list is already linked. */
  canInviteAgain: status === 'declined',
});
