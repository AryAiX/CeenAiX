CREATE OR REPLACE FUNCTION public.list_active_pharmacies()
 RETURNS TABLE(id uuid, name text, city text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, COALESCE(pfp.display_name, o.name) AS name, o.city
  FROM public.organizations o
  LEFT JOIN public.pharmacy_facility_profiles pfp ON pfp.organization_id = o.id
  WHERE o.kind = 'pharmacy'
    AND o.status = 'active'
  ORDER BY lower(COALESCE(pfp.display_name, o.name));
$function$