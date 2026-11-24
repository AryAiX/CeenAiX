-- QA-156: an edited message showed no sign that it had been changed.
--
-- The sender can change a message's text at any time (senders_soft_delete_own_messages allows
-- UPDATE of their own rows), even after the other person has read it, and nothing showed that it
-- had been edited. Doctor and patient messages are part of the care record, so both sides should
-- be able to see that a message was changed.
--
-- messages.edited_at is set by the database itself whenever the text changes, so the app (or
-- anyone calling the API) cannot leave it out, set it on a new message, or clear it later.
-- Deleting, restoring (QA-154) and marking as read do not change the text, so they leave it alone.
-- No existing rows change.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

COMMENT ON COLUMN public.messages.edited_at IS
  'QA-156: when the text was last changed. Set only by trg_messages_stamp_edited_at.';

CREATE OR REPLACE FUNCTION public.stamp_message_edited_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.edited_at := NULL;
  ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_message_edited_at() FROM PUBLIC;

CREATE OR REPLACE TRIGGER trg_messages_stamp_edited_at
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_message_edited_at();
