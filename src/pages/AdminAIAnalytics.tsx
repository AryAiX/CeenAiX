import { useState, useEffect, useRef } from 'react';
import {
  Bot, TrendingUp, Star, ArrowRight, Shield, DollarSign,
  Download, Settings, Bell, MessageSquare, Heart, Activity, Lock,
} from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AIPerformanceTab from '../components/aiAnalytics/AIPerformanceTab';
import ConversationsTab from '../components/aiAnalytics/ConversationsTab';
import PopulationHealthTab from '../components/aiAnalytics/PopulationHealthTab';
import SafetyMonitorTab from '../components/aiAnalytics/SafetyMonitorTab';
import ModelManagementTab from '../components/aiAnalytics/ModelManagementTab';
import AIExportModal from '../components/aiAnalytics/AIExportModal';

type MainTab = 'performance' | 'conversations' | 'population' | 'safety' | 'model';
type DateFilter = 'today' | 'week' | 'month' | 'custom';
interface Toast { id: number; msg: string; type: string }

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: 'performance', label: 'AI Performance', icon: TrendingUp },
  { key: 'conversations', label: 'Conversations', icon: MessageSquare },
  { key: 'population', label: 'Population Health', icon: Heart },
  { key: 'safety', label: 'Safety Monitor', icon: Shield },
  { key: 'model', label: 'Model Management', icon: Lock },
];

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function KpiCard({ label, value, sub, sub2, icon: Icon, iconColor, iconBg }: any) {
  return (
    <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px', cursor: 'default', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', gap: 8 }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div style={{ color: iconColor, fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#10B981', fontSize: 11 }}>{sub}</div>}
      {sub2 && <div style={{ color: '#475569', fontSize: 11 }}>{sub2}</div>}
    </div>
  );
}

export default function AdminAIAnalytics() {
  const [mainTab, setMainTab] = useState<MainTab>('performance');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [showExport, setShowExport] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sessions = useCountUp(8921);
  const active = useCountUp(247);

  const showToast = (msg: string, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', overflow: 'hidden' }}>
      <AdminSidebar activeSection="ai" onSectionChange={() => {}} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#1E293B', height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#475569', fontSize: 13 }}>Admin Portal ›</span>
            <Bot size={18} color="#A78BFA" />
            <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>AI Analytics</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', boxShadow: '0 0 0 3px rgba(124,58,237,0.25)', flexShrink: 0 }}>
              <style>{`@keyframes pulseViolet { 0%,100%{box-shadow:0 0 0 3px rgba(124,58,237,0.25)} 50%{box-shadow:0 0 0 6px rgba(124,58,237,0.1)} }`}</style>
            </div>
            <span style={{ color: '#A78BFA', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
              {sessions.toLocaleString()} AI sessions today · {active} active now
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowExport(true)} style={{ width: 36, height: 36, borderRadius: 8, background: '#334155', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><Download size={15} /></button>
            <button onClick={() => showToast('AI Settings opened')} style={{ width: 36, height: 36, borderRadius: 8, background: '#334155', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><Settings size={15} /></button>
            <button style={{ width: 36, height: 36, borderRadius: 8, background: '#334155', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><Bell size={15} /></button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0D9488, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>PY</div>
          </div>
        </div>

        <div style={{ padding: '18px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Bot size={26} color="#A78BFA" />
                <h1 style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 22, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>AI Analytics</h1>
              </div>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>Claude Sonnet · CeenAiX AI v2.4.1 · Production</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                <span style={{ color: '#34D399', fontSize: 11 }}>✅ All AI systems operational · 2.3s avg · 99.98% uptime</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 9, padding: 3, border: '1px solid #1E293B' }}>
                {(['today', 'week', 'month', 'custom'] as DateFilter[]).map(f => (
                  <button key={f} onClick={() => setDateFilter(f)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: dateFilter === f ? '#1E293B' : 'transparent', color: dateFilter === f ? '#F1F5F9' : '#64748B', textTransform: 'capitalize' }}>{f}</button>
                ))}
              </div>
              <button
                onClick={() => setShowExport(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 9, color: '#A78BFA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Download size={14} />
                Export AI Report
              </button>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #2E1065 100%)',
            borderRadius: 14, border: '1px solid rgba(109,40,217,0.3)',
            padding: '20px 28px', marginBottom: 16,
            boxShadow: '0 0 40px rgba(124,58,237,0.12)',
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <Bot size={32} color="#A78BFA" />
                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.3)', animation: 'ping 2s ease-out infinite' }} />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CeenAiX Clinical AI</div>
                <div style={{ color: '#C4B5FD', fontSize: 12 }}>Powered by Claude Sonnet · Anthropic</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[
                    { label: 'v2.4.1', color: '#A78BFA', bg: 'rgba(109,40,217,0.3)' },
                    { label: 'Production', color: '#34D399', bg: 'rgba(5,150,105,0.25)' },
                    { label: 'UAE Region', color: '#93C5FD', bg: 'rgba(29,78,216,0.25)' },
                    { label: 'FHIR R4', color: '#5EEAD4', bg: 'rgba(13,148,136,0.25)' },
                  ].map(b => (
                    <span key={b.label} style={{ background: b.bg, color: b.color, fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{b.label}</span>
                  ))}
                </div>
                <div style={{ color: 'rgba(196,181,253,0.6)', fontSize: 10, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Last updated: 2 April 2026</div>
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { value: sessions.toLocaleString(), label: 'Sessions Today', color: 'white' },
                { value: active.toString(), label: 'Active Now', color: '#C4B5FD' },
                { value: '2.3s', label: 'Avg Response', color: '#99F6E4' },
                { value: '99.98%', label: 'Uptime 30d', color: '#A7F3D0' },
              ].map(m => (
                <div key={m.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ color: m.color, fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{m.value}</div>
                  <div style={{ color: '#6D28D9', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
            <KpiCard
              label="AI Sessions Today"
              value={sessions.toLocaleString()}
              sub="↑ +23.1% vs yesterday"
              sub2="Active: 247 sessions"
              icon={Bot}
              iconColor="#A78BFA"
              iconBg="rgba(124,58,237,0.12)"
            />
            <KpiCard
              label="This Month"
              value="127,450"
              sub="↑ +22.7% vs March"
              sub2="All-time: 1,247,891"
              icon={TrendingUp}
              iconColor="#A78BFA"
              iconBg="rgba(124,58,237,0.12)"
            />
            <KpiCard
              label="Patient Satisfaction"
              value="4.6 ★"
              sub="↑ +0.2 vs last month"
              sub2="From 48,291 ratings"
              icon={Star}
              iconColor="#F59E0B"
              iconBg="rgba(180,83,9,0.12)"
            />
            <KpiCard
              label="AI → Appointment"
              value="34.7%"
              sub="3,097 bookings today"
              icon={ArrowRight}
              iconColor="#0D9488"
              iconBg="rgba(13,148,136,0.12)"
            />
            <KpiCard
              label="Safety Flags Today"
              value="12"
              sub="3 escalated · 9 resolved ✅"
              sub2="0 DHA safety events"
              icon={Shield}
              iconColor="#10B981"
              iconBg="rgba(16,185,129,0.12)"
            />
            <KpiCard
              label="AI-Driven Revenue"
              value="AED 287K"
              sub="Net margin: AED 269K"
              sub2="93.7% margin"
              icon={DollarSign}
              iconColor="#10B981"
              iconBg="rgba(16,185,129,0.12)"
            />
          </div>

          <div style={{ display: 'flex', gap: 2, background: '#0F172A', borderRadius: 10, padding: 4, border: '1px solid #1E293B', width: 'fit-content', marginBottom: 0 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = mainTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setMainTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    background: isActive ? '#1E293B' : 'transparent',
                    color: isActive ? '#A78BFA' : '#64748B',
                    transition: 'all 0.15s',
                    borderBottom: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                  }}
                >
                  <Icon size={14} color={isActive ? '#7C3AED' : '#64748B'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {mainTab === 'performance' && <AIPerformanceTab />}
          {mainTab === 'conversations' && <ConversationsTab />}
          {mainTab === 'population' && <PopulationHealthTab showToast={showToast} />}
          {mainTab === 'safety' && <SafetyMonitorTab showToast={showToast} />}
          {mainTab === 'model' && <ModelManagementTab showToast={showToast} />}
        </div>
      </div>

      {showExport && <AIExportModal onClose={() => setShowExport(false)} showToast={showToast} />}

      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, maxWidth: 380, background: t.type === 'success' ? '#7C3AED' : t.type === 'error' ? '#EF4444' : '#1E293B', border: t.type === 'info' ? '1px solid #334155' : 'none', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'slideInToast 0.25s ease-out', pointerEvents: 'auto' }}>
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes slideInToast { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
