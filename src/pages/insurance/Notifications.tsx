import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, AlertTriangle, ClipboardList, RefreshCcw } from 'lucide-react';
import InsuranceShell, { useInsurancePageData } from './InsuranceShell';
import { useInsuranceNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

interface InsuranceDerivedNotification {
  id: string;
  kind: 'overdue_preauth' | 'fraud_alert';
  title: string;
  body: string;
  createdAt: string;
  actionUrl: string;
}

export const InsuranceNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, refetch } = useInsurancePageData();
  const { data: notifData, loading, error: notifError, refetch: notifRefetch } = useInsuranceNotifications(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');

  const derivedNotifications = useMemo<InsuranceDerivedNotification[]>(() => {
    const items: InsuranceDerivedNotification[] = [];

    for (const pa of data?.preAuthorizations ?? []) {
      if (pa.status === 'overdue') {
        items.push({
          id: `preauth-${pa.id}`,
          kind: 'overdue_preauth',
          title: `Pre-authorization overdue — ${pa.patientName}`,
          body: `${pa.procedureName}${pa.providerName ? ` at ${pa.providerName}` : ''} has breached its SLA.`,
          createdAt: pa.slaDueAt,
          actionUrl: '/insurance/preauth',
        });
      }
    }

    for (const alert of data?.fraudAlerts ?? []) {
      if (alert.severity === 'high' && !alert.closedAt) {
        items.push({
          id: `fraud-${alert.id}`,
          kind: 'fraud_alert',
          title: `High-risk fraud alert — ${alert.subjectName}`,
          body: alert.reason,
          createdAt: alert.assignedAt ?? new Date().toISOString(),
          actionUrl: '/insurance/fraud',
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, 25);
  }, [data]);

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
    notifRefetch();
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
    notifRefetch();
  };

  const storedNotifications = notifData?.notifications ?? [];
  const unreadCount = storedNotifications.filter((n) => !n.is_read).length;

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'unread') return storedNotifications.filter((n) => !n.is_read);
    if (notificationFilter === 'read') return storedNotifications.filter((n) => n.is_read);
    return storedNotifications;
  }, [storedNotifications, notificationFilter]);

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <div className="p-6 space-y-6 bg-slate-50 min-h-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            SLA breaches, high-risk fraud alerts, and your saved notification log.
          </p>
        </div>

        {notifError ? (
          <div role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {notifError}
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
              <p className="text-sm font-medium text-slate-500">Unread notification log items</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => notifRefetch()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={busyId === 'all' || unreadCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {busyId === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                <span>Mark all read</span>
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">What needs your attention</h2>
          </div>

          {derivedNotifications.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing needs your attention right now.</p>
          ) : (
            <div className="space-y-3">
              {derivedNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => navigate(notification.actionUrl)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    notification.kind === 'fraud_alert'
                      ? 'border-red-200 bg-red-50/40 hover:border-red-300 hover:bg-red-50'
                      : 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {notification.kind === 'fraud_alert' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    ) : (
                      <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <p className="font-semibold text-slate-900">{notification.title}</p>
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
              <Bell className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Notification log</h2>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'unread', 'read'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setNotificationFilter(filter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    notificationFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filter === 'all' ? `All (${storedNotifications.length})`
                    : filter === 'unread' ? `Unread (${unreadCount})`
                    : `Read (${storedNotifications.length - unreadCount})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-sm text-slate-600">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50/50'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{notification.title}</p>
                        {!notification.is_read ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">New</span>
                        ) : null}
                      </div>
                      {notification.body ? <p className="mt-2 text-sm text-slate-600">{notification.body}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {notification.action_url ? (
                        <button
                          type="button"
                          onClick={() => navigate(notification.action_url ?? '/insurance/dashboard')}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Open
                        </button>
                      ) : null}
                      {!notification.is_read ? (
                        <button
                          type="button"
                          onClick={() => markRead(notification.id)}
                          disabled={busyId === notification.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {busyId === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                          <span>Mark read</span>
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
    </InsuranceShell>
  );
};
