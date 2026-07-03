create or replace function public.create_preauth_from_lab_order(
  p_lab_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order           record;
  v_pat_ins         record;
  v_plan            record;
  v_doctor_profile  record;
  v_patient_profile record;
  v_item            record;
  v_external_ref    text;
  v_test_name       text;
  v_amount          numeric;
  v_sla_hours       integer;
  v_priority        text;
  v_count           integer := 0;
begin
  select * into v_order
  from lab_orders
  where id = p_lab_order_id
    and is_deleted = false;

  if not found then
    raise exception 'Lab order % not found', p_lab_order_id;
  end if;

  select pi.* into v_pat_ins
  from patient_insurance pi
  where pi.patient_id = v_order.patient_id
    and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;

  if not found then
    return 0;
  end if;

  select * into v_plan
  from insurance_plans
  where id = v_pat_ins.insurance_plan_id
    and is_active = true;

  if not found or v_plan.organization_id is null then
    return 0;
  end if;

  select * into v_doctor_profile
  from user_profiles where user_id = v_order.doctor_id;

  -- Always look up patient profile as fallback for null fields
  select * into v_patient_profile
  from user_profiles where user_id = v_order.patient_id;

  v_priority  := case when v_order.urgency in ('urgent', 'stat') then 'urgent' else 'routine' end;
  v_sla_hours := case when v_order.urgency in ('urgent', 'stat') then 4 else 8 end;

  for v_item in
    select
      loi.id,
      loi.test_name,
      loi.unit_cost_aed,
      ltc.display_name_en
    from lab_order_items loi
    join lab_test_catalog ltc on ltc.id = loi.lab_test_catalog_id
    where loi.lab_order_id = p_lab_order_id
      and ltc.requires_pre_auth = true
      and ltc.is_active = true
  loop
    v_test_name := coalesce(v_item.display_name_en, v_item.test_name);
    v_amount    := coalesce(v_item.unit_cost_aed, 160);

    v_external_ref := 'PA-LAB-'
      || to_char(now(), 'YYYYMMDD')
      || '-'
      || upper(substr(md5(v_item.id::text), 1, 6));

    insert into insurance_pre_authorizations (
      organization_id,
      external_ref,
      patient_name,
      clinician_name,
      provider_name,
      procedure_name,
      priority,
      status,
      requested_amount_aed,
      requested_at,
      sla_due_at,
      is_ceenaix_eprescribed,
      plan_label,
      patient_age,
      patient_gender
    ) values (
      v_plan.organization_id,
      v_external_ref,
      -- Fall back to user_profiles when lab_orders fields are null
      coalesce(v_order.patient_display_name, v_patient_profile.full_name, 'Unknown Patient'),
      coalesce(v_doctor_profile.full_name, 'Unknown Doctor'),
      coalesce(v_order.clinic_name, 'CeenAiX Lab'),
      v_test_name,
      v_priority,
      'review',
      v_amount,
      now(),
      now() + (v_sla_hours || ' hours')::interval,
      true,
      v_plan.name,
      -- Fall back to user_profiles for age and gender
      coalesce(
        v_order.patient_age,
        case when v_patient_profile.date_of_birth is not null
          then date_part('year', age(v_patient_profile.date_of_birth))::integer
          else null
        end
      ),
      coalesce(v_order.patient_gender, v_patient_profile.gender)
    );

    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    update lab_orders
    set preauth_status = 'pending',
        updated_at     = now()
    where id = p_lab_order_id;
  end if;

  return v_count;
end;
$$;

notify pgrst, 'reload schema';