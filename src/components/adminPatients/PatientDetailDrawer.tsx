import { useState, useEffect } from 'react';
import { X, Copy, Eye, Mail, MessageSquare, ExternalLink, Download, Shield, Activity, User, FileText } from 'lucide-react';
import { AdminPatient, activityLog, accessLog } from '../../data/adminPatientsData';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface PatientDetailDrawerProps {
  patient: AdminPatient | null;
  onClose: () => void;
  onStatusAction: (p: AdminPatient, action: 'flag' | 'suspend' | 'deactivate') => void;
  showToast: (msg: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'security', label: 'Access & Security', icon: Shield },
  { id: 'notes', label: 'Admin Notes', icon: FileText },
];

const engagementData = [
  { month: 'Jan', events: 28 },
  { month: 'Feb', events: 35 },
  { month: 'Mar', events: 41 },
  { month: 'Apr', events: 22 },
];

export default function PatientDetailDrawer({ patient, onClose, onStatusAction, showToast }: PatientDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isVisible, setIsVisible] = useState(false);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([
    { author: 'Dr. Parnia Yazdkhasti · CEO', date: 'Jan 15, 2024', text: 'VIP patient — CEO of AryAiX. Primary test patient for platform QA. Handle all queries with priority.' },
  ]);
  const [labels, setLabels] = useState(['VIP', 'Test Account', 'CEO']);
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (patient) {
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 10);
      setActiveTab('overview');
    }
  }, [patient]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!patient) return null;

  const handleAddNote = () => {
    if (!note.trim()) return;
    setNotes(prev => [{ author: 'Dr. Parnia Yazdkhasti · CEO', date: 'Now', text: note }, ...prev]);
    setNote('');
    showToast('✅ Admin note added');
  };

  const handleAddLabel = () => {
    if (!newLabel.trim() || labels.includes(newLabel)) return;
    setLabels(prev => [...prev, newLabel]);
    setNewLabel('');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(2,6,23,0.6)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 520,
          background: '#0F172A',
          borderLeft: '1px solid #334155',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms ease-out',
        }}
      >
        <div
          className="flex items-center justify-between flex-shrink-0 px-5"
          style={{ height: 64, background: '#1E293B', borderBottom: '1px solid #334155' }}
        >
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
              Patient Profile
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2DD4BF' }}>
              {patient.ptId} · {patient.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F1F5F9'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748B'}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div
          className="flex flex-shrink-0"
          style={{ background: 'rgba(30,41,59,0.5)', borderBottom: '1px solid #334155', padding: '0 20px' }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 py-3 mr-6 transition-colors"
                style={{
                  fontSize: 12, fontFamily: 'Inter, sans-serif',
                  color: activeTab === tab.id ? '#5EEAD4' : '#64748B',
                  borderBottom: activeTab === tab.id ? '2px solid #0D9488' : '2px solid transparent',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: patient.avatarGradient, fontSize: 18, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {patient.initials}
                    </div>
                    <div
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        borderColor: '#1E293B',
                        background: patient.status === 'active' ? '#34D399' : patient.status === 'suspended' ? '#F87171' : patient.status === 'flagged' ? '#FB923C' : '#64748B',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>{patient.name}</div>
                    {patient.nameAr && <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{patient.nameAr}</div>}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'rgba(13,148,136,0.15)', color: '#5EEAD4', borderRadius: 6, padding: '2px 8px' }}>{patient.ptId}</span>
                      <span style={{ fontSize: 10, background: '#334155', color: '#CBD5E1', borderRadius: 6, padding: '2px 8px' }}>{patient.age}{patient.gender}</span>
                      <span style={{ fontSize: 10, background: 'rgba(153,27,27,0.2)', color: '#FCA5A5', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{patient.bloodType}</span>
                      <span style={{ fontSize: 10, background: '#334155', color: '#CBD5E1', borderRadius: 6, padding: '2px 8px' }}>🇮🇷 {patient.nationality}</span>
                    </div>
                    {patient.allergies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {patient.allergies.map(a => (
                          <span key={a} style={{ fontSize: 9, fontWeight: 700, background: 'rgba(153,27,27,0.2)', color: '#F87171', borderRadius: 4, padding: '2px 6px' }}>
                            ⚠️ {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Emirates ID', value: patient.emiratesId.split('-').map((s, i, a) => i === 0 || i === a.length - 1 ? s : '●'.repeat(s.length)).join('-') },
                  { label: 'Date of Birth', value: patient.dob },
                  { label: 'Gender', value: patient.gender === 'F' ? 'Female' : 'Male' },
                  { label: 'Nationality', value: patient.nationality },
                  { label: 'Mobile', value: patient.phone.replace(/(\d{4})$/, '●●●●') },
                  { label: 'Email', value: patient.email },
                  { label: 'Address', value: patient.address },
                  { label: 'Language', value: patient.language },
                ].map(field => (
                  <div key={field.label}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{field.label}</div>
                    <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{field.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.25)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#93C5FD', marginBottom: 4 }}>
                  {patient.insurance} · {patient.policyNumber}
                </div>
                <div style={{ fontSize: 10, color: '#34D399', marginBottom: 2 }}>✅ Active · Valid 31 Dec 2026</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#6EE7B7' }}>AED 487,600 remaining of AED 500,000</div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Appointments', val: patient.appointmentsCount },
                  { label: 'Active Rx', val: patient.labResultsCount > 0 ? 4 : 0 },
                  { label: 'Lab Results', val: patient.labResultsCount },
                  { label: 'AI Sessions', val: patient.aiSessionsCount },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {patient.conditions.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active Conditions</div>
                  <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.8 }}>
                    {patient.conditions.join(' · ')}
                  </div>
                  {patient.medications.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 10, marginBottom: 8 }}>Active Medications</div>
                      <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.8 }}>
                        {patient.medications.join(' · ')}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#34D399', marginBottom: 6 }}>✅ {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', marginBottom: 3 }}>Member since: {patient.joined}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', marginBottom: 12 }}>Last login: {patient.lastActiveRelative} · iOS App</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onStatusAction(patient, 'flag')}
                    className="px-3 py-1.5 rounded-lg transition-colors"
                    style={{ fontSize: 10, background: 'rgba(154,52,18,0.2)', color: '#FB923C', border: '1px solid rgba(154,52,18,0.3)' }}
                  >
                    🚩 Flag Account
                  </button>
                  <button
                    onClick={() => onStatusAction(patient, 'deactivate')}
                    className="px-3 py-1.5 rounded-lg transition-colors"
                    style={{ fontSize: 10, background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                  >
                    ⏸ Deactivate
                  </button>
                  <button
                    onClick={() => onStatusAction(patient, 'suspend')}
                    className="px-3 py-1.5 rounded-lg transition-colors"
                    style={{ fontSize: 10, background: 'rgba(153,27,27,0.2)', color: '#FCA5A5', border: '1px solid rgba(153,27,27,0.3)' }}
                  >
                    🔒 Suspend
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Appointments', val: `${patient.appointmentsCount} total`, sub: '2 upcoming' },
                  { label: 'Lab Results', val: `${patient.labResultsCount} total`, sub: '3 new' },
                  { label: 'AI Sessions', val: `${patient.aiSessionsCount} total`, sub: 'Last: today' },
                  { label: 'Messages', val: `${patient.messagesCount} sent`, sub: '1 unread' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: '#2DD4BF', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 12 }}>Monthly Activity — 2026</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={engagementData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#94A3B8' }}
                      itemStyle={{ color: '#2DD4BF' }}
                    />
                    <Bar dataKey="events" fill="rgba(13,148,136,0.7)" radius={[4, 4, 0, 0]} animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Activity Log</div>
                <div className="flex flex-col gap-1">
                  {activityLog.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: item.color }} />
                      <div className="flex-1" style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{item.desc}</div>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Portal Sessions (30 Days)</div>
                {[
                  { label: 'iOS App', val: 18 },
                  { label: 'Web', val: 4 },
                  { label: 'Desktop', val: 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{s.label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F1F5F9' }}>{s.val} sessions</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>Avg session: <span style={{ color: '#CBD5E1', fontFamily: 'DM Mono, monospace' }}>6.2 min</span></div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Security Status</div>
                {[
                  { label: '2FA', val: patient.twoFA ? '✅ SMS enabled' : '❌ Not enabled', color: patient.twoFA ? '#34D399' : '#F87171' },
                  { label: 'Last password change', val: '2 months ago', color: '#94A3B8' },
                  { label: 'Active sessions', val: '2 (iPhone + Chrome)', color: '#94A3B8' },
                  { label: 'Failed logins (7d)', val: '0 ✅', color: '#34D399' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: item.color, fontFamily: 'DM Mono, monospace' }}>{item.val}</span>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Recent Record Access — Last 7 Days</div>
                <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
                  All access to this patient's data is logged per UAE PDPL (Federal Law No. 45/2021)
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 0.8fr 1fr 0.6fr', background: 'rgba(15,23,42,0.5)', padding: '8px 12px' }}>
                    {['Date', 'Accessor', 'Role', 'Data', 'Action'].map(h => (
                      <div key={h} style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>{h}</div>
                    ))}
                  </div>
                  {accessLog.map((row, i) => (
                    <div
                      key={i}
                      className="grid"
                      style={{
                        gridTemplateColumns: '1fr 1fr 0.8fr 1fr 0.6fr',
                        padding: '8px 12px',
                        borderTop: '1px solid rgba(51,65,85,0.3)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(30,41,59,0.3)',
                      }}
                    >
                      {[row.date, row.accessor, row.role, row.data, row.action].map((val, j) => (
                        <div key={j} style={{ fontSize: 10, color: j === 0 ? '#64748B' : '#94A3B8', fontFamily: j === 0 ? 'DM Mono, monospace' : 'Inter, sans-serif' }}>{val}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => showToast('📤 Exporting access log...')}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                  style={{ fontSize: 10, background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Export Full Access Log
                </button>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>NABIDH HIE</div>
                <div style={{ fontSize: 12, color: '#34D399', marginBottom: 4 }}>
                  {patient.nabidh ? '✅ Connected · Last sync: Today 2:07 PM' : '❌ Not connected'}
                </div>
                {patient.nabidh && (
                  <>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Synced records: <span style={{ color: '#CBD5E1', fontFamily: 'DM Mono, monospace' }}>89 total</span></div>
                    <button style={{ fontSize: 11, color: '#2DD4BF', marginTop: 6 }}>View NABIDH Log →</button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex flex-col gap-4">
              {notes.map((n, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, color: '#5EEAD4', fontFamily: 'Inter, sans-serif' }}>{n.author}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{n.date}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>{n.text}</p>
                </div>
              ))}

              <div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add admin note (internal, not visible to patient)..."
                  rows={3}
                  style={{
                    width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 10,
                    color: '#F1F5F9', fontSize: 12, fontFamily: 'Inter, sans-serif',
                    padding: '10px 12px', resize: 'none', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0D9488'; }}
                  onBlur={e => { e.target.style.borderColor = '#475569'; }}
                />
                <button
                  onClick={handleAddNote}
                  className="mt-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: '#0D9488', color: '#fff', fontSize: 10, fontWeight: 600 }}
                >
                  Add Note
                </button>
              </div>

              <div>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Account Labels</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {labels.map(l => (
                    <span
                      key={l}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                      style={{ fontSize: 11, background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}
                    >
                      {l}
                      <button onClick={() => setLabels(prev => prev.filter(x => x !== l))}>
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
                    placeholder="Add label..."
                    style={{
                      flex: 1, height: 32, background: '#334155', border: '1px solid #475569', borderRadius: 8,
                      color: '#F1F5F9', fontSize: 11, fontFamily: 'Inter, sans-serif', padding: '0 10px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddLabel}
                    className="px-3 py-1 rounded-lg"
                    style={{ fontSize: 10, background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-2 flex-shrink-0 px-5"
          style={{ height: 56, background: '#1E293B', borderTop: '1px solid #334155' }}
        >
          {[
            { icon: Mail, label: '📧 Send Email', action: () => showToast(`✅ Email sent to ${patient.email}`) },
            { icon: MessageSquare, label: '💬 Platform Msg', action: () => showToast('✅ Platform message sent') },
            { icon: ExternalLink, label: '👁 Open in Portal', action: () => showToast('Opening patient portal...'), teal: true },
            { icon: Download, label: '📤 Export', action: () => showToast('📤 Exporting patient data...') },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
              style={{
                fontSize: 10, fontFamily: 'Inter, sans-serif', height: 36,
                background: btn.teal ? 'rgba(13,148,136,0.15)' : '#334155',
                color: btn.teal ? '#5EEAD4' : '#94A3B8',
                border: `1px solid ${btn.teal ? 'rgba(13,148,136,0.3)' : '#475569'}`,
              }}
            >
              <btn.icon style={{ width: 12, height: 12 }} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
