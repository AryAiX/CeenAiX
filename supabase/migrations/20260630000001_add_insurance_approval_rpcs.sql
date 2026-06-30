-- Approve a single pre-authorization. Security check happens inside the
-- function since RLS only grants SELECT to insurance org members on
-- insurance_pre_authorizations. The approved amount is always pulled from
-- the row's own requested_amount_aed server-side — never trusted from the
-- client — to prevent a tampered amount being sent from the browser.
create or replace function public.insurance_approve_pre_authorization(
  p_pre_auth_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_amount numeric;
begin
  select organization_id, requested_amount_aed
  into v_org_id, v_amount
  from insurance_pre_authorizations
  where id = p_pre_auth_id;

  if v_org_id is null then
    raise exception 'Pre-authorization not found';
  end if;

  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to approve this pre-authorization';
  end if;

  update insurance_pre_authorizations
  set status = 'approved',
      approved_amount_aed = v_amount,
      decision_at = now()
  where id = p_pre_auth_id;
end;
$$;

-- Bulk-approve a batch of pre-authorizations (used by the Dashboard's
-- "Bulk Approve AI Recommended" button). Same security model — checked
-- per row inside the loop so a mixed batch can't slip an unauthorized
-- org's row through.
create or replace function public.insurance_bulk_approve_pre_authorizations(
  p_pre_auth_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_org_id uuid;
  v_amount numeric;
begin
  foreach v_id in array p_pre_auth_ids loop
    select organization_id, requested_amount_aed
    into v_org_id, v_amount
    from insurance_pre_authorizations
    where id = v_id;

    if v_org_id is null then
      continue;
    end if;

    if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
      raise exception 'Not authorized to approve pre-authorization %', v_id;
    end if;

    update insurance_pre_authorizations
    set status = 'approved',
        approved_amount_aed = v_amount,
        decision_at = now()
    where id = v_id;
  end loop;
end;
$$;

-- Toggle an insurance_settings row's enabled flag. Same pattern.
create or replace function public.insurance_set_setting_enabled(
  p_setting_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from insurance_settings
  where id = p_setting_id;

  if v_org_id is null then
    raise exception 'Setting not found';
  end if;

  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to update this setting';
  end if;

  update insurance_settings
  set enabled = p_enabled,
      updated_at = now()
  where id = p_setting_id;
end;
$$;

-- Allow logged-in users to call these (the internal checks above are what
-- actually enforce per-org authorization, not this grant).
grant execute on function public.insurance_approve_pre_authorization(uuid) to authenticated;
grant execute on function public.insurance_bulk_approve_pre_authorizations(uuid[]) to authenticated;
grant execute on function public.insurance_set_setting_enabled(uuid, boolean) to authenticated;