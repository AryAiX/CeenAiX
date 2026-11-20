import i18n from 'i18next';
import type { Conversation } from '../types';

export const MESSAGE_DRAFT_MAX_LENGTH = 2000;
export const DEFAULT_CARE_CONVERSATION_SUBJECT_KEY = 'messaging.defaultCareSubject';
export const DEFAULT_CARE_CONVERSATION_SUBJECT_FALLBACK = 'Care conversation';
export const DEFAULT_CARE_CONVERSATION_SUBJECT = DEFAULT_CARE_CONVERSATION_SUBJECT_FALLBACK;
export const getDefaultCareConversationSubject = () =>
  i18n.t(DEFAULT_CARE_CONVERSATION_SUBJECT_KEY, { defaultValue: DEFAULT_CARE_CONVERSATION_SUBJECT_FALLBACK });

const careActionFallbackLabel = () => i18n.t('messaging.actionCareDefault', { defaultValue: 'Care action' });
const MESSAGE_ACTION_PREFIX = '[[ceenaix-action:';
const MESSAGE_ACTION_SUFFIX = ']]';

export interface ConversationCounterparty {
  id: string;
  name: string;
  email: string | null;
}

export interface ConversationListItem {
  id: string;
  subject: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  counterpart: ConversationCounterparty;
}

export type MessageActionKind = 'booking_link' | 'appointments_link' | 'records_link';

export interface MessageActionPayload {
  kind: MessageActionKind;
  href: string;
}

export type MessageBodyPart =
  | { type: 'text'; value: string }
  | { type: 'action'; action: MessageActionPayload };

export const getConversationCounterpartyId = (
  conversation: Conversation,
  currentUserId: string
): string | null => conversation.participant_ids.find((participantId) => participantId !== currentUserId) ?? null;

export const trimMessageDraft = (value: string) => value.replace(/\r\n/g, '\n').trim();

const getMessageActionToken = (action: MessageActionPayload) =>
  `${MESSAGE_ACTION_PREFIX}${encodeURIComponent(JSON.stringify(action))}${MESSAGE_ACTION_SUFFIX}`;

/**
 * QA-152: the only page each message chip may open, as a path inside the app.
 *
 * Chips show a trusted label ("Book appointment", "View records") and any participant can write
 * the text behind one, so the link used to be anything: another website, a fake sign-in page or a
 * javascript: link. They also stored the sender's full web address, so a doctor working on a local
 * copy sent patients links to their own computer.
 */
const MESSAGE_ACTION_PATHS: Record<MessageActionKind, string> = {
  booking_link: '/patient/appointments/book',
  appointments_link: '/patient/appointments',
  records_link: '/patient/records',
};

/** Booking links may only keep these query parameters (which doctor, and where the link came from). */
const BOOKING_LINK_PARAMS = ['doctor', 'source'] as const;

/**
 * The in-app path a chip may open, or null when the link is not one of the allowed pages.
 * Old chips saved with a full address keep working: only their path is used, never their website.
 */
