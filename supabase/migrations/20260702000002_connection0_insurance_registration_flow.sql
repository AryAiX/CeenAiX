-- ── New table: insurance_member_requests ─────────────────────────────────────
-- Stores patient insurance registration requests waiting for officer approval.
-- A patient submits their insurance details → insurance officer reviews →
-- approves (creates patient_insurance + insurance_members) or rejects.
create table if not exists public.insurance_member_requests (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references auth.users(id),
  insurance_plan_id   uuid not null references public.insurance_plans(id),
  organization_id     uuid not null references public.organizations(id),
  -- Patient-submitted details
  patient_name        text not null,
  policy_number       text,
  member_id           text,
  card_photo_url      text,
  valid_from          date,
  valid_until         date,
  -- Request lifecycle
  status              text not null default 'pending',
  rejection_reason    text,
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamp with time zone,
  created_at          timestamp with time zone not null default now(),
  updated_at          timestamp with time zone not null default now()
);

-- Prevent duplicate pending/approved requests for the same patient + plan
create unique index if not exists insurance_member_requests_patient_plan_active_idx
  on public.insurance_member_requests (patient_id, insurance_plan_id)
  where status in ('pending', 'approved');

alter table public.insurance_member_requests enable row level security;

-- Patient can submit and view their own requests
create policy insurance_member_requests_patient_insert
  on public.insurance_member_requests for insert
  with check (auth.uid() = patient_id);

create policy insurance_member_requests_patient_select
  on public.insurance_member_requests for select
  using (auth.uid() = patient_id or is_current_user_super_admin());

-- Insurance officer can view requests for their organization
create policy insurance_member_requests_ops_select
  on public.insurance_member_requests for select
  using (
    is_current_user_super_admin()
    or is_current_user_ops_org(organization_id, 'insurance')
  );

-- Admin full access
create policy insurance_member_requests_admin_manage
  on public.insurance_member_requests for all
  using (is_current_user_super_admin());

-- ── RPC 1: Patient submits insurance registration request ─────────────────────
create or replace function public.submit_insurance_registration(
  p_insurance_plan_id uuid,
  p_policy_number     text default null,
  p_member_id         text default null,
  p_card_photo_url    text default null,
  p_valid_from        date default null,
  p_valid_until       date default null
)
returns uuid  -- new request id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id   uuid;
  v_plan         record;
  v_patient_name text;
  v_request_id   uuid;
begin
  v_patient_id := auth.uid();

  if v_patient_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Load and validate the insurance plan
  select * into v_plan
  from insurance_plans
  where id = p_insurance_plan_id
    and is_active = true;

  if not found then
    raise exception 'Insurance plan not found or inactive';
  end if;

  -- Check the plan is linked to an insurance portal organization
  if v_plan.organization_id is null then
    raise exception 'This insurance provider is not yet available on CeenAiX';
  end if;

  -- Check no active request already exists for this patient + plan
  if exists (
    select 1 from insurance_member_requests
    where patient_id = v_patient_id
      and insurance_plan_id = p_insurance_plan_id
      and status in ('pending', 'approved')
  ) then
    raise exception 'You already have an active or approved registration for this plan';
  end if;

  -- Get patient display name
  select full_name into v_patient_name
  from user_profiles
  where user_id = v_patient_id;

  -- Create the registration request
  insert into insurance_member_requests (
    patient_id,
    insurance_plan_id,
    organization_id,
    patient_name,
    policy_number,
    member_id,
    card_photo_url,
    valid_from,
    valid_until,
    status
  ) values (
    v_patient_id,
    p_insurance_plan_id,
    v_plan.organization_id,
    coalesce(v_patient_name, 'Unknown Patient'),
    p_policy_number,
    p_member_id,
    p_card_photo_url,
    p_valid_from,
    p_valid_until,
    'pending'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ── RPC 2: Insurance officer approves a registration request ──────────────────
-- On approval, automatically creates:
-- 1. A patient_insurance row (the patient's enrollment)
-- 2. An insurance_members row (the officer's member list entry)
-- Both are linked via patient_insurance_id — the bridge between portals.
create or replace function public.approve_insurance_member_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request         record;
  v_plan            record;
  v_pat_insurance_id uuid;
  v_external_id     text;
begin
  -- Load and validate the request
  select * into v_request
  from insurance_member_requests
  where id = p_request_id;

  if not found then
    raise exception 'Registration request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is already % — cannot approve again', v_request.status;
  end if;

  -- Confirm officer belongs to the correct insurance org
  if not (is_current_user_super_admin()
    or is_current_user_ops_org(v_request.organization_id, 'insurance')) then
    raise exception 'Not authorized to approve this request';
  end if;

  -- Load the insurance plan for plan details
  select * into v_plan
  from insurance_plans
  where id = v_request.insurance_plan_id;

  -- Generate external member ID
  v_external_id := 'MBR-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || upper(substr(md5(p_request_id::text), 1, 6));

  -- 1. Create patient_insurance row (the patient's enrollment record)
  insert into patient_insurance (
    patient_id,
    insurance_plan_id,
    policy_number,
    member_id,
    card_photo_url,
    valid_from,
    valid_until,
    is_primary,
    annual_limit_used
  ) values (
    v_request.patient_id,
    v_request.insurance_plan_id,
    v_request.policy_number,
    coalesce(v_request.member_id, v_external_id),
    v_request.card_photo_url,
    v_request.valid_from,
    v_request.valid_until,
    -- Set as primary if the patient has no other active insurance
    not exists (
      select 1 from patient_insurance
      where patient_id = v_request.patient_id
        and is_primary = true
    ),
    0
  )
  returning id into v_pat_insurance_id;

  -- 2. Create insurance_members row (the officer's member list entry)
  insert into insurance_members (
    organization_id,
    patient_insurance_id,
    external_member_id,
    patient_name,
    plan_name,
    utilization_percent,
    claim_count,
    risk_level,
    is_active
  ) values (
    v_request.organization_id,
    v_pat_insurance_id,
    v_external_id,
    v_request.patient_name,
    v_plan.name,
    0,
    0,
    'low',
    true
  );

  -- 3. Mark request as approved
  update insurance_member_requests
  set status      = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at  = now()
  where id = p_request_id;
end;
$$;

-- ── RPC 3: Insurance officer rejects a registration request ───────────────────
create or replace function public.reject_insurance_member_request(
  p_request_id      uuid,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
begin
  select * into v_request
  from insurance_member_requests
  where id = p_request_id;

  if not found then
    raise exception 'Registration request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is already % — cannot reject', v_request.status;
  end if;

  if not (is_current_user_super_admin()
    or is_current_user_ops_org(v_request.organization_id, 'insurance')) then
    raise exception 'Not authorized to reject this request';
  end if;

  update insurance_member_requests
  set status            = 'rejected',
      rejection_reason  = p_rejection_reason,
      reviewed_by       = auth.uid(),
      reviewed_at       = now(),
      updated_at        = now()
  where id = p_request_id;
end;
$$;

grant execute on function public.submit_insurance_registration(uuid, text, text, text, date, date) to authenticated;
grant execute on function public.approve_insurance_member_request(uuid) to authenticated;
grant execute on function public.reject_insurance_member_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';