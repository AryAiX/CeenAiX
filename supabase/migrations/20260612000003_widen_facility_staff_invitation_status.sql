ALTER TABLE facility_staff DROP CONSTRAINT facility_staff_invitation_status_chk;

ALTER TABLE facility_staff ADD CONSTRAINT facility_staff_invitation_status_chk
CHECK (invitation_status = ANY (ARRAY[
  'pending', 'accepted', 'active', 'suspended', 
  'rejected', 'removed', 'invited', 'cancelled', 'declined'
]));