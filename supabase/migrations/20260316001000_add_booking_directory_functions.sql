-- Secure booking directory accessors for public/authenticated clients.
-- These expose only the fields needed for doctor discovery and slot availability.

CREATE OR REPLACE FUNCTION public.get_bookable_doctors()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  specialty text,
  specialization_ids uuid[],
  city text,
  address text,
  bio text,
  consultation_fee numeric,
  active_availability_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.user_id,
    up.full_name,
    dp.specialization AS specialty,
    COALESCE(
      array_agg(DISTINCT ds.specialization_id) FILTER (WHERE ds.specialization_id IS NOT NULL),
      ARRAY[]::uuid[]
    ) AS specialization_ids,
    up.city,
    up.address,
    dp.bio,
    dp.consultation_fee,
    COUNT(DISTINCT da.id) AS active_availability_count
  FROM public.user_profiles up
  JOIN public.doctor_profiles dp
    ON dp.user_id = up.user_id
  LEFT JOIN public.doctor_availability da
    ON da.doctor_id = up.user_id
   AND da.is_active = true
  LEFT JOIN public.doctor_specializations ds
    ON ds.doctor_user_id = up.user_id
  WHERE up.role = 'doctor'
  GROUP BY
    up.user_id,
    up.full_name,
    dp.specialization,
    up.city,
    up.address,
    dp.bio,
    dp.consultation_fee
  ORDER BY lower(up.full_name);
$$;

CREATE OR REPLACE FUNCTION public.get_doctor_booked_appointments(
  p_doctor_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
RETURNS TABLE (
  id uuid,
  scheduled_at timestamptz,
  duration_minutes integer,
  status appointment_status
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    appointments.id,
    appointments.scheduled_at,
    appointments.duration_minutes,
    appointments.status
  FROM public.appointments
  WHERE appointments.doctor_id = p_doctor_id
    AND appointments.is_deleted = false
    AND appointments.scheduled_at >= p_start_at
    AND appointments.scheduled_at < p_end_at
    AND appointments.status IN ('scheduled', 'confirmed', 'in_progress')
  ORDER BY appointments.scheduled_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bookable_doctors() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_booked_appointments(uuid, timestamptz, timestamptz) TO anon, authenticated;
