-- Remove direct profile reads introduced for patient/staff messaging. A
-- user_profiles policy grants access to every column, not only the fields
-- selected by today's UI, so messaging display must use a narrow RPC instead.
DROP POLICY IF EXISTS "Users can search for other users" ON public.user_profiles;
DROP POLICY IF EXISTS "patients_read_linked_staff_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "patients_read_pharmacy_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "patients_read_pharmacy_members" ON public.organization_members;

CREATE OR REPLACE FUNCTION public.is_current_user_ops_org(
  target_organization_id uuid,
  expected_kind text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_current_user_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.organizations org
          ON org.id = om.organization_id
        WHERE om.organization_id = target_organization_id
          AND om.user_id = auth.uid()
          AND (om.ends_at IS NULL OR om.ends_at > now())
          AND (expected_kind IS NULL OR org.kind = expected_kind)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_ops_org(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_ops_org(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_ops_org(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_conversation_counterparty_profiles(
  p_user_ids uuid[]
)
RETURNS TABLE (
  user_id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    up.user_id,
    up.full_name
  FROM public.user_profiles up
  WHERE auth.uid() IS NOT NULL
    AND p_user_ids IS NOT NULL
    AND cardinality(p_user_ids) BETWEEN 1 AND 100
    AND up.user_id = ANY(p_user_ids)
    AND up.user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE (
          c.created_by = auth.uid()
          OR c.participant_ids ? auth.uid()::text
        )
        AND (
          c.created_by = up.user_id
          OR c.participant_ids ? up.user_id::text
        )
    )
  ORDER BY up.full_name, up.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_counterparty_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_conversation_counterparty_profiles(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_counterparty_profiles(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_conversation_counterparty_profiles(uuid[]) IS
  'Returns minimal display identities for requested users who share a conversation with the authenticated caller.';

DROP POLICY IF EXISTS "pharmacy_read_prescriptions_queue" ON public.prescriptions;
CREATE POLICY "pharmacy_read_prescriptions_queue"
  ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (
    NOT is_deleted
    AND pharmacy_organization_id IS NOT NULL
    AND public.is_current_user_ops_org(pharmacy_organization_id, 'pharmacy')
  );

DROP POLICY IF EXISTS "pharmacy_read_prescription_items_queue" ON public.prescription_items;
CREATE POLICY "pharmacy_read_prescription_items_queue"
  ON public.prescription_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND NOT p.is_deleted
        AND p.pharmacy_organization_id IS NOT NULL
        AND public.is_current_user_ops_org(p.pharmacy_organization_id, 'pharmacy')
    )
  );

DROP POLICY IF EXISTS "pharmacy_read_prescription_related_profiles" ON public.user_profiles;
CREATE POLICY "pharmacy_read_prescription_related_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.prescriptions p
      WHERE NOT p.is_deleted
        AND p.pharmacy_organization_id IS NOT NULL
        AND public.is_current_user_ops_org(p.pharmacy_organization_id, 'pharmacy')
        AND (
          p.patient_id = user_profiles.user_id
          OR p.doctor_id = user_profiles.user_id
        )
    )
  );

CREATE OR REPLACE FUNCTION public.get_patient_prescription_pharmacy_contact(
  p_prescription_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    om.user_id,
    up.full_name
  FROM public.prescriptions p
  JOIN public.organizations org
    ON org.id = p.pharmacy_organization_id
   AND org.kind = 'pharmacy'
   AND org.status = 'active'
  JOIN public.organization_members om
    ON om.organization_id = org.id
   AND (om.ends_at IS NULL OR om.ends_at > now())
  JOIN public.user_profiles up
    ON up.user_id = om.user_id
   AND up.role = 'pharmacy'
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles caller
      WHERE caller.user_id = auth.uid()
        AND caller.role = 'patient'
    )
    AND p.id = p_prescription_id
    AND p.patient_id = auth.uid()
    AND NOT p.is_deleted
  ORDER BY om.is_primary DESC, om.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) IS
  'Returns minimal pharmacy contact identity for a prescription owned by the authenticated patient.';
