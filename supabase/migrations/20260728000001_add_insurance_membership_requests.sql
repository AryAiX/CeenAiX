-- 1. New table
create table if not exists insurance_membership_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  insurance_plan_id uuid not null references insurance_plans(id),
  policy_number text,
  member_id text,
  valid_until date,
  card_photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  decision_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  resulting_patient_insurance_id uuid references patient_insurance(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_insurance_requests_patient
  on insurance_membership_requests (patient_id);

create index if not exists idx_insurance_requests_plan
  on insurance_membership_requests (insurance_plan_id);

-- 2. One pending request per patient, enforced by the database
create unique index if not exists uq_pending_insurance_request_per_patient
  on insurance_membership_requests (patient_id)
  where status = 'pending';

-- 3. RLS
alter table insurance_membership_requests enable row level security;

create policy patients_insert_own_requests
  on insurance_membership_requests
  for insert
  with check (auth.uid() = patient_id and status = 'pending');

create policy patients_read_own_requests
  on insurance_membership_requests
  for select
  using (auth.uid() = patient_id);

create policy officers_read_org_requests
  on insurance_membership_requests
  for select
  using (
    exists (
      select 1
      from insurance_plans ip
      join organization_members om on om.organization_id = ip.organization_id
      where ip.id = insurance_membership_requests.insurance_plan_id
      and om.user_id = auth.uid()
    )
  );

-- 4. Approve / deny functions
create or replace function approve_insurance_membership_request(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request insurance_membership_requests%rowtype;
  v_new_id uuid;
  v_has_existing boolean;
begin
  select * into v_request
  from insurance_membership_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if not exists (
    select 1
    from insurance_plans ip
    join organization_members om on om.organization_id = ip.organization_id
    where ip.id = v_request.insurance_plan_id
    and om.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to approve this request';
  end if;

  select exists (
    select 1 from patient_insurance where patient_id = v_request.patient_id
  ) into v_has_existing;

  insert into patient_insurance (
    patient_id, insurance_plan_id, policy_number, member_id,
    card_photo_url, valid_until, is_primary, annual_limit_used
  ) values (
    v_request.patient_id, v_request.insurance_plan_id, v_request.policy_number, v_request.member_id,
    v_request.card_photo_url, v_request.valid_until, not v_has_existing, 0
  )
  returning id into v_new_id;

  update insurance_membership_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      resulting_patient_insurance_id = v_new_id,
      updated_at = now()
  where id = request_id;

  return v_new_id;
end;
$$;

grant execute on function approve_insurance_membership_request(uuid) to authenticated;

create or replace function deny_insurance_membership_request(request_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request insurance_membership_requests%rowtype;
begin
  select * into v_request
  from insurance_membership_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if not exists (
    select 1
    from insurance_plans ip
    join organization_members om on om.organization_id = ip.organization_id
    where ip.id = v_request.insurance_plan_id
    and om.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to deny this request';
  end if;

  update insurance_membership_requests
  set status = 'denied',
      decision_reason = reason,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = request_id;
end;
$$;

grant execute on function deny_insurance_membership_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';