-- New columns to capture decision detail and manual-entry data that
-- currently has nowhere to be stored.
alter table public.insurance_claims
  add column if not exists approval_note text,
  add column if not exists denial_reason text,
  add column if not exists appeal_review_note text,
  add column if not exists appeal_dismissal_reason text,
  add column if not exists doctor_name text,
  add column if not exists diagnosis_icd_code text,
  add column if not exists cpt_code text,
  add column if not exists ai_eligibility_result text,
  add column if not exists submission_method text,
  add column if not exists flagged_for_review boolean not null default false,
  add column if not exists flagged_reason text,
  add column if not exists flagged_at timestamp with time zone;

-- Approve a single claim.
create or replace function public.insurance_approve_claim(
  p_claim_id uuid,
  p_approval_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from insurance_claims where id = p_claim_id;
  if v_org_id is null then
    raise exception 'Claim not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to approve this claim';
  end if;

  update insurance_claims
  set status = 'approved',
      approval_note = p_approval_note,
      adjudicated_at = now()
  where id = p_claim_id;
end;
$$;

-- Deny a single claim.
create or replace function public.insurance_deny_claim(
  p_claim_id uuid,
  p_denial_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from insurance_claims where id = p_claim_id;
  if v_org_id is null then
    raise exception 'Claim not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to deny this claim';
  end if;

  update insurance_claims
  set status = 'denied',
      denial_reason = p_denial_reason,
      adjudicated_at = now()
  where id = p_claim_id;
end;
$$;

-- Bulk approve. Loops so each row's org is checked individually — a mixed
-- selection can never slip an unauthorized org's claim through.
create or replace function public.insurance_bulk_approve_claims(
  p_claim_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_org_id uuid;
begin
  foreach v_id in array p_claim_ids loop
    select organization_id into v_org_id from insurance_claims where id = v_id;
    if v_org_id is null then
      continue;
    end if;
    if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
      raise exception 'Not authorized to approve claim %', v_id;
    end if;
    update insurance_claims
    set status = 'approved', adjudicated_at = now()
    where id = v_id;
  end loop;
end;
$$;

-- Bulk deny. Takes a single reason applied to the whole batch.
create or replace function public.insurance_bulk_deny_claims(
  p_claim_ids uuid[],
  p_denial_reason text default 'Bulk denial'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_org_id uuid;
begin
  foreach v_id in array p_claim_ids loop
    select organization_id into v_org_id from insurance_claims where id = v_id;
    if v_org_id is null then
      continue;
    end if;
    if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
      raise exception 'Not authorized to deny claim %', v_id;
    end if;
    update insurance_claims
    set status = 'denied', denial_reason = p_denial_reason, adjudicated_at = now()
    where id = v_id;
  end loop;
end;
$$;

-- Resolve an appeal: either uphold (-> approved) or dismiss (-> denied,
-- dismissal reason required). Only valid on claims currently in
-- 'appealed' status.
create or replace function public.insurance_resolve_claim_appeal(
  p_claim_id uuid,
  p_decision text,
  p_review_note text default null,
  p_dismissal_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
begin
  if p_decision not in ('approved', 'denied') then
    raise exception 'Invalid appeal decision: %', p_decision;
  end if;
  if p_decision = 'denied' and (p_dismissal_reason is null or trim(p_dismissal_reason) = '') then
    raise exception 'A dismissal reason is required to dismiss an appeal';
  end if;

  select organization_id, status into v_org_id, v_status
  from insurance_claims where id = p_claim_id;

  if v_org_id is null then
    raise exception 'Claim not found';
  end if;
  if v_status <> 'appealed' then
    raise exception 'Claim is not currently under appeal';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to resolve this appeal';
  end if;

  update insurance_claims
  set status = p_decision,
      appeal_review_note = p_review_note,
      appeal_dismissal_reason = case when p_decision = 'denied' then p_dismissal_reason else null end,
      adjudicated_at = now()
  where id = p_claim_id;
end;
$$;

-- Submit a manually-entered claim. Determines the officer's own
-- organization server-side rather than trusting a client-supplied org id.
create or replace function public.insurance_submit_manual_claim(
  p_patient_name text,
  p_plan_name text,
  p_plan_tier text,
  p_provider_name text,
  p_doctor_name text,
  p_claim_type text,
  p_amount_aed numeric,
  p_diagnosis_icd_code text default null,
  p_cpt_code text default null,
  p_ai_eligibility_result text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_new_id uuid;
  v_ref text;
begin
  select organization_id into v_org_id
  from organization_members
  where user_id = auth.uid() and ends_at is null
  limit 1;

  if v_org_id is null or not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to submit a claim for this organization';
  end if;

  v_ref := 'CLM-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);

  insert into insurance_claims (
    organization_id, external_ref, patient_name, plan_name, plan_tier,
    provider_name, doctor_name, claim_type, amount_aed, status,
    submitted_at, diagnosis_icd_code, cpt_code, ai_eligibility_result, submission_method
  ) values (
    v_org_id, v_ref, p_patient_name, p_plan_name, p_plan_tier,
    p_provider_name, p_doctor_name, p_claim_type, p_amount_aed, 'submitted',
    now(), p_diagnosis_icd_code, p_cpt_code, p_ai_eligibility_result, 'manual'
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Flag a claim for fraud/review investigation.
create or replace function public.insurance_flag_claim_for_review(
  p_claim_id uuid,
  p_flag_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from insurance_claims where id = p_claim_id;
  if v_org_id is null then
    raise exception 'Claim not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to flag this claim';
  end if;

  update insurance_claims
  set flagged_for_review = true,
      flagged_reason = p_flag_reason,
      flagged_at = now()
  where id = p_claim_id;
end;
$$;

grant execute on function public.insurance_approve_claim(uuid, text) to authenticated;
grant execute on function public.insurance_deny_claim(uuid, text) to authenticated;
grant execute on function public.insurance_bulk_approve_claims(uuid[]) to authenticated;
grant execute on function public.insurance_bulk_deny_claims(uuid[], text) to authenticated;
grant execute on function public.insurance_resolve_claim_appeal(uuid, text, text, text) to authenticated;
grant execute on function public.insurance_submit_manual_claim(text, text, text, text, text, text, numeric, text, text, text) to authenticated;
grant execute on function public.insurance_flag_claim_for_review(uuid, text) to authenticated;

