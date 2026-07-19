import { createClient } from 'npm:@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TaskType = 'extract_previsit_questionnaire' | 'generate_previsit_summary';

interface ExtractQuestionnaireRequest {
  task: 'extract_previsit_questionnaire';
  bucket?: string;
  path?: string;
  fileName?: string;
}

interface GenerateSummaryRequest {
  task: 'generate_previsit_summary';
  appointmentLabel?: string;
  templateTitle?: string;
  patientId?: string;
  answers?: Array<{
    questionKey?: string;
    questionLabel?: string;
    questionType?: string;
    answerText?: string | null;
    answerJson?: unknown;
  }>;
}

type RequestBody = ExtractQuestionnaireRequest | GenerateSummaryRequest;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const QUESTION_TYPES = new Set([
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'boolean',
  'number',
  'date',
]);

const ALLOWED_AUTOFILL_SOURCES = new Set([
  'profile.full_name',
  'profile.date_of_birth',
  'profile.gender',
  'profile.address',
  'patient.blood_type',
  'patient.emergency_contact',
  'medical_conditions.active',
  'allergies.active',
  'prescriptions.active',
]);

const extractFirstJsonObject = (value: string) => {
  const match = value.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error('AI response did not include valid JSON.');
  }

  return JSON.parse(match[0]);
};

const normalizeQuestionKey = (value: string, index: number) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || `question_${index + 1}`;
};

const normalizeExtractedQuestionnaire = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    throw new Error('AI questionnaire extraction returned an invalid payload.');
  }

  const candidate = value as {
    title?: unknown;
    description?: unknown;
    extractionNotes?: unknown;
    questions?: unknown;
  };

  const rawQuestions = Array.isArray(candidate.questions) ? candidate.questions : [];
  const questions = rawQuestions
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        return null;
      }

      const currentQuestion = question as {
        key?: unknown;
        label?: unknown;
        helpText?: unknown;
        type?: unknown;
        required?: unknown;
        options?: unknown;
        displayOrder?: unknown;
        autofillSource?: unknown;
        memoryKey?: unknown;
        aiInstructions?: unknown;
      };
      const label =
        typeof currentQuestion.label === 'string' && currentQuestion.label.trim()
          ? currentQuestion.label.trim()
          : `Question ${index + 1}`;
      const type =
        typeof currentQuestion.type === 'string' && QUESTION_TYPES.has(currentQuestion.type)
          ? currentQuestion.type
          : 'short_text';
      const options = Array.isArray(currentQuestion.options)
        ? currentQuestion.options
            .map((option) => {
              if (typeof option === 'string') {
                return { label: option.trim(), value: option.trim() };
              }

              if (option && typeof option === 'object') {
                const candidateOption = option as { label?: unknown; value?: unknown };
                const optionLabel =
                  typeof candidateOption.label === 'string' ? candidateOption.label.trim() : '';
                const optionValue =
                  typeof candidateOption.value === 'string' ? candidateOption.value.trim() : optionLabel;

                if (optionLabel) {
                  return { label: optionLabel, value: optionValue || optionLabel };
                }
              }

              return null;
            })
            .filter((option): option is { label: string; value: string } => Boolean(option && option.label))
        : [];
      const autofillSource =
        typeof currentQuestion.autofillSource === 'string' && ALLOWED_AUTOFILL_SOURCES.has(currentQuestion.autofillSource)
          ? currentQuestion.autofillSource
          : null;

      return {
        key: normalizeQuestionKey(
          typeof currentQuestion.key === 'string' ? currentQuestion.key : label,
          index
        ),
        label,
        helpText:
          typeof currentQuestion.helpText === 'string' && currentQuestion.helpText.trim()
            ? currentQuestion.helpText.trim()
            : null,
        type,
        required: Boolean(currentQuestion.required),
        options,
        displayOrder:
          typeof currentQuestion.displayOrder === 'number' ? currentQuestion.displayOrder : index,
        autofillSource,
        memoryKey:
          typeof currentQuestion.memoryKey === 'string' && currentQuestion.memoryKey.trim()
            ? normalizeQuestionKey(currentQuestion.memoryKey, index)
            : null,
        aiInstructions:
          typeof currentQuestion.aiInstructions === 'string' && currentQuestion.aiInstructions.trim()
            ? currentQuestion.aiInstructions.trim()
            : null,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.displayOrder - right.displayOrder);

  return {
    title:
      typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : 'Pre-visit assessment',
    description:
      typeof candidate.description === 'string' && candidate.description.trim()
        ? candidate.description.trim()
        : null,
    extractionNotes: Array.isArray(candidate.extractionNotes)
      ? candidate.extractionNotes.filter((note): note is string => typeof note === 'string')
      : [],
    questions,
  };
};

