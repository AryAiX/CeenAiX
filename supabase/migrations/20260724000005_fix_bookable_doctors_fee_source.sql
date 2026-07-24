CREATE OR REPLACE FUNCTION public.get_bookable_doctors()
 RETURNS TABLE(user_id uuid, full_name text, specialty text, specialization_ids uuid[], city text, address text, bio text, consultation_fee numeric, active_availability_count bigint)
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
    up.city,
    up.address,
    dp.bio,
    COALESCE(
      (SELECT fs.consultation_fee
       FROM public.facility_staff fs
       WHERE fs.doctor_user_id = up.user_id
         AND fs.is_active = true
         AND fs.invitation_status = 'accepted'
       ORDER BY fs.updated_at DESC NULLS LAST
       LIMIT 1),
      dp.consultation_fee
    ) AS consultation_fee,
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
$function$;

NOTIFY pgrst, 'reload schema';