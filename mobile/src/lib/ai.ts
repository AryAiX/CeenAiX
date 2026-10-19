import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type { PreVisitAnswerDraft } from '@ceenaix/shared/pre-visit';
import i18n from 'i18next';
import { supabase } from './supabase';
import { randomId, uploadToBucket, type LocalAsset } from './uploads';

// Client for the `ai-chat` and `ai-document-analyze` Edge Functions. The app
// never talks to a model provider directly. Payload shapes match
// `src/lib/ai.ts` on the web.

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
  sourceType: string;
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
}

export const AI_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const friendlyFunctionError = async (error: unknown, fallback: string): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.clone().json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.trim()) {
        return body.error.trim();
      }
    } catch {
      // Non-JSON body; use status-based copy below.
    }
    const status = error.context.status;
    if (status === 401 || status === 403) {
      return i18n.t('ai.errors.sessionExpired', {
        defaultValue: 'Your session expired while contacting the AI service. Refresh and try again.',
      });
    }
    if (status >= 500) {
      return i18n.t('ai.errors.serviceUnavailable', {
        defaultValue: 'The AI chat service is temporarily unavailable. Please try again shortly.',
      });
    }
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return i18n.t('ai.errors.network', {
      defaultValue: 'We could not reach the AI chat service. Check your connection and try again.',
    });
  }
  return fallback;
};

export async function invokeAiChat(input: {
  message: string;
  sessionId: string | null;
  attachments: AiChatStoredAttachment[];
  usePatientContext: boolean;
}): Promise<AiChatResponsePayload> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: input.message,
      sessionId: input.sessionId,
      attachments: input.attachments,
      usePatientContext: input.usePatientContext,
      mode: 'chat',
      appointmentId: null,
    },
  });
  if (error) {
    throw new Error(
      await friendlyFunctionError(
        error,
        i18n.t('ai.errors.generic', { defaultValue: 'We could not complete the AI chat request. Please try again.' })
      )
    );
  }
  const payload = data as Partial<AiChatResponsePayload> | null;
  if (!payload || typeof payload.sessionId !== 'string' || typeof payload.assistantMessage?.content !== 'string') {
    throw new Error(i18n.t('ai.errors.invalidChatResponse', { defaultValue: 'AI chat returned an invalid response.' }));
  }
  return payload as AiChatResponsePayload;
}

export async function uploadAiChatAttachment(userId: string, asset: LocalAsset): Promise<AiChatFileAttachment> {
  if (asset.size > AI_ATTACHMENT_MAX_BYTES) {
    throw new Error(i18n.t('ai.errors.attachmentTooLarge', { defaultValue: 'Attachments must be 10 MB or smaller.' }));
  }
  const sanitized = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userId}/ai-chat/${randomId()}-${sanitized}`;
  await uploadToBucket('medical-files', path, asset);
  return {
    type: 'uploaded_file',
    bucket: 'medical-files',
    path,
    fileName: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
  };
}

export async function removeAiChatAttachments(attachments: AiChatFileAttachment[]): Promise<void> {
  if (attachments.length === 0) return;
  await supabase.storage.from('medical-files').remove(attachments.map((attachment) => attachment.path));
}

export interface PreVisitSummaryPayload {
  summaryText: string;
  keyPoints: string[];
  riskFlags: string[];
  pendingQuestions: string[];
}

export async function generatePreVisitSummary(input: {
  appointmentLabel: string;
  templateTitle: string;
  patientId: string;
  answers: PreVisitAnswerDraft[];
}): Promise<PreVisitSummaryPayload> {
  const { data, error } = await supabase.functions.invoke('ai-document-analyze', {
    body: { task: 'generate_previsit_summary', ...input },
  });
  if (error) {
    throw new Error(await friendlyFunctionError(error, 'We could not summarise your answers right now. Please try again.'));
  }
  const payload = data as Partial<PreVisitSummaryPayload> | null;
  if (!payload || typeof payload.summaryText !== 'string') {
    throw new Error('AI document analysis returned an invalid response.');
  }
  return {
    summaryText: payload.summaryText,
    keyPoints: payload.keyPoints ?? [],
    riskFlags: payload.riskFlags ?? [],
    pendingQuestions: payload.pendingQuestions ?? [],
  };
}

// Patient-context consent for the assistant. The web portal sends context on
// every message; on mobile the patient makes an explicit, revocable choice
// before any record data is attached to an AI request.
export type AiContextConsent = 'granted' | 'declined' | 'unset';

const consentKey = (userId: string) => `ceenaix.aiContextConsent.${userId}`;

export async function getAiContextConsent(userId: string): Promise<AiContextConsent> {
  const value = await AsyncStorage.getItem(consentKey(userId));
  return value === 'granted' || value === 'declined' ? value : 'unset';
}

export async function setAiContextConsent(userId: string, value: Exclude<AiContextConsent, 'unset'>): Promise<void> {
  await AsyncStorage.setItem(consentKey(userId), value);
}

export const getAssistantMetadata = (attachments: AiChatStoredAttachment[]): AiChatAssistantMetadata | null =>
  (attachments.find((attachment) => attachment.type === 'response_metadata') as AiChatAssistantMetadata | undefined) ??
  null;

export const getFileAttachments = (attachments: AiChatStoredAttachment[]): AiChatFileAttachment[] =>
  attachments.filter((attachment): attachment is AiChatFileAttachment => attachment.type === 'uploaded_file');
