-- QA-166: "Save draft" switched off the doctor's live pre-visit intake template, and saving was
-- not all-or-nothing.
--
-- The Profile page opens the live (published, active) template in the editor. "Save draft" then
-- updated that same row to status 'draft' / is_active false, so new bookings silently stopped
-- getting an intake form. Saving was also several separate requests: switch the old template
-- off, save the template, delete its questions, insert the new questions. If a later request
-- failed, the doctor could be left with no live template, or a template with no questions.
--
-- This function saves a template and all of its questions in one transaction:
--   * "Save draft" on the live template saves the changes as a NEW draft; the live one stays on.
--   * "Save draft" on a draft updates that draft.
--   * "Publish" makes this template the only live one (the others are switched off) and saves it.
-- Either everything is saved or nothing is.
--
-- It runs as the calling doctor (SECURITY INVOKER), so the existing table rules decide what is
-- allowed, exactly as with the direct requests it replaces. It adds no new permissions.

CREATE OR REPLACE FUNCTION public.save_doctor_pre_visit_template(
  p_template_id uuid,
  p_publish boolean,
  p_title text,
  p_description text,
  p_specialization_id uuid,
  p_source_bucket text,
  p_source_path text,
  p_source_file_name text,
  p_extraction_notes jsonb,
  p_questions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_doctor_id uuid := auth.uid();
  v_existing public.pre_visit_templates%ROWTYPE;
  v_target_id uuid;
  v_saved_as_copy boolean := false;
  v_now timestamptz := now();
  v_publish boolean := coalesce(p_publish, false);
  v_metadata jsonb;
BEGIN
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'A template title is required' USING ERRCODE = '22023';
  END IF;

  IF p_questions IS NULL
     OR jsonb_typeof(p_questions) <> 'array'
     OR NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(p_questions) AS q
       WHERE btrim(coalesce(q ->> 'label', '')) <> ''
     ) THEN
    RAISE EXCEPTION 'At least one question is required' USING ERRCODE = '22023';
  END IF;

  v_metadata := jsonb_build_object(
    'extractionNotes', coalesce(p_extraction_notes, '[]'::jsonb),
    'lastSavedAt', v_now
  );

  IF p_template_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.pre_visit_templates
    WHERE id = p_template_id
      AND doctor_user_id = v_doctor_id
      AND is_deleted = false
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Only one live template per doctor (idx_pre_visit_templates_single_active).
  IF v_publish THEN
    UPDATE public.pre_visit_templates
    SET is_active = false
    WHERE doctor_user_id = v_doctor_id
      AND is_active = true
      AND id IS DISTINCT FROM p_template_id;
  END IF;

  IF p_template_id IS NOT NULL AND (v_publish OR NOT v_existing.is_active) THEN
    UPDATE public.pre_visit_templates
    SET specialization_id = p_specialization_id,
        title = btrim(p_title),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        status = CASE WHEN v_publish THEN 'published' ELSE 'draft' END::public.pre_visit_template_status,
        is_active = v_publish,
        source_bucket = p_source_bucket,
        source_path = p_source_path,
        source_file_name = p_source_file_name,
        extraction_metadata = v_metadata,
        published_at = CASE WHEN v_publish THEN v_now ELSE NULL END,
        is_deleted = false,
        deleted_at = NULL
    WHERE id = p_template_id
    RETURNING id INTO v_target_id;
  ELSE
    -- New template, or "Save draft" on the live one: keep the live one on, save a new draft.
    v_saved_as_copy := p_template_id IS NOT NULL;

    INSERT INTO public.pre_visit_templates (
      doctor_user_id, specialization_id, title, description, status, is_active,
      source_bucket, source_path, source_file_name, extraction_metadata, published_at
    )
    VALUES (
      v_doctor_id,
      p_specialization_id,
      btrim(p_title),
      nullif(btrim(coalesce(p_description, '')), ''),
      CASE WHEN v_publish THEN 'published' ELSE 'draft' END::public.pre_visit_template_status,
      v_publish,
      p_source_bucket,
      p_source_path,
      p_source_file_name,
      v_metadata,
      CASE WHEN v_publish THEN v_now ELSE NULL END
    )
    RETURNING id INTO v_target_id;
  END IF;

  DELETE FROM public.pre_visit_template_questions WHERE template_id = v_target_id;

  INSERT INTO public.pre_visit_template_questions (
    template_id, question_key, label, help_text, question_type, display_order, is_required,
    options, autofill_source, memory_key, ai_instructions
  )
  SELECT
    v_target_id,
    q.value ->> 'question_key',
    q.value ->> 'label',
    nullif(q.value ->> 'help_text', ''),
    (q.value ->> 'question_type')::public.pre_visit_question_type,
    (q.ordinality - 1)::integer,
    coalesce((q.value ->> 'is_required')::boolean, false),
    CASE WHEN jsonb_typeof(q.value -> 'options') = 'array' THEN q.value -> 'options' ELSE '[]'::jsonb END,
    nullif(q.value ->> 'autofill_source', ''),
    nullif(q.value ->> 'memory_key', ''),
    nullif(q.value ->> 'ai_instructions', '')
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS q(value, ordinality);

  RETURN jsonb_build_object('template_id', v_target_id, 'saved_as_copy', v_saved_as_copy);
END;
$$;

REVOKE ALL ON FUNCTION public.save_doctor_pre_visit_template(uuid, boolean, text, text, uuid, text, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_doctor_pre_visit_template(uuid, boolean, text, text, uuid, text, text, text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_doctor_pre_visit_template(uuid, boolean, text, text, uuid, text, text, text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_doctor_pre_visit_template(uuid, boolean, text, text, uuid, text, text, text, jsonb, jsonb) IS
  'QA-166: saves a doctor pre-visit template and its questions in one transaction. Save draft on the live template creates a new draft and keeps the live one on.';
