-- ── Add pre-auth flag to lab_test_catalog ────────────────────────────────────
-- When requires_pre_auth = true, any lab order containing this test
-- automatically triggers a pre-authorization request to the insurance portal.
-- Examples: MRI, CT scan, PET scan, bone marrow biopsy, genetic testing.
alter table public.lab_test_catalog
  add column if not exists requires_pre_auth boolean not null default false;

-- ── RPC: create pre-auths from a lab order ───────────────────────────────────
-- Called after a doctor successfully saves a lab order.
-- Loops through all lab order items, finds ones linked to the catalog
-- with requires_pre_auth = true, and creates one
-- insurance_pre_authorizations row per flagged test.
-- Also updates lab_orders.preauth_status to 'pending' if any
-- pre-auths were created.
-- Returns the count of pre-auths created (0 if none needed).
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
  v_item            record;
  v_external_ref    text;
  v_test_name       text;
  v_amount          numeric;
  v_sla_hours       integer;
  v_priority        text;
  v_count           integer := 0;
begin
  -- 1. Load the lab order — skip deleted
  select * into v_order
  from lab_orders
  where id = p_lab_order_id
    and is_deleted = false;

  if not found then
    raise exception 'Lab order % not found', p_lab_order_id;
  end if;

  -- 2. Find patient's active primary insurance
  select pi.* into v_pat_ins
  from patient_insurance pi
  where pi.patient_id = v_order.patient_id
    and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;

  -- No active insurance — exit cleanly
  if not found then
    return 0;
  end if;

  -- 3. Load insurance plan
  select * into v_plan
  from insurance_plans
  where id = v_pat_ins.insurance_plan_id
    and is_active = true;

  -- Plan inactive or not linked to an org — exit cleanly
  if not found or v_plan.organization_id is null then
    return 0;
  end if;

  -- 4. Get doctor display name
  select full_name into v_doctor_profile
  from user_profiles
  where user_id = v_order.doctor_id;

  -- 5. Determine priority and SLA from lab order urgency
  v_priority  := case when v_order.urgency in ('urgent', 'stat') then 'urgent' else 'routine' end;
  v_sla_hours := case when v_order.urgency in ('urgent', 'stat') then 4 else 8 end;

  -- 6. Loop through lab order items that require pre-auth.
  --    Only items linked to lab_test_catalog with requires_pre_auth = true
  --    are included — unlinked or routine items are skipped safely.
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
    -- Use catalog display name if available, else item test name
    v_test_name := coalesce(v_item.display_name_en, v_item.test_name);

    -- Use item unit cost or fall back to AED 160 (current client estimate)
    v_amount := coalesce(v_item.unit_cost_aed, 160);

    -- Generate unique external reference per test item
    v_external_ref := 'PA-LAB-'
      || to_char(now(), 'YYYYMMDD')
      || '-'
      || upper(substr(md5(v_item.id::text), 1, 6));

    -- Create pre-auth for this test
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
      -- Use pre-stored patient data from lab_orders (already there!)
      coalesce(v_order.patient_display_name, 'Unknown Patient'),
      coalesce(v_doctor_profile.full_name,   'Unknown Doctor'),
      coalesce(v_order.clinic_name, 'CeenAiX Lab'),
      v_test_name,
      v_priority,
      'review',
      v_amount,
      now(),
      now() + (v_sla_hours || ' hours')::interval,
      true,
      v_plan.name,
      v_order.patient_age,
      v_order.patient_gender
    );

    v_count := v_count + 1;
  end loop;

  -- 7. If any pre-auths were created, update the lab order preauth_status
  if v_count > 0 then
    update lab_orders
    set preauth_status = 'pending',
        updated_at     = now()
    where id = p_lab_order_id;
  end if;

  return v_count;
end;
$$;

grant execute on function public.create_preauth_from_lab_order(uuid) to authenticated;

notify pgrst, 'reload schema';