-- Adds 3 imaging studies with status='ordered' so the Imaging Orders "New" tab
-- in the lab portal matches hosted reference (which shows 3 pending orders).
-- Idempotent via NOT EXISTS check on accession.

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_imaging_studies (
  lab_id, accession, patient_name, patient_age, patient_gender,
  doctor_name, clinic_name, modality, study_name, priority, status,
  room, scheduled_at, progress_percent, tat_minutes, report_status, nabidh_status, alerts,
  icd10_code, icd10_description, cpt_code, clinical_indication, contrast, prep_instructions,
  rooms_available_summary, suggested_slot, preauth_status, preauth_coverage, insurance_plan,
  doctor_dha_license, doctor_specialty, source_label
)
SELECT lab.id, s.accession, s.patient, s.age, s.gender, s.doctor, s.clinic, s.modality,
       s.study, s.priority, s.status, s.room, s.scheduled_at, s.progress, s.tat,
       s.report_status, s.nabidh_status, s.alerts,
       s.icd10, s.icd10_desc, s.cpt, s.indication, s.contrast, s.prep,
       s.rooms_avail, s.slot, s.preauth, s.coverage, s.insurance,
       s.dha, s.specialty, s.source
FROM lab CROSS JOIN (VALUES
  ('MRI-20260510-IN01', 'Khalid Al Suwaidi', 44, 'male', 'Dr. Mariam Al Farsi', 'Saudi German Hospital', 'MRI', 'Brain MRI w/wo contrast', 'STAT', 'ordered',
   NULL::text, now() + interval '2 hours', 0, NULL::integer, 'Awaiting scheduling', 'pending', ARRAY['New order — STAT']::text[],
   'G45.9', 'TIA, unspecified', '70553', 'Acute focal weakness 2h ago. Rule out stroke vs TIA.', 'Gadolinium', 'No metal items',
   '4 of 6 rooms available', 'Today 4:00 PM', 'Not required', 'Covered by Daman', 'Daman',
   'DHA-PRAC-2018-022345', 'Neurology', 'CeenAiX ePrescription'),
  ('USS-20260510-IN02', 'Layla Al Falasi', 36, 'female', 'Dr. Hana Al Farsi', 'Saudi German Hospital', 'USS', 'Abdomen Ultrasound', 'Urgent', 'ordered',
   NULL::text, now() + interval '3 hours', 0, NULL::integer, 'Awaiting scheduling', 'pending', ARRAY['Fasting required']::text[],
   'R10.13', 'Epigastric pain', '76700', 'Epigastric pain 1 week. Rule out cholelithiasis.', 'No', 'Fasting 6 hours',
   '5 of 6 rooms available', 'Today 5:00 PM', 'Not required', 'Covered by AXA Gulf', 'AXA Gulf',
   'DHA-PRAC-2019-031042', 'Internal Medicine', 'CeenAiX ePrescription'),
  ('CT-20260510-IN03', 'Mohammed Al Habsi', 58, 'male', 'Dr. Khalid Al Nasser', 'Burjeel Hospital', 'CT', 'CT Chest w/ contrast', 'Urgent', 'ordered',
   NULL::text, now() + interval '90 minutes', 0, NULL::integer, 'Awaiting scheduling', 'pending', ARRAY['Iodine consent on file']::text[],
   'R91.8', 'Lung lesion', '71250', 'Smoker, surveillance of RLL nodule.', 'Iodine 80mL IV', 'Remove metal',
   '3 of 4 rooms available', 'Today 4:30 PM', 'Pre-auth required', '80% covered pending pre-auth', 'Daman',
   'DHA-PRAC-2017-019234', 'Pulmonology', 'CeenAiX ePrescription')
) AS s(accession, patient, age, gender, doctor, clinic, modality, study, priority, status,
       room, scheduled_at, progress, tat, report_status, nabidh_status, alerts,
       icd10, icd10_desc, cpt, indication, contrast, prep,
       rooms_avail, slot, preauth, coverage, insurance, dha, specialty, source)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lab_portal_imaging_studies x
  WHERE x.lab_id = lab.id AND x.accession = s.accession
);
