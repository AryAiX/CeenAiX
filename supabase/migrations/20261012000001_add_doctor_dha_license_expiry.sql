   -- Store each doctor's DHA license expiry date on the doctor's own record,
   -- next to doctor_profiles.license_number. Needed for the Shiraz Medical
   -- Center doctor import. Nothing reads it yet; it is only stored.
   -- Safe to run more than once.

   alter table public.doctor_profiles
     add column if not exists dha_license_expiry date;

   comment on column public.doctor_profiles.dha_license_expiry is
     'Expiry date of the DHA professional license in license_number.';