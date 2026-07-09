create or replace function public.admin_update_organization(
  in_id uuid,
  in_name text,
  in_city text,
  in_country text,
  in_primary_contact_name text,
  in_primary_contact_email text,
  in_status text,
  in_seats_allocated integer,
  in_baa_signed_at timestamptz,
  in_contract_started_at timestamptz,
  in_contract_ends_at timestamptz,
  in_dha_license text,
  in_nabidh_connected boolean,
  in_notes text
)
returns public.organizations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_row public.organizations;
begin
  if public.is_current_user_super_admin() is not true then
    raise exception 'Only super_admin users can update organizations.' using errcode = 'P0001';
  end if;

  update public.organizations
  set
    name = in_name,
    city = in_city,
    country = in_country,
    primary_contact_name = in_primary_contact_name,
    primary_contact_email = in_primary_contact_email,
    status = in_status,
    seats_allocated = in_seats_allocated,
    baa_signed_at = in_baa_signed_at,
    contract_started_at = in_contract_started_at,
    contract_ends_at = in_contract_ends_at,
    dha_license = in_dha_license,
    nabidh_connected = in_nabidh_connected,
    notes = in_notes,
    updated_at = now()
  where id = in_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Organization not found.' using errcode = 'P0002';
  end if;

  return updated_row;
end;
$function$;

grant execute on function public.admin_update_organization(
  uuid, text, text, text, text, text, text, integer,
  timestamptz, timestamptz, timestamptz, text, boolean, text
) to authenticated;

notify pgrst, 'reload schema';