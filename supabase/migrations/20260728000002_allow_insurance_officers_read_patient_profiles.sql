create policy insurance_read_related_patient_profiles
on user_profiles
for select
using (
  role = 'patient'::user_role
  and (
    exists (
      select 1
      from patient_insurance pi
      join insurance_plans ip on ip.id = pi.insurance_plan_id
      join organization_members om on om.organization_id = ip.organization_id
      where pi.patient_id = user_profiles.user_id
      and om.user_id = auth.uid()
    )
    or exists (
      select 1
      from insurance_membership_requests imr
      join insurance_plans ip on ip.id = imr.insurance_plan_id
      join organization_members om on om.organization_id = ip.organization_id
      where imr.patient_id = user_profiles.user_id
      and om.user_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';