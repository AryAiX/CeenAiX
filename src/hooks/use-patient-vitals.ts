import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const BP_LIMITS = {
  systolicMin: 70,
  systolicMax: 250,
  diastolicMin: 40,
  diastolicMax: 150,
} as const;

export type BloodPressureValidationError = 'systolicRange' | 'diastolicRange' | 'diastolicNotBelowSystolic';

export interface UsePatientVitalsResult {
  saving: boolean;
  error: string | null;
  clearError: () => void;
  recordBloodPressure: (systolic: number, diastolic: number) => Promise<boolean>;
}

const isWholeNumber = (value: number) => Number.isInteger(value);

// The RLS policy enforces the same limits, but failing there gives an opaque
// database error, so the same rules run here where a clear message can be shown.
export function validateBloodPressure(systolic: number, diastolic: number): BloodPressureValidationError | null {
  if (!isWholeNumber(systolic) || systolic < BP_LIMITS.systolicMin || systolic > BP_LIMITS.systolicMax) {
    return 'systolicRange';
  }

  if (!isWholeNumber(diastolic) || diastolic < BP_LIMITS.diastolicMin || diastolic > BP_LIMITS.diastolicMax) {
    return 'diastolicRange';
  }

  if (diastolic >= systolic) {
    return 'diastolicNotBelowSystolic';
  }

  return null;
}

export function usePatientVitals(userId: string | null | undefined): UsePatientVitalsResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordBloodPressure = async (systolic: number, diastolic: number) => {
    if (!userId) {
      setError('Not signed in.');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      // recorded_by is the patient so a clinician can tell a home reading from one
      // measured in clinic, and the policy requires both.
      const { error: insertError } = await supabase.from('patient_vitals').insert({
        patient_id: userId,
        recorded_by: userId,
        systolic_bp: systolic,
        diastolic_bp: diastolic,
        source: 'manual',
      });

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save the reading.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    error,
    clearError: () => setError(null),
    recordBloodPressure,
  };
}
