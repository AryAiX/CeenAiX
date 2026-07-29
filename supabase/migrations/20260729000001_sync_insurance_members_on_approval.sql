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
  v_organization_id uuid;
  v_plan_name text;
  v_patient_name text;
  v_external_member_id text;
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

  select ip.organization_id, ip.name into v_organization_id, v_plan_name
  from insurance_plans ip
  where ip.id = v_request.insurance_plan_id;

  if not exists (
    select 1
    from organization_members om
    where om.organization_id = v_organization_id
    and om.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to approve this request';
  end if;

  v_external_member_id := coalesce(nullif(v_request.member_id, ''), nullif(v_request.policy_number, ''));
  if v_external_member_id is null then
    raise exception 'Cannot approve: request has no policy number or member ID';
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

  select full_name into v_patient_name from user_profiles where user_id = v_request.patient_id;

  insert into insurance_members (
    organization_id, patient_insurance_id, external_member_id, patient_name,
    plan_name, utilization_percent, claim_count, risk_level, is_active, flagged_for_review
  ) values (
    v_organization_id, v_new_id, v_external_member_id, coalesce(v_patient_name, 'Unknown patient'),
    coalesce(v_plan_name, 'Unknown plan'), 0, 0, 'low', true, false
  );

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

notify pgrst, 'reload schema';