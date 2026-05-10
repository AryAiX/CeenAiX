import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import i18n from 'i18next';
import type { MedicationCatalog } from '../types';
import { supabase } from './supabase';

interface MedicationEnrichmentResponse {
  medication: MedicationCatalog;
  wasEnriched: boolean;
}

const getFriendlyMedicationEnrichmentErrorMessage = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (body && typeof body.error === 'string' && body.error.trim()) {
        return body.error.trim();
      }
    } catch {
      // Fall through to the generic status-based messages below.
    }

    if (error.context.status === 401 || error.context.status === 403) {
      return 'Your session is not allowed to enrich medication details right now.';
    }

    if (error.context.status >= 500) {
      return 'RxNorm enrichment is temporarily unavailable. You can still fill the dosage manually.';
    }
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return 'We could not reach the medication enrichment service. You can still fill the dosage manually.';
  }

  return 'We could not load medication details from RxNorm right now. You can still fill the dosage manually.';
};

export async function enrichMedicationCatalogEntry(catalogId: string): Promise<MedicationCatalog> {
  const { data, error } = await supabase.functions.invoke('medication-enrich', {
    body: {
      catalogId,
    },
  });

  if (error) {
    throw new Error(await getFriendlyMedicationEnrichmentErrorMessage(error));
  }

  if (!data || typeof data !== 'object' || !('medication' in data) || !data.medication) {
    throw new Error(
      i18n.t('ai.errors.invalidMedEnrichment', {
        defaultValue: 'Medication enrichment returned an invalid response.',
      })
    );
  }

  return (data as MedicationEnrichmentResponse).medication;
}
