import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import type { AiChatAssistantMetadata, AiChatFileAttachment, AiChatStoredAttachment } from '@/data/web/lib/ai';
import { randomId, uploadToBucket, type LocalAsset } from './uploads';

// Edge Function clients (`ai-chat`, `ai-document-analyze`) come verbatim from
// the web `src/lib/ai.ts` via the generated data layer. This module only adds
// the native pieces: uploading picked files and the patient-context consent.
export {
  generatePreVisitSummary,
  invokeAiChat,
  removeAiChatAttachments,
  type AiChatAction,
  type AiChatAssistantMetadata,
  type AiChatEvidence,
  type AiChatFileAttachment,
  type AiChatResponsePayload,
  type AiChatStoredAttachment,
} from '@/data/web/lib/ai';

export const AI_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Native counterpart of the web `uploadAiChatAttachment(userId, File)`: same bucket, path and payload. */
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
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size,
  };
}

// Patient-context consent for the assistant. The web portal sends context on
// every message; on mobile the patient makes an explicit, revocable choice
// before any record data is attached to an AI request (`usePatientContext`).
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
