-- Post-release verification for ceenaix-prod.
-- Fails the release if required reference data or schema invariants are missing.

DO $$
DECLARE
  spec_count integer;
  med_count integer;
  lab_catalog_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'specializations'
  ) THEN
    RAISE EXCEPTION 'prod verify: missing table public.specializations';
  END IF;

  SELECT count(*)::integer INTO spec_count FROM public.specializations;
  IF spec_count < 10 THEN
    RAISE EXCEPTION 'prod verify: specializations has % rows (expected reference seed)', spec_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medication_catalog'
  ) THEN
    SELECT count(*)::integer INTO med_count FROM public.medication_catalog;
    IF med_count < 1 THEN
      RAISE EXCEPTION 'prod verify: medication_catalog is empty';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lab_test_catalog'
  ) THEN
    SELECT count(*)::integer INTO lab_catalog_count FROM public.lab_test_catalog;
    -- lab_test_catalog may legitimately be empty at launch; report only.
    RAISE NOTICE 'prod verify: lab_test_catalog rows=%', lab_catalog_count;
  END IF;

  RAISE NOTICE 'prod verify: specializations=% medication_catalog=% OK', spec_count, med_count;
END $$;
