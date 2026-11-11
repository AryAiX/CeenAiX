import { supabase } from './supabase';

/** 1 = helpful, -1 = not helpful. */
export type AiChatFeedbackRating = 1 | -1;

/** Loads the signed-in patient's own ratings for the given replies (the table only returns their own rows). */
export async function fetchAiChatMessageFeedback(
  messageIds: string[]
): Promise<Record<string, AiChatFeedbackRating>> {
  if (messageIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('ai_chat_message_feedback')
    .select('message_id, rating')
    .in('message_id', messageIds);

  if (error) {
    throw error;
  }

  const ratings: Record<string, AiChatFeedbackRating> = {};
  for (const row of (data ?? []) as Array<{ message_id: string; rating: number }>) {
    if (row.rating === 1 || row.rating === -1) {
      ratings[row.message_id] = row.rating;
    }
  }
  return ratings;
}

/** Saves a rating on one reply, or removes it when rating is null. */
export async function setAiChatMessageFeedback(
  messageId: string,
  rating: AiChatFeedbackRating | null
): Promise<void> {
  const { error } = await supabase.rpc('set_ai_chat_message_feedback', {
    p_message_id: messageId,
    p_rating: rating,
  });

  if (error) {
    throw error;
  }
}

/** Copies text, with a fallback for app web views where navigator.clipboard is missing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the older copy method below
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export type ShareTextResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Opens the phone's share sheet with the text. Where sharing is not available
 * (for example some Android app web views), the text is copied instead.
 */
export async function shareOrCopyText(text: string, title?: string): Promise<ShareTextResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(title ? { title, text } : { text });
      return 'shared';
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') {
        return 'cancelled';
      }
      // sharing failed for another reason, so copy instead
    }
  }

  return (await copyText(text)) ? 'copied' : 'failed';
}

export interface AiChatTranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface AiChatTranscriptLabels {
  title: string;
  exportedOn: string;
  you: string;
  assistant: string;
  disclaimer: string;
  formatTime: (iso: string) => string;
}

/** Builds a plain-text copy of the conversation for the patient to keep or send. */
export function buildAiChatTranscript(
  messages: AiChatTranscriptMessage[],
  labels: AiChatTranscriptLabels
): string {
  const lines: string[] = [labels.title, labels.exportedOn, ''];

  for (const message of messages) {
    if (message.role === 'system') {
      continue;
    }
    const speaker = message.role === 'user' ? labels.you : labels.assistant;
    lines.push(`${speaker} (${labels.formatTime(message.createdAt)}):`);
    lines.push(message.content.trim());
    lines.push('');
  }

  lines.push(labels.disclaimer);
  return lines.join('\n');
}
