create or replace function public.admin_update_feature_flag(
  in_id uuid,
  in_is_enabled boolean,
  in_rollout_percent integer
)
returns public.feature_flags
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_row public.feature_flags;
begin
  if public.is_current_user_super_admin() is not true then
    raise exception 'Only super_admin users can update feature flags.' using errcode = 'P0001';
  end if;

  if in_rollout_percent < 0 or in_rollout_percent > 100 then
    raise exception 'rollout_percent must be between 0 and 100.' using errcode = 'P0003';
  end if;

  update public.feature_flags
  set
    is_enabled = in_is_enabled,
    rollout_percent = in_rollout_percent,
    updated_by = auth.uid(),
    updated_at = now()
  where id = in_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Feature flag not found.' using errcode = 'P0002';
  end if;

  return updated_row;
end;
$function$;

grant execute on function public.admin_update_feature_flag(uuid, boolean, integer) to authenticated;

notify pgrst, 'reload schema';