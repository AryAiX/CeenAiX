-- QA-074: let patients rate Ceen Agent replies (thumbs up / thumbs down).
-- One rating per patient per reply. Patients can read only their own ratings,
-- and they change them only through set_ai_chat_message_feedback, which checks
-- that the reply is an assistant message in one of their own chat sessions.
-- Ratings are removed with the reply (and with the account) through ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS public.ai_chat_message_feedback (
  message_id uuid NOT NULL REFERENCES public.ai_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_message_feedback_user
  ON public.ai_chat_message_feedback(user_id);

ALTER TABLE public.ai_chat_message_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_chat_message_feedback'
      AND policyname = 'ai_chat_message_feedback_select_own'
  ) THEN
    CREATE POLICY ai_chat_message_feedback_select_own
      ON public.ai_chat_message_feedback
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END;
$$;

-- Read-only for signed-in users; nothing for signed-out users. Writes go through the function below.
REVOKE ALL ON TABLE public.ai_chat_message_feedback FROM PUBLIC;
REVOKE ALL ON TABLE public.ai_chat_message_feedback FROM anon;
REVOKE ALL ON TABLE public.ai_chat_message_feedback FROM authenticated;
GRANT SELECT ON TABLE public.ai_chat_message_feedback TO authenticated;

-- p_rating: 1 = helpful, -1 = not helpful, NULL = remove the rating.
CREATE OR REPLACE FUNCTION public.set_ai_chat_message_feedback(
  p_message_id uuid,
  p_rating integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;

  IF p_rating IS NOT NULL AND p_rating NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Rating must be 1, -1 or empty.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ai_chat_messages m
    JOIN public.ai_chat_sessions s ON s.id = m.session_id
    WHERE m.id = p_message_id
      AND m.role = 'assistant'
      AND s.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;

  IF p_rating IS NULL THEN
    DELETE FROM public.ai_chat_message_feedback
    WHERE message_id = p_message_id
      AND user_id = v_user_id;
  ELSE
    INSERT INTO public.ai_chat_message_feedback (message_id, user_id, rating)
    VALUES (p_message_id, v_user_id, p_rating::smallint)
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_chat_message_feedback(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_ai_chat_message_feedback(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_ai_chat_message_feedback(uuid, integer) TO authenticated;

COMMENT ON TABLE public.ai_chat_message_feedback IS
  'Patient thumbs up (1) or thumbs down (-1) on a Ceen Agent reply. One row per patient per reply. Written only through set_ai_chat_message_feedback.';
