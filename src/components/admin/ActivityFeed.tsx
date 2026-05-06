import React, { useState, useEffect, useRef } from 'react';
import { Activity, Pause, Play } from 'lucide-react';
import { initialFeedItems, newFeedTemplates, FeedItem } from '../../data/superAdminData';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const typeStyle: Record<FeedItem['type'], { dot: string; icon: string }> = {
  success: { dot: '#34D399', icon: '#34D399' },
  info: { dot: '#60A5FA', icon: '#60A5FA' },
  warning: { dot: '#FCD34D', icon: '#FCD34D' },
  error: { dot: '#F87171', icon: '#F87171' },
  ai: { dot: '#C4B5FD', icon: '#C4B5FD' },
  teal: { dot: '#2DD4BF', icon: '#2DD4BF' },
};

const ActivityFeed: React.FC = () => {
  const [items, setItems] = useState<FeedItem[]>(initialFeedItems);
  const [paused, setPaused] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const counterRef = useRef(100);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const template = newFeedTemplates[Math.floor(Math.random() * newFeedTemplates.length)];
      const id = `live-${counterRef.current++}`;
      const newItem: FeedItem = {
        ...template,
        id,
        timeAgo: 'just now',
        seconds: 0,
      };
      setNewIds(prev => new Set([...prev, id]));
      setItems(prev => [newItem, ...prev.slice(0, 19)]);
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 600);
    }, 3500);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden h-full"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="flex items-center gap-2">
          <Activity style={{ width: 16, height: 16, color: '#2DD4BF' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
            Live Activity
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontSize: 9, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>
              REAL-TIME
            </span>
          </div>
          <button
            onClick={() => setPaused(p => !p)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(71,85,105,0.5)'; e.currentTarget.style.color = '#CBD5E1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; e.currentTarget.style.color = '#94A3B8'; }}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play style={{ width: 12, height: 12 }} /> : <Pause style={{ width: 12, height: 12 }} />}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {items.map(item => {
          const style = typeStyle[item.type];
          const isNew = newIds.has(item.id);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200"
              style={{
                borderBottom: '1px solid rgba(51,65,85,0.4)',
                background: isNew ? 'rgba(13,148,136,0.06)' : 'transparent',
                transform: isNew ? 'translateX(0)' : undefined,
                opacity: 1,
              }}
              onClick={() => nav('/admin/audit')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isNew ? 'rgba(13,148,136,0.06)' : 'transparent'; }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: style.dot, boxShadow: isNew ? `0 0 6px ${style.dot}` : undefined }}
              />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>
                  {item.event}
                </div>
                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'DM Mono, monospace' }} className="truncate">
                  {item.detail}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                {item.timeAgo}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex-shrink-0 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}
      >
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
          127,450 AI sessions · 3,847 consultations today
        </span>
        <button
          onClick={() => nav('/admin/audit')}
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: '#0D9488' }}
        >
          View full log →
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;
