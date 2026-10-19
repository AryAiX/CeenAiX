import type { AllergySeverity, ConditionStatus } from '@ceenaix/types';
import { supabase } from '@/lib/supabase';

// Mirrors the inline insert/update/soft-delete calls in web
// `src/pages/patient/Records.tsx` (same tables, columns and patient scoping).

export type RecordCategory = 'condition' | 'allergy' | 'vaccination';

export interface ConditionInput {
  conditionName: string;
  icdCode: string;
  diagnosedDate: string;
  status: ConditionStatus;
  notes: string;
}

export interface AllergyInput {
  allergen: string;
  severity: AllergySeverity;
  reaction: string;
  confirmedByDoctor: boolean;
}

export interface VaccinationInput {
  vaccineName: string;
  doseNumber: number | null;
  administeredDate: string;
  administeredBy: string;
  nextDoseDue: string;
}

export type RecordInput =
  { category: 'condition'; values: ConditionInput } | { category: 'allergy'; values: AllergyInput } | { category: 'vaccination'; values: VaccinationInput };

const TABLE: Record<RecordCategory, 'medical_conditions' | 'allergies' | 'vaccinations'> = {
  condition: 'medical_conditions',
  allergy: 'allergies',
  vaccination: 'vaccinations',
};

function toRow(input: RecordInput): Record<string, string | number | boolean | null> {
  switch (input.category) {
    case 'condition':
      return {
        condition_name: input.values.conditionName.trim(),
        icd_code: input.values.icdCode.trim() || null,
        diagnosed_date: input.values.diagnosedDate || null,
        status: input.values.status,
        notes: input.values.notes.trim() || null,
      };
    case 'allergy':
      return {
        allergen: input.values.allergen.trim(),
        severity: input.values.severity,
        reaction: input.values.reaction.trim() || null,
        confirmed_by_doctor: input.values.confirmedByDoctor,
      };
    case 'vaccination':
      return {
        vaccine_name: input.values.vaccineName.trim(),
        dose_number: input.values.doseNumber,
        administered_date: input.values.administeredDate || null,
        administered_by: input.values.administeredBy.trim() || null,
        next_dose_due: input.values.nextDoseDue || null,
      };
  }
}

export async function saveRecord(patientId: string, input: RecordInput, recordId?: string): Promise<void> {
  const table = TABLE[input.category];
  const row = toRow(input);
  const { error } = recordId
    ? await supabase.from(table).update(row).eq('id', recordId).eq('patient_id', patientId)
    : await supabase.from(table).insert({ ...row, patient_id: patientId });
  if (error) throw error;
}

export async function softDeleteRecord(patientId: string, category: RecordCategory, recordId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE[category])
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('patient_id', patientId);
  if (error) throw error;
}
