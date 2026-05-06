import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  Activity, X, Pause, Play, Filter, Settings, ChevronLeft,
  AlertTriangle, AlertCircle, CheckCircle, Info, Wifi, WifiOff,
  RefreshCw, Bell, Users, Shield, Plug, FileCheck, Monitor,
  Eye, EyeOff, Clock, ExternalLink, Check, VolumeX,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = 'info' | 'success' | 'warning' | 'error' | 'critical';
type EventSource =
  | 'system' | 'users' | 'security' | 'integrations' | 'compliance';
type TabKey = 'all' | EventSource;

export interface LiveEvent {
  id: string;
  type: string;
  severity: Severity;
  source: EventSource;
  workspace_id?: string;
  workspace_name?: string;
  actor?: string;
  target?: string;
  title: string;
  description: string;
  metadata?: Record<string, string>;
  correlation_id?: string;
  created_at: Date;
  requires_ack?: boolean;
  phi_present?: boolean;
  acknowledged?: boolean;
  read?: boolean;
}

type StreamStatus = 'live' | 'reconnecting' | 'disconnected' | 'paused';

// ─── Mock event seed ─────────────────────────────────────────────────────────

const mkDate = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000);

const SEED_EVENTS: LiveEvent[] = [
  {
    id: 'e1', type: 'api_latency', severity: 'warning', source: 'system',
    title: 'API latency spiked on Doctor Portal — p95 1.2 s',
    description: 'Response times on /doctor/appointments exceeded the 1 s SLA threshold.',
    metadata: { endpoint: '/doctor/appointments', p95: '1.2s', region: 'UAE-AE-1' },
    correlation_id: 'COR-20260430-001', created_at: mkDate(18), read: false,
  },
  {
    id: 'e2', type: 'queue_cleared', severity: 'success', source: 'system',
    title: 'Background queue backlog cleared',
    description: 'The DHA submission queue that was stalled for 4 minutes has been drained.',
    metadata: { queue: 'dha-submissions', cleared: '47 jobs' },
    created_at: mkDate(55), read: false,
  },
  {
    id: 'e3', type: 'new_device_login', severity: 'warning', source: 'security',
    title: 'Dr. Al Rashidi signed in from a new device — Dubai, UAE',
    description: 'A new browser fingerprint was detected. No action taken; notification sent.',
    actor: 'Dr. Ahmed Al Rashidi', metadata: { ip: '185.52.44.12', device: 'Chrome / Windows 11' },
    created_at: mkDate(90), read: false,
  },
  {
    id: 'e4', type: 'failed_logins', severity: 'critical', source: 'security',
    title: '5 failed login attempts on parnia@aryaix.com',
    description: 'Threshold reached — account temporarily rate-limited for 10 minutes.',
    actor: 'unknown', target: 'parnia@aryaix.com',
    metadata: { attempts: '5', ip: '91.108.4.22', country: 'Unknown' },
    correlation_id: 'COR-20260430-002', created_at: mkDate(140), requires_ack: true, read: false,
  },
  {
    id: 'e5', type: 'nabidh_degraded', severity: 'error', source: 'integrations',
    title: 'NABIDH submission gateway: degraded',
    description: 'NABIDH API returning 503 on 30 % of requests. Retrying with exponential backoff.',
    metadata: { error_rate: '30%', last_success: '14:42 GST' },
    correlation_id: 'COR-20260430-003', created_at: mkDate(210), requires_ack: true, read: false,
  },
  {
    id: 'e6', type: 'fhir_failures', severity: 'error', source: 'integrations',
    title: 'FHIR R4 endpoint: 3 failed pushes in 5 min',
    description: 'Patient resource pushes to the FHIR endpoint returning 422 Unprocessable Entity.',
    metadata: { endpoint: '/fhir/r4/Patient', failures: '3', last_error: '422' },
    created_at: mkDate(310), read: true,
  },
  {
    id: 'e7', type: 'patients_onboarded', severity: 'info', source: 'users',
    title: '12 new patients onboarded in the last hour',
    description: 'Onboarding completion rate: 91 %. 1 patient pending identity verification.',
    metadata: { total: '12', pending: '1', workspace: 'Al Noor Medical' },
    workspace_name: 'Al Noor Medical', created_at: mkDate(480), read: true,
  },
  {
    id: 'e8', type: 'dha_license_expiry', severity: 'warning', source: 'compliance',
    title: 'DHA license expiring in 30 days — Al Shifa Pharmacy',
    description: 'License DHA-PHARM-2019-003481 expires on 30 May 2026. Renewal required.',
    target: 'Al Shifa Pharmacy',
    metadata: { license: 'DHA-PHARM-2019-003481', expires: '30 May 2026' },
    created_at: mkDate(3600), read: true,
  },
  {
    id: 'e9', type: 'phi_flagged', severity: 'critical', source: 'compliance',
    title: 'PHI access flagged for review',
    description: 'Bulk export of >500 patient records triggered automated PHI flag.',
    phi_present: true, requires_ack: true,
    metadata: { records: '512', actor: 'admin@alnoor.ae', resource: 'PatientExport' },
    correlation_id: 'COR-20260430-004', created_at: mkDate(7200), read: false,
  },
  {
    id: 'e10', type: 'impersonation', severity: 'info', source: 'security',
    title: 'Impersonation session started — Parnia → Dr. Reem Al Suwaidi',
    description: 'Admin initiated an impersonation session for support purposes.',
    actor: 'Parnia Yazdkhasti', target: 'Dr. Reem Al Suwaidi',
    metadata: { duration: '15 min', reason: 'Support request #TK-0482' },
    created_at: mkDate(86000), read: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
  info: '#0891B2',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  critical: '#DC2626',
};

const SEVERITY_BG: Record<Severity, string> = {
  info: 'rgba(8,145,178,0.15)',
  success: 'rgba(16,185,129,0.15)',
  warning: 'rgba(245,158,11,0.15)',
  error: 'rgba(239,68,68,0.15)',
  critical: 'rgba(220,38,38,0.18)',
};

function SeverityIcon({ s, size = 14 }: { s: Severity; size?: number }) {
  const c = SEVERITY_COLOR[s];
  const cls = `flex-shrink-0`;
  if (s === 'critical' || s === 'error') return <AlertCircle style={{ color: c, width: size, height: size }} className={cls} />;
  if (s === 'warning') return <AlertTriangle style={{ color: c, width: size, height: size }} className={cls} />;
  if (s === 'success') return <CheckCircle style={{ color: c, width: size, height: size }} className={cls} />;
  return <Info style={{ color: c, width: size, height: size }} className={cls} />;
}

function SourceIcon({ src, size = 14 }: { src: EventSource; size?: number }) {
  const cls = `flex-shrink-0`;
  const s = { width: size, height: size, color: '#64748B' };
  if (src === 'system') return <Monitor style={s} className={cls} />;
  if (src === 'users') return <Users style={s} className={cls} />;
  if (src === 'security') return <Shield style={s} className={cls} />;
  if (src === 'integrations') return <Plug style={s} className={cls} />;
  if (src === 'compliance') return <FileCheck style={s} className={cls} />;
  return <Activity style={s} className={cls} />;
}

function relTime(d: Date, now: number): string {
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function absTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function bucketLabel(d: Date, now: number): string {
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 300) return 'Last 5 minutes';
  if (diff < 3600) return 'Last hour';
  if (diff < 86400) return 'Earlier today';
  return 'Yesterday and older';
}

const BUCKET_ORDER = ['Just now', 'Last 5 minutes', 'Last hour', 'Earlier today', 'Yesterday and older'];

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  severities: Severity[];
  sources: EventSource[];
  onlyUnread: boolean;
}

