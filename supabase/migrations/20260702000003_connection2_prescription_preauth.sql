-- ── Add pre-auth flag and estimated cost to medication_catalog ────────────────
-- requires_pre_auth: when true, any prescription of this medication
-- automatically triggers a pre-authorization request to the insurance portal.
-- estimated_cost_aed: used to populate the pre-auth amount. Falls back
-- to AED 120 (the current client-side estimate) if not set.
alter table public.medication_catalog
  add column if not exists requires_pre_auth boolean not null default false,
  add column if not exists estimated_cost_aed numeric;

-- ── RPC: create pre-auths from a prescription ────────────────────────────────
-- Called after a doctor successfully saves a prescription.
-- Loops through all prescription items, finds ones linked to the
-- medication catalog with requires_pre_auth = true, and creates one
-- insurance_pre_authorizations row per flagged medication.
-- Returns the count of pre-auths created (0 if none needed).
-- Never blocks the prescription save — always fire-and-forget from client.
create or replace function public.create_preauth_from_prescription(
  p_prescription_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rx              record;
  v_pat_ins         record;
  v_plan            record;
  v_patient_profile record;
  v_doctor_profile  record;
  v_patient_age     integer;
  v_item            record;
  v_external_ref    text;
  v_med_name        text;
  v_amount          numeric;
  v_count           integer := 0;
begin
  -- 1. Load the prescription — skip deleted
  select * into v_rx
  from prescriptions
  where id = p_prescription_id
    and is_deleted = false;

  if not found then
    raise exception 'Prescription % not found', p_prescription_id;
  end if;

  -- 2. Find patient's active primary insurance
  select pi.* into v_pat_ins
  from patient_insurance pi
  where pi.patient_id = v_rx.patient_id
    and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;

  -- No active insurance — exit cleanly
  if not found then
    return 0;
  end if;

  -- 3. Load the insurance plan
  select * into v_plan
  from insurance_plans
  where id = v_pat_ins.insurance_plan_id
    and is_active = true;

  -- Plan inactive or not linked to an org — exit cleanly
  if not found or v_plan.organization_id is null then
    return 0;
  end if;

  -- 4. Get patient and doctor profiles
  select * into v_patient_profile
  from user_profiles where user_id = v_rx.patient_id;

  select * into v_doctor_profile
  from user_profiles where user_id = v_rx.doctor_id;

  -- 5. Calculate patient age
  if v_patient_profile.date_of_birth is not null then
    v_patient_age := date_part('year', age(v_patient_profile.date_of_birth))::integer;
  end if;

  -- 6. Loop through prescription items that require pre-auth.
  --    Only items linked to the medication_catalog with
  --    requires_pre_auth = true are included — custom or
  --    unlinked items are skipped safely.
  for v_item in
    select
      pi.id,
      pi.dosage,
      mc.generic_name_en,
      mc.brand_name_en,
      mc.estimated_cost_aed
    from prescription_items pi
    join medication_catalog mc on mc.id = pi.medication_catalog_id
    where pi.prescription_id = p_prescription_id
      and mc.requires_pre_auth = true
      and mc.is_active = true
  loop
    -- Prefer brand name over generic for the pre-auth description
    v_med_name := coalesce(v_item.brand_name_en, v_item.generic_name_en);

    -- Use catalog cost or fall back to AED 120 estimate
    v_amount := coalesce(v_item.estimated_cost_aed, 120);

    -- Generate unique external reference per medication item
    v_external_ref := 'PA-RX-'
      || to_char(now(), 'YYYYMMDD')
      || '-'
      || upper(substr(md5(v_item.id::text), 1, 6));

    -- Create pre-auth for this medication
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
      coalesce(v_patient_profile.full_name, 'Unknown Patient'),
      coalesce(v_doctor_profile.full_name,  'Unknown Doctor'),
      'CeenAiX Pharmacy',
      v_med_name
        || case
             when v_item.dosage is not null
             then ' — ' || v_item.dosage
             else ''
           end,
      'routine',
      'review',
      v_amount,
      now(),
      now() + interval '8 hours',
      true,
      v_plan.name,
      v_patient_age,
      v_patient_profile.gender
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_preauth_from_prescription(uuid) to authenticated;

notify pgrst, 'reload schema';