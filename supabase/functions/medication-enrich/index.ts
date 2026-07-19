import { createClient } from 'npm:@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  catalogId?: string;
  force?: boolean;
}

interface RxNormPropertiesResponse {
  properties?: {
    name?: string;
    tty?: string;
  };
}

interface RxNormAllPropertiesResponse {
  propConceptGroup?:
    | {
        propConcept?: Array<{
          propName?: string;
          propValue?: string;
        }>;
      }
    | Array<{
        propConcept?: Array<{
          propName?: string;
          propValue?: string;
        }>;
      }>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const stripBrandSuffix = (value: string) => value.replace(/\s*\[[^\]]+\]\s*$/u, '').replace(/\s+/gu, ' ').trim();

const extractStrengthFromText = (value: string) => {
  const match = value.match(
    /(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?(?:\s*(?:MG|MCG|G|GM|GRAM|ML|L|UNT|UNITS?|MEQ|MMOL|IU|%))(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(?:MG|MCG|G|GM|GRAM|ML|L|UNT|UNITS?|MEQ|MMOL|IU))?)/iu
  );

  return normalizeText(match?.[1]);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractDosageFormFromText = (value: string, knownStrength?: string | null) => {
  const normalized = stripBrandSuffix(value);
  const strength = knownStrength ?? extractStrengthFromText(normalized);

  if (!strength) {
    return null;
  }

  const match = normalized.match(new RegExp(`${escapeRegex(strength)}\\s+(.+)$`, 'iu'));
  return normalizeText(match?.[1]);
};

const extractIngredientNameFromText = (value: string, knownStrength?: string | null) => {
  const normalized = stripBrandSuffix(value);
  const strength = knownStrength ?? extractStrengthFromText(normalized);

  if (!strength) {
    return null;
  }

  const index = normalized.toLowerCase().indexOf(strength.toLowerCase());
  if (index <= 0) {
    return null;
  }

  return normalizeText(normalized.slice(0, index));
};

const getPropertyValue = (payload: RxNormAllPropertiesResponse, names: string[]) => {
  const normalizedNames = new Set(names.map((name) => name.toUpperCase()));
  const groups = Array.isArray(payload.propConceptGroup)
    ? payload.propConceptGroup
    : payload.propConceptGroup
      ? [payload.propConceptGroup]
      : [];

  for (const group of groups) {
    for (const concept of group.propConcept ?? []) {
      const propertyName = concept.propName?.trim().toUpperCase();
      if (propertyName && normalizedNames.has(propertyName)) {
        const propertyValue = normalizeText(concept.propValue);
        if (propertyValue) {
          return propertyValue;
        }
      }
    }
  }

  return null;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`RxNorm request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ error: 'Supabase Edge Function environment is not configured correctly.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let catalogId: string | null = null;

  try {
    const body = (await request.json()) as RequestBody;
    catalogId = normalizeText(body.catalogId);

    if (!catalogId) {
      return json({ error: 'A medication catalog entry is required.' }, 400);
    }

    const authResult = await userClient.auth.getUser();
    const user = authResult.data.user;

    if (authResult.error || !user) {
      return json({ error: authResult.error?.message ?? 'Authentication is required.' }, 401);
    }

    const { data: userProfile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!userProfile || (userProfile.role !== 'doctor' && userProfile.role !== 'super_admin')) {
      return json({ error: 'Only doctors can enrich medication catalog entries.' }, 403);
    }

    const { data: medication, error: medicationError } = await adminClient
      .from('medication_catalog')
      .select('*')
      .eq('id', catalogId)
      .maybeSingle();

    if (medicationError) {
      throw medicationError;
    }

    if (!medication) {
      return json({ error: 'Medication catalog entry not found.' }, 404);
    }

    if (medication.source !== 'rxnorm' || !normalizeText(medication.source_code)) {
      return json({ medication, wasEnriched: false });
    }

    if (!body.force && medication.enrichment_status === 'enriched' && normalizeText(medication.strength)) {
      return json({ medication, wasEnriched: false });
    }

    try {
      const rxcui = medication.source_code.trim();
      const [propertiesPayload, allPropertiesPayload] = await Promise.all([
        fetchJson<RxNormPropertiesResponse>(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/properties.json`
        ),
        fetchJson<RxNormAllPropertiesResponse>(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/allProperties.json?prop=attributes+names`
        ),
      ]);

      const rxnormName = normalizeText(propertiesPayload.properties?.name) ?? medication.generic_name_en;
      const strength =
        getPropertyValue(allPropertiesPayload, ['STRENGTH', 'AVAILABLE_STRENGTH', 'PRESCRIBABLE_STRENGTH']) ??
        extractStrengthFromText(rxnormName) ??
        medication.strength;
      const dosageForm =
        getPropertyValue(allPropertiesPayload, ['DOSAGE_FORM', 'FORM', 'DOSE_FORM']) ??
        extractDosageFormFromText(rxnormName, strength) ??
        medication.dosage_form;
      const ingredientName =
        getPropertyValue(allPropertiesPayload, ['ACTIVE_INGREDIENT', 'INGREDIENT']) ??
        extractIngredientNameFromText(rxnormName, strength) ??
        medication.ingredient_name_en;
      const nowIso = new Date().toISOString();

      const { data: updatedMedication, error: updateError } = await adminClient
        .from('medication_catalog')
        .update({
          strength,
          dosage_form: dosageForm,
          ingredient_name_en: ingredientName,
          rxnorm_tty: normalizeText(propertiesPayload.properties?.tty) ?? medication.rxnorm_tty,
          enrichment_status: 'enriched',
          enrichment_error: null,
          last_enriched_at: nowIso,
          source_updated_at: nowIso,
          last_synced_at: nowIso,
        })
        .eq('id', catalogId)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      return json({ medication: updatedMedication, wasEnriched: true });
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : 'Unknown enrichment error.';

      await adminClient
        .from('medication_catalog')
        .update({
          enrichment_status: 'failed',
          enrichment_error: failureMessage,
          last_enriched_at: new Date().toISOString(),
        })
        .eq('id', catalogId);

      return json(
        {
          error: 'RxNorm enrichment failed for this medication. You can still enter the dosage manually.',
        },
        502
      );
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected medication enrichment error.' }, 500);
  }
});
