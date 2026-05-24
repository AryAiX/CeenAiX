import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, Send } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { sendPharmacyResponse, usePharmacyPrescriptionQueue } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { PHARMACY_NAV_ITEMS } from './navItems';

interface PharmacyMessage {
  id: string;
  contact: string;
  specialty: string;
  type: 'doctor' | 'patient' | 'system' | 'dha';
  status: 'awaiting' | 'sent' | 'resolved' | 'info';
  unread: number;
  lastMessage: string;
  thread: Array<{ sender: 'pharmacy' | 'contact'; kind: 'query' | 'approval' | 'info' | 'response'; content: string; time: string }>;
}

const typeStyles: Record<PharmacyMessage['type'], { border: string; bg: string; tag: string; avatar: string }> = {
  doctor: { border: 'border-l-amber-500', bg: 'bg-amber-50', tag: 'DOCTOR', avatar: 'bg-amber-500' },
  patient: { border: 'border-l-teal-500', bg: 'bg-teal-50', tag: 'PATIENT', avatar: 'bg-teal-500' },
  system: { border: 'border-l-slate-400', bg: 'bg-slate-50', tag: 'SYSTEM', avatar: 'bg-slate-500' },
  dha: { border: 'border-l-red-500', bg: 'bg-red-50', tag: 'DHA', avatar: 'bg-red-500' },
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .padEnd(2, 'X')
    .toUpperCase();

export const PharmacyMessages = () => {
  const { t } = useTranslation('common');
  const { data, error: loadError, refetch } = usePharmacyPrescriptionQueue();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);
  const messages = useMemo<PharmacyMessage[]>(() => {
    return (data?.messages ?? []).map((message) => {
      const contactTime = new Date(message.lastMessageAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return {
        id: message.id,
        contact: message.contactName,
        specialty: message.specialty,
        type: message.messageType,
        status: message.status,
        unread: message.unreadCount,
        lastMessage: message.lastMessage,
        thread: [
          {
            sender: 'contact',
            kind: message.messageType === 'dha' ? 'approval' : message.status === 'awaiting' ? 'query' : 'info',
            content: message.contactMessage,
            time: contactTime,
          },
          ...(message.pharmacyResponse
            ? [
                {
                  sender: 'pharmacy' as const,
                  kind: 'response' as const,
                  content: message.pharmacyResponse,
                  time: contactTime,
                },
              ]
            : []),
        ],
      };
    });
  }, [data?.messages]);

  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? 'msg-doctor');
  const selected = messages.find((message) => message.id === selectedId) ?? messages[0];
  const style = selected ? typeStyles[selected.type] : null;
  const fallbackName = t('pharmacy.messages.fallbackName', { defaultValue: 'Pharmacy' });

  const handleSendDraft = async () => {
    if (!selected || draft.trim().length === 0) return;
    setFeedback(null);
    setSending(true);
    try {
      await sendPharmacyResponse(selected.id, draft);
      setDraft('');
      setFeedback({
        kind: 'success',
        text: t('pharmacy.messages.sendSuccess', {
          defaultValue: 'Reply saved on the thread and marked resolved.',
        }),
      });
      refetch();
    } catch (error) {
      setFeedback({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : t('pharmacy.messages.sendError', { defaultValue: 'Could not send reply.' }),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <OpsShell
      title={t('pharmacy.messages.title', { defaultValue: 'Messages' })}
      subtitle={`${data?.profile?.displayName ?? data?.organization?.name ?? fallbackName} ${t('pharmacy.messages.communicationsSuffix', { defaultValue: 'communications' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: messages.reduce((sum, item) => sum + item.unread, 0) || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={loadError} onRetry={() => void refetch()} />
      <div className="flex min-h-full bg-slate-50">
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-100 px-4 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">
              {t('pharmacy.messages.title', { defaultValue: 'Messages' })}
            </h2>
            <div className="text-xs text-slate-400">
              {t('pharmacy.messages.sidebarSubtitle', { defaultValue: 'Pharmacy communications' })}
            </div>
          </div>
          {messages.map((message) => {
            const itemStyle = typeStyles[message.type];
            const active = message.id === selected.id;
            return (
              <button
                key={message.id}
                type="button"
                onClick={() => setSelectedId(message.id)}
                className={`border-l-4 border-b border-slate-50 px-4 py-3.5 text-left transition ${itemStyle.border} ${
                  active ? itemStyle.bg : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${itemStyle.avatar}`}>
                    {initialsFor(message.contact)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-slate-800">{message.contact}</div>
                    <div className="truncate text-[11px] text-slate-500">{message.lastMessage}</div>
                  </div>
                  {message.unread ? (
                    <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {message.unread}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    {itemStyle.tag}
                  </span>
                  <span className="truncate text-[10px] text-slate-400">{message.specialty}</span>
                </div>
              </button>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {selected && style ? (
            <>
              <div className={`shrink-0 border-b border-slate-200 px-6 py-4 ${style.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${style.avatar}`}>
                    {initialsFor(selected.contact)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{selected.contact}</div>
                    <div className="text-xs text-slate-500">{selected.specialty}</div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">
                    {t(`pharmacy.messages.status.${selected.status}`, { defaultValue: selected.status })}
                  </span>
                </div>
              </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {selected.thread.map((entry, index) => {
              const fromPharmacy = entry.sender === 'pharmacy';
              const Icon = entry.kind === 'approval' ? CheckCircle2 : entry.kind === 'query' ? AlertCircle : Info;
              return (
                <div key={`${entry.time}-${index}`} className={`flex ${fromPharmacy ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[68%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      fromPharmacy
                        ? 'rounded-br bg-emerald-600 text-white'
                        : entry.kind === 'query'
                          ? 'rounded-bl border border-amber-200 bg-amber-50 text-slate-800'
                          : entry.kind === 'approval'
                            ? 'rounded-bl border border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'rounded-bl border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {!fromPharmacy ? (
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <Icon className="h-3 w-3" />
                        {t(`pharmacy.messages.kind.${entry.kind}`, { defaultValue: entry.kind })}
                      </div>
                    ) : null}
                    <div className="leading-6">{entry.content}</div>
                    <div className={`mt-2 text-right font-mono text-[10px] ${fromPharmacy ? 'text-white/60' : 'text-slate-400'}`}>
                      {entry.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-slate-500">
              {t('pharmacy.messages.emptyState', { defaultValue: 'No messages yet.' })}
            </div>
          )}

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendDraft();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                placeholder={t('pharmacy.messages.responsePlaceholder', {
                  defaultValue: 'Type a secure pharmacy response...',
                })}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                aria-label={t('pharmacy.messages.responsePlaceholder', {
                  defaultValue: 'Type a secure pharmacy response...',
                })}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || draft.trim().length === 0}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                aria-label={t('messaging.sendMessage', { defaultValue: 'Send message' })}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {feedback ? (
              <p
                role="alert"
                className={`mt-2 text-[11px] ${
                  feedback.kind === 'error' ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {feedback.text}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    </OpsShell>
  );
};
