create or replace function public.admin_cancel_clinic_invitation(p_invitation_id uuid)
returns public.clinic_doctor_invitations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_row public.clinic_doctor_invitations;
begin
  if public.is_current_user_super_admin() is not true then
    raise exception 'Only super_admin users can cancel invitations.' using errcode = 'P0001';
  end if;

  update public.clinic_doctor_invitations
  set status = 'cancelled', updated_at = now()
  where id = p_invitation_id
    and status = 'pending'
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Invitation not found or no longer pending.' using errcode = 'P0002';
  end if;

  return updated_row;
end;
$function$;

grant execute on function public.admin_cancel_clinic_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';