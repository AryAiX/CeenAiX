-- Marketing lead capture for public landing page (demo + launch notify).

CREATE TABLE IF NOT EXISTS public.marketing_launch_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en',
  persona text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  consent_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_launch_signups_email_len CHECK (char_length(email) <= 320)
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_launch_signups_email_unique
  ON public.marketing_launch_signups (lower(trim(email)));

CREATE TABLE IF NOT EXISTS public.marketing_demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization_name text NOT NULL,
  role_title text NOT NULL,
  organization_type text NOT NULL,
  country text NOT NULL,
  team_size text NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  preferred_demo_time text,
  specific_date date,
  notes text,
  preferred_language text NOT NULL DEFAULT 'English',
  consent boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  override_free_email boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_demo_requests_created_at_idx
  ON public.marketing_demo_requests (created_at DESC);

ALTER TABLE public.marketing_launch_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_demo_requests ENABLE ROW LEVEL SECURITY;

-- Inserts only via Edge Function (service role). No public policies.

CREATE OR REPLACE FUNCTION public.marketing_leads_public_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT count(*)::integer FROM public.marketing_launch_signups)
    + (SELECT count(*)::integer FROM public.marketing_demo_requests)
  );
$$;

REVOKE ALL ON FUNCTION public.marketing_leads_public_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketing_leads_public_count() TO service_role;