const DEFAULT_FILTER: FilterState = { severities: [], sources: [], onlyUnread: false };

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveActivityDropdown() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('all');
  const [events, setEvents] = useState<LiveEvent[]>(SEED_EVENTS);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('live');
  const [paused, setPaused] = useState(false);
  const [detail, setDetail] = useState<LiveEvent | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [now, setNow] = useState(Date.now());
  const [heartbeat, setHeartbeat] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pauseBufferRef = useRef<LiveEvent[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Heartbeat blink ───────────────────────────────────────────────────────
  useEffect(() => {
    if (streamStatus !== 'live') return;
    const id = setInterval(() => {
      setHeartbeat(true);
      setTimeout(() => setHeartbeat(false), 400);
    }, 10000);
    return () => clearInterval(id);
  }, [streamStatus]);

  // ── Simulated new event stream ────────────────────────────────────────────
  const injectEvent = useCallback((ev: LiveEvent) => {
    if (paused) {
      pauseBufferRef.current.push(ev);
      return;
    }
    setEvents(prev => {
      if (prev.length >= 500) return [ev, ...prev.slice(0, 499)];
      return [ev, ...prev];
    });
  }, [paused]);

  useEffect(() => {
    const templates: Omit<LiveEvent, 'id' | 'created_at' | 'read'>[] = [
      { type: 'login', severity: 'info', source: 'users', title: 'New admin login from Abu Dhabi', description: 'Admin user logged in from a known device.' },
      { type: 'hl7_reconnected', severity: 'success', source: 'integrations', title: 'HL7 message bus: reconnected', description: 'Connection restored after 12-second outage.' },
      { type: 'queue_backlog', severity: 'warning', source: 'system', title: 'Scheduled maintenance starting in 30 minutes', description: 'All non-critical API endpoints will be in read-only mode.' },
      { type: 'audit_anomaly', severity: 'error', source: 'compliance', title: 'Audit log anomaly detected — review required', description: 'Unexpected gap in audit trail between 14:00 and 14:03 GST.', requires_ack: true },
    ];
    let idx = 0;
    const id = setInterval(() => {
      const tmpl = templates[idx % templates.length];
      idx++;
      const ev: LiveEvent = {
        ...tmpl,
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_at: new Date(),
        read: false,
      };
      injectEvent(ev);
    }, 12000);
    return () => clearInterval(id);
  }, [injectEvent]);

  // ── Simulated reconnect cycle ─────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (paused || streamStatus === 'disconnected') return;
      // occasionally simulate a brief reconnect
      const r = Math.random();
      if (r < 0.04) {
        setStreamStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(() => setStreamStatus('live'), 3500);
      }
    }, 20000);
    return () => clearInterval(id);
  }, [paused, streamStatus]);

  // ── Close on click-outside / Esc ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) setDetail(null);
        else setOpen(false);
      }
    };
    const onMouse = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowFilter(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouse);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onMouse); };
  }, [detail]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const unreadCount = useMemo(() => events.filter(e => !e.read).length, [events]);
  const hasCriticalUnread = useMemo(() => events.some(e => !e.read && (e.severity === 'critical' || e.severity === 'error')), [events]);

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<TabKey, number>> = {};
    for (const e of events) {
      if (!e.read) {
        counts.all = (counts.all ?? 0) + 1;
        counts[e.source] = (counts[e.source] ?? 0) + 1;
      }
    }
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (tab !== 'all' && e.source !== tab) return false;
      if (filter.severities.length && !filter.severities.includes(e.severity)) return false;
      if (filter.sources.length && !filter.sources.includes(e.source)) return false;
      if (filter.onlyUnread && e.read) return false;
      return true;
    });
  }, [events, tab, filter]);

  const bucketed = useMemo(() => {
    const map: Record<string, LiveEvent[]> = {};
    for (const e of filteredEvents) {
      const lbl = bucketLabel(e.created_at, now);
      if (!map[lbl]) map[lbl] = [];
      map[lbl].push(e);
    }
    return BUCKET_ORDER.filter(b => map[b]).map(b => ({ label: b, items: map[b] }));
  }, [filteredEvents, now]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markRead = (id: string) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));

  const markAllRead = () =>
    setEvents(prev => prev.map(e => ({ ...e, read: true })));

  const acknowledge = (id: string) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true, read: true } : e));

  const handleResume = () => {
    setPaused(false);
    const buffered = [...pauseBufferRef.current];
    pauseBufferRef.current = [];
    if (buffered.length) {
      setBatchCount(buffered.length);
      setTimeout(() => setBatchCount(0), 4000);
      setEvents(prev => [...buffered, ...prev].slice(0, 500));
    }
    setStreamStatus('live');
  };

  const handlePause = () => {
    setPaused(true);
    setStreamStatus('paused');
  };

  const streamDot = streamStatus === 'live' ? '#10B981'
    : streamStatus === 'paused' ? '#0891B2'
    : streamStatus === 'reconnecting' ? '#F59E0B'
    : '#EF4444';

  const streamLabel = streamStatus === 'live' ? 'Live · streaming'
    : streamStatus === 'paused' ? 'Stream paused'
    : streamStatus === 'reconnecting' ? 'Reconnecting…'
    : 'Disconnected';

  const hasActiveFilter = filter.severities.length > 0 || filter.sources.length > 0 || filter.onlyUnread;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => { setOpen(o => !o); setShowFilter(false); }}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors focus:outline-none"
        style={{ background: open ? 'rgba(13,148,136,0.15)' : 'rgba(30,41,59,0.8)', color: open ? '#0D9488' : '#94A3B8' }}
        aria-label={`Live Activity · ${unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}`}
        aria-expanded={open}
        title={unreadCount > 0 ? `Live Activity · ${unreadCount} new` : 'Live Activity · All caught up'}
      >
        <Activity className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}
          strokeWidth={streamStatus === 'live' && !paused ? 2.5 : 1.8} />

        {/* Stream status dot */}
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{
            background: streamDot,
            boxShadow: streamStatus === 'live' ? `0 0 0 2px rgba(30,41,59,0.8), 0 0 6px ${streamDot}` : `0 0 0 2px rgba(30,41,59,0.8)`,
          }}
        />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold"
            style={{
              background: hasCriticalUnread ? '#DC2626' : '#0D9488',
              fontSize: 9,
              fontFamily: 'DM Mono, monospace',
              padding: '0 3px',
              boxShadow: hasCriticalUnread ? '0 0 0 2px #DC2626' : undefined,
              border: '2px solid #0F172A',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute right-0 top-12 rounded-xl overflow-hidden z-50"
          style={{
            width: 420,
            maxHeight: '70vh',
            background: '#0F172A',
            border: '1px solid rgba(51,65,85,0.8)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'liveDropIn 150ms ease-out',
          }}
          role="region"
          aria-label="Live Activity"
        >
          <style>{`
            @keyframes liveDropIn {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes critPulse {
              0%,100% { box-shadow: 0 0 0 1px #DC2626; }
              50%      { box-shadow: 0 0 0 3px rgba(220,38,38,0.4); }
            }
            @keyframes hbBlink {
              0%,100% { opacity: 1; }
              50%      { opacity: 0.3; }
            }
          `}</style>

          {detail ? (
            <DetailPanel
              event={detail}
              now={now}
              onBack={() => setDetail(null)}
              onAck={acknowledge}
              onMarkRead={markRead}
            />
          ) : (
            <>
              {/* ── Panel header ── */}
              <div className="px-4 pt-4 pb-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(51,65,85,0.5)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 16, color: '#F1F5F9' }}>
                    Live Activity
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Pause / Resume */}
                    <HdrBtn
                      icon={paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      title={paused ? 'Resume stream' : 'Pause stream'}
                      onClick={paused ? handleResume : handlePause}
                    />
                    {/* Filter */}
                    <HdrBtn
                      icon={<Filter className="w-3.5 h-3.5" />}
                      title="Filter events"
                      active={hasActiveFilter || showFilter}
                      onClick={() => setShowFilter(f => !f)}
                    />
                    {/* Settings → notifications */}
                    <HdrBtn
                      icon={<Settings className="w-3.5 h-3.5" />}
                      title="Notification preferences"
                      onClick={() => { navigate('/admin/settings/notifications'); setOpen(false); }}
                    />
                    {/* Close */}
                    <HdrBtn icon={<X className="w-3.5 h-3.5" />} title="Close" onClick={() => setOpen(false)} />
                  </div>
                </div>

                {/* Stream status row */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: streamDot,
                      animation: streamStatus === 'live' && heartbeat ? 'hbBlink 0.4s ease' : undefined,
                    }}
                  />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>
                    {streamLabel}
                  </span>
                </div>

                {/* Status banners */}
                {streamStatus === 'disconnected' && (
                  <StatusBanner color="#EF4444" bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.25)">
                    <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">Reconnecting to live stream…</span>
                    <button
                      onClick={() => setStreamStatus('reconnecting')}
                      className="underline text-xs"
                      style={{ color: '#EF4444' }}
                    >Retry</button>
                  </StatusBanner>
                )}
                {streamStatus === 'reconnecting' && (
                  <StatusBanner color="#F59E0B" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.25)">
                    <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
                    <span>Reconnecting to live stream…</span>
                  </StatusBanner>
                )}
                {streamStatus === 'paused' && (
                  <StatusBanner color="#0891B2" bg="rgba(8,145,178,0.08)" border="rgba(8,145,178,0.25)">
                    <Pause className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">Stream paused — resume to see new events</span>
                    <button onClick={handleResume} className="underline text-xs" style={{ color: '#0891B2' }}>Resume</button>
                  </StatusBanner>
                )}

                {/* Batch burst indicator */}
                {batchCount > 0 && (
                  <div
                    className="w-full text-center py-1 rounded-lg mb-1"
                    style={{ background: 'rgba(13,148,136,0.12)', fontSize: 11, color: '#0D9488', fontFamily: 'Inter, sans-serif' }}
                  >
                    {batchCount} new event{batchCount !== 1 ? 's' : ''} added
                  </div>
                )}

                {/* Tab strip */}
                <div className="flex gap-0.5 mt-2 -mx-1">
                  {(['all', 'system', 'users', 'security', 'integrations', 'compliance'] as TabKey[]).map(t => (
                    <TabBtn
                      key={t}
                      label={t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                      active={tab === t}
                      count={tabCounts[t]}
                      critical={t === 'security' && (tabCounts.security ?? 0) > 0}
                      onClick={() => setTab(t)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Filter popover ── */}
              {showFilter && (
                <FilterPopover filter={filter} onChange={setFilter} onClose={() => setShowFilter(false)} />
              )}

              {/* ── Event list ── */}
              <div
                ref={listRef}
                className="overflow-y-auto flex-1 min-h-0"
                style={{ scrollbarWidth: 'none' }}
                aria-live="polite"
              >
                {bucketed.length === 0 ? (
                  <EmptyState hasFilter={hasActiveFilter} onClear={() => setFilter(DEFAULT_FILTER)} />
                ) : (
                  bucketed.map(({ label, items }) => (
                    <div key={label}>
                      <div
                        className="px-4 py-1.5 sticky top-0"
                        style={{
                          background: '#0F172A',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontSize: 11,
                          color: '#334155',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid rgba(51,65,85,0.25)',
                          zIndex: 2,
                        }}
                      >
                        {label}
                      </div>
                      {items.map(ev => (
                        <EventRow
                          key={ev.id}
                          event={ev}
                          now={now}
                          onClick={() => { markRead(ev.id); setDetail(ev); }}
                          onMarkRead={() => markRead(ev.id)}
                        />
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* ── Footer ── */}
              <div
                className="px-4 py-2.5 flex items-center justify-between flex-shrink-0"
                style={{ borderTop: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.95)' }}
              >
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </span>
                <button
                  disabled={unreadCount === 0}
                  onClick={markAllRead}
                  className="transition-colors"
                  style={{
                    fontSize: 11,
                    color: unreadCount > 0 ? '#0D9488' : '#334155',
                    cursor: unreadCount > 0 ? 'pointer' : 'default',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Mark all as read
                </button>
                <button
                  onClick={() => { navigate('/admin/audit/me'); setOpen(false); }}
                  className="transition-colors"
                  style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; }}
                >
                  View full log →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HdrBtn({ icon, title, onClick, active }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
      style={{
        background: active ? 'rgba(13,148,136,0.2)' : 'transparent',
        color: active ? '#0D9488' : '#475569',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; e.currentTarget.style.color = '#94A3B8'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
    >
      {icon}
    </button>
  );
}

function TabBtn({ label, active, count, critical, onClick }: {
  label: string; active: boolean; count?: number; critical?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors text-xs"
      style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: active ? 600 : 400,
        background: active ? 'rgba(13,148,136,0.15)' : 'transparent',
        color: active ? '#0D9488' : '#64748B',
      }}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className="rounded-full px-1"
          style={{
            background: critical ? '#DC2626' : 'rgba(51,65,85,0.7)',
            color: critical ? '#fff' : '#94A3B8',
            fontSize: 9,
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBanner({ color, bg, border, children }: {
  color: string; bg: string; border: string; children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
      style={{ background: bg, border: `1px solid ${border}`, color, fontSize: 11, fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </div>
  );
}

function EventRow({ event: ev, now, onClick, onMarkRead }: {
  event: LiveEvent; now: number;
  onClick: () => void;
  onMarkRead: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showAbs, setShowAbs] = useState(false);
  const isCrit = ev.severity === 'critical';
  const borderColor = SEVERITY_COLOR[ev.severity];

  return (
    <button
      className="w-full text-left px-4 py-3 transition-colors relative focus:outline-none"
      style={{
        background: hovered ? 'rgba(30,41,59,0.6)' : 'transparent',
        borderLeft: `3px solid ${borderColor}`,
        animation: isCrit && !ev.acknowledged ? 'critPulse 2s ease infinite' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      aria-label={`${ev.severity} — ${ev.title} — ${ev.source} — ${relTime(ev.created_at, now)}`}
    >
      <div className="flex items-start gap-3">
        {/* Source icon with severity ring */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: SEVERITY_BG[ev.severity],
            border: `1.5px solid ${borderColor}44`,
            marginTop: 1,
          }}
        >
          <SourceIcon src={ev.source} size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="flex-1 truncate"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 13, color: '#E2E8F0' }}
            >
              {ev.phi_present ? '████ [PHI — click to reveal]' : ev.title}
            </span>
            {!ev.read && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#0D9488' }} />
            )}
          </div>
          <p
            className="line-clamp-2"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}
          >
            {ev.phi_present && !hovered ? '—' : ev.description}
          </p>
          {ev.workspace_name && (
            <span
              className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
            >
              {ev.workspace_name}
            </span>
          )}
        </div>

        {/* Right: time + actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
          <span
            style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}
            title={absTime(ev.created_at)}
            onMouseEnter={() => setShowAbs(true)}
            onMouseLeave={() => setShowAbs(false)}
          >
            {showAbs ? absTime(ev.created_at) : relTime(ev.created_at, now)}
          </span>
          {hovered && (
            <div className="flex items-center gap-1">
              {!ev.read && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs cursor-pointer"
                  style={{ background: 'rgba(13,148,136,0.2)', color: '#0D9488', fontSize: 10 }}
                  onClick={e => { e.stopPropagation(); onMarkRead(); }}
                >
                  Read
                </span>
              )}
              <span
                className="px-1.5 py-0.5 rounded text-xs cursor-pointer"
                style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8', fontSize: 10 }}
              >
                Open
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function DetailPanel({ event: ev, now, onBack, onAck, onMarkRead }: {
  event: LiveEvent;
  now: number;
  onBack: () => void;
  onAck: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const [phiRevealed, setPhiRevealed] = useState(false);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: 'none', maxHeight: '70vh' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(51,65,85,0.5)' }}
      >
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{ color: '#64748B' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; e.currentTarget.style.color = '#94A3B8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span
          className="flex-1 truncate"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#F1F5F9' }}
        >
          {ev.title}
        </span>
      </div>

      <div className="px-4 py-4 flex-1 space-y-4">
        {/* Chips row */}
        <div className="flex flex-wrap gap-2">
          <Chip bg={SEVERITY_BG[ev.severity]} color={SEVERITY_COLOR[ev.severity]}>
            <SeverityIcon s={ev.severity} size={11} />
            {ev.severity.charAt(0).toUpperCase() + ev.severity.slice(1)}
          </Chip>
          <Chip bg="rgba(51,65,85,0.5)" color="#94A3B8">
            <SourceIcon src={ev.source} size={11} />
            {ev.source.charAt(0).toUpperCase() + ev.source.slice(1)}
          </Chip>
          {ev.workspace_name && (
            <Chip bg="rgba(51,65,85,0.4)" color="#64748B">{ev.workspace_name}</Chip>
          )}
        </div>

        {/* Timestamps */}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#475569' }}>
          {absTime(ev.created_at)} · {relTime(ev.created_at, now)}
        </div>

        {/* Description */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
          {ev.phi_present && !phiRevealed
            ? <span style={{ color: '#EF4444' }}>PHI redacted. Click reveal to view (audit-logged).</span>
            : ev.description}
        </p>

        {ev.phi_present && (
          <button
            onClick={() => setPhiRevealed(r => !r)}
            className="flex items-center gap-2 transition-colors"
            style={{ fontSize: 11, color: phiRevealed ? '#F59E0B' : '#0D9488', fontFamily: 'Inter, sans-serif' }}
          >
            {phiRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {phiRevealed ? 'Hide PHI' : 'Reveal PHI (audit-logged)'}
          </button>
        )}

        {/* Metadata table */}
        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(51,65,85,0.4)' }}
          >
            {Object.entries(ev.metadata).map(([k, v], i) => (
              <div
                key={k}
                className="flex items-start gap-3 px-3 py-2"
                style={{ background: i % 2 === 0 ? 'rgba(30,41,59,0.3)' : 'transparent' }}
              >
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', minWidth: 80, flexShrink: 0 }}>
                  {k}
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8', wordBreak: 'break-all' }}>
                  {v}
                </span>
              </div>
            ))}
            {ev.correlation_id && (
              <div className="flex items-start gap-3 px-3 py-2" style={{ background: 'rgba(30,41,59,0.3)' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', minWidth: 80, flexShrink: 0 }}>
                  corr_id
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8' }}>
                  {ev.correlation_id}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {ev.requires_ack && !ev.acknowledged && (
            <ActionBtn
              icon={<Check className="w-3.5 h-3.5" />}
              label="Acknowledge"
              color="#10B981"
              bg="rgba(16,185,129,0.12)"
              border="rgba(16,185,129,0.3)"
              onClick={() => onAck(ev.id)}
            />
          )}
          {(ev.source === 'security' || ev.source === 'compliance') && (
            <ActionBtn
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              label="Open in Audit Log"
              color="#0891B2"
              bg="rgba(8,145,178,0.08)"
              border="rgba(8,145,178,0.2)"
              onClick={() => navigate('/admin/audit/me')}
            />
          )}
          {ev.source === 'system' && (
            <ActionBtn
              icon={<Monitor className="w-3.5 h-3.5" />}
              label="Open System Status"
              color="#64748B"
              bg="rgba(51,65,85,0.2)"
              border="rgba(51,65,85,0.4)"
              onClick={() => navigate('/admin/system/status')}
            />
          )}
          {ev.source === 'users' && (
            <ActionBtn
              icon={<Users className="w-3.5 h-3.5" />}
              label="Open User Management"
              color="#64748B"
              bg="rgba(51,65,85,0.2)"
              border="rgba(51,65,85,0.4)"
              onClick={() => navigate('/admin/users')}
            />
          )}
          <ActionBtn
            icon={<Bell className="w-3.5 h-3.5" />}
            label="Open Support Ticket"
            color="#64748B"
            bg="rgba(51,65,85,0.2)"
            border="rgba(51,65,85,0.4)"
            onClick={() => navigate('/admin/support')}
          />
          <ActionBtn
            icon={<VolumeX className="w-3.5 h-3.5" />}
            label="Mute this event type"
            color="#64748B"
            bg="rgba(51,65,85,0.2)"
            border="rgba(51,65,85,0.4)"
            onClick={() => navigate('/admin/settings/notifications')}
          />
        </div>
      </div>
    </div>
  );
}

function Chip({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: bg, color, fontSize: 11, fontFamily: 'Inter, sans-serif', border: `1px solid ${color}33` }}
    >
      {children}
    </span>
  );
}

function ActionBtn({ icon, label, color, bg, border, onClick }: {
  icon: React.ReactNode; label: string; color: string; bg: string; border: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left"
      style={{ background: bg, border: `1px solid ${border}`, color, fontSize: 12, fontFamily: 'Inter, sans-serif' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterPopover({ filter, onChange, onClose }: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  onClose: () => void;
}) {
  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const severities: Severity[] = ['info', 'success', 'warning', 'error', 'critical'];
  const sources: EventSource[] = ['system', 'users', 'security', 'integrations', 'compliance'];

  return (
    <div
      className="px-4 py-3 border-b flex-shrink-0"
      style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.98)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#CBD5E1' }}>
          Filters
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(DEFAULT_FILTER)}
            style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}
          >Clear all</button>
          <button onClick={onClose} style={{ color: '#475569' }}><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="space-y-3">
        <FilterGroup label="Severity">
          {severities.map(s => (
            <FilterChip
              key={s}
              active={filter.severities.includes(s)}
              color={SEVERITY_COLOR[s]}
              onClick={() => onChange({ ...filter, severities: toggle(filter.severities, s) })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Source">
          {sources.map(s => (
            <FilterChip
              key={s}
              active={filter.sources.includes(s)}
              color="#0D9488"
              onClick={() => onChange({ ...filter, sources: toggle(filter.sources, s) })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </FilterGroup>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.onlyUnread}
            onChange={e => onChange({ ...filter, onlyUnread: e.target.checked })}
            className="w-3.5 h-3.5 accent-teal-500"
          />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Show only unread</span>
        </label>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full transition-colors"
      style={{
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        background: active ? `${color}22` : 'rgba(30,41,59,0.6)',
        color: active ? color : '#64748B',
        border: `1px solid ${active ? color + '55' : 'rgba(51,65,85,0.4)'}`,
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasFilter, onClear }: { hasFilter: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {hasFilter ? (
        <>
          <Filter className="w-8 h-8 mb-3" style={{ color: '#334155' }} />
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, color: '#475569', marginBottom: 8 }}>
            No activity matches these filters.
          </p>
          <button onClick={onClear} style={{ fontSize: 12, color: '#0D9488', fontFamily: 'Inter, sans-serif' }}>
            Clear filters
          </button>
        </>
      ) : (
        <>
          <CheckCircle className="w-8 h-8 mb-3" style={{ color: '#334155' }} />
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, color: '#475569' }}>
            You're all caught up.
          </p>
        </>
      )}
    </div>
  );
}
