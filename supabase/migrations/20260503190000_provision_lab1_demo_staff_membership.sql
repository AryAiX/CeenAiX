-- Provision the demo Lab & Radiology account when it is recreated through
-- normal signup. This keeps lab1@aryaix.com tied to the seeded lab dataset
-- without granting arbitrary lab signups access to demo operational data.

CREATE OR REPLACE FUNCTION public.provision_lab1_demo_staff_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'lab' AND lower(coalesce(NEW.email, '')) = 'lab1@aryaix.com' THEN
    INSERT INTO public.lab_staff (user_id, lab_id, role_label, is_active)
    SELECT NEW.user_id, lab_profiles.id, 'pathologist', true
    FROM public.lab_profiles
    ON CONFLICT (user_id, lab_id) DO UPDATE SET
      role_label = EXCLUDED.role_label,
      is_active = true,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_lab1_demo_staff_membership ON public.user_profiles;
CREATE TRIGGER trg_provision_lab1_demo_staff_membership
  AFTER INSERT OR UPDATE OF role, email
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_lab1_demo_staff_membership();

WITH target_user AS (
  SELECT up.user_id
  FROM public.user_profiles up
  WHERE up.role = 'lab'
    AND lower(coalesce(up.email, '')) = 'lab1@aryaix.com'
  LIMIT 1
)
INSERT INTO public.lab_staff (user_id, lab_id, role_label, is_active)
SELECT target_user.user_id, lab_profiles.id, 'pathologist', true
FROM target_user
CROSS JOIN public.lab_profiles
ON CONFLICT (user_id, lab_id) DO UPDATE SET
  role_label = EXCLUDED.role_label,
  is_active = true,
  updated_at = now();
