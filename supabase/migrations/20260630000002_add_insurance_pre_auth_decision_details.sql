-- Add columns to capture full decision detail for all three pre-auth
-- actions (approve / deny / request info). Currently only status and
-- approved_amount_aed exist — everything an officer types into the
-- Approve/Deny/Request Info forms is discarded on submit.
alter table public.insurance_pre_authorizations
  add column if not exists approval_note text,
  add column if not exists validity_days integer,
  add column if not exists denial_reason text,
  add column if not exists denial_note text,
  add column if not exists info_requested boolean not null default false,
  add column if not exists info_requested_items text[],
  add column if not exists info_requested_note text,
  add column if not exists info_requested_at timestamp with time zone;

-- Replace the existing approve RPC (from the earlier migration) to also
-- accept an optional approval note and validity period. Re-created with
-- DROP first since adding parameters changes the function signature.
drop function if exists public.insurance_approve_pre_authorization(uuid);

create or replace function public.insurance_approve_pre_authorization(
  p_pre_auth_id uuid,
  p_approval_note text default null,
  p_validity_days integer default null
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
      approval_note = p_approval_note,
      validity_days = p_validity_days,
      decision_at = now()
  where id = p_pre_auth_id;
end;
$$;

-- Deny a pre-authorization. Same security model as approve.
create or replace function public.insurance_deny_pre_authorization(
  p_pre_auth_id uuid,
  p_denial_reason text,
  p_denial_note text default null
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
  from insurance_pre_authorizations
  where id = p_pre_auth_id;

  if v_org_id is null then
    raise exception 'Pre-authorization not found';
  end if;

  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to deny this pre-authorization';
  end if;

  update insurance_pre_authorizations
  set status = 'denied',
      denial_reason = p_denial_reason,
      denial_note = p_denial_note,
      decision_at = now()
  where id = p_pre_auth_id;
end;
$$;

-- Record an information request. Deliberately does NOT change `status` —
-- the pre-auth stays in its current status (e.g. 'review') and
-- info_requested = true marks the "awaiting documents" sub-state instead.
-- This avoids touching the status value set and keeps this additive.
create or replace function public.insurance_request_pre_auth_info(
  p_pre_auth_id uuid,
  p_requested_items text[],
  p_note text default null
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
  from insurance_pre_authorizations
  where id = p_pre_auth_id;

  if v_org_id is null then
    raise exception 'Pre-authorization not found';
  end if;

  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to request information for this pre-authorization';
  end if;

  update insurance_pre_authorizations
  set info_requested = true,
      info_requested_items = p_requested_items,
      info_requested_note = p_note,
      info_requested_at = now()
  where id = p_pre_auth_id;
end;
$$;

grant execute on function public.insurance_approve_pre_authorization(uuid, text, integer) to authenticated;
grant execute on function public.insurance_deny_pre_authorization(uuid, text, text) to authenticated;
grant execute on function public.insurance_request_pre_auth_info(uuid, text[], text) to authenticated;