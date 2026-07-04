alter table public.doctor_profiles
  add column if not exists dashboard_preferences jsonb;

notify pgrst, 'reload schema';