async function uploadOpenAiFile(openAiApiKey: string, bytes: ArrayBuffer, fileName: string, mimeType: string) {
  const formData = new FormData();
  formData.append('purpose', 'user_data');
  formData.append('file', new Blob([bytes], { type: mimeType }), fileName);

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI file upload failed: ${errorText}`);
  }

  return await response.json();
}

async function deleteOpenAiFile(openAiApiKey: string, fileId: string) {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
  });
}

async function extractQuestionnaireFromPdf(args: {
  openAiApiKey: string;
  adminClient: ReturnType<typeof createClient>;
  bucket: string;
  path: string;
  fileName: string;
}) {
  const { data, error } = await args.adminClient.storage.from(args.bucket).download(args.path);

  if (error) {
    throw error;
  }

  const fileBytes = await data.arrayBuffer();
  const uploadedFile = await uploadOpenAiFile(args.openAiApiKey, fileBytes, args.fileName, data.type || 'application/pdf');

  try {
    const prompt = [
      'Convert this doctor-provided pre-visit questionnaire into structured JSON for CeenAiX.',
      'Return only JSON with this shape:',
      '{"title":"string","description":"string|null","extractionNotes":["string"],"questions":[{"key":"string","label":"string","helpText":"string|null","type":"short_text|long_text|single_select|multi_select|boolean|number|date","required":true,"options":[{"label":"string","value":"string"}],"displayOrder":0,"autofillSource":"profile.full_name|profile.date_of_birth|profile.gender|profile.address|patient.blood_type|patient.emergency_contact|medical_conditions.active|allergies.active|prescriptions.active|null","memoryKey":"string|null","aiInstructions":"string|null"}]}',
      'Use concise, patient-friendly labels.',
      'If the source material is long, keep the questionnaire focused to the most clinically useful questions for a pre-visit intake.',
      'If the PDF includes checkboxes or options, convert them into structured options.',
      'For non-canonical repeated questions, infer a stable snake_case memoryKey so semantically similar questions can reuse prior patient answers.',
      'Examples: "How long have you had this pain?" and "Duration of symptoms" should both map to "symptom_duration".',
      'Keep clinically different concepts separate, such as current pain severity vs worst pain severity, or family history vs personal history.',
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file_id: uploadedFile.id,
              },
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI questionnaire extraction failed: ${errorText}`);
    }

    const responseJson = await response.json();
    const outputText =
      typeof responseJson.output_text === 'string'
        ? responseJson.output_text
        : Array.isArray(responseJson.output)
          ? responseJson.output
              .flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
              .map((item: { text?: string }) => item.text ?? '')
              .join('\n')
          : '';

    return normalizeExtractedQuestionnaire(extractFirstJsonObject(outputText));
  } finally {
    if (uploadedFile?.id) {
      await deleteOpenAiFile(args.openAiApiKey, uploadedFile.id);
    }
  }
}

async function loadPatientHistoryContext(
  adminClient: ReturnType<typeof createClient>,
  patientId: string
) {
  const [
    { data: conditions, error: conditionsError },
    { data: allergies, error: allergiesError },
    { data: prescriptions, error: prescriptionsError },
  ] = await Promise.all([
    adminClient
      .from('medical_conditions')
      .select('condition_name, status, notes')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('allergies')
      .select('allergen, severity, reaction')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('prescriptions')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
  ]);

  if (conditionsError) {
    throw conditionsError;
  }

  if (allergiesError) {
    throw allergiesError;
  }

  if (prescriptionsError) {
    throw prescriptionsError;
  }

  const activePrescriptionIds = (prescriptions ?? [])
    .filter((prescription) => prescription.status === 'active')
    .map((prescription) => prescription.id);
  const { data: prescriptionItems, error: prescriptionItemsError } = activePrescriptionIds.length
    ? await adminClient
        .from('prescription_items')
        .select('medication_name, dosage, frequency, prescription_id')
        .in('prescription_id', activePrescriptionIds)
    : { data: [], error: null };

  if (prescriptionItemsError) {
    throw prescriptionItemsError;
  }

  const conditionLines =
    (conditions ?? [])
      .map((condition) =>
        [condition.condition_name, condition.status, condition.notes].filter(Boolean).join(' | ')
      )
      .filter(Boolean) ?? [];
  const allergyLines =
    (allergies ?? [])
      .map((allergy) => [allergy.allergen, allergy.severity, allergy.reaction].filter(Boolean).join(' | '))
      .filter(Boolean) ?? [];
  const medicationLines =
    (prescriptionItems ?? [])
      .map((item) => [item.medication_name, item.dosage, item.frequency].filter(Boolean).join(' | '))
      .filter(Boolean) ?? [];

  return [
    conditionLines.length > 0 ? `Active conditions:\n- ${conditionLines.join('\n- ')}` : 'Active conditions: none recorded',
    allergyLines.length > 0 ? `Allergies:\n- ${allergyLines.join('\n- ')}` : 'Allergies: none recorded',
    medicationLines.length > 0 ? `Active medications:\n- ${medicationLines.join('\n- ')}` : 'Active medications: none recorded',
  ].join('\n\n');
}

