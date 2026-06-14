import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  FileText,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  UserCircle2,
  X,
} from 'lucide-react';
import { useMessagingHub } from '../hooks';
import { useAuth } from '../lib/auth-context';
import { dateTimeFormatWithNumerals, formatRelativeTime, resolveLocale } from '../lib/i18n-ui';
import {
  type MessageBodyPart,
  type MessageActionKind,
  type MessageActionPayload,
  MESSAGE_DRAFT_MAX_LENGTH,
  parseMessageBodyParts,
  serializeMessageBodyParts,
  trimMessageDraft,
} from '../lib/messaging';
import { Skeleton } from './Skeleton';

interface MessagesWorkspaceProps {
  role: 'patient' | 'doctor' | 'pharmacy' | 'clinic';
}

interface AttachmentPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'pdf' | 'other';
}

const AVATAR_GRADIENTS: readonly string[] = [
  'from-slate-800 to-teal-700',
  'from-emerald-700 to-teal-600',
  'from-blue-700 to-indigo-600',
  'from-rose-600 to-pink-600',
  'from-amber-600 to-orange-500',
  'from-violet-700 to-fuchsia-600',
  'from-cyan-700 to-sky-600',
  'from-slate-700 to-slate-500',
];

function avatarInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '•';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MessagesWorkspace = ({ role }: MessagesWorkspaceProps) => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const namespace = role === 'patient' ? 'patient.messages' : role === 'pharmacy' ? 'pharmacy.messages' : role === 'clinic' ? 'clinic.messages' : 'doctor.messages';
  const pharmacyParam = searchParams.get('pharmacy');
  const composeParam = role === 'patient'
    ? 'doctor'
    : role === 'pharmacy'
      ? 'patient'
      : role === 'clinic'
        ? (searchParams.get('doctor') ? 'doctor' : 'patient')
        : 'patient';
  const composeTargetId = role === 'patient'
    ? (pharmacyParam ?? searchParams.get('doctor'))
    : searchParams.get(composeParam);
  const draftParam = searchParams.get('draft');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [doctorComposerBody, setDoctorComposerBody] = useState('');
  const [doctorComposerFocused, setDoctorComposerFocused] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const [sentAttachments, setSentAttachments] = useState<Record<string, AttachmentPreview>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [undoMessageId, setUndoMessageId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const bootstrappedTargetRef = useRef<string | null>(null);
  const draftPrefillRef = useRef<string | null>(null);
  const doctorComposerRef = useRef<HTMLDivElement | null>(null);
  const doctorComposerSelectionRef = useRef<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locale = resolveLocale(i18n.language);
  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    working,
    conversationError,
    threadError,
    actionError,
    ensureDirectConversation,
    sendMessage,
    deleteMessage,
    updateMessage,
  } = useMessagingHub(user?.id, conversationId ?? null);

  useEffect(() => {
    if (!composeTargetId || !user?.id) {
      return;
    }

    const bootstrapKey = `${composeParam}:${composeTargetId}`;
    if (bootstrappedTargetRef.current === bootstrapKey) {
      return;
    }

    bootstrappedTargetRef.current = bootstrapKey;

    void (async () => {
      const { conversationId: nextConversationId } = await ensureDirectConversation(
        composeTargetId,
        t(`${namespace}.defaultSubject`)
      );

      if (nextConversationId) {
        const draftValue = searchParams.get('draft');
        const target = draftValue
          ? `/${role}/messages/${nextConversationId}?draft=${draftValue}`
          : `/${role}/messages/${nextConversationId}`;
        navigate(target, { replace: true });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeParam, composeTargetId, ensureDirectConversation, namespace, navigate, role, t, user?.id]);

  useEffect(() => {
    if (!draftParam || !activeConversationId) return;
    if (draftPrefillRef.current === activeConversationId) return;
    draftPrefillRef.current = activeConversationId;
    const decoded = decodeURIComponent(draftParam);
    if (role === 'doctor') {
      setDoctorComposerBody(decoded);
      setTimeout(() => {
        if (doctorComposerRef.current) {
          doctorComposerRef.current.innerText = decoded;
        }
      }, 100);
    } else {
      setDraft(decoded);
    }
  }, [draftParam, activeConversationId, role]);

  useEffect(() => {
    setSentAttachments((prev) => {
      const tempKeys = Object.keys(prev).filter((key) => key.startsWith('temp-'));
      if (tempKeys.length === 0) return prev;
      const ownMessages = messages.filter((m) => m.sender_id === user?.id);
      if (ownMessages.length === 0) return prev;
      const updated = { ...prev };
      tempKeys.forEach((tempKey) => {
        const tempTimestamp = parseInt(tempKey.replace('temp-', ''), 10);
        const closest = ownMessages.reduce((best, m) => {
          const diff = Math.abs(new Date(m.sent_at).getTime() - tempTimestamp);
          const bestDiff = Math.abs(new Date(best.sent_at).getTime() - tempTimestamp);
          return diff < bestDiff ? m : best;
        });
        if (closest) {
          updated[closest.id] = updated[tempKey];
          delete updated[tempKey];
        }
      });
      return updated;
    });
  }, [messages, user?.id]);

  // Cleanup attachment preview URLs on unmount
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  // Cancel any pending delete timers on unmount to prevent stale Supabase calls
  useEffect(() => {
    const timers = undoTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystacks = [
        conversation.counterpart.name,
        conversation.counterpart.email ?? '',
        conversation.subject ?? '',
        conversation.lastMessagePreview ?? '',
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [conversations, searchQuery]);

  const doctorQuickActions = useMemo(() => {
    if (role !== 'doctor' || !user?.id || !activeConversation) {
      return [];
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const bookingLink = origin
      ? `${origin}/patient/appointments/book?doctor=${encodeURIComponent(user.id)}&source=message`
      : `/patient/appointments/book?doctor=${encodeURIComponent(user.id)}&source=message`;

    return [
      {
        id: 'booking-link',
        label: t('doctor.messages.quickActions.bookingLink'),
        icon: CalendarPlus,
        action: {
          kind: 'booking_link' as const,
          href: bookingLink,
        },
      },
      {
        id: 'intake-reminder',
        label: t('doctor.messages.quickActions.intakeReminder'),
        icon: ClipboardList,
        action: {
          kind: 'appointments_link' as const,
          href: origin ? `${origin}/patient/appointments` : '/patient/appointments',
        },
      },
      {
        id: 'records-reminder',
        label: t('doctor.messages.quickActions.recordsReminder'),
        icon: FileText,
        action: {
          kind: 'records_link' as const,
          href: origin ? `${origin}/patient/records` : '/patient/records',
        },
      },
    ];
  }, [activeConversation, role, t, user?.id]);

  const getActionLabel = (kind: MessageActionKind) => {
    switch (kind) {
      case 'booking_link':
        return t('doctor.messages.actionLabels.bookingLink');
      case 'appointments_link':
        return t('doctor.messages.actionLabels.appointmentsLink');
      case 'records_link':
        return t('doctor.messages.actionLabels.recordsLink');
      default:
        return t('doctor.messages.actionLabels.bookingLink');
    }
  };

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString(
      locale,
      dateTimeFormatWithNumerals(i18n.language, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    );

  const getCurrentComposerBody = () => (role === 'doctor' ? doctorComposerBody : draft);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Revoke previous preview URL
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type === 'application/pdf'
      ? 'pdf'
      : 'other';

    setAttachment({ file, previewUrl, type });

    // Reset file input so same file can be re-selected
    event.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const submitCurrentComposer = async () => {
    const composerBody = getCurrentComposerBody();

    if (!trimMessageDraft(composerBody) && !attachment) {
      return false;
    }

    const bodyToSend = trimMessageDraft(composerBody) ? composerBody : `📎 ${attachment!.file.name}`;
    const didSend = await sendMessage(bodyToSend);

    if (didSend) {
      if (attachment) {
        const tempKey = `temp-${Date.now()}`;
        setSentAttachments((prev) => ({ ...prev, [tempKey]: attachment }));
      }
      setDraft('');
      setDoctorComposerBody('');
      setAttachment(null);
      doctorComposerSelectionRef.current = null;
      if (doctorComposerRef.current) {
        doctorComposerRef.current.innerHTML = '';
      }
    }

    return didSend;
  };

  const getCurrentSelectionRange = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const root = doctorComposerRef.current;
    if (!root || !range.commonAncestorContainer) {
      return null;
    }

    const ancestor =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (ancestor && root.contains(ancestor)) {
      return range.cloneRange();
    }

    return null;
  };

  const updateStoredComposerSelection = () => {
    if (role !== 'doctor') {
      return;
    }

    const range = getCurrentSelectionRange();
    if (range) {
      doctorComposerSelectionRef.current = range;
    }
  };

  const createComposerActionChip = (action: MessageActionPayload) => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.messageActionKind = action.kind;
    chip.dataset.messageActionHref = action.href;
    chip.className =
      'mx-1 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 align-middle text-xs font-semibold text-emerald-800';

    const label = document.createElement('span');
    label.textContent = getActionLabel(action.kind);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className =
      'rounded-full text-emerald-900/80 transition hover:text-emerald-950';
    removeButton.setAttribute('aria-label', t('doctor.messages.removeAction'));
    removeButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z"></path></svg>';
    removeButton.addEventListener('click', (event) => {
      event.preventDefault();
      chip.remove();
      syncDoctorComposerState();
      doctorComposerRef.current?.focus();
    });

    chip.append(label, removeButton);
    return chip;
  };

  const serializeDoctorComposerDom = () => {
    const root = doctorComposerRef.current;
    if (!root) {
      return '';
    }

    const parts: MessageBodyPart[] = [];

    root.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push({ type: 'text', value: node.textContent ?? '' });
        return;
      }

      if (!(node instanceof HTMLElement)) {
        return;
      }

      if (node.dataset.messageActionKind && node.dataset.messageActionHref) {
        parts.push({
          type: 'action',
          action: {
            kind: node.dataset.messageActionKind as MessageActionKind,
            href: node.dataset.messageActionHref,
          },
        });
        return;
      }

      if (node.tagName === 'BR') {
        parts.push({ type: 'text', value: '\n' });
        return;
      }

      parts.push({ type: 'text', value: node.textContent ?? '' });
    });

    return serializeMessageBodyParts(parts);
  };

  const syncDoctorComposerState = () => {
    setDoctorComposerBody(serializeDoctorComposerDom());
    updateStoredComposerSelection();
  };

  const focusDoctorComposerAtEnd = () => {
    const root = doctorComposerRef.current;
    if (!root) {
      return null;
    }

    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    doctorComposerSelectionRef.current = range.cloneRange();
    return range;
  };

  const insertLineBreakIntoDoctorComposer = () => {
    const root = doctorComposerRef.current;
    if (!root) {
      return;
    }

    const range = doctorComposerSelectionRef.current ?? focusDoctorComposerAtEnd();
    if (!range) {
      return;
    }

    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);

    const spacer = document.createTextNode('');
    br.after(spacer);

    const nextRange = document.createRange();
    nextRange.setStart(spacer, 0);
    nextRange.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    doctorComposerSelectionRef.current = nextRange.cloneRange();
    syncDoctorComposerState();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitCurrentComposer();
  };

  const handleComposerKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!trimMessageDraft(draft) && !attachment) {
      return;
    }

    await submitCurrentComposer();
  };

  const addQuickAction = (action: MessageActionPayload) => {
    if (role !== 'doctor') {
      return;
    }

    const root = doctorComposerRef.current;
    if (!root) {
      return;
    }

    const existingChip = root.querySelector(
      `[data-message-action-kind="${action.kind}"]`
    );
    if (existingChip) {
      return;
    }

    const chip = createComposerActionChip(action);
    const trailingSpace = document.createTextNode(' ');
    const range = doctorComposerSelectionRef.current ?? focusDoctorComposerAtEnd();

    if (!range) {
      return;
    }

    range.deleteContents();
    const fragment = document.createDocumentFragment();
    fragment.append(chip, trailingSpace);
    range.insertNode(fragment);

    const nextRange = document.createRange();
    nextRange.setStart(trailingSpace, trailingSpace.textContent?.length ?? 0);
    nextRange.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    doctorComposerSelectionRef.current = nextRange.cloneRange();
    syncDoctorComposerState();
  };
  const handleEditMessage = (messageId: string, currentBody: string) => {
    setEditingMessageId(messageId);
    setEditingMessageText(currentBody);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingMessageText.trim()) return;
    setSavingEdit(true);
    const success = await updateMessage(messageId, editingMessageText);
    setSavingEdit(false);
    if (success) {
      setEditingMessageId(null);
      setEditingMessageText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    setDeletedMessageIds((prev) => new Set([...prev, messageId]));
    setUndoMessageId(messageId);

    const timer = setTimeout(async () => {
      setUndoMessageId(null);
      await deleteMessage(messageId);
    }, 5000);

    undoTimers.current[messageId] = timer;
  };

  const handleUndoDelete = (messageId: string) => {
    setDeletedMessageIds((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
    setUndoMessageId(null);
    if (undoTimers.current[messageId]) {
      clearTimeout(undoTimers.current[messageId]);
      delete undoTimers.current[messageId];
    }
  };
  const renderInlineText = (text: string, isOwn: boolean) => {
    const linkClassName = isOwn
      ? 'font-semibold underline text-white'
      : 'font-semibold underline text-emerald-700';

    return text.split('\n').map((line, lineIndex, lines) => (
      <span key={`${lineIndex}-${line}`}>
        {line.split(/(https?:\/\/[^\s]+)/g).map((segment, segmentIndex) =>
          /^https?:\/\/[^\s]+$/.test(segment) ? (
            <a
              key={`${lineIndex}-${segmentIndex}-${segment}`}
              href={segment}
              target="_blank"
              rel="noreferrer"
              className={linkClassName}
            >
              {segment}
            </a>
          ) : (
            <span key={`${lineIndex}-${segmentIndex}`}>{segment}</span>
          )
        )}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };

  const renderActionBadge = (
    action: MessageActionPayload,
    options: {
      isOwn: boolean;
      removable?: boolean;
      onRemove?: () => void;
      insideComposer?: boolean;
    }
  ) => {
    const { isOwn, removable = false, onRemove, insideComposer = false } = options;
    const actionClassName = isOwn
      ? 'border-white/25 bg-white/15 text-white hover:bg-white/20'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
    const spacingClassName = insideComposer ? '' : 'mx-1 align-middle';

    const content = (
      <>
        <span>{getActionLabel(action.kind)}</span>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            className={`rounded-full transition ${isOwn ? 'text-white/80 hover:text-white' : 'text-emerald-900/80 hover:text-emerald-950'}`}
            aria-label={t('doctor.messages.removeAction')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </>
    );

    if (removable) {
      return (
        <span
          key={`${action.kind}-${action.href}`}
          className={`${spacingClassName} inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${actionClassName}`}
        >
          {content}
        </span>
      );
    }

    return (
      <a
        key={`${action.kind}-${action.href}`}
        href={action.href}
        target="_blank"
        rel="noreferrer"
        className={`${spacingClassName} inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${actionClassName}`}
      >
        {content}
      </a>
    );
  };

  const renderMessageBody = (body: string, isOwn: boolean) => {
    const parts = parseMessageBodyParts(body);

    return parts.length > 0 ? (
      <div className="text-sm leading-6">
        {parts.map((part, index) =>
          part.type === 'text' ? (
            <span key={`text-${index}`}>{renderInlineText(part.value, isOwn)}</span>
          ) : (
            renderActionBadge(part.action, { isOwn })
          )
        )}
      </div>
    ) : null;
  };

  // Render attachment preview inside a sent message bubble
  const renderSentAttachment = (att: AttachmentPreview, isOwn: boolean) => {
    if (att.type === 'image') {
      return (
        <div className="mb-2 overflow-hidden rounded-xl">
          <img
            src={att.previewUrl}
            alt={att.file.name}
            className="max-h-48 max-w-full rounded-xl object-cover"
          />
          <div className={`mt-1 text-xs ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
            {att.file.name} · {formatFileSize(att.file.size)}
          </div>
        </div>
      );
    }

    return (
      <div className={`mb-2 flex items-center gap-3 rounded-xl border p-3 ${isOwn ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${isOwn ? 'bg-white/20' : 'bg-red-50'}`}>
          <FileText className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-red-500'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs font-semibold ${isOwn ? 'text-white' : 'text-gray-800'}`}>
            {att.file.name}
          </p>
          <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
            {formatFileSize(att.file.size)}
          </p>
        </div>
      </div>
    );
  };

  const theme =
    role === 'clinic'
      ? {
          selected: 'border-teal-200 bg-teal-50',
          badge: 'bg-teal-100 text-teal-700',
          button: 'from-teal-700 to-teal-500',
          composerBorder: 'focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20',
          composerButton: 'bg-teal-600 hover:bg-teal-700',
          ownBubble: 'border-teal-200 bg-teal-600 text-white',
        }
      : role === 'doctor'
      ? {
          selected: 'border-emerald-200 bg-emerald-50',
          badge: 'bg-emerald-100 text-emerald-700',
          button: 'from-slate-900 to-emerald-700',
          composerBorder: 'focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20',
          composerButton: 'bg-emerald-600 hover:bg-emerald-700',
          ownBubble: 'border-emerald-200 bg-emerald-600 text-white',
        }
      : role === 'pharmacy'
      ? {
          selected: 'border-emerald-200 bg-emerald-50',
          badge: 'bg-emerald-100 text-emerald-700',
          button: 'from-emerald-800 to-emerald-600',
          composerBorder: 'focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20',
          composerButton: 'bg-emerald-600 hover:bg-emerald-700',
          ownBubble: 'border-emerald-200 bg-emerald-600 text-white',
        }
      : {
          selected: 'border-cyan-200 bg-cyan-50',
          badge: 'bg-cyan-100 text-cyan-700',
          button: 'from-ceenai-blue to-ceenai-cyan',
          composerBorder: 'focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20',
          composerButton: 'bg-cyan-600 hover:bg-cyan-700',
          ownBubble: 'border-cyan-200 bg-cyan-600 text-white',
        };

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">{t(`${namespace}.conversations`)}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
              {t(`${namespace}.conversationCount`, { count: conversations.length })}
            </span>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(`${namespace}.searchPlaceholder`)}
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200 rtl:pl-4 rtl:pr-11"
            />
          </div>
        </div>

        <div className="max-h-[680px] overflow-y-auto p-3">
          {loadingConversations ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-gray-100 p-4">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-3 h-3 w-5/6" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <MessageSquare className="h-7 w-7" />
              </div>
              <p className="mt-4 font-semibold text-gray-900">
                {searchQuery.trim() ? t(`${namespace}.noResultsTitle`) : t(`${namespace}.noneTitle`)}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {searchQuery.trim() ? t(`${namespace}.noResultsBody`) : t(`${namespace}.noneBody`)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => navigate(`/${role}/messages/${conversation.id}`)}
                    className={`w-full rounded-2xl border p-4 text-left transition hover:border-gray-300 hover:bg-slate-50 ${
                      isActive ? theme.selected : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${avatarGradient(
                          conversation.counterpart.id ?? conversation.counterpart.name
                        )}`}
                      >
                        {avatarInitials(conversation.counterpart.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{conversation.counterpart.name}</p>
                            <p className="truncate text-xs text-gray-500">
                              {conversation.counterpart.email ?? t(`${namespace}.noEmail`)}
                            </p>
                          </div>
                          {conversation.unreadCount > 0 ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>
                              {t(`${namespace}.unreadCount`, { count: conversation.unreadCount })}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                          {conversation.lastMessagePreview ?? t(`${namespace}.emptyPreview`)}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                          <span className="truncate">{conversation.subject ?? t(`${namespace}.defaultSubject`)}</span>
                          <span className="shrink-0">
                            {conversation.lastMessageAt
                              ? formatRelativeTime(t, conversation.lastMessageAt)
                              : t(`${namespace}.newConversation`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        {conversationError ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {t(`${namespace}.loadError`)}
          </div>
        ) : null}
        {threadError ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {t(`${namespace}.threadError`)}
          </div>
        ) : null}
        {actionError ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            {actionError}
          </div>
        ) : null}

        {activeConversation ? (
          <>
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white shadow-sm ${avatarGradient(
                    activeConversation.counterpart.id ?? activeConversation.counterpart.name
                  )}`}
                >
                  {avatarInitials(activeConversation.counterpart.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-gray-900">{activeConversation.counterpart.name}</p>
                  <p className="truncate text-sm text-gray-500">
                    {activeConversation.counterpart.email ?? t(`${namespace}.noEmail`)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {activeConversation.lastMessageAt
                      ? t(`${namespace}.lastUpdated`, {
                          time: formatTimestamp(activeConversation.lastMessageAt),
                        })
                      : t(`${namespace}.newConversation`)}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setShowProfileModal(true)}
                  className='rounded-lg p-1 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500'
                  title='View profile'
                >
                  <ChevronRight className='h-5 w-5 rtl:rotate-180' />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 px-5 py-6">
              {loadingMessages ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className={index % 2 === 0 ? 'flex justify-end' : 'flex justify-start'}>
                      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-4">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="mt-3 h-3 w-full" />
                        <Skeleton className="mt-2 h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{t(`${namespace}.threadEmptyTitle`)}</h3>
                  <p className="mt-2 max-w-md text-sm text-gray-600">{t(`${namespace}.threadEmptyBody`)}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, msgIndex) => {
                    const isOwn = message.sender_id === user?.id;
                    const attachmentForMessage = isOwn
                      ? sentAttachments[message.id] ?? (
                          msgIndex === messages.length - 1 && Object.keys(sentAttachments).length > 0
                            ? sentAttachments[Object.keys(sentAttachments)[Object.keys(sentAttachments).length - 1]]
                            : null
                        )
                      : null;

              // Skip deleted messages (show undo banner instead)
              if (deletedMessageIds.has(message.id)) {
                return undoMessageId === message.id ? (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <span className="text-sm text-amber-700">Message deleted</span>
                      <button
                        type="button"
                        onClick={() => handleUndoDelete(message.id)}
                        className="text-sm font-bold text-amber-700 underline transition hover:text-amber-900"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                ) : null;
              }

              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`w-full max-w-xl rounded-2xl border px-4 py-3 shadow-sm ${
                      isOwn ? theme.ownBubble : 'border-gray-200 bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className={isOwn ? 'text-white/85' : 'text-gray-500'}>
                        {isOwn ? t(`${namespace}.you`) : activeConversation.counterpart.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={isOwn ? 'text-white/80' : 'text-gray-400'}>
                          {formatTimestamp(message.sent_at)}
                        </span>
                        {isOwn ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditMessage(message.id, message.body)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message.id)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {attachmentForMessage ? (
                      <div className="mt-2">
                        {renderSentAttachment(attachmentForMessage, isOwn)}
                      </div>
                    ) : null}
                    {editingMessageId === message.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="w-full rounded-xl border border-white/30 bg-white/10 p-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/50"
                          rows={3}
                          autoFocus
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type='button'
                            onClick={() => void handleSaveEdit(message.id)}
                            disabled={savingEdit || !editingMessageText.trim()}
                            className='rounded-lg bg-white/20 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/30 disabled:opacity-60'
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-white/70 transition hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">{renderMessageBody(message.body, isOwn)}</div>
                    )}
                    {isOwn && editingMessageId !== message.id ? (
                      <div className="mt-1 flex items-center justify-end gap-1">
                        {message.read_at ? (
                          <span className="text-[10px] text-white/70">✓✓ Read</span>
                        ) : (
                          <span className="text-[10px] text-white/60">✓ Sent</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white p-4">
              {doctorQuickActions.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {doctorQuickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addQuickAction(action.action)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Attachment Preview */}
              {attachment ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.file.name}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <FileText className="h-7 w-7 text-red-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{attachment.file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(attachment.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="flex-shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <label className="sr-only" htmlFor={`${role}-message-draft`}>
                {t(`${namespace}.composerLabel`)}
              </label>
              {role === 'doctor' ? (
                <div className={`relative w-full rounded-2xl border border-gray-200 px-4 py-3 transition ${theme.composerBorder}`}>
                  {!doctorComposerFocused && !doctorComposerBody ? (
                    <div className="pointer-events-none absolute left-4 right-4 top-3 text-sm text-gray-400 rtl:left-4 rtl:right-4">
                      {t(`${namespace}.composerPlaceholder`)}
                    </div>
                  ) : null}
                  <div
                    ref={doctorComposerRef}
                    id={`${role}-message-draft`}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    onFocus={() => {
                      setDoctorComposerFocused(true);
                      updateStoredComposerSelection();
                    }}
                    onBlur={() => {
                      setDoctorComposerFocused(false);
                    }}
                    onInput={syncDoctorComposerState}
                    onKeyUp={updateStoredComposerSelection}
                    onMouseUp={updateStoredComposerSelection}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void submitCurrentComposer();
                        return;
                      }

                      if (event.key === 'Enter' && event.shiftKey) {
                        event.preventDefault();
                        insertLineBreakIntoDoctorComposer();
                      }
                    }}
                    className="min-h-[28px] whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 outline-none"
                  />
                </div>
              ) : (
                <div className={`w-full rounded-2xl border border-gray-200 px-4 py-3 transition ${theme.composerBorder}`}>
                  <textarea
                    id={`${role}-message-draft`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    maxLength={MESSAGE_DRAFT_MAX_LENGTH}
                    rows={1}
                    placeholder={t(`${namespace}.composerPlaceholder`)}
                    className="min-h-[28px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-gray-700 outline-none focus:outline-none focus:ring-0"
                  />
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Attach</span>
                  </button>
                  <p className="text-xs text-gray-400">Images, PDF, Word, TXT</p>
                </div>
                <button
                  type="submit"
                  disabled={working || (!trimMessageDraft(getCurrentComposerBody()) && !attachment)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.composerButton}`}
                >
                  <Send className="h-4 w-4" />
                  <span>{working ? t(`${namespace}.sending`) : t(`${namespace}.send`)}</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-r text-white ${theme.button}`}>
              <UserCircle2 className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-gray-900">{t(`${namespace}.selectTitle`)}</h3>
            <p className="mt-3 max-w-md text-sm text-gray-600">{t(`${namespace}.selectBody`)}</p>
          </div>
        )}
      </div>
    </div>

    {showProfileModal && activeConversation
      ? createPortal(
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm'
            onClick={() => setShowProfileModal(false)}
          >
            <div
              className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
                <h3 className='font-bold text-gray-900'>Profile Details</h3>
                <button
                  type='button'
                  onClick={() => setShowProfileModal(false)}
                  className='rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>

              {/* Avatar + name */}
              <div className='flex flex-col items-center px-6 pt-8 pb-4'>
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white shadow-md ${avatarGradient(
                    activeConversation.counterpart.id ?? activeConversation.counterpart.name
                  )}`}
                >
                  {avatarInitials(activeConversation.counterpart.name)}
                </div>
                <p className='mt-4 text-xl font-bold text-gray-900'>{activeConversation.counterpart.name}</p>
                <p className='mt-1 text-sm text-gray-500'>
                  {activeConversation.counterpart.email ?? 'No email'}
                </p>
                <span
                  className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${
                    role === 'patient'
                      ? 'bg-teal-100 text-teal-700'
                      : role === 'pharmacy'
                      ? 'bg-emerald-100 text-emerald-700'
                      : role === 'clinic'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {role === 'patient' ? 'Doctor' : role === 'pharmacy' ? 'Patient' : role === 'clinic' ? 'Contact' : 'Patient'}
                </span>
              </div>

              {/* Details */}
              <div className='mx-6 mb-6 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50'>
                <div className='flex items-center gap-3 px-4 py-3 text-sm'>
                  <span className='text-base'>📧</span>
                  <span className='text-gray-500'>Email</span>
                  <span className='ml-auto font-medium text-gray-800 truncate max-w-[180px]'>
                    {activeConversation.counterpart.email ?? 'Not available'}
                  </span>
                </div>
                <div className='flex items-center gap-3 px-4 py-3 text-sm'>
                  <span className='text-base'>👤</span>
                  <span className='text-gray-500'>Role</span>
                  <span className='ml-auto font-medium text-gray-800'>
                    {role === 'patient' ? 'Healthcare Provider' : role === 'clinic' ? 'Contact' : 'Patient'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className='border-t border-gray-100 px-6 py-4'>
                <button
                  type='button'
                  onClick={() => setShowProfileModal(false)}
                  className={`w-full rounded-xl bg-gradient-to-r py-2.5 text-sm font-semibold text-white transition hover:opacity-90 ${theme.button}`}
                >
                  Message
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
};
