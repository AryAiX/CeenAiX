import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const typeConfig: Record<string, { label: string; color: string }> = {
  appointment: { label: 'Appointment', color: 'bg-teal-50 text-teal-700' },
  system: { label: 'System', color: 'bg-blue-50 text-blue-700' },
  alert: { label: 'Alert', color: 'bg-amber-50 text-amber-700' },
  medication: { label: 'Medication', color: 'bg-emerald-50 text-emerald-700' },
  lab_result: { label: 'Lab Result', color: 'bg-violet-50 text-violet-700' },
};

export default function ClinicNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotifications(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (updateError) throw updateError;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification.');
    } finally {
      setBusyId(null);
    }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications.');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss notification.');
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
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Notifications</h2>
        <p className="text-sm text-slate-500 mt-0.5">Stay up to date with your clinic activity</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Unread Notifications</p>
          <p className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{unreadCount}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void fetchData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => void markAllRead()} disabled={busyId === 'all' || unreadCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
            {busyId === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark All Read
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-900">Activity Log</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'appointment', label: 'Appointments' },
            { value: 'system', label: 'System' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === opt.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No notifications to show.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const cfg = typeConfig[n.type] ?? { label: n.type, color: 'bg-slate-50 text-slate-600' };
              return (
                <div key={n.id} className={`rounded-2xl border p-4 ${n.is_read ? 'border-slate-200 bg-slate-50' : 'border-teal-200 bg-teal-50/50'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <p className="font-semibold text-slate-900">{n.title}</p>
                        {!n.is_read && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">New</span>}
                      </div>
                      {n.body ? <p className="mt-2 text-sm text-slate-600">{n.body}</p> : null}
                      <p className="mt-2 text-xs font-semibold text-slate-400">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {n.action_url ? (
                        <button onClick={() => navigate(n.action_url!)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                          Open
                        </button>
                      ) : null}
                      {!n.is_read ? (
                        <button onClick={() => void markRead(n.id)} disabled={busyId === n.id} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
                          {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                          Mark Read
                        </button>
                      ) : null}
                      <button onClick={() => void dismiss(n.id)} disabled={busyId === n.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-60">
                        {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
