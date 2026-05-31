-- Repair dev drift: clinic1@aryaix.com existed before clinic_portal_backend seed,
-- so IF NOT EXISTS skipped password provisioning. Reset to the standard demo password.

DO $$
DECLARE
  demo_password text := 'CeenAiXDemo!';
  clinic_user_id uuid := '729ebc60-093f-412a-bb5e-8c748b30ec7b';
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = crypt(demo_password, gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = clinic_user_id
     OR lower(email) = 'clinic1@aryaix.com';

  INSERT INTO public.user_profiles (
    user_id, role, full_name, first_name, last_name, email, profile_completed, terms_accepted, notification_preferences
  )
  VALUES (
    clinic_user_id, 'clinic', 'Clinic Admin', 'Clinic', 'Admin', 'clinic1@aryaix.com', true, true, '{}'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'clinic',
    profile_completed = true,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();
END $$;
