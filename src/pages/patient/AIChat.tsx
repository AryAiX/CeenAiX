import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { usePatientPreVisitAssessments, usePatientDashboard } from '../../hooks';
import { usePatientAiChat } from '../../hooks/use-patient-ai-chat';
import { useQuery } from '../../hooks/use-query';
import {
  type AiChatAssistantMetadata,
  invokeAiChat,
  type AiChatFileAttachment,
  type AiChatStoredAttachment,
  removeAiChatAttachments,
  uploadAiChatAttachment,
} from '../../lib/ai';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';
import {
  applyCanonicalUpdateRequests,
  dismissCanonicalUpdateRequests,
  fetchCanonicalUpdateRequests,
  formatCanonicalValueForReview,
} from '../../lib/canonical-record-updates';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments: AiChatStoredAttachment[];
}

const PATIENT_AI_STARTER_ID = 'patient-ai-starter';

const PLAYFAIR: CSSProperties = { fontFamily: 'Playfair Display, serif' };

const formatTimestamp = (value: string, language: string) => {
  const locale = resolveLocale(language);
  return new Date(value).toLocaleTimeString(
    locale,
    dateTimeFormatWithNumerals(language, {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

const formatShortDate = (value: string, language: string) => {
  const locale = resolveLocale(language);
  return new Date(value).toLocaleDateString(
    locale,
    dateTimeFormatWithNumerals(language, {
      month: 'short',
      day: 'numeric',
    })
  );
};

const getFileAttachments = (message: ChatMessage) =>
  message.attachments.filter((attachment) => attachment.type === 'uploaded_file') as AiChatFileAttachment[];

const getAssistantMetadata = (message: ChatMessage) =>
  message.attachments.find((attachment) => attachment.type === 'response_metadata') as
    | AiChatAssistantMetadata
    | undefined;

const getHistoryBadges = (message: ChatMessage) => {
  const metadata = getAssistantMetadata(message);

  if (!metadata?.usedPatientContext || metadata.evidence.length === 0) {
    return [];
  }

  return Array.from(new Set(metadata.evidence.map((evidence) => evidence.title.trim()).filter(Boolean))).slice(0, 3);
};

const getSuggestedActions = (message: ChatMessage) => getAssistantMetadata(message)?.suggestedActions ?? [];

const classifyHba1c = (latest: number | null | undefined, previous: number | null | undefined) => {
  if (latest === null || latest === undefined) {
    return null;
  }

  // First reading: we have nothing to compare against, so call it out as a
  // baseline rather than mislabelling it 'stable' (which implied a trend
  // when there was none).
  if (previous === null || previous === undefined) {
    return 'baseline' as const;
  }

  const delta = latest - previous;

  if (delta <= -0.2) {
    return 'improving' as const;
  }

  if (delta >= 0.2) {
    return 'rising' as const;
  }

  return 'stable' as const;
};

const classifyBloodPressure = (systolic: number | null | undefined, diastolic: number | null | undefined) => {
  if (!systolic || !diastolic) {
    return null;
  }

  if (systolic < 130 && diastolic < 85) {
    return 'controlled' as const;
  }

  if (systolic < 140 && diastolic < 90) {
    return 'elevated' as const;
  }

  return 'uncontrolled' as const;
};

export const PatientAIChat: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language ?? 'en';
  const isArabic = lang.startsWith('ar');

  const starterMessage = useMemo<ChatMessage>(
    () => ({
      id: PATIENT_AI_STARTER_ID,
      role: 'assistant',
      content: t('patient.aiChat.starterContent'),
      createdAt: new Date(0).toISOString(),
      attachments: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- include i18n.language so greeting updates on locale switch
    [t, i18n.language]
  );

  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { data, loading, error, refetch } = usePatientAiChat(user?.id, selectedSessionId);
  const { data: preVisitAssessmentsData } = usePatientPreVisitAssessments(user?.id);
  const { data: dashboardData } = usePatientDashboard(user?.id, lang);
  const preVisitAssessments = preVisitAssessmentsData ?? [];

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recordUpdateFeedback, setRecordUpdateFeedback] = useState<string | null>(null);
  const [isApplyingRecordUpdates, setIsApplyingRecordUpdates] = useState(false);

  const sessions = data?.sessions ?? [];
  const firstName = useMemo(() => {
    const fromProfile = profile?.first_name?.trim() || profile?.full_name?.trim().split(/\s+/)[0];
    const fromEmail = user?.email?.split('@')[0];
    return fromProfile || fromEmail || 'there';
  }, [profile?.first_name, profile?.full_name, user?.email]);

  const { data: pendingCanonicalUpdatesData, refetch: refetchCanonicalUpdates } = useQuery(
    async () => {
      if (!user?.id) {
        return [];
      }

      return fetchCanonicalUpdateRequests({
        patientId: user.id,
        sourceKind: 'ai_chat_message',
        status: 'pending',
      });
    },
    [user?.id ?? '', selectedSessionId ?? '']
  );
  const pendingCanonicalUpdates = (pendingCanonicalUpdatesData ?? []).filter((update) => {
    if (!selectedSessionId) {
      return false;
    }

    const sessionUserMessageIds = new Set(
      messages.filter((message) => message.role === 'user').map((message) => message.id)
    );

    if (sessionUserMessageIds.has(update.sourceRecordId)) {
      return true;
    }

    return (
      typeof update.metadata.sessionId === 'string' && update.metadata.sessionId === selectedSessionId
    );
  });

  // Track the last user-driven session selection so the "clear stale
  // messages" effect can fire on real session-switches (sidebar click) but
  // skip the synthetic session id change that happens inside
  // `handleSendMessage` when a brand-new session is created.
  const lastSelectedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (isSending) {
      // Mid-send a new session id may be assigned by the server response;
      // keep the optimistic message + assistant reply visible until the
      // refetch lands.
      lastSelectedSessionRef.current = selectedSessionId;
      return;
    }
    if (selectedSessionId === null) {
      setMessages([starterMessage]);
      lastSelectedSessionRef.current = null;
      return;
    }
    if (lastSelectedSessionRef.current === selectedSessionId) {
      return;
    }
    lastSelectedSessionRef.current = selectedSessionId;
    // The user switched threads — wipe the previous transcript so no message
    // from the prior session leaks into the new one while the fetch is in
    // flight.
    setMessages([]);
  }, [isSending, selectedSessionId, starterMessage]);

  useEffect(() => {
    if (loading || isSending) {
      return;
    }

    if (selectedSessionId === null) {
      setMessages([starterMessage]);
      return;
    }

    if (data?.sessionId !== selectedSessionId) {
      return;
    }

    setMessages(data.messages.length > 0 ? data.messages : []);
  }, [data, isSending, loading, selectedSessionId, starterMessage]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const outstandingPreVisitAssessment =
    preVisitAssessments.find(
      (assessment) => assessment.status === 'not_started' || assessment.status === 'in_progress'
    ) ?? null;

  const showStarterOptions =
    !loading &&
    !error &&
    messages.length === 1 &&
    messages[0]?.id === PATIENT_AI_STARTER_ID &&
    !isSending;

  const startNewSession = () => {
    setSelectedSessionId(null);
    setMessages([starterMessage]);
    setInput('');
    setPendingFiles([]);
    setSendError(null);
    setIsHistoryOpen(false);
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setPendingFiles((currentFiles) => {
      const oversized = selectedFiles.find((file) => file.size > 10 * 1024 * 1024);
      if (oversized) {
        setSendError(
          t('ai.errors.attachmentTooLarge', {
            defaultValue: 'Attachments must be 10 MB or smaller.',
          })
        );
        return currentFiles;
      }

      return [...currentFiles, ...selectedFiles].slice(0, 4);
    });
    event.target.value = '';
  };

  const handleRemovePendingFile = (fileName: string) => {
    setPendingFiles((currentFiles) => currentFiles.filter((file) => file.name !== fileName));
  };

  const handleSendMessage = async (options?: { submittedMessage?: string }) => {
    const nextMessage = (options?.submittedMessage ?? input).trim();

    if (!user) {
      setSendError(t('patient.aiChat.signInError'));
      return;
    }

    if (!nextMessage || isSending) {
      return;
    }

    let uploadedAttachments: AiChatFileAttachment[] = [];
    let invokeSucceeded = false;
    const attachmentsBeforeSend = pendingFiles;
    try {
      setSendError(null);
      setIsSending(true);

      uploadedAttachments =
        pendingFiles.length > 0
          ? await Promise.all(pendingFiles.map((file) => uploadAiChatAttachment(user.id, file)))
          : [];

      const optimisticUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: nextMessage,
        createdAt: new Date().toISOString(),
        attachments: uploadedAttachments,
      };

      setMessages((currentMessages) => {
        const nextMessages =
          selectedSessionId === null
            ? currentMessages.filter((message) => message.id !== PATIENT_AI_STARTER_ID)
            : currentMessages;
        return [...nextMessages, optimisticUserMessage];
      });
      setInput('');
      setPendingFiles([]);

      const response = await invokeAiChat({
        message: nextMessage,
        sessionId: selectedSessionId,
        attachments: uploadedAttachments,
        usePatientContext: true,
        mode: 'chat',
      });
      invokeSucceeded = true;

      const previousSessionId = selectedSessionId;
      setSelectedSessionId(response.sessionId);
      setRecordUpdateFeedback(null);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: response.assistantMessage.id,
          role: 'assistant',
          content: response.assistantMessage.content,
          createdAt: response.assistantMessage.createdAt,
          attachments: response.assistantMessage.attachments,
        },
      ]);

      // Always refresh after a successful exchange: when previousSessionId was
      // null the call we just made *created* the session, so the session list
      // needs to pick it up. When it was not null we may also have advanced
      // the same thread; either way the panel should reload.
      if (previousSessionId !== null || response.sessionId) {
        await refetch();
      }

      await refetchCanonicalUpdates();
    } catch (sendFailure) {
      setSendError(sendFailure instanceof Error ? sendFailure.message : t('patient.aiChat.sendError'));
      setMessages((currentMessages) =>
        currentMessages.filter((message) => !message.id.startsWith('temp-user-'))
      );
      if (!options?.submittedMessage) {
        setInput(nextMessage);
      }
      setPendingFiles(attachmentsBeforeSend);
      // The invoke or one of the surrounding writes failed after we already
      // pushed attachments into storage. Clean them up so we don't leak
      // orphan objects into the medical-files bucket.
      if (!invokeSucceeded && uploadedAttachments.length > 0) {
        await removeAiChatAttachments(uploadedAttachments);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSendMessage();
  };

  const handleApplyPendingUpdates = async () => {
    try {
      setIsApplyingRecordUpdates(true);
      setRecordUpdateFeedback(null);
      await applyCanonicalUpdateRequests(pendingCanonicalUpdates.map((update) => update.id));
      setRecordUpdateFeedback(t('patient.aiChat.recordUpdateOk'));
      await refetchCanonicalUpdates();
      await refetch();
    } catch (applyError) {
      setRecordUpdateFeedback(
        applyError instanceof Error ? applyError.message : t('patient.aiChat.recordUpdateFail')
      );
    } finally {
      setIsApplyingRecordUpdates(false);
    }
  };

  const handleDismissPendingUpdates = async () => {
    try {
      setIsApplyingRecordUpdates(true);
      setRecordUpdateFeedback(null);
      await dismissCanonicalUpdateRequests(pendingCanonicalUpdates.map((update) => update.id));
      setRecordUpdateFeedback(t('patient.aiChat.dismissed'));
      await refetchCanonicalUpdates();
    } catch (dismissError) {
      setRecordUpdateFeedback(
        dismissError instanceof Error ? dismissError.message : t('patient.aiChat.dismissFail')
      );
    } finally {
      setIsApplyingRecordUpdates(false);
    }
  };

  const handleClearConversation = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('patient.aiChat.clearChatConfirm'))) {
      return;
    }
    startNewSession();
  };

  const latestHba1c = dashboardData?.latestHba1c?.value ?? null;
  const previousHba1c = dashboardData?.previousHba1c?.value ?? null;
  const hba1cTrend = classifyHba1c(latestHba1c, previousHba1c);
  const latestBp = dashboardData?.latestBloodPressure ?? null;
  const bpClass = classifyBloodPressure(latestBp?.systolic ?? null, latestBp?.diastolic ?? null);
  const activeMedicationsCount = dashboardData?.medications?.length ?? 0;
  const nextAppointment = dashboardData?.nextAppointment ?? null;
  const allergyLabels = (dashboardData?.allergyAlerts ?? [])
    .map((allergy) => allergy.allergen)
    .filter(Boolean)
    .slice(0, 3);
  const allergyText =
    allergyLabels.length > 0
      ? t('patient.aiChat.allergyAlert', { allergens: allergyLabels.join(' · ') })
      : t('patient.aiChat.allergyNone');

  const hba1cStatusText =
    hba1cTrend === 'improving'
      ? `↓ ${t('patient.aiChat.hba1cImproving')}`
      : hba1cTrend === 'rising'
        ? `↑ ${t('patient.aiChat.hba1cRising')}`
        : hba1cTrend === 'stable'
          ? t('patient.aiChat.hba1cStable')
          : hba1cTrend === 'baseline'
            ? t('patient.aiChat.hba1cBaseline', {
                defaultValue: 'Baseline reading on file',
              })
            : null;

  const bpStatusText =
    bpClass === 'controlled'
      ? t('patient.aiChat.bpControlled')
      : bpClass === 'elevated'
        ? t('patient.aiChat.bpElevated')
        : bpClass === 'uncontrolled'
          ? t('patient.aiChat.bpUncontrolled')
          : null;

  const suggestionPills = useMemo(
    () => [
      { icon: '💊', text: t('patient.aiChat.pillMedications') },
      { icon: '💊', text: t('patient.aiChat.pillDrugInteractions') },
      { icon: '🩸', text: t('patient.aiChat.pillHba1c') },
      { icon: '💓', text: t('patient.aiChat.pillBloodPressure') },
      { icon: '🩺', text: t('patient.aiChat.pillPrepareVisit') },
      { icon: '📋', text: t('patient.aiChat.pillReviewHistory') },
      { icon: '🔬', text: t('patient.aiChat.pillLabResults') },
      { icon: '🥗', text: t('patient.aiChat.pillLifestyle') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- include i18n.language so greeting updates on locale switch
    [t, i18n.language]
  );

  return (
    <div className="h-full w-full flex overflow-hidden bg-slate-900">
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-5 sm:px-8">
          <div className={`flex items-center gap-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <div className="h-16 w-16 rounded-full border-2 border-teal-500/40" />
              </div>
              <div
                className="absolute inset-0 animate-pulse"
                style={{ animationDuration: '3s' }}
              >
                <div className="h-16 w-16 rounded-full border-2 border-teal-500/15" />
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/30">
                <Bot className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white" style={PLAYFAIR}>
                {t('patient.aiChat.heroBrand')}
              </h1>
              <p className="flex items-center gap-1 text-xs text-teal-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
                {t('patient.aiChat.heroSubtitle')}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={() => setIsHistoryOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {isHistoryOpen ? t('patient.aiChat.collapseHistory') : t('patient.aiChat.chats')}
              {sessions.length > 0 ? (
                <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-200">
                  {sessions.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={handleClearConversation}
              className="p-2 text-white/60 transition hover:text-white/90"
              title={t('patient.aiChat.clearChat')}
              aria-label={t('patient.aiChat.clearChat')}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 text-white/60 transition hover:text-white/90"
              title={t('patient.aiChat.exportChat')}
              aria-label={t('patient.aiChat.exportChat')}
              disabled
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 text-white/60 transition hover:text-white/90"
              title={t('patient.aiChat.aiSettings')}
              aria-label={t('patient.aiChat.aiSettings')}
              disabled
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
                {loading ? (
                  <div className="flex h-full items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {t('patient.aiChat.loadHistoryError')}
                  </div>
                ) : null}

                {pendingCanonicalUpdates.length > 0 ? (
                  <section className="mb-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm shadow-amber-900/20">
                    <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className="rounded-2xl bg-amber-500/20 p-3 text-amber-300">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-amber-100">
                          {t('patient.aiChat.reviewUpdatesTitle')}
                        </h3>
                        <p className="mt-1 text-sm text-amber-100/80">
                          {t('patient.aiChat.reviewUpdatesBody')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {pendingCanonicalUpdates.map((update) => (
                        <article
                          key={update.id}
                          className="rounded-2xl border border-amber-500/20 bg-slate-900/60 px-4 py-4"
                        >
                          <div className={`flex flex-wrap items-center justify-between gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <h4 className="text-sm font-semibold text-white/90">{update.displayLabel}</h4>
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                update.requiresDoctorReview
                                  ? 'bg-violet-500/20 text-violet-200'
                                  : 'bg-emerald-500/20 text-emerald-200'
                              }`}
                            >
                              {update.requiresDoctorReview
                                ? t('patient.aiChat.badgeDoctorReview')
                                : t('patient.aiChat.badgeUpdateRecord')}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-white/5 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                                {t('patient.aiChat.fieldCurrent')}
                              </p>
                              <p className="mt-1 text-sm text-white/70">
                                {formatCanonicalValueForReview(update.currentValue)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-teal-500/10 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">
                                {t('patient.aiChat.fieldNew')}
                              </p>
                              <p className="mt-1 text-sm text-white/90">
                                {formatCanonicalValueForReview(update.proposedValue)}
                              </p>
                            </div>
                          </div>
                          {typeof update.metadata.messagePreview === 'string' ? (
                            <p className="mt-3 text-xs text-white/50">
                              {t('patient.aiChat.fromChat', { preview: update.metadata.messagePreview })}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>

                    <div className={`mt-4 flex flex-wrap gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <button
                        type="button"
                        onClick={() => void handleApplyPendingUpdates()}
                        disabled={isApplyingRecordUpdates}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isApplyingRecordUpdates ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isApplyingRecordUpdates ? t('patient.aiChat.applying') : t('patient.aiChat.applyUpdates')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDismissPendingUpdates()}
                        disabled={isApplyingRecordUpdates}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        {t('patient.aiChat.notNow')}
                      </button>
                    </div>
                    {recordUpdateFeedback ? (
                      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-slate-900/60 px-4 py-3 text-sm text-amber-100">
                        {recordUpdateFeedback}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {showStarterOptions ? (
                  <>
                    <div className="mb-8 text-center">
                      <h2
                        className="mb-2 text-3xl font-bold text-white"
                        style={PLAYFAIR}
                      >
                        {t('patient.aiChat.greeting', { name: firstName })} 👋
                      </h2>
                      <p className="text-lg text-white/70">{t('patient.aiChat.howCanHelp')}</p>
                    </div>

                    <div className="mx-auto mb-8 max-w-xl">
                      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
                        <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                          <div className="mt-0.5 text-amber-400">⚠️</div>
                          <p className="text-sm leading-relaxed text-amber-200">
                            {t('patient.aiChat.safety')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto mb-8 max-w-xl">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-teal-400">
                          {t('patient.aiChat.healthSummary')}
                        </p>
                        <div className="mb-6 grid grid-cols-2 gap-8">
                          <div>
                            <p className="mb-1 font-mono text-xs text-white/50">
                              {t('patient.aiChat.labelHba1c')}
                            </p>
                            <p
                              className={`font-mono text-2xl font-bold ${
                                hba1cTrend === 'improving'
                                  ? 'text-emerald-300'
                                  : hba1cTrend === 'rising'
                                    ? 'text-amber-300'
                                    : 'text-white'
                              }`}
                            >
                              {latestHba1c !== null
                                ? `${latestHba1c.toFixed(1)}${dashboardData?.latestHba1c?.unit ? ` ${dashboardData.latestHba1c.unit}` : '%'}`
                                : t('patient.aiChat.metricNone')}
                            </p>
                            {hba1cStatusText ? (
                              <p className="mt-1 text-xs text-emerald-400">{hba1cStatusText}</p>
                            ) : null}
                          </div>
                          <div>
                            <p className="mb-1 font-mono text-xs text-white/50">
                              {t('patient.aiChat.labelBloodPressure')}
                            </p>
                            <p
                              className={`font-mono text-2xl font-bold ${
                                bpClass === 'controlled'
                                  ? 'text-white'
                                  : bpClass === 'elevated'
                                    ? 'text-amber-300'
                                    : bpClass === 'uncontrolled'
                                      ? 'text-red-300'
                                      : 'text-white'
                              }`}
                            >
                              {latestBp
                                ? `${latestBp.systolic}/${latestBp.diastolic}`
                                : t('patient.aiChat.metricNone')}
                            </p>
                            {bpStatusText ? (
                              <p className="mt-1 text-xs text-emerald-400">{bpStatusText}</p>
                            ) : null}
                          </div>
                          <div>
                            <p className="mb-1 font-mono text-xs text-white/50">
                              {t('patient.aiChat.labelMedications')}
                            </p>
                            <p className="font-mono text-2xl font-bold text-teal-300">
                              {activeMedicationsCount}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {activeMedicationsCount > 0
                                ? t('patient.aiChat.medsActive')
                                : t('patient.aiChat.medsInactive')}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 font-mono text-xs text-white/50">
                              {t('patient.aiChat.labelNextVisit')}
                            </p>
                            <p className="font-mono text-2xl font-bold text-white">
                              {nextAppointment
                                ? formatShortDate(nextAppointment.scheduledAt, lang)
                                : t('patient.aiChat.metricNone')}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {nextAppointment
                                ? t('patient.aiChat.nextVisitWithDoctor', {
                                    name: nextAppointment.doctorName,
                                  })
                                : t('patient.aiChat.nextVisitNone')}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-xs leading-relaxed text-red-200/90">{allergyText}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto mb-8 max-w-2xl">
                      <p className="mb-4 text-center font-mono text-xs uppercase tracking-wider text-white/40">
                        {t('patient.aiChat.tryAsking')}
                      </p>
                      <div className={`flex flex-wrap justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {suggestionPills.map((pill, index) => (
                          <button
                            key={`${pill.text}-${index}`}
                            type="button"
                            onClick={() => void handleSendMessage({ submittedMessage: pill.text })}
                            className="flex-shrink-0 rounded-full border border-teal-500/30 bg-teal-900/20 px-5 py-2.5 text-sm text-teal-200 transition-all hover:scale-105 hover:bg-teal-900/30 hover:shadow-lg hover:shadow-teal-500/10"
                          >
                            {pill.icon} {pill.text}
                          </button>
                        ))}
                      </div>
                      {outstandingPreVisitAssessment ? (
                        <div className={`mt-4 flex justify-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/patient/pre-visit/${outstandingPreVisitAssessment.id}`)
                            }
                            className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                          >
                            🩺 {t('patient.aiChat.continuePreVisit')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {!loading &&
                  !error &&
                  !showStarterOptions &&
                  messages.map((message, index) => {
                    const isAssistant = message.role !== 'user';
                    const fileAttachments = getFileAttachments(message);
                    const historyBadges = getHistoryBadges(message);
                    const suggestedActions = getSuggestedActions(message);

                    if (isAssistant) {
                      return (
                        <div key={message.id} className="mb-8 flex justify-start">
                          <div className={`flex max-w-[85%] items-start gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900">
                              <Bot className="h-6 w-6 text-teal-400" />
                            </div>
                            <div className="flex-1">
                              <div className="rounded-3xl rounded-tl-sm border border-teal-500/20 bg-teal-900/[0.12] p-6 shadow-lg shadow-teal-500/5">
                                {index === 0 ? (
                                  <div className="mb-3">
                                    <p
                                      className="text-sm font-bold text-teal-300"
                                      style={PLAYFAIR}
                                    >
                                      {t('patient.aiChat.heroBrand')}
                                    </p>
                                    <p className="font-mono text-xs text-teal-400/60">
                                      {t('patient.aiChat.personalizedFor', { name: firstName })}
                                    </p>
                                  </div>
                                ) : null}
                                <div className="whitespace-pre-line text-[15px] leading-relaxed text-white/90">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      p: ({ children }) => <p className="mt-3 first:mt-0">{children}</p>,
                                      ol: ({ children }) => (
                                        <ol className="mt-3 list-decimal space-y-2 pl-5 first:mt-0">{children}</ol>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="mt-3 list-disc space-y-2 pl-5 first:mt-0">{children}</ul>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-white">{children}</strong>
                                      ),
                                      a: ({ children, href }) => (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="font-medium text-teal-300 underline"
                                        >
                                          {children}
                                        </a>
                                      ),
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                                {fileAttachments.length > 0 ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {fileAttachments.map((attachment) => (
                                      <span
                                        key={attachment.path}
                                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70"
                                      >
                                        {attachment.fileName}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {historyBadges.length > 0 ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {historyBadges.map((badge) => (
                                      <span
                                        key={badge}
                                        className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-200"
                                      >
                                        {t('patient.aiChat.usedPrefix', { label: badge })}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {suggestedActions.length > 0 ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {suggestedActions.map((action) => (
                                      <button
                                        key={`${message.id}-${action.href}`}
                                        type="button"
                                        onClick={() => navigate(action.href)}
                                        className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 transition hover:bg-teal-500"
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="mt-4 border-t border-white/5 pt-4">
                                  <p className="text-xs italic text-white/30">
                                    ℹ️ {t('patient.aiChat.disclaimer')}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100">
                                <button
                                  type="button"
                                  disabled
                                  title={t('patient.aiChat.feedbackComingSoon', { defaultValue: 'Feedback — coming soon' })}
                                  className="cursor-not-allowed p-1.5 text-white/20"
                                  aria-label="thumbs up"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  title={t('patient.aiChat.feedbackComingSoon', { defaultValue: 'Feedback — coming soon' })}
                                  className="cursor-not-allowed p-1.5 text-white/20"
                                  aria-label="thumbs down"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    typeof navigator !== 'undefined' && navigator.clipboard
                                      ? void navigator.clipboard.writeText(message.content)
                                      : undefined
                                  }
                                  className="p-1.5 text-white/30 transition hover:text-white/70"
                                  aria-label="copy"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  title={t('patient.aiChat.shareComingSoon', { defaultValue: 'Share — coming soon' })}
                                  className="cursor-not-allowed p-1.5 text-white/20"
                                  aria-label="share"
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  title={t('patient.aiChat.regenerateComingSoon', {
                                    defaultValue: 'Regenerate — coming soon',
                                  })}
                                  className="cursor-not-allowed p-1.5 text-white/20"
                                  aria-label="regenerate"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className="mb-8 flex justify-end">
                        <div className="max-w-[70%]">
                          <div className="rounded-3xl rounded-tr-sm bg-teal-600 p-6 shadow-lg shadow-teal-500/30">
                            {fileAttachments.length > 0 ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {fileAttachments.map((attachment) => (
                                  <span
                                    key={attachment.path}
                                    className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
                                  >
                                    {attachment.fileName}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white">
                              {message.content}
                            </p>
                          </div>
                          <p className="mt-1 text-right font-mono text-xs text-white/30">
                            {formatTimestamp(message.createdAt, lang)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                {isSending ? (
                  <div className="mb-8 flex max-w-[85%] items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900">
                      <Bot className="h-6 w-6 text-teal-400" />
                    </div>
                    <div className="rounded-3xl rounded-tl-sm border border-teal-500/20 bg-teal-900/[0.12] p-6">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '200ms' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '400ms' }} />
                      </div>
                      <p className="font-mono text-xs italic text-teal-300/60">
                        {t('patient.aiChat.thinking')}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-white/5 bg-slate-900/80 px-4 py-6 backdrop-blur-xl sm:px-8">
              <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
                {sendError ? (
                  <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200" role="alert">
                    {sendError}
                  </div>
                ) : null}
                {recordUpdateFeedback && pendingCanonicalUpdates.length === 0 ? (
                  <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                    {recordUpdateFeedback}
                  </div>
                ) : null}
                {pendingFiles.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingFiles.map((file) => (
                      <button
                        key={`${file.name}-${file.size}`}
                        type="button"
                        onClick={() => handleRemovePendingFile(file.name)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
                      >
                        {file.name}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className={`flex items-end gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl p-3 text-white/40 transition hover:bg-white/5 hover:text-white/80"
                    title={t('patient.aiChat.attach')}
                    aria-label={t('patient.aiChat.attach')}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-xl p-3 text-white/40 transition hover:bg-white/5 hover:text-white/80"
                    title={t('patient.aiChat.voiceInput')}
                    aria-label={t('patient.aiChat.voiceInput')}
                    disabled
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                  />

                  <label className="flex-1">
                    <span className="sr-only">{t('patient.aiChat.inputSrOnly')}</span>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      maxLength={FORM_FIELD_LIMITS.chatMessage}
                      onChange={(event) => setInput(event.target.value)}
                      rows={1}
                      placeholder={t('patient.aiChat.inputPhLong')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      className="w-full resize-none rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className={`rounded-xl p-4 transition-all ${
                      isSending || !input.trim()
                        ? 'bg-white/10 text-white/30'
                        : 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/40 hover:scale-[1.04]'
                    }`}
                    aria-label={t('patient.aiChat.send')}
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-white/20">
                  <ShieldCheck className="h-3 w-3" />
                  {t('patient.aiChat.encrypted')}
                </p>
              </form>
            </div>
          </div>

          {isHistoryOpen ? (
            <aside className="hidden w-72 shrink-0 flex-col border-l border-white/5 bg-slate-900/60 md:flex">
              <div className="border-b border-white/5 px-4 py-4">
                <div className={`flex items-center justify-between gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{t('patient.aiChat.chats')}</h3>
                    <p className="mt-0.5 text-xs text-white/50">{t('patient.aiChat.chatsSub')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewSession}
                    className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-teal-500/30 transition hover:bg-teal-500"
                  >
                    {t('patient.aiChat.newChatShort')}
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                <button
                  type="button"
                  onClick={startNewSession}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedSessionId === null
                      ? 'border-teal-500/40 bg-teal-500/10'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-white/90">{t('patient.aiChat.newChat')}</p>
                  <p className="mt-1 text-xs text-white/50">{t('patient.aiChat.newChatSub')}</p>
                </button>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setSendError(null);
                      setIsHistoryOpen(false);
                    }}
                    title={session.preview}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedSessionId === session.id
                        ? 'border-teal-500/40 bg-teal-500/10'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                    }`}
                  >
                    <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <p className="text-sm font-semibold text-white/80">
                        {formatShortDate(session.lastMessageAt, lang)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-white/40">
                        {t('patient.aiChat.previous')}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/60">{session.preview}</p>
                  </button>
                ))}
                {!loading && sessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-transparent px-4 py-5 text-sm text-white/40">
                    {t('patient.aiChat.noChats')}
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
};
