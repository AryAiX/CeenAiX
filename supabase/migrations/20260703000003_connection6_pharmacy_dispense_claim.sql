-- Add prescription_id to insurance_claims for connection 6 dedup
alter table public.insurance_claims
  add column if not exists prescription_id uuid references public.prescriptions(id);

create unique index if not exists insurance_claims_prescription_id_unique
  on public.insurance_claims(prescription_id)
  where prescription_id is not null;

-- RPC: create a claim when a pharmacist finishes dispensing a prescription
create or replace function public.create_claim_from_prescription(p_prescription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_doctor_id uuid;
  v_pharmacy_org_id uuid;
  v_insurance_plan_id uuid;
  v_organization_id uuid;
  v_plan_name text;
  v_plan_active boolean;
  v_patient_name text;
  v_doctor_name text;
  v_provider_name text;
  v_amount_aed numeric := 0;
  v_external_ref text;
begin
  if exists (select 1 from public.insurance_claims where prescription_id = p_prescription_id) then
    return;
  end if;

  select patient_id, doctor_id, pharmacy_organization_id
  into v_patient_id, v_doctor_id, v_pharmacy_org_id
  from public.prescriptions
  where id = p_prescription_id;

  if v_patient_id is null then
    return;
  end if;

  select ip.id, ip.organization_id, ip.name, ip.is_active
  into v_insurance_plan_id, v_organization_id, v_plan_name, v_plan_active
  from public.patient_insurance pi
  join public.insurance_plans ip on ip.id = pi.insurance_plan_id
  where pi.patient_id = v_patient_id
    and pi.is_primary = true
  limit 1;

  if v_insurance_plan_id is null or v_plan_active is not true or v_organization_id is null then
    return;
  end if;

  select full_name into v_patient_name from public.user_profiles where user_id = v_patient_id;
  select full_name into v_doctor_name from public.user_profiles where user_id = v_doctor_id;

  if v_pharmacy_org_id is not null then
    select name into v_provider_name from public.organizations where id = v_pharmacy_org_id;
  end if;

  select coalesce(sum(coalesce(mc.estimated_cost_aed, 120)), 0)
  into v_amount_aed
  from public.prescription_items pit
  left join public.medication_catalog mc on mc.id = pit.medication_catalog_id
  where pit.prescription_id = p_prescription_id;

  if v_amount_aed <= 0 then
    return;
  end if;

  v_external_ref := 'CLM-RX-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.insurance_claims (
    organization_id, external_ref, patient_id, prescription_id,
    patient_name, plan_name, provider_name, doctor_name,
    amount_aed, status, claim_type, submission_method, submitted_at
  ) values (
    v_organization_id, v_external_ref, v_patient_id, p_prescription_id,
    coalesce(v_patient_name, 'Unknown Patient'), v_plan_name, v_provider_name, v_doctor_name,
    v_amount_aed, 'submitted', 'Pharmacy', 'auto', now()
  );
end;
$$;

grant execute on function public.create_claim_from_prescription(uuid) to authenticated;

notify pgrst, 'reload schema';