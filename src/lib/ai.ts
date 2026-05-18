import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import i18n from 'i18next';
import { supabase } from './supabase';
import type { PreVisitAnswerDraft, PreVisitTemplateQuestionDraft } from './pre-visit';

export interface AiChatContextSummary {
  conditionsCount: number;
  allergiesCount: number;
  activeMedicationCount: number;
  recentAppointmentsCount: number;
  labResultCount: number;
}

export interface AiChatFileAttachment {
  type: 'uploaded_file';
  bucket: 'medical-files';
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface AiChatAction {
  type: 'navigate';
  label: string;
  href: string;
}

export interface AiChatEvidence {
  sourceType: 'condition' | 'allergy' | 'medication' | 'appointment' | 'consultation_note' | 'lab_result' | 'patient_memory';
  sourceId: string;
  title: string;
  excerpt: string;
  eventDate: string | null;
  tags: string[];
  score: number;
  whyRelevant: string;
}

export interface AiChatAssistantMetadata {
  type: 'response_metadata';
  intent: string;
  usedPatientContext: boolean;
  mode: 'chat' | 'previsit';
  recommendedSpecialty: string | null;
  evidence: AiChatEvidence[];
  suggestedActions: AiChatAction[];
  nextAppointmentId: string | null;
  nextAppointmentLabel: string | null;
}

export type AiChatStoredAttachment = AiChatFileAttachment | AiChatAssistantMetadata;

export interface AiChatResponsePayload {
  sessionId: string;
  assistantMessage: {
    id: string;
    content: string;
    createdAt: string;
    attachments: AiChatStoredAttachment[];
  };
  contextSummary: AiChatContextSummary | null;
}

export async function invokeAiChat(input: {
  message: string;
  sessionId?: string | null;
  attachments?: AiChatStoredAttachment[];
  usePatientContext?: boolean;
  mode?: 'chat' | 'previsit';
  appointmentId?: string | null;
}): Promise<AiChatResponsePayload> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: input.message,
      sessionId: input.sessionId ?? null,
      attachments: input.attachments ?? [],
      usePatientContext: input.usePatientContext ?? true,
      mode: input.mode ?? 'chat',
      appointmentId: input.appointmentId ?? null,
    },
  });

  if (error) {
    throw error;
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      i18n.t('ai.errors.invalidChatResponse', { defaultValue: 'AI chat returned an invalid response.' })
    );
  }

  const payload = data as Record<string, unknown>;
  const assistantMessage = payload.assistantMessage;
  if (
    typeof payload.sessionId !== 'string' ||
    !assistantMessage ||
    typeof assistantMessage !== 'object' ||
    typeof (assistantMessage as { content?: unknown }).content !== 'string'
  ) {
    throw new Error(
      i18n.t('ai.errors.invalidChatResponse', { defaultValue: 'AI chat returned an invalid response.' })
    );
  }

  return data as AiChatResponsePayload;
}

export interface UploadedStorageFile {
  bucket: 'documents' | 'medical-files';
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface PreVisitTemplateExtractionPayload {
  title: string;
  description: string | null;
  questions: PreVisitTemplateQuestionDraft[];
  extractionNotes: string[];
}

export interface PreVisitSummaryPayload {
  summaryText: string;
  keyPoints: string[];
  riskFlags: string[];
  pendingQuestions: string[];
}

const getFriendlyAiDocumentErrorMessage = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;

    try {
      const body = await error.context.clone().json();
      if (body && typeof body.error === 'string' && body.error.trim().length > 0) {
        return body.error.trim();
      }
    } catch {
      // Ignore parse failures and fall back to status-based messaging below.
    }

    if (status === 401 || status === 403) {
      return 'Your session expired while contacting the AI service. Refresh the page and try the upload again.';
    }

    if (status >= 500) {
      return 'The AI document service is temporarily unavailable. Please try the upload again in a moment.';
    }
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return 'We could not reach the AI document service. Please check your connection and try again.';
  }

  return 'We could not turn that PDF into a questionnaire right now. Please try again.';
};

async function invokeAiDocumentAnalyze<T>(input: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-document-analyze', {
    body: input,
  });

  if (error) {
    throw new Error(await getFriendlyAiDocumentErrorMessage(error));
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      i18n.t('ai.errors.invalidDocResponse', {
        defaultValue: 'AI document analysis returned an invalid response.',
      })
    );
  }

  return data as T;
}

const createAttachmentPath = (userId: string, fileName: string) => {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${userId}/ai-chat/${crypto.randomUUID()}-${sanitizedName}`;
};

export async function uploadAiChatAttachment(userId: string, file: File): Promise<AiChatFileAttachment> {
  const path = createAttachmentPath(userId, file.name);
  const { error } = await supabase.storage.from('medical-files').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }

  return {
    type: 'uploaded_file',
    bucket: 'medical-files',
    path,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  };
}

/**
 * Best-effort rollback for storage objects that were uploaded but whose
 * downstream invoke (or DB write) failed. Used to keep the medical-files
 * bucket from accumulating orphaned objects.
 */
export async function removeAiChatAttachments(
  attachments: ReadonlyArray<AiChatFileAttachment>
): Promise<void> {
  if (attachments.length === 0) return;
  const byBucket = new Map<string, string[]>();
  for (const attachment of attachments) {
    const paths = byBucket.get(attachment.bucket) ?? [];
    paths.push(attachment.path);
    byBucket.set(attachment.bucket, paths);
  }
  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        // Cleanup is best-effort; surface only as a console warning so a
        // failed rollback never masks the original invoke failure for the
        // caller.
        console.warn('[ai-chat] orphan attachment rollback failed', error);
      }
    })
  );
}

const createTemplateDocumentPath = (doctorUserId: string, fileName: string) => {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${doctorUserId}/pre-visit/${crypto.randomUUID()}-${sanitizedName}`;
};

export async function uploadPreVisitTemplateSource(
  doctorUserId: string,
  file: File
): Promise<UploadedStorageFile> {
  const path = createTemplateDocumentPath(doctorUserId, file.name);
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }

  return {
    bucket: 'documents',
    path,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    size: file.size,
  };
}

export async function extractPreVisitQuestionnaire(input: {
  bucket: 'documents';
  path: string;
  fileName: string;
}): Promise<PreVisitTemplateExtractionPayload> {
  return invokeAiDocumentAnalyze<PreVisitTemplateExtractionPayload>({
    task: 'extract_previsit_questionnaire',
    bucket: input.bucket,
    path: input.path,
    fileName: input.fileName,
  });
}

export async function generatePreVisitSummary(input: {
  appointmentLabel: string;
  templateTitle: string;
  patientId: string;
  answers: PreVisitAnswerDraft[];
}): Promise<PreVisitSummaryPayload> {
  return invokeAiDocumentAnalyze<PreVisitSummaryPayload>({
    task: 'generate_previsit_summary',
    appointmentLabel: input.appointmentLabel,
    templateTitle: input.templateTitle,
    patientId: input.patientId,
    answers: input.answers,
  });
}
