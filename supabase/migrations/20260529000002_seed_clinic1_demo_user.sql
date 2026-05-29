-- Seed clinic1 demo user profile
INSERT INTO public.user_profiles (
  user_id,
  role,
  full_name,
  first_name,
  last_name,
  email,
  profile_completed,
  terms_accepted,
  notification_preferences
)
VALUES (
  '729ebc60-093f-412a-bb5e-8c748b30ec7b',
  'clinic',
  'Clinic Admin',
  'Clinic',
  'Admin',
  'clinic1@aryaix.com',
  true,
  true,
  '{}'
)
ON CONFLICT (user_id) DO NOTHING;