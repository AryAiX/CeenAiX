import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, MessageSquare, Package, RefreshCcw } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { PHARMACY_NAV_ITEMS } from './navItems';
import { Skeleton } from '../../components/Skeleton';
import { usePharmacyNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { formatLocaleDigits, formatRelativeTime } from '../../lib/i18n-ui';
import { supabase } from '../../lib/supabase';

export const PharmacyNotifications: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePharmacyNotifications(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');

  const markRead = async (notificationId: string) => {
    setBusyId(notificationId);
    setActionError(null);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user?.id ?? '');

    setBusyId(null);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    refetch();
  };

  const markAllRead = async () => {
    setBusyId('all');
    setActionError(null);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id ?? '')
      .eq('is_read', false);

    setBusyId(null);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    refetch();
  };

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'unread') return (data?.notifications ?? []).filter((n) => !n.is_read);
    if (notificationFilter === 'read') return (data?.notifications ?? []).filter((n) => n.is_read);
    return data?.notifications ?? [];
  }, [data?.notifications, notificationFilter]);

  const storedNotifications = data?.notifications ?? [];
  const unreadCount = storedNotifications.filter((notification) => !notification.is_read).length;
  const liveAttentionItems = data?.derivedNotifications ?? [];

  return (
    <OpsShell
      title={t('pharmacy.notifications.title', { defaultValue: 'Notifications' })}
      subtitle={t('pharmacy.notifications.subtitle', {
        defaultValue: 'Stay on top of prescriptions and messages from patients and doctors.',
      })}
      navItems={PHARMACY_NAV_ITEMS(t, {})}
      accent="emerald"
      variant="pharmacy"
    >
      <div className="flex min-h-full flex-col overflow-y-auto bg-slate-50 p-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {error ? (
              <div role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {error}
                <button type="button" onClick={refetch} className="ml-2 font-semibold underline">
                  Retry
                </button>
              </div>
            ) : null}

            {actionError ? (
              <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t('pharmacy.notifications.unreadCount', { defaultValue: 'Unread notification log items' })}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatLocaleDigits(unreadCount, uiLang)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={refetch}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>{t('pharmacy.notifications.refresh', { defaultValue: 'Refresh' })}</span>
                  </button>
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={busyId === 'all' || unreadCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                  >
                    {busyId === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    <span>{t('pharmacy.notifications.markAllRead', { defaultValue: 'Mark all read' })}</span>
                  </button>
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  {t('pharmacy.notifications.liveAttention', { defaultValue: 'What needs your attention' })}
                </h2>
              </div>

              {liveAttentionItems.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('pharmacy.notifications.noLiveAttention', { defaultValue: 'Nothing needs your attention right now.' })}
                </p>
              ) : (
                <div className="space-y-3">
                  {liveAttentionItems.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => navigate(notification.actionUrl)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        notification.kind === 'new_prescription'
                          ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50'
                          : 'border-slate-200 bg-slate-50 hover:border-teal-200 hover:bg-teal-50/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {notification.kind === 'new_prescription' ? (
                            <Package className="h-4 w-4 shrink-0 text-amber-600" />
                          ) : (
                            <MessageSquare className="h-4 w-4 shrink-0 text-teal-600" />
                          )}
                          <p className="font-semibold text-slate-900">{notification.title}</p>
                        </div>
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
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    {t('pharmacy.notifications.logTitle', { defaultValue: 'Notification log' })}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'unread', 'read'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setNotificationFilter(filter)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        notificationFilter === filter
                          ? 'bg-teal-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filter === 'all' ? `All (${formatLocaleDigits(storedNotifications.length, uiLang)})`
                        : filter === 'unread' ? `Unread (${formatLocaleDigits(unreadCount, uiLang)})`
                        : `Read (${formatLocaleDigits(storedNotifications.length - unreadCount, uiLang)})`}
                    </button>
                  ))}
                </div>
              </div>

              {filteredNotifications.length === 0 ? (
                <p className="text-sm text-slate-600">
                  {notificationFilter === 'unread' ? 'No unread notifications.'
                    : notificationFilter === 'read' ? 'No read notifications.'
                    : t('pharmacy.notifications.emptyLog', { defaultValue: 'No notifications yet.' })}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-2xl border p-4 ${
                        notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-teal-200 bg-teal-50/50'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{notification.title}</p>
                            {!notification.is_read ? (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                                {t('pharmacy.notifications.unreadBadge', { defaultValue: 'New' })}
                              </span>
                            ) : null}
                          </div>
                          {notification.body ? <p className="mt-2 text-sm text-slate-600">{notification.body}</p> : null}
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {formatRelativeTime(t, notification.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {notification.action_url ? (
                            <button
                              type="button"
                              onClick={() => navigate(notification.action_url ?? '/pharmacy/dashboard')}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {t('pharmacy.notifications.open', { defaultValue: 'Open' })}
                            </button>
                          ) : null}
                          {!notification.is_read ? (
                            <button
                              type="button"
                              onClick={() => markRead(notification.id)}
                              disabled={busyId === notification.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                            >
                              {busyId === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                              <span>{t('pharmacy.notifications.markRead', { defaultValue: 'Mark read' })}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </OpsShell>
  );
};
