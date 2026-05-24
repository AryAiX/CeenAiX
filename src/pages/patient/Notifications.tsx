import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { formatLocaleDigits, formatRelativeTime } from '../../lib/i18n-ui';
import { supabase } from '../../lib/supabase';

export const PatientNotifications: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientNotifications(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const markRead = async (notificationId: string) => {
    if (!user?.id) return;
    setBusyId(notificationId);
    setActionError(null);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    setBusyId(null);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    refetch();
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setBusyId('all');
    setActionError(null);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setBusyId(null);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    refetch();
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

  const storedNotifications = data?.notifications ?? [];
  const unreadCount = storedNotifications.filter((notification) => !notification.is_read).length;
  const liveAttentionItems = data?.derivedNotifications ?? [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('patient.notifications.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('patient.notifications.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
          >
            {error}
            <button
              type="button"
              onClick={refetch}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {actionError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {t('patient.notifications.actionError', {
              defaultValue: 'Could not update notification: {{message}}',
              message: actionError,
            })}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('patient.notifications.unreadCount')}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatLocaleDigits(unreadCount, i18n.language)}</p>
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{notification.title}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatRelativeTime(t, notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{notification.body}</p>
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

          {storedNotifications.length === 0 ? (
            <p className="text-sm text-slate-600">{t('patient.notifications.emptyLog')}</p>
          ) : (
            <div className="space-y-3">
              {storedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.is_read
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-emerald-200 bg-emerald-50/50'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{notification.title}</p>
                        {!notification.is_read ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};
