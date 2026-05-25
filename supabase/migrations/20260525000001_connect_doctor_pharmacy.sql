-- ============================================================
-- CeenAiX — Doctor → Pharmacy Connection Migration
-- Branch: pharmacy-fixes-v2
-- Author: Abdolrahim (Abud-ai)
-- Date: 2026-05-25
-- ============================================================
-- WHAT THIS DOES:
-- 1. Adds pharmacy_organization_id column to prescriptions table
-- 2. Creates a trigger that auto-creates pharmacy_dispensing_tasks
--    when a patient selects a pharmacy
-- 3. Adds RLS policy so patient can update pharmacy_organization_id
--
-- TO UNDO EVERYTHING:
--   DROP TRIGGER IF EXISTS trg_create_pharmacy_dispensing_tasks ON public.prescriptions;
--   DROP FUNCTION IF EXISTS public.fn_create_pharmacy_dispensing_tasks();
--   DROP POLICY IF EXISTS "patients_update_pharmacy_org" ON public.prescriptions;
--   ALTER TABLE public.prescriptions DROP COLUMN IF EXISTS pharmacy_organization_id;
-- ============================================================

-- ------------------------------------------------------------
-- STEP 1: Add pharmacy_organization_id to prescriptions table
-- ------------------------------------------------------------
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS pharmacy_organization_id uuid
    REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_org
  ON public.prescriptions(pharmacy_organization_id)
  WHERE pharmacy_organization_id IS NOT NULL;

-- ------------------------------------------------------------
-- STEP 2: Create the trigger function
-- This fires AFTER a patient sets pharmacy_organization_id
-- It creates one pharmacy_dispensing_tasks row per prescription item
-- SAFETY: Only fires on NEW assignments (old value was NULL)
-- SAFETY: Never touches existing dispensing tasks
-- SAFETY: Skips deleted prescriptions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_create_pharmacy_dispensing_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name  text;
  v_doctor_name   text;
  v_item          record;
  v_external_ref  text;
  v_insurance     text;
BEGIN
  -- Only fire when pharmacy_organization_id is being set for the first time
  -- (old value was NULL and new value is not NULL)
  IF OLD.pharmacy_organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.pharmacy_organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip deleted prescriptions
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  -- Get patient full name
  SELECT COALESCE(up.full_name, 'Unknown Patient')
    INTO v_patient_name
    FROM public.user_profiles up
   WHERE up.user_id = NEW.patient_id
   LIMIT 1;

  -- Get doctor full name
  SELECT COALESCE(up.full_name, 'Unknown Doctor')
    INTO v_doctor_name
    FROM public.user_profiles up
   WHERE up.user_id = NEW.doctor_id
   LIMIT 1;

  -- Get patient insurance provider (fallback to Cash)
  SELECT COALESCE(ic.provider_name, 'Cash')
    INTO v_insurance
    FROM public.insurance_coverages ic
   WHERE ic.patient_id = NEW.patient_id
     AND ic.status = 'active'
   ORDER BY ic.created_at DESC
   LIMIT 1;

  IF v_insurance IS NULL THEN
    v_insurance := 'Cash';
  END IF;

  -- Create one dispensing task per prescription item
  FOR v_item IN
    SELECT *
      FROM public.prescription_items
     WHERE prescription_id = NEW.id
  LOOP
    -- Build a unique external_ref using prescription id + item id
    v_external_ref := 'rx-' || NEW.id || '-item-' || v_item.id;

    -- Insert dispensing task (skip if already exists)
    INSERT INTO public.pharmacy_dispensing_tasks (
      organization_id,
      prescription_id,
      prescription_item_id,
      external_ref,
      patient_name,
      prescriber_name,
      medication_name,
      quantity,
      priority,
      workflow_status,
      received_at,
      insurance_provider,
      copay_aed,
      allergy_flag
    )
    VALUES (
      NEW.pharmacy_organization_id,
      NEW.id,
      v_item.id,
      v_external_ref,
      v_patient_name,
      v_doctor_name,
      v_item.medication_name,
      v_item.quantity,
      'routine',
      'new',
      now(),
      v_insurance,
      0,
      false
    )
    ON CONFLICT (organization_id, external_ref) DO NOTHING;

  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_pharmacy_dispensing_tasks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_pharmacy_dispensing_tasks() TO authenticated;

-- ------------------------------------------------------------
-- STEP 3: Create the trigger on prescriptions table
-- Fires AFTER UPDATE when pharmacy_organization_id changes
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_create_pharmacy_dispensing_tasks ON public.prescriptions;

CREATE TRIGGER trg_create_pharmacy_dispensing_tasks
  AFTER UPDATE OF pharmacy_organization_id
  ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_pharmacy_dispensing_tasks();

-- ------------------------------------------------------------
-- STEP 4: RLS policy — allow patient to update pharmacy_organization_id
-- on their own prescriptions
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "patients_update_pharmacy_org" ON public.prescriptions;

CREATE POLICY "patients_update_pharmacy_org"
  ON public.prescriptions
  FOR UPDATE
  TO authenticated
  USING (
    patient_id = auth.uid()
    AND NOT is_deleted
  )
  WITH CHECK (
    patient_id = auth.uid()
    AND NOT is_deleted
  );

-- ------------------------------------------------------------
-- STEP 5: Allow pharmacy to read the new column
-- (extends existing pharmacy_read_prescriptions_queue policy)
-- No change needed — existing SELECT policy already covers this
-- ------------------------------------------------------------

-- ============================================================
-- MIGRATION COMPLETE
-- Run this on Supabase SQL editor
-- Verify by checking: SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'prescriptions' AND column_name = 'pharmacy_organization_id';
-- ============================================================