async function generatePreVisitSummary(args: {
  openAiApiKey: string;
  adminClient: ReturnType<typeof createClient>;
  appointmentLabel: string;
  templateTitle: string;
  patientId: string;
  answers: GenerateSummaryRequest['answers'];
}) {
  const patientHistoryContext = await loadPatientHistoryContext(args.adminClient, args.patientId);
  const answerLines =
    args.answers?.map((answer) => {
      const answerValue =
        answer.answerText?.trim() ||
        (Array.isArray(answer.answerJson) ? answer.answerJson.join(', ') : '') ||
        'Not answered';

      return `- ${answer.questionLabel ?? answer.questionKey ?? 'Question'}: ${answerValue}`;
    }) ?? [];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'You generate structured pre-visit summaries for doctors. Be concise, clinically useful, and avoid definitive diagnosis claims. Return JSON only.',
        },
        {
          role: 'user',
          content: [
            `Appointment: ${args.appointmentLabel}`,
            `Questionnaire title: ${args.templateTitle}`,
            'Return valid JSON with keys summaryText, keyPoints, riskFlags, pendingQuestions.',
            'Use pendingQuestions for missing or incomplete information the doctor may still want to clarify.',
            'Patient history context:',
            patientHistoryContext,
            'Assessment answers:',
            ...answerLines,
          ].join('\n\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI pre-visit summary generation failed: ${errorText}`);
  }

  const responseJson = await response.json();
  const content = responseJson?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty pre-visit summary.');
  }

  const parsed = JSON.parse(content) as {
    summaryText?: unknown;
    keyPoints?: unknown;
    riskFlags?: unknown;
    pendingQuestions?: unknown;
  };

  return {
    summaryText:
      typeof parsed.summaryText === 'string' && parsed.summaryText.trim()
        ? parsed.summaryText.trim()
        : 'Pre-visit intake completed.',
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((item): item is string => typeof item === 'string')
      : [],
    riskFlags: Array.isArray(parsed.riskFlags)
      ? parsed.riskFlags.filter((item): item is string => typeof item === 'string')
      : [],
    pendingQuestions: Array.isArray(parsed.pendingQuestions)
      ? parsed.pendingQuestions.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase Edge Function environment is not configured correctly.' }, 500);
    }

    if (!openAiApiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured for ai-document-analyze.' }, 500);
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

    const { data: authData, error: authError } = await userClient.auth.getUser();

    if (authError || !authData.user) {
      return json({ error: authError?.message ?? 'Authentication required.' }, 401);
    }

    const body = (await request.json()) as RequestBody;
    const task = body.task as TaskType | undefined;

    if (task === 'extract_previsit_questionnaire') {
      if (!body.bucket || !body.path || !body.fileName) {
        return json({ error: 'bucket, path, and fileName are required for questionnaire extraction.' }, 400);
      }

      const extraction = await extractQuestionnaireFromPdf({
        openAiApiKey,
        adminClient,
        bucket: body.bucket,
        path: body.path,
        fileName: body.fileName,
      });

      return json(extraction);
    }

    if (task === 'generate_previsit_summary') {
      if (!body.appointmentLabel || !body.templateTitle || !body.patientId || !Array.isArray(body.answers)) {
        return json({ error: 'appointmentLabel, templateTitle, patientId, and answers are required.' }, 400);
      }

      if (authData.user.id !== body.patientId) {
        return json({ error: 'Patients may only generate summaries for their own intake.' }, 403);
      }

      const summary = await generatePreVisitSummary({
        openAiApiKey,
        adminClient,
        appointmentLabel: body.appointmentLabel,
        templateTitle: body.templateTitle,
        patientId: body.patientId,
        answers: body.answers,
      });

      return json(summary);
    }

    return json({ error: 'Unsupported ai-document-analyze task.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ai-document-analyze failure.';
    return json({ error: message }, 500);
  }
});
