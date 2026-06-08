-- Add clinic portal role in its own transaction before migrations use it.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'clinic';
