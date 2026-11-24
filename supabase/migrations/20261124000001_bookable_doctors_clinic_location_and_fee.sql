-- get_bookable_doctors() is open to signed-out visitors (Find a Doctor) and returned the
-- doctor's personal user_profiles.address and the doctor's own profile fee.
--
-- Location: a doctor with an active clinic link now shows the clinic's address and city
-- (facilities). The doctor's own profile address is only returned to signed-in users and only
-- when the doctor has no active clinic, so a signed-out visitor never sees it.
--
-- Fee: the clinic link's consultation_fee (set on the clinic Doctors page) wins over the
-- doctor's profile fee, the same rule the clinic portal already uses.
--
-- Same name, arguments and result columns, so callers are unchanged.

CREATE OR REPLACE FUNCTION public.get_bookable_doctors()
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
  SELECT
    up.user_id,
    up.full_name,
    dp.specialization AS specialty,
    COALESCE(
      array_agg(DISTINCT ds.specialization_id) FILTER (WHERE ds.specialization_id IS NOT NULL),
      ARRAY[]::uuid[]
    ) AS specialization_ids,
    COALESCE(NULLIF(btrim(clinic.city), ''), up.city) AS city,
    CASE
      WHEN clinic.facility_id IS NOT NULL THEN clinic.address
      WHEN auth.uid() IS NOT NULL THEN up.address
      ELSE NULL
    END AS address,
    dp.bio,
    COALESCE(clinic.consultation_fee, dp.consultation_fee) AS consultation_fee,
    COUNT(DISTINCT da.id) AS active_availability_count
  FROM public.user_profiles up
  JOIN public.doctor_profiles dp
    ON dp.user_id = up.user_id
  LEFT JOIN LATERAL (
    SELECT fs.facility_id, f.address, f.city, fs.consultation_fee
    FROM public.facility_staff fs
    JOIN public.facilities f
      ON f.id = fs.facility_id
    WHERE fs.doctor_user_id = up.user_id
      AND fs.is_active = true
      AND fs.invitation_status::text IN ('accepted', 'active')
      AND f.is_active = true
      AND f.is_deleted = false
    ORDER BY fs.updated_at DESC
    LIMIT 1
  ) clinic ON true
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
    dp.consultation_fee,
    clinic.facility_id,
    clinic.city,
    clinic.address,
    clinic.consultation_fee
  ORDER BY lower(up.full_name);
$function$;
