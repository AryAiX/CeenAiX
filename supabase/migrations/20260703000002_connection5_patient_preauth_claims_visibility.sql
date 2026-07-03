-- ── Add patient_id to both tables so patients can query their own data ────────
alter table public.insurance_pre_authorizations
  add column if not exists patient_id uuid references auth.users(id);

alter table public.insurance_claims
  add column if not exists patient_id uuid references auth.users(id);

-- ── RLS: allow patients to read their own rows ────────────────────────────────
create policy insurance_pre_authorizations_patient_select
  on public.insurance_pre_authorizations for select
  using (
    patient_id = auth.uid()
    or is_current_user_super_admin()
    or is_current_user_ops_org(organization_id, 'insurance')
  );

create policy insurance_claims_patient_select
  on public.insurance_claims for select
  using (
    patient_id = auth.uid()
    or is_current_user_super_admin()
    or is_current_user_ops_org(organization_id, 'insurance')
  );

-- ── Update all 4 RPCs to populate patient_id ─────────────────────────────────

-- RPC 1: create_preauth_from_appointment
create or replace function public.create_preauth_from_appointment(
  p_appointment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt            record;
  v_pat_ins         record;
  v_plan            record;
  v_patient_profile record;
  v_doctor_profile  record;
  v_facility_name   text;
  v_patient_age     integer;
  v_external_ref    text;
  v_pre_auth_id     uuid;
  v_amount          numeric;
begin
  select * into v_appt from appointments
  where id = p_appointment_id and is_deleted = false;
  if not found then raise exception 'Appointment % not found', p_appointment_id; end if;

  select pi.* into v_pat_ins from patient_insurance pi
  where pi.patient_id = v_appt.patient_id and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;
  if not found then return null; end if;

  select * into v_plan from insurance_plans
  where id = v_pat_ins.insurance_plan_id and is_active = true;
  if not found or v_plan.organization_id is null then return null; end if;

  select * into v_patient_profile from user_profiles where user_id = v_appt.patient_id;
  select * into v_doctor_profile  from user_profiles where user_id = v_appt.doctor_id;

  if v_patient_profile.date_of_birth is not null then
    v_patient_age := date_part('year', age(v_patient_profile.date_of_birth))::integer;
  end if;

  if v_appt.facility_id is not null then
    select name into v_facility_name from facilities where id = v_appt.facility_id;
  end if;
  v_facility_name := coalesce(v_facility_name, 'CeenAiX Clinic');

  v_amount := case when v_appt.type::text = 'virtual' then 300 else 400 end;

  v_external_ref := 'PA-APT-' || to_char(now(), 'YYYYMMDD') || '-'
    || upper(substr(md5(p_appointment_id::text), 1, 6));

  insert into insurance_pre_authorizations (
    organization_id, patient_id, external_ref, patient_name, clinician_name,
    provider_name, procedure_name, priority, status, requested_amount_aed,
    requested_at, sla_due_at, is_ceenaix_eprescribed, plan_label,
    patient_age, patient_gender
  ) values (
    v_plan.organization_id, v_appt.patient_id, v_external_ref,
    coalesce(v_patient_profile.full_name, 'Unknown Patient'),
    coalesce(v_doctor_profile.full_name,  'Unknown Doctor'),
    v_facility_name,
    coalesce(v_appt.chief_complaint, 'Consultation — ' || initcap(v_appt.type::text)),
    'routine', 'review', v_amount, now(), now() + interval '8 hours',
    true, v_plan.name, v_patient_age, v_patient_profile.gender
  )
  returning id into v_pre_auth_id;

  return v_pre_auth_id;
end;
$$;

-- RPC 2: create_preauth_from_prescription
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
  select * into v_rx from prescriptions
  where id = p_prescription_id and is_deleted = false;
  if not found then raise exception 'Prescription % not found', p_prescription_id; end if;

  select pi.* into v_pat_ins from patient_insurance pi
  where pi.patient_id = v_rx.patient_id and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;
  if not found then return 0; end if;

  select * into v_plan from insurance_plans
  where id = v_pat_ins.insurance_plan_id and is_active = true;
  if not found or v_plan.organization_id is null then return 0; end if;

  select * into v_patient_profile from user_profiles where user_id = v_rx.patient_id;
  select * into v_doctor_profile  from user_profiles where user_id = v_rx.doctor_id;

  if v_patient_profile.date_of_birth is not null then
    v_patient_age := date_part('year', age(v_patient_profile.date_of_birth))::integer;
  end if;

  for v_item in
    select pi.id, pi.dosage, mc.generic_name_en, mc.brand_name_en, mc.estimated_cost_aed
    from prescription_items pi
    join medication_catalog mc on mc.id = pi.medication_catalog_id
    where pi.prescription_id = p_prescription_id
      and mc.requires_pre_auth = true and mc.is_active = true
  loop
    v_med_name := coalesce(v_item.brand_name_en, v_item.generic_name_en);
    v_amount   := coalesce(v_item.estimated_cost_aed, 120);
    v_external_ref := 'PA-RX-' || to_char(now(), 'YYYYMMDD') || '-'
      || upper(substr(md5(v_item.id::text), 1, 6));

    insert into insurance_pre_authorizations (
      organization_id, patient_id, external_ref, patient_name, clinician_name,
      provider_name, procedure_name, priority, status, requested_amount_aed,
      requested_at, sla_due_at, is_ceenaix_eprescribed, plan_label,
      patient_age, patient_gender
    ) values (
      v_plan.organization_id, v_rx.patient_id, v_external_ref,
      coalesce(v_patient_profile.full_name, 'Unknown Patient'),
      coalesce(v_doctor_profile.full_name,  'Unknown Doctor'),
      'CeenAiX Pharmacy',
      v_med_name || case when v_item.dosage is not null then ' — ' || v_item.dosage else '' end,
      'routine', 'review', v_amount, now(), now() + interval '8 hours',
      true, v_plan.name, v_patient_age, v_patient_profile.gender
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- RPC 3: create_preauth_from_lab_order
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
  select * into v_order from lab_orders
  where id = p_lab_order_id and is_deleted = false;
  if not found then raise exception 'Lab order % not found', p_lab_order_id; end if;

  select pi.* into v_pat_ins from patient_insurance pi
  where pi.patient_id = v_order.patient_id and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;
  if not found then return 0; end if;

  select * into v_plan from insurance_plans
  where id = v_pat_ins.insurance_plan_id and is_active = true;
  if not found or v_plan.organization_id is null then return 0; end if;

  select * into v_doctor_profile  from user_profiles where user_id = v_order.doctor_id;
  select * into v_patient_profile from user_profiles where user_id = v_order.patient_id;

  v_priority  := case when v_order.urgency in ('urgent', 'stat') then 'urgent' else 'routine' end;
  v_sla_hours := case when v_order.urgency in ('urgent', 'stat') then 4 else 8 end;

  for v_item in
    select loi.id, loi.test_name, loi.unit_cost_aed, ltc.display_name_en
    from lab_order_items loi
    join lab_test_catalog ltc on ltc.id = loi.lab_test_catalog_id
    where loi.lab_order_id = p_lab_order_id
      and ltc.requires_pre_auth = true and ltc.is_active = true
  loop
    v_test_name    := coalesce(v_item.display_name_en, v_item.test_name);
    v_amount       := coalesce(v_item.unit_cost_aed, 160);
    v_external_ref := 'PA-LAB-' || to_char(now(), 'YYYYMMDD') || '-'
      || upper(substr(md5(v_item.id::text), 1, 6));

    insert into insurance_pre_authorizations (
      organization_id, patient_id, external_ref, patient_name, clinician_name,
      provider_name, procedure_name, priority, status, requested_amount_aed,
      requested_at, sla_due_at, is_ceenaix_eprescribed, plan_label,
      patient_age, patient_gender
    ) values (
      v_plan.organization_id, v_order.patient_id, v_external_ref,
      coalesce(v_order.patient_display_name, v_patient_profile.full_name, 'Unknown Patient'),
      coalesce(v_doctor_profile.full_name, 'Unknown Doctor'),
      coalesce(v_order.clinic_name, 'CeenAiX Lab'),
      v_test_name, v_priority, 'review', v_amount,
      now(), now() + (v_sla_hours || ' hours')::interval,
      true, v_plan.name,
      coalesce(v_order.patient_age,
        case when v_patient_profile.date_of_birth is not null
          then date_part('year', age(v_patient_profile.date_of_birth))::integer
          else null end),
      coalesce(v_order.patient_gender, v_patient_profile.gender)
    );
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    update lab_orders set preauth_status = 'pending', updated_at = now()
    where id = p_lab_order_id;
  end if;

  return v_count;
end;
$$;

-- RPC 4: create_claim_from_appointment
create or replace function public.create_claim_from_appointment(
  p_appointment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt            record;
  v_pat_ins         record;
  v_plan            record;
  v_patient_profile record;
  v_doctor_profile  record;
  v_facility_name   text;
  v_external_ref    text;
  v_claim_id        uuid;
  v_amount          numeric;
begin
  select * into v_appt from appointments
  where id = p_appointment_id and is_deleted = false;
  if not found then raise exception 'Appointment % not found', p_appointment_id; end if;

  if v_appt.status::text <> 'completed' then return null; end if;

  if exists (select 1 from insurance_claims where appointment_id = p_appointment_id) then
    return null;
  end if;

  select pi.* into v_pat_ins from patient_insurance pi
  where pi.patient_id = v_appt.patient_id and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;
  if not found then return null; end if;

  select * into v_plan from insurance_plans
  where id = v_pat_ins.insurance_plan_id and is_active = true;
  if not found or v_plan.organization_id is null then return null; end if;

  select * into v_patient_profile from user_profiles where user_id = v_appt.patient_id;
  select * into v_doctor_profile  from user_profiles where user_id = v_appt.doctor_id;

  if v_appt.facility_id is not null then
    select name into v_facility_name from facilities where id = v_appt.facility_id;
  end if;
  v_facility_name := coalesce(v_facility_name, 'CeenAiX Clinic');

  v_amount := case when v_appt.type::text = 'virtual' then 300 else 400 end;

  v_external_ref := 'CLM-APT-' || to_char(now(), 'YYYYMMDD') || '-'
    || upper(substr(md5(p_appointment_id::text), 1, 6));

  insert into insurance_claims (
    organization_id, patient_id, appointment_id, external_ref,
    patient_name, plan_name, plan_tier, provider_name, doctor_name,
    claim_type, amount_aed, status, submitted_at, submission_method
  ) values (
    v_plan.organization_id, v_appt.patient_id, p_appointment_id, v_external_ref,
    coalesce(v_patient_profile.full_name, 'Unknown Patient'),
    v_plan.name, v_plan.coverage_type, v_facility_name,
    coalesce(v_doctor_profile.full_name, 'Unknown Doctor'),
    case when v_appt.type::text = 'virtual' then 'Telemedicine' else 'Consultation' end,
    v_amount, 'submitted', now(), 'auto'
  )
  returning id into v_claim_id;

  return v_claim_id;
end;
$$;

notify pgrst, 'reload schema';