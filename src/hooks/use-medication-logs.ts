import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UseMedicationLogsResult {
  takenItemIds: Set<string>;
  takenByDate: Record<string, Set<string>>;
  loading: boolean;
  error: string | null;
  markTaken: (prescriptionItemId: string) => Promise<void>;
  clearError: () => void;
}

const todayIsoDate = () => new Date().toISOString().split('T')[0];

/** Last 7 dates, oldest first and ending today, as YYYY-MM-DD in UTC. */
export function lastSevenIsoDates(): string[] {
  const dates: string[] = [];
  const todayUtc = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(todayUtc);
    day.setUTCDate(todayUtc.getUTCDate() - offset);
    dates.push(day.toISOString().split('T')[0]);
  }
  return dates;
}

export function useMedicationLogs(userId: string | null | undefined): UseMedicationLogsResult {
  const [takenItemIds, setTakenItemIds] = useState<Set<string>>(new Set());
  const [takenByDate, setTakenByDate] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTakenItemIds(new Set());
      setTakenByDate({});
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const loadLogs = async () => {
      const today = todayIsoDate();
      const { data, error: fetchError } = await supabase
        .from('medication_logs')
        .select('prescription_item_id, taken_date')
        .eq('patient_id', userId)
        .gte('taken_date', lastSevenIsoDates()[0]);

      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const byDate: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        const date = row.taken_date;
        const ids = byDate[date] ?? new Set<string>();
        ids.add(row.prescription_item_id);
        byDate[date] = ids;
      }
      setTakenByDate(byDate);
      setTakenItemIds(byDate[today] ?? new Set());
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

    const today = todayIsoDate();
    const { error: upsertError } = await supabase.from('medication_logs').upsert(
      {
        patient_id: userId,
        prescription_item_id: prescriptionItemId,
        taken_date: today,
        taken_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,prescription_item_id,taken_date' }
    );

    if (upsertError) {
      setError(upsertError.message);
      throw upsertError;
    }

    setTakenItemIds((prev) => new Set([...prev, prescriptionItemId]));
    setTakenByDate((prev) => {
      const nextForToday = new Set(prev[today] ?? []);
      nextForToday.add(prescriptionItemId);
      return { ...prev, [today]: nextForToday };
    });
  };

  return {
    takenItemIds,
    takenByDate,
    loading,
    error,
    markTaken,
    clearError: () => setError(null),
  };
}
