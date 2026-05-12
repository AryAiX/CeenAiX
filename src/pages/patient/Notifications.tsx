import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, CheckCheck, FlaskConical, Loader2, Pill, RefreshCcw, Shield, Sparkles, Trash2 } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { formatRelativeTime } from '../../lib/i18n-ui';
import { supabase } from '../../lib/supabase';

export const PatientNotifications: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientNotifications(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [undoDeleteId, setUndoDeleteId] = useState<string | null>(null);
  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const markRead = async (notificationId: string) => {
    setBusyId(notificationId);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user?.id ?? '');

    setBusyId(null);

    if (!updateError) {
      refetch();
    }
  };

  const markAllRead = async () => {
    setBusyId('all');
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id ?? '')
      .eq('is_read', false);

    setBusyId(null);

    if (!updateError) {
      refetch();
    }
  };

  const deleteNotification = (notificationId: string) => {
    setDeletedIds((prev) => new Set(prev).add(notificationId));
    setUndoDeleteId(notificationId);

    const timer = setTimeout(async () => {
      setUndoDeleteId((current) => (current === notificationId ? null : current));
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id ?? '');
      refetch();
      delete undoTimers.current[notificationId];
    }, 5000);

    undoTimers.current[notificationId] = timer;
  };

  const undoDelete = (notificationId: string) => {
    clearTimeout(undoTimers.current[notificationId]);
    delete undoTimers.current[notificationId];
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(notificationId);
      return next;
    });
    setUndoDeleteId((current) => (current === notificationId ? null : current));
  };

  const getNotificationStyle = (title: string) => {
    const lower = title.toLowerCase();
    if (/lab|result|test/.test(lower)) {
      return { Icon: FlaskConical, iconBg: 'bg-violet-100', iconColor: 'text-violet-600', borderColor: 'border-violet-200', unreadBg: 'bg-violet-50/50' };
    }
    if (/prescription|medication|refill|medicine/.test(lower)) {
      return { Icon: Pill, iconBg: 'bg-teal-100', iconColor: 'text-teal-600', borderColor: 'border-teal-200', unreadBg: 'bg-teal-50/50' };
    }
    if (/appointment|booking|schedule/.test(lower)) {
      return { Icon: Calendar, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-blue-200', unreadBg: 'bg-blue-50/50' };
    }
    if (/insurance|claim|coverage/.test(lower)) {
      return { Icon: Shield, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', borderColor: 'border-amber-200', unreadBg: 'bg-amber-50/50' };
    }
    return { Icon: Bell, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'border-emerald-200', unreadBg: 'bg-emerald-50/50' };
  };

  if (loading) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('patient.notifications.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('patient.notifications.subtitle')}</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  const allStoredNotifications = data?.notifications ?? [];
  const storedNotifications = allStoredNotifications.filter((n) => !deletedIds.has(n.id));
  const unreadCount = storedNotifications.filter((notification) => !notification.is_read).length;
  const liveAttentionItems = data?.derivedNotifications ?? [];
  const hasAnyNotifications = storedNotifications.length > 0 || liveAttentionItems.length > 0;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('patient.notifications.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('patient.notifications.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('patient.notifications.loadError')}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('patient.notifications.unreadCount')}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refetch}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>{t('patient.notifications.refresh')}</span>
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={busyId === 'all' || unreadCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {busyId === 'all' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                <span>{t('patient.notifications.markAllRead')}</span>
              </button>
            </div>
          </div>
        </div>

        {!hasAnyNotifications ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
                <Bell className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">You're all caught up! 🎉</h2>
              <p className="mt-3 max-w-md text-sm text-slate-500">
                No new notifications at the moment. We'll notify you when something needs your attention.
              </p>

              {/* Info cards */}
              <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-3">
                {[
                  { emoji: '🔬', label: 'Lab Results', desc: 'When your lab results are ready' },
                  { emoji: '💊', label: 'Medications', desc: 'Refill reminders and new prescriptions' },
                  { emoji: '📅', label: 'Appointments', desc: 'Upcoming appointment reminders' },
                ].map(({ emoji, label, desc }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4 text-left">
                    <div className="mb-1.5 text-2xl">{emoji}</div>
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={refetch}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-semibold text-slate-900">{t('patient.notifications.liveAttention')}</h2>
          </div>

          {liveAttentionItems.length === 0 ? (
            <p className="text-sm text-slate-500">{t('patient.notifications.noLiveAttention')}</p>
          ) : (
            <div className="space-y-3">
              {liveAttentionItems.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => navigate(notification.actionUrl)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{notification.title}</p>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatRelativeTime(t, notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">{t('patient.notifications.logTitle')}</h2>
          </div>

          {allStoredNotifications.length === 0 ? (
            <p className="text-sm text-slate-600">{t('patient.notifications.emptyLog')}</p>
          ) : (
            <div className="space-y-3">
              {allStoredNotifications.map((notification) => {
                if (deletedIds.has(notification.id)) {
                  return undoDeleteId === notification.id ? (
                    <div
                      key={notification.id}
                      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <span className="text-sm text-amber-700">Notification deleted</span>
                      <button
                        type="button"
                        onClick={() => undoDelete(notification.id)}
                        className="text-sm font-bold text-amber-700 underline hover:text-amber-900"
                      >
                        Undo
                      </button>
                    </div>
                  ) : null;
                }

                const style = getNotificationStyle(notification.title);
                const { Icon } = style;
                return (
                  <div
                    key={notification.id}
                    className={`rounded-2xl border p-4 ${
                      notification.is_read
                        ? 'border-slate-200 bg-slate-50'
                        : `${style.borderColor} ${style.unreadBg}`
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
                          <Icon className={`h-4 w-4 ${style.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{notification.title}</p>
                          {!notification.is_read ? (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.iconBg} ${style.iconColor}`}>
                              {t('patient.notifications.unreadBadge')}
                            </span>
                          ) : null}
                        </div>
                        {notification.body ? (
                          <p className="mt-2 text-sm text-slate-600">{notification.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {formatRelativeTime(t, notification.created_at)}
                        </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {notification.action_url ? (
                          <button
                            type="button"
                            onClick={() => navigate(notification.action_url ?? '/patient/dashboard')}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {t('patient.notifications.open')}
                          </button>
                        ) : null}
                        {!notification.is_read ? (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            disabled={busyId === notification.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {busyId === notification.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCheck className="h-4 w-4" />
                            )}
                            <span>{t('patient.notifications.markRead')}</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteNotification(notification.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </>
  );
};
