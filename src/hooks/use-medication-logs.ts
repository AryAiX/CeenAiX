import { useEffect, useState } from 'react';
import i18n from 'i18next';
import { supabase } from '../lib/supabase';

export interface UseMedicationLogsResult {
  takenItemIds: Set<string>;
  loading: boolean;
  error: string | null;
  errorKind?: 'load' | 'save' | null;
  markTaken: (prescriptionItemId: string) => Promise<void>;
  clearError: () => void;
}

const isNetworkError = (err: unknown): boolean => {
  const message =
    err instanceof Error
      ? err.message
      : err !== null &&
          typeof err === 'object' &&
          'message' in err &&
          typeof err.message === 'string'
        ? err.message
        : '';
  const normalized = message.toLowerCase();

  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  );
};

const todayIsoDate = () => new Date().toISOString().split('T')[0];

export function useMedicationLogs(userId: string | null | undefined): UseMedicationLogsResult {
  const [takenItemIds, setTakenItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'load' | 'save' | null>(null);

  useEffect(() => {
    if (!userId) {
      setTakenItemIds(new Set());
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    setErrorKind(null);

    const loadLogs = async () => {
      const { data, error: fetchError } = await supabase
        .from('medication_logs')
        .select('prescription_item_id')
        .eq('patient_id', userId)
        .eq('taken_date', todayIsoDate());

      if (!mounted) return;
      if (fetchError) {
        setError(
          isNetworkError(fetchError)
            ? i18n.t('shared.errors.network')
            : i18n.t('patient.prescriptions.medicationLogLoadError')
        );
        setErrorKind('load');
        setLoading(false);
        return;
      }
      setTakenItemIds(new Set((data ?? []).map((row) => row.prescription_item_id)));
      setLoading(false);
    };

    void loadLogs().catch((err: unknown) => {
      if (mounted) {
        setError(
          isNetworkError(err)
            ? i18n.t('shared.errors.network')
            : i18n.t('patient.prescriptions.medicationLogLoadError')
        );
        setErrorKind('load');
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
    setErrorKind(null);

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
      setError(
        isNetworkError(upsertError)
          ? i18n.t('shared.errors.network')
          : i18n.t('patient.prescriptions.medicationLogSaveError')
      );
      setErrorKind('save');
      throw upsertError;
    }

    setTakenItemIds((prev) => new Set([...prev, prescriptionItemId]));
  };

  return {
    takenItemIds,
    loading,
    error,
    errorKind,
    markTaken,
    clearError: () => {
      setError(null);
      setErrorKind(null);
    },
  };
}