export const safeMessageActionPath = (kind: MessageActionKind, href: string): string | null => {
  const raw = href.trim();
  if (!raw) return null;

  let url: URL;
  try {
    if (raw.startsWith('/') && !raw.startsWith('//')) {
      url = new URL(raw, 'https://app.invalid');
    } else {
      url = new URL(raw);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    }
  } catch {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path !== MESSAGE_ACTION_PATHS[kind]) return null;
  if (kind !== 'booking_link') return path;

  const params = new URLSearchParams();
  for (const name of BOOKING_LINK_PARAMS) {
    const value = url.searchParams.get(name);
    if (value) params.set(name, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** Path for a chip the doctor adds now (no website address, so it works on every copy of the app). */
export const buildMessageActionPath = (kind: MessageActionKind, doctorId?: string): string =>
  kind === 'booking_link' && doctorId
    ? `${MESSAGE_ACTION_PATHS.booking_link}?doctor=${encodeURIComponent(doctorId)}&source=message`
    : MESSAGE_ACTION_PATHS[kind];

const parseMessageActionToken = (encodedValue: string): MessageActionPayload | null => {
  try {
    const parsed = JSON.parse(decodeURIComponent(encodedValue)) as Partial<MessageActionPayload>;
    if (
      typeof parsed.kind === 'string' &&
      typeof parsed.href === 'string' &&
      ['booking_link', 'appointments_link', 'records_link'].includes(parsed.kind)
    ) {
      const kind = parsed.kind as MessageActionKind;
      const href = safeMessageActionPath(kind, parsed.href);
      return href ? { kind, href } : null;
    }
  } catch {
    return null;
  }

  return null;
};

const normalizeMessageBodyParts = (parts: MessageBodyPart[]) => {
  const normalizedParts: MessageBodyPart[] = [];

  for (const part of parts) {
    if (part.type === 'text') {
      if (part.value.length === 0) {
        continue;
      }

      const previousPart = normalizedParts[normalizedParts.length - 1];
      if (previousPart?.type === 'text') {
        previousPart.value += part.value;
      } else {
        normalizedParts.push({ type: 'text', value: part.value });
      }
      continue;
    }

    normalizedParts.push(part);
  }

  return normalizedParts;
};

export const serializeMessageBody = (text: string, actions: MessageActionPayload[]) => {
  const trimmedText = trimMessageDraft(text);
  const parts: MessageBodyPart[] = trimmedText ? [{ type: 'text', value: trimmedText }] : [];

  for (const action of actions) {
    if (parts.length > 0) {
      parts.push({ type: 'text', value: '\n\n' });
    }
    parts.push({ type: 'action', action });
  }

  return serializeMessageBodyParts(parts);
};

export const parseMessageBodyParts = (body: string): MessageBodyPart[] => {
  const parts: MessageBodyPart[] = [];
  const tokenRegex = /\[\[ceenaix-action:([^\]]+)\]\]/g;
  let lastIndex = 0;

  for (const match of body.matchAll(tokenRegex)) {
    const [fullMatch, encodedValue] = match;
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({ type: 'text', value: body.slice(lastIndex, matchIndex) });
    }

    const parsedAction = parseMessageActionToken(encodedValue);
    if (parsedAction) {
      parts.push({ type: 'action', action: parsedAction });
    } else {
      // QA-152: a chip that does not open an allowed page is never made clickable.
      parts.push({ type: 'text', value: i18n.t('messaging.linkRemoved', { defaultValue: '[Link removed]' }) });
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < body.length) {
    parts.push({ type: 'text', value: body.slice(lastIndex) });
  }

  return normalizeMessageBodyParts(parts);
};

export const serializeMessageBodyParts = (parts: MessageBodyPart[]) =>
  normalizeMessageBodyParts(parts)
    .map((part) => (part.type === 'text' ? part.value : getMessageActionToken(part.action)))
    .join('');

export const getMessageActionFallbackLabel = (kind: MessageActionKind) => {
  switch (kind) {
    case 'booking_link':
      return i18n.t('messaging.actionBookingLink', { defaultValue: 'Appointment link' });
    case 'appointments_link':
      return i18n.t('messaging.actionAppointmentsLink', { defaultValue: 'Appointments reminder' });
    case 'records_link':
      return i18n.t('messaging.actionRecordsLink', { defaultValue: 'Records reminder' });
    default:
      return careActionFallbackLabel();
  }
};

export const getMessagePreviewText = (body: string) => {
  const parts = parseMessageBodyParts(body);
  const text = parts
    .filter((part): part is Extract<MessageBodyPart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.value)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  if (text) {
    return text.split('\n')[0] ?? text;
  }

  const actions = parts.filter((part): part is Extract<MessageBodyPart, { type: 'action' }> => part.type === 'action');

  if (actions.length > 0) {
    return actions.map((part) => getMessageActionFallbackLabel(part.action.kind)).join(', ');
  }

  return '';
};

export const buildDirectParticipantIds = (currentUserId: string, otherUserId: string) =>
  Array.from(new Set([currentUserId, otherUserId]));

export const isMissingMessagingRpcError = (error: { code?: string; message?: string } | null | undefined) => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST202') {
    return true;
  }

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('could not find the function') || message.includes('function public.');
};
