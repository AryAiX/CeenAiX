-- ── Foundation: link insurance plans to insurance portal orgs ─────────────────
-- Every insurance plan must be linked to its corresponding insurance portal
-- organization so pre-auths are routed to the correct officer queue.
-- This works for every insurance provider (Daman, AXA, Thiqa, ADNIC, etc.)
-- because each plan independently carries its own organization_id.
-- organization_id is nullable by design — unlinked plans simply skip
-- pre-auth creation cleanly without error.
alter table public.insurance_plans
  add column if not exists organization_id uuid references public.organizations(id),
  add column if not exists preauth_required_for_appointments boolean not null default false;

-- ── RPC: create pre-auth automatically when an appointment is booked ──────────
-- Called after a patient successfully books an appointment.
-- Handles every insurance provider dynamically — looks up each patient's
-- specific plan and routes to the correct insurance org automatically.
-- Returns the new pre-auth uuid on success, or null if no pre-auth is needed.
-- Never throws for business-logic conditions (no insurance, plan inactive,
-- org not linked) so the appointment booking always succeeds regardless.
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
  -- 1. Load the appointment — skip soft-deleted records
  select * into v_appt
  from appointments
  where id = p_appointment_id
    and is_deleted = false;

  if not found then
    raise exception 'Appointment % not found', p_appointment_id;
  end if;

  -- 2. Find this patient's active primary insurance enrollment
  --    Each patient may have a different insurance — this always uses
  --    their own specific plan, never a hardcoded one
  select pi.* into v_pat_ins
  from patient_insurance pi
  where pi.patient_id = v_appt.patient_id
    and pi.is_primary = true
    and (pi.valid_until is null or pi.valid_until >= current_date)
  limit 1;

  -- No active insurance on file — exit cleanly, booking still succeeds
  if not found then
    return null;
  end if;

  -- 3. Load the insurance plan
  select * into v_plan
  from insurance_plans
  where id = v_pat_ins.insurance_plan_id
    and is_active = true;

  -- Plan is inactive or not found — exit cleanly
  if not found then
    return null;
  end if;

  -- 4. Check if this plan requires pre-auth for appointments
  --    Each insurance company decides this at the plan level
  if not v_plan.preauth_required_for_appointments then
    return null;
  end if;

  -- 5. Check the plan is linked to an insurance portal organization
  --    Admin must set organization_id on insurance_plans for each provider
  if v_plan.organization_id is null then
    return null;
  end if;

  -- 6. Get patient name and demographics for the pre-auth record
  select * into v_patient_profile
  from user_profiles
  where user_id = v_appt.patient_id;

  -- 7. Get doctor name for the pre-auth record
  select * into v_doctor_profile
  from user_profiles
  where user_id = v_appt.doctor_id;

  -- 8. Calculate patient age from date of birth if available
  if v_patient_profile.date_of_birth is not null then
    v_patient_age := date_part('year', age(v_patient_profile.date_of_birth))::integer;
  end if;

  -- 9. Get facility name if the appointment is at a specific facility
  if v_appt.facility_id is not null then
    select name into v_facility_name
    from facilities
    where id = v_appt.facility_id;
  end if;
  v_facility_name := coalesce(v_facility_name, 'CeenAiX Clinic');

  -- 10. Estimate cost — matches current usePatientInsurance client-side estimate
  v_amount := case when v_appt.type::text = 'virtual' then 300 else 400 end;

  -- 11. Generate a unique external reference
  v_external_ref := 'PA-APT-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || upper(substr(md5(p_appointment_id::text), 1, 6));

  -- 12. Create the pre-authorization row — routed to the patient's
  --     specific insurance org automatically
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
    v_facility_name,
    coalesce(
      v_appt.chief_complaint,
      'Consultation — ' || initcap(v_appt.type::text)
    ),
    'routine',
    'review',
    v_amount,
    now(),
    now() + interval '8 hours',
    true,
    v_plan.name,
    v_patient_age,
    v_patient_profile.gender
  )
  returning id into v_pre_auth_id;

  return v_pre_auth_id;
end;
$$;

grant execute on function public.create_preauth_from_appointment(uuid) to authenticated;

notify pgrst, 'reload schema';