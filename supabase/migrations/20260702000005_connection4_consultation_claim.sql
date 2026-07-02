-- ── Add appointment_id to insurance_claims ────────────────────────────────────
-- Links a claim back to the appointment it came from.
-- The unique index prevents duplicate claims for the same appointment
-- if the doctor accidentally marks it complete more than once.
alter table public.insurance_claims
  add column if not exists appointment_id uuid references public.appointments(id);

create unique index if not exists insurance_claims_appointment_id_unique_idx
  on public.insurance_claims (appointment_id)
  where appointment_id is not null;

-- ── RPC: create a claim when a consultation is completed ─────────────────────
-- Called after a doctor marks an appointment as completed.
-- Automatically creates a real insurance claim in the officer's
-- Claims page for adjudication. Works for every patient using
-- their own specific insurance plan dynamically.
-- Returns the new claim id, or null if no claim is needed
-- (no insurance, plan not linked, or claim already exists).
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
  -- 1. Load the appointment — skip deleted
  select * into v_appt
  from appointments
  where id = p_appointment_id
    and is_deleted = false;

  if not found then
    raise exception 'Appointment % not found', p_appointment_id;
  end if;

  -- 2. Only create claims for completed appointments
  if v_appt.status::text <> 'completed' then
    return null;
  end if;

  -- 3. Prevent duplicate claims for the same appointment
  if exists (
    select 1 from insurance_claims
    where appointment_id = p_appointment_id
  ) then
    return null; -- Claim already exists for this appointment
  end if;

  -- 4. Find patient's active primary insurance
  select pi.* into v_pat_ins
  from patient_insurance pi
  where pi.patient_id = v_appt.patient_id
    and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;

  -- No active insurance — exit cleanly
  if not found then
    return null;
  end if;

  -- 5. Load the insurance plan
  select * into v_plan
  from insurance_plans
  where id = v_pat_ins.insurance_plan_id
    and is_active = true;

  -- Plan inactive or not linked to an org — exit cleanly
  if not found or v_plan.organization_id is null then
    return null;
  end if;

  -- 6. Get patient and doctor profiles
  select * into v_patient_profile
  from user_profiles where user_id = v_appt.patient_id;

  select * into v_doctor_profile
  from user_profiles where user_id = v_appt.doctor_id;

  -- 7. Get facility name
  if v_appt.facility_id is not null then
    select name into v_facility_name
    from facilities where id = v_appt.facility_id;
  end if;
  v_facility_name := coalesce(v_facility_name, 'CeenAiX Clinic');

  -- 8. Calculate claim amount matching current client-side estimates
  v_amount := case when v_appt.type::text = 'virtual' then 300 else 400 end;

  -- 9. Generate unique external reference
  v_external_ref := 'CLM-APT-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || upper(substr(md5(p_appointment_id::text), 1, 6));

  -- 10. Create the insurance claim
  insert into insurance_claims (
    organization_id,
    appointment_id,
    external_ref,
    patient_name,
    plan_name,
    plan_tier,
    provider_name,
    doctor_name,
    claim_type,
    amount_aed,
    status,
    submitted_at,
    submission_method
  ) values (
    v_plan.organization_id,
    p_appointment_id,
    v_external_ref,
    coalesce(v_patient_profile.full_name, 'Unknown Patient'),
    v_plan.name,
    v_plan.coverage_type,
    v_facility_name,
    coalesce(v_doctor_profile.full_name, 'Unknown Doctor'),
    case when v_appt.type::text = 'virtual'
      then 'Telemedicine'
      else 'Consultation'
    end,
    v_amount,
    'submitted',
    now(),
    'auto'
  )
  returning id into v_claim_id;

  return v_claim_id;
end;
$$;

grant execute on function public.create_claim_from_appointment(uuid) to authenticated;

notify pgrst, 'reload schema';