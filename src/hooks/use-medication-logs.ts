import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UseMedicationLogsResult {
  takenItemIds: Set<string>;
  loading: boolean;
  error: string | null;
  markTaken: (prescriptionItemId: string) => Promise<void>;
  clearError: () => void;
}

const todayIsoDate = () => new Date().toISOString().split('T')[0];

export function useMedicationLogs(userId: string | null | undefined): UseMedicationLogsResult {
  const [takenItemIds, setTakenItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTakenItemIds(new Set());
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const loadLogs = async () => {
      const { data, error: fetchError } = await supabase
        .from('medication_logs')
        .select('prescription_item_id')
        .eq('patient_id', userId)
        .eq('taken_date', todayIsoDate());

      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }
      setTakenItemIds(new Set((data ?? []).map((row) => row.prescription_item_id)));
      setLoading(false);
    };

    void loadLogs().catch((err: unknown) => {
      if (mounted) {
        setError(err instanceof Error ? err.message : 'Could not load medication logs.');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const markTaken = async (prescriptionItemId: string) => {
    if (!userId) return;
    setError(null);

    const { error: upsertError } = await supabase.from('medication_logs').upsert(
      {
        patient_id: userId,
        prescription_item_id: prescriptionItemId,
        taken_date: todayIsoDate(),
        taken_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,prescription_item_id,taken_date' }
    );

    if (upsertError) {
      setError(upsertError.message);
      throw upsertError;
    }

    setTakenItemIds((prev) => new Set([...prev, prescriptionItemId]));
  };

  return {
    takenItemIds,
    loading,
    error,
    markTaken,
    clearError: () => setError(null),
  };
}
