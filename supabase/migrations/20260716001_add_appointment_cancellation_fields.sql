ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;