-- QA-073: get_or_create_direct_conversation let any signed-in user open a
-- conversation with any user ID, and the conversations table policy let any
-- signed-in user insert a conversation row directly (or change who is in one).
--
-- From now on a conversation that includes a patient can only be started
-- between that patient and someone caring for them:
--   * doctor   - the patient has an appointment with that doctor
--   * pharmacy - the patient has a prescription sent to that pharmacy
--   * clinic   - the patient has an appointment at that clinic
-- Conversations without a patient (staff to staff) keep their current behaviour.
-- Existing conversations are not changed and still open as before.

-- ---------------------------------------------------------------------------
-- 1. Who may start a direct conversation with whom (internal helper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_start_direct_conversation(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH roles AS (
    SELECT
      (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = p_user_a) AS role_a,
      (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = p_user_b) AS role_b
  ),
  pair AS (
    SELECT
      CASE WHEN role_a = 'patient' THEN p_user_a ELSE p_user_b END AS patient_id,
      CASE WHEN role_a = 'patient' THEN p_user_b ELSE p_user_a END AS other_id,
      CASE WHEN role_a = 'patient' THEN role_b ELSE role_a END AS other_role,
      COALESCE(role_a = 'patient', false) OR COALESCE(role_b = 'patient', false) AS involves_patient
    FROM roles
  )
  SELECT CASE
    WHEN p_user_a IS NULL OR p_user_b IS NULL OR p_user_a = p_user_b THEN false
    WHEN NOT pair.involves_patient THEN true
    WHEN pair.other_role = 'doctor' THEN EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.patient_id = pair.patient_id
        AND a.doctor_id = pair.other_id
        AND NOT a.is_deleted
    )
    WHEN pair.other_role = 'pharmacy' THEN EXISTS (
      SELECT 1
      FROM public.prescriptions p
      JOIN public.organizations org
        ON org.id = p.pharmacy_organization_id
       AND org.kind = 'pharmacy'
       AND org.status = 'active'
      JOIN public.organization_members om
        ON om.organization_id = org.id
       AND om.user_id = pair.other_id
       AND (om.ends_at IS NULL OR om.ends_at > now())
      WHERE p.patient_id = pair.patient_id
        AND NOT p.is_deleted
    )
    WHEN pair.other_role = 'clinic' THEN EXISTS (
      SELECT 1
      FROM public.clinic_portal_members cpm
      JOIN public.appointments a
        ON a.facility_id = cpm.facility_id
      WHERE cpm.user_id = pair.other_id
        AND cpm.is_active
        AND a.patient_id = pair.patient_id
        AND NOT a.is_deleted
    )
    ELSE false
  END
  FROM pair;
$$;

COMMENT ON FUNCTION public.can_start_direct_conversation(uuid, uuid) IS
  'QA-073: true when the two users may start a direct conversation. A patient may only be paired with a doctor they have an appointment with, a pharmacy holding one of their prescriptions, or a clinic they have an appointment at. Internal: not callable by app users.';

-- It reveals care relationships between any two user IDs, so only the
-- SECURITY DEFINER conversation function below may call it.
REVOKE ALL ON FUNCTION public.can_start_direct_conversation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_start_direct_conversation(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_start_direct_conversation(uuid, uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. The conversation function checks the relationship before creating
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  p_other_user_id uuid,
  p_subject text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_conversation_id uuid;
BEGIN
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_current_user_id THEN
    RAISE EXCEPTION 'A different participant is required.';
  END IF;

  -- An existing conversation between the two still opens, so older threads keep working.
  SELECT id
  INTO v_conversation_id
  FROM public.conversations
  WHERE jsonb_array_length(participant_ids) = 2
    AND participant_ids @> jsonb_build_array(v_current_user_id::text, p_other_user_id::text)
  ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  IF NOT public.can_start_direct_conversation(v_current_user_id, p_other_user_id) THEN
    RAISE EXCEPTION 'You can only start a conversation with your care team.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.conversations (
    created_by,
    participant_ids,
    subject,
    last_message_at
  )
  VALUES (
    v_current_user_id,
    jsonb_build_array(v_current_user_id::text, p_other_user_id::text),
    COALESCE(NULLIF(btrim(p_subject), ''), 'Care conversation'),
    NULL
  )
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Close the side doors on the conversations table
-- ---------------------------------------------------------------------------

-- New conversations only come from the function above (it runs as the owner).
REVOKE INSERT ON public.conversations FROM anon, authenticated;

-- App users may still update a conversation they are in (the app sets
-- last_message_at after sending), but not who is in it.
CREATE OR REPLACE FUNCTION public.conversations_keep_participants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (
       NEW.participant_ids IS DISTINCT FROM OLD.participant_ids
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
     ) THEN
    RAISE EXCEPTION 'Conversation participants cannot be changed.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_conversations_keep_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.conversations_keep_participants();

NOTIFY pgrst, 'reload schema';
