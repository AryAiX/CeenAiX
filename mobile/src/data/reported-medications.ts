import { useQuery } from '@/hooks/use-query';
import { supabase } from '@/lib/supabase';

// Mirrors the inline `patient_reported_medications` reads/writes in web
// `src/pages/patient/Prescriptions.tsx`.

export interface ReportedMedication {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  is_current: boolean;
  review_status: string;
}

export interface ReportedMedicationInput {
  medicationName: string;
  dosage: string;
  frequency: string;
  isCurrent: boolean;
}

export function useReportedMedications(patientId: string | null | undefined) {
  return useQuery<ReportedMedication[]>(async () => {
    if (!patientId) return [];
    const { data, error } = await supabase
      .from('patient_reported_medications')
      .select('id, medication_name, dosage, frequency, duration, instructions, is_current, review_status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ReportedMedication[];
  }, [patientId ?? '']);
}

export async function addReportedMedication(patientId: string, input: ReportedMedicationInput): Promise<void> {
  const { error } = await supabase.from('patient_reported_medications').insert({
    patient_id: patientId,
    medication_name: input.medicationName.trim(),
    dosage: input.dosage.trim() || null,
    frequency: input.frequency.trim() || null,
    duration: null,
    instructions: null,
    is_current: input.isCurrent,
    review_status: 'pending_review',
  });
  if (error) throw error;
}

export async function removeReportedMedication(patientId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('patient_reported_medications')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('patient_id', patientId);
  if (error) throw error;
}
