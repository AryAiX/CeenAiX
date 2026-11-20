-- QA-148: ordinary lab tests were turned into imaging studies.
--
-- is_imaging_test_name() decides whether a lab order test is a scan (it then gets a row in
-- lab_portal_imaging_studies, shown in the doctor's Imaging worklist and the lab's imaging queue).
-- It matched the keywords anywhere inside the name, so "ct" inside C-Reactive Protein,
-- Electrolytes, Lactate, Direct Bilirubin, Lactate Dehydrogenase, Factor VIII Activity,
-- Electrocardiogram or Insect Allergy Panel made each of them a "CT" study.
--
-- Both functions now match whole words only (\m and \M are PostgreSQL's start/end of word).
-- Real scan names keep working: CT Chest, MRI Brain, X-Ray / Xray Chest, Ultrasound Abdomen,
-- Echocardiogram, Bone Scan, Doppler Lower Limb. Same keywords as before; the ones that used to
-- match longer words (echo..., sonograph..., scan..., doppler...) still allow those endings.
--
-- Signatures, IMMUTABLE and the existing grants stay the same (CREATE OR REPLACE keeps them).
-- Imaging rows already created from lab tests are not changed here.

CREATE OR REPLACE FUNCTION public.is_imaging_test_name(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_name, '')
    ~* '\m(mri|ct|x-?ray|ultrasound|sonograph\w*|echo\w*|radiology|scan\w*|doppler\w*)\M';
$$;

CREATE OR REPLACE FUNCTION public.imaging_modality_from_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_name, '') ~* '\mmri\M' THEN 'MRI'
    WHEN COALESCE(p_name, '') ~* '\mct\M' THEN 'CT'
    WHEN COALESCE(p_name, '') ~* '\mx-?ray\M' THEN 'X-Ray'
    WHEN COALESCE(p_name, '') ~* '\m(ultrasound|sonograph\w*|sono\w*)\M' THEN 'Ultrasound'
    WHEN COALESCE(p_name, '') ~* '\mecho\w*\M' THEN 'Echo'
    ELSE 'Radiology'
  END;
$$;

COMMENT ON FUNCTION public.is_imaging_test_name(text) IS
  'QA-148: true when a lab test name is a scan. Matches whole words only, so lab tests such as C-Reactive Protein or Electrolytes are no longer treated as CT.';
