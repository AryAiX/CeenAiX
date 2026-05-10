-- Add a small set of "newly arrived" imaging orders (status='ordered') so the
-- Imaging Orders > New (X) tab matches the hosted reference. The hosted UI
-- shows 3 inbound orders awaiting acceptance/scheduling: ECHO 2D TTE,
-- PET-CT Full Body, and Chest X-Ray.

INSERT INTO public.lab_portal_imaging_studies (
  lab_id, accession, patient_name, patient_age, patient_gender,
  doctor_name, clinic_name, modality, study_name, priority, status,
  room, scheduled_at, progress_percent, tat_minutes, report_status, nabidh_status, alerts,
  icd10_code, icd10_description, cpt_code, clinical_indication, contrast, prep_instructions,
  rooms_available_summary, suggested_slot, preauth_status, preauth_coverage, insurance_plan,
  doctor_dha_license, doctor_specialty, source_label
)
SELECT lp.id, s.accession, s.patient, s.age, s.gender, s.doctor, s.clinic, s.modality,
       s.study, s.priority, s.status, s.room, s.scheduled_at, s.progress, s.tat,
       s.report_status, s.nabidh_status, s.alerts,
       s.icd10, s.icd10_desc, s.cpt, s.indication, s.contrast, s.prep,
       s.rooms_avail, s.slot, s.preauth, s.coverage, s.insurance,
       s.dha, s.specialty, s.source
FROM public.lab_profiles lp
CROSS JOIN (VALUES
  ('IORD-20260407-001', 'Aisha Mohammed Al Reem', 42, 'female', 'Dr. Ahmed Al Rashidi', 'Al Noor Medical Center',
   'ECHO', '2D TTE Echocardiogram', 'Routine', 'ordered',
   NULL, now() - interval '5 minutes', 0, NULL::integer, 'Awaiting acceptance', 'pending', ARRAY[]::text[],
   'I50.9', 'Heart Failure', '93306',
   'Assess cardiac function in HFrEF. Previous echo Oct 2025 showed EF 38%.',
   'No', 'Fasting not required',
   '4 of 6 rooms available', 'Today 4:00 PM or Tomorrow 9:00 AM',
   'Pre-auth required', '80% covered pending pre-auth', 'AXA Gulf Standard',
   'DHA-PRAC-2018-047821', 'Cardiologist', 'CeenAiX ePrescription'),
  ('IORD-20260407-002', 'Mohammed Al Rasheed', 63, 'male', 'Dr. Amira Al Nabulsi', 'Dubai Hospital',
   'PET', 'PET-CT Full Body', 'Urgent', 'ordered',
   NULL, now() - interval '20 minutes', 0, NULL::integer, 'Awaiting acceptance', 'pending', ARRAY[]::text[],
   'C34.9', 'Malignant neoplasm of bronchus and lung', '78816',
   'Staging PET-CT for newly diagnosed lung malignancy. Recent biopsy: NSCLC adenocarcinoma.',
   'FDG (radiopharmaceutical)', 'Fasting 4–6 hours. Blood glucose < 11 mmol/L required.',
   'PET-CT scheduled 3:30 PM', 'Today 3:30 PM',
   'Pre-auth required', '100% covered subject to approval', 'Thiqa',
   'DHA-PRAC-2017-019234', 'Oncologist', 'CeenAiX ePrescription'),
  ('IORD-20260407-003', 'Salem Al Mazrouei', 29, 'male', 'Dr. Hassan Al Ali', 'Walk-in',
   'X-Ray', 'Chest X-Ray (PA + Lateral)', 'Routine', 'ordered',
   NULL, now() - interval '35 minutes', 0, NULL::integer, 'Awaiting acceptance', 'pending', ARRAY[]::text[],
   'R05', 'Cough', '71046',
   'Productive cough 2 weeks. Rule out pneumonia or TB.',
   'No', 'Remove metal objects from chest',
   '2 of 3 X-Ray rooms available', 'Today 2:30 PM or Today 2:45 PM',
   'Not required', 'Covered by Daman', 'Daman',
   'DHA-PRAC-2022-062811', 'GP', 'Walk-in')
) AS s(accession, patient, age, gender, doctor, clinic, modality, study, priority, status,
       room, scheduled_at, progress, tat, report_status, nabidh_status, alerts,
       icd10, icd10_desc, cpt, indication, contrast, prep,
       rooms_avail, slot, preauth, coverage, insurance, dha, specialty, source)
WHERE lp.slug = 'dubai-medical-imaging-centre'
  AND NOT EXISTS (
    SELECT 1 FROM public.lab_portal_imaging_studies x
    WHERE x.lab_id = lp.id AND x.accession = s.accession
  );
