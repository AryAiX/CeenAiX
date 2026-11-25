import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { announceNotificationsChanged } from '../../lib/notification-events';
import { safePortalActionPath } from '../../lib/notification-links';
import { formatLocaleDigits, formatRelativeTime } from '../../lib/i18n-ui';
import { formatClinicDate } from '../../lib/clinic-booking-time';
import { Bell, CheckCheck, Loader2, RefreshCcw, X } from 'lucide-react';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

/** QA-225: at most this many notifications are loaded (newest first). */
const NOTIFICATION_LIMIT = 200;

/** QA-225: "5 minutes ago" in the UI language for the last week, then the date (clinic time). */
function notificationTime(t: TFunction, value: string, language: string): string {
  const ageMs = Date.now() - new Date(value).getTime();
  return ageMs < 7 * 24 * 60 * 60 * 1000 ? formatRelativeTime(t, value) : formatClinicDate(value, language);
}

const typeColor: Record<string, string> = {
  appointment: 'bg-teal-50 text-teal-700',
  system: 'bg-blue-50 text-blue-700',
  alert: 'bg-amber-50 text-amber-700',
  medication: 'bg-emerald-50 text-emerald-700',
  lab_result: 'bg-violet-50 text-violet-700',
};

export default function ClinicNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const P = 'clinic.notificationsPage';
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'system'>('all');

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type, title, body, action_url, is_read, created_at')
        .eq('user_id', user!.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LIMIT);

      if (fetchError) throw fetchError;
      setNotifications(data ?? []);
    } catch (err) {
      // QA-225: plain message in the UI language; the database text stays in the console
      console.warn('[ClinicNotifications] load failed', err);
      setError(t('clinic.notificationsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string): Promise<boolean> => {
    setBusyId(id);
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (updateError) throw updateError;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      announceNotificationsChanged();
      return true;
    } catch (err) {
      console.warn('[ClinicNotifications] update failed', err);
      setError(t('clinic.notificationsPage.updateFailed'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  // QA-223: like the doctor page (QA-163), opening an unread notification also marks it read,
  // then goes to the page.
  const openNotification = async (notification: NotificationRow, path: string) => {
    if (!notification.is_read) {
      await markRead(notification.id);
    }
    navigate(path);
  };

  const markAllRead = async () => {
    setBusyId('all');
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (updateError) throw updateError;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      announceNotificationsChanged();
    } catch (err) {
      console.warn('[ClinicNotifications] update failed', err);
      setError(t('clinic.notificationsPage.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (id: string) => {
    setBusyId(id);
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (updateError) throw updateError;
      setNotifications(prev => prev.filter(n => n.id !== id));
      announceNotificationsChanged();
    } catch (err) {
      console.warn('[ClinicNotifications] update failed', err);
      setError(t('clinic.notificationsPage.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${P}.title`)}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t(`${P}.subtitle`)}</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{t(`${P}.unreadLabel`)}</p>
          <p data-testid="clinic-unread-notifications" className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(unreadCount, lang)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void fetchData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> {t(`${P}.refresh`)}
          </button>
          <button type="button" onClick={() => void markAllRead()} disabled={busyId === 'all' || unreadCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
            {busyId === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />}
            {t(`${P}.markAllRead`)}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-teal-600" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900">{t(`${P}.activityLog`)}</h3>
        </div>

        <div role="group" aria-label={t(`${P}.filtersLabel`)} className="flex flex-wrap gap-2">
          {(['all', 'unread', 'appointment', 'system'] as const).map(value => ({ value, label: t(`${P}.filters.${value}`) })).map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filter === opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === opt.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t(`${P}.empty`)}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const typeLabel = typeColor[n.type] ? t(`${P}.types.${n.type}`) : n.type;
              const typeClass = typeColor[n.type] ?? 'bg-slate-50 text-slate-600';
              const titleId = `clinic-notification-${n.id}`;
              // QA-223: action_url comes from the database; only follow an in-app /clinic/... path
              const actionPath = safePortalActionPath('clinic', n.action_url);
              return (
                <div key={n.id} className={`rounded-2xl border p-4 ${n.is_read ? 'border-slate-200 bg-slate-50' : 'border-teal-200 bg-teal-50/50'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeClass}`}>{typeLabel}</span>
                        <p id={titleId} className="font-semibold text-slate-900">{n.title}</p>
                        {!n.is_read && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">{t(`${P}.new`)}</span>}
                      </div>
                      {n.body ? <p className="mt-2 text-sm text-slate-600">{n.body}</p> : null}
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        <time dateTime={n.created_at}>{notificationTime(t, n.created_at, lang)}</time>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {actionPath ? (
                        <button type="button" onClick={() => void openNotification(n, actionPath)} disabled={busyId === n.id} aria-describedby={titleId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                          {t(`${P}.open`)}
                        </button>
                      ) : null}
                      {!n.is_read ? (
                        <button type="button" onClick={() => void markRead(n.id)} disabled={busyId === n.id} aria-describedby={titleId} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
                          {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
                          {t(`${P}.markRead`)}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => void dismiss(n.id)} disabled={busyId === n.id} aria-describedby={titleId} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-60">
                        {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                        {t(`${P}.dismiss`)}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {notifications.length >= NOTIFICATION_LIMIT ? (
          <p className="text-center text-xs text-slate-400">
            {t(`${P}.latestOnly`, { value: formatLocaleDigits(NOTIFICATION_LIMIT, lang) })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
