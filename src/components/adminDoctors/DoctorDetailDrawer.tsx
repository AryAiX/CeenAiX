import { useState, useEffect } from 'react';
import {
  X, Star, CheckCircle2, AlertTriangle, ShieldOff, Mail, Phone, MapPin,
  Calendar, Award, Stethoscope, Activity, DollarSign, MessageSquare, ExternalLink,
  FileText, BarChart3, Shield, ChevronRight
} from 'lucide-react';
import { AdminDoctor } from '../../data/adminDoctorsData';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { drConsultationTrend, drRevenueMonthly, drInsuranceMix } from '../../data/adminDoctorsData';

interface DoctorDetailDrawerProps {
  doctor: AdminDoctor | null;
  onClose: () => void;
  onStatusAction: (doctor: AdminDoctor, action: 'flag' | 'suspend' | 'deactivate') => void;
  showToast: (msg: string) => void;
}

type DrawerTab = 'overview' | 'performance' | 'dha' | 'revenue' | 'notes';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  inactive: { label: 'Inactive', color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
  flagged: { label: 'Flagged', color: '#FB923C', bg: 'rgba(249,115,22,0.12)' },
  suspended: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  expiring: { label: 'Expiring Soon', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  expired: { label: 'Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const VERIFICATION_CFG: Record<string, { label: string; color: string }> = {
  verified: { label: 'Verified', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  reviewing: { label: 'Reviewing', color: '#60A5FA' },
  rejected: { label: 'Rejected', color: '#EF4444' },
  incomplete: { label: 'Incomplete', color: '#F59E0B' },
  mismatch: { label: 'DHA Mismatch', color: '#EF4444' },
};

const TABS: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Stethoscope style={{ width: 13, height: 13 }} /> },
  { id: 'performance', label: 'Performance', icon: <Activity style={{ width: 13, height: 13 }} /> },
  { id: 'dha', label: 'DHA & Compliance', icon: <Shield style={{ width: 13, height: 13 }} /> },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign style={{ width: 13, height: 13 }} /> },
  { id: 'notes', label: 'Admin Notes', icon: <FileText style={{ width: 13, height: 13 }} /> },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: '#64748B', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#F1F5F9' }}>{p.name ? `${p.name}: ` : ''}{typeof p.value === 'number' && p.value > 10000 ? `AED ${p.value.toLocaleString()}` : p.value}</div>
      ))}
    </div>
  );
};

export default function DoctorDetailDrawer({ doctor, onClose, onStatusAction, showToast }: DoctorDetailDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [note, setNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<{ text: string; ts: string }[]>([]);

  useEffect(() => {
    if (doctor) {
      setTimeout(() => setVisible(true), 10);
      setTab('overview');
    } else {
      setVisible(false);
    }
  }, [doctor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!doctor) return null;

  const statusCfg = STATUS_CFG[doctor.accountStatus] || STATUS_CFG.inactive;
  const verifCfg = VERIFICATION_CFG[doctor.verificationStatus] || VERIFICATION_CFG.pending;

  const expiryColor = doctor.daysUntilExpiry < 0 ? '#EF4444' : doctor.daysUntilExpiry <= 30 ? '#F97316' : doctor.daysUntilExpiry <= 90 ? '#F59E0B' : '#10B981';

  const handleSaveNote = () => {
    if (!note.trim()) return;
    setSavedNotes(prev => [{ text: note.trim(), ts: new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) + ' Today' }, ...prev]);
    setNote('');
    showToast('✅ Note saved');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 560,
          background: '#0F172A',
          borderLeft: '1px solid #1E293B',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms ease-out',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1E293B' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: doctor.avatarGradient, fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}
            >
              {doctor.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{doctor.name}</span>
                {doctor.isTopRated && <Star style={{ width: 14, height: 14, color: '#F59E0B' }} fill="#F59E0B" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{doctor.specialty} · {doctor.dhaCategory}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: '#475569' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 pb-0 flex-shrink-0" style={{ borderBottom: '1px solid #1E293B' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-lg transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                color: tab === t.id ? '#2DD4BF' : '#64748B',
                background: tab === t.id ? 'rgba(13,148,136,0.1)' : 'transparent',
                borderBottom: tab === t.id ? '2px solid #0D9488' : '2px solid transparent',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'overview' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 rounded-full" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: verifCfg.color }}>
                  ◉ {verifCfg.label}
                </span>
                {doctor.isPlatformTeam && (
                  <span className="px-2 py-1 rounded-full" style={{ fontSize: 11, background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', fontFamily: 'Inter, sans-serif', border: '1px solid rgba(13,148,136,0.3)' }}>
                    Platform Team
                  </span>
                )}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>Personal Information</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  {[
                    { label: 'Date of Birth', value: doctor.dob },
                    { label: 'Gender', value: `${doctor.gender === 'M' ? 'Male' : 'Female'} · ${doctor.nationalityFlag} ${doctor.nationality}` },
                    { label: 'Emirates ID', value: doctor.emiratesId },
                    { label: 'Languages', value: doctor.languages },
                    { label: 'Platform Since', value: doctor.platformJoined },
                    { label: 'Last Login', value: doctor.lastLogin },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#CBD5E1', fontFamily: label === 'Emirates ID' ? 'DM Mono, monospace' : 'Inter, sans-serif', marginTop: 1 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>Contact</div>
                <div className="flex flex-col gap-2">
                  <a href={`mailto:${doctor.email}`} className="flex items-center gap-2 group">
                    <Mail style={{ width: 13, height: 13, color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#60A5FA', fontFamily: 'Inter, sans-serif' }}>{doctor.email}</span>
                  </a>
                  <div className="flex items-center gap-2">
                    <Phone style={{ width: 13, height: 13, color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'DM Mono, monospace' }}>{doctor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin style={{ width: 13, height: 13, color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{doctor.clinicPrimary} · {doctor.location}</span>
                  </div>
                </div>
              </div>

              {doctor.medicalSchool && (
                <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Credentials</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award style={{ width: 13, height: 13, color: '#64748B' }} />
                    <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{doctor.medicalSchool}</span>
                  </div>
                  {doctor.boardCerts && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {doctor.boardCerts.map(c => (
                        <span key={c} className="px-2.5 py-1 rounded-lg" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(doctor.flagReason || doctor.suspendReason) && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle style={{ width: 13, height: 13, color: '#EF4444' }} />
                    <span style={{ fontSize: 11, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>
                      {doctor.flagReason ? 'Flag Reason' : 'Suspension Reason'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#FCA5A5', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                    {doctor.flagReason || doctor.suspendReason}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'performance' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Consultations', value: doctor.consultationsTotal.toLocaleString(), color: '#2DD4BF' },
                  { label: 'This Month', value: doctor.consultationsMonth.toString(), color: '#60A5FA' },
                  { label: 'Rating', value: doctor.rating > 0 ? `${doctor.rating} ★` : '—', color: '#F59E0B' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: 'DM Mono, monospace' }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>Monthly Consultations</div>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={drConsultationTrend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="consultations" stroke="#0D9488" fill="url(#cGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Platform Stats</div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Total Consultations', value: doctor.consultationsTotal.toLocaleString() },
                    { label: 'Platform Rating', value: doctor.rating > 0 ? `${doctor.rating} / 5.0 (${doctor.ratingCount} reviews)` : 'No reviews yet' },
                    { label: 'Complaints', value: `${doctor.complaints} total · ${doctor.openComplaints} open` },
                    { label: 'Clinic', value: doctor.clinicPrimary },
                    ...(doctor.clinicSecondary ? [{ label: 'Secondary Clinic', value: doctor.clinicSecondary }] : []),
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'dha' && (
            <div className="flex flex-col gap-5">
              <div
                className="rounded-xl p-4"
                style={{
                  background: doctor.daysUntilExpiry < 0 ? 'rgba(239,68,68,0.06)' : doctor.daysUntilExpiry <= 30 ? 'rgba(249,115,22,0.06)' : 'rgba(16,185,129,0.06)',
                  border: `1px solid ${expiryColor}33`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>DHA License Number</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'DM Mono, monospace' }}>{doctor.dhaLicense}</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>License Expiry</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: expiryColor, fontFamily: 'DM Mono, monospace' }}>{doctor.licenseExpiry}</div>
                    <div style={{ fontSize: 11, color: expiryColor, fontFamily: 'Inter, sans-serif', opacity: 0.8 }}>
                      {doctor.daysUntilExpiry < 0 ? `Expired ${Math.abs(doctor.daysUntilExpiry)} days ago` : `${doctor.daysUntilExpiry} days remaining`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>License Details</div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'DHA Category', value: doctor.dhaCategory },
                    { label: 'Specialty', value: doctor.specialty + (doctor.subSpecialty ? ` (${doctor.subSpecialty})` : '') },
                    { label: 'Verification Status', value: verifCfg.label },
                    { label: 'Primary Facility DHA#', value: doctor.clinicPrimaryDha || '—' },
                    { label: 'License Status', value: doctor.licenseStatus.replace('-', ' ') },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {doctor.verificationDocuments && (
                <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Documents on File</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(doctor.verificationDocuments).map(([key, ok]) => (
                      <div key={key} className="flex items-center gap-2">
                        {ok ? <CheckCircle2 style={{ width: 13, height: 13, color: '#10B981' }} /> : <AlertTriangle style={{ width: 13, height: 13, color: '#F59E0B' }} />}
                        <span style={{ fontSize: 12, color: ok ? '#94A3B8' : '#FCD34D', fontFamily: 'Inter, sans-serif' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'revenue' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Revenue', value: `AED ${(doctor.revenueTotal / 1000).toFixed(1)}K`, color: '#2DD4BF' },
                  { label: 'This Month', value: `AED ${(doctor.revenueMonth / 1000).toFixed(1)}K`, color: '#60A5FA' },
                  { label: 'Platform Fees', value: `AED ${(doctor.platformFeeTotal / 1000).toFixed(1)}K`, color: '#F59E0B' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: 'DM Mono, monospace' }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>Monthly Revenue (AED)</div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={drRevenueMonthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>Insurance Mix</div>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie data={drInsuranceMix} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                        {drInsuranceMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5">
                    {drInsuranceMix.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{d.name}</span>
                        <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Add Admin Note</div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add an internal note about this doctor..."
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 resize-none"
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
                <button
                  onClick={handleSaveNote}
                  className="mt-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none', opacity: note.trim() ? 1 : 0.5 }}
                  disabled={!note.trim()}
                >
                  Save Note
                </button>
              </div>

              {savedNotes.length > 0 && (
                <div className="flex flex-col gap-3">
                  {savedNotes.map((n, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                      <div style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>You · {n.ts}</div>
                    </div>
                  ))}
                </div>
              )}

              {savedNotes.length === 0 && (
                <div className="text-center py-8">
                  <FileText style={{ width: 32, height: 32, color: '#334155', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13, color: '#475569', fontFamily: 'Inter, sans-serif' }}>No notes yet</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex-shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid #1E293B' }}>
          <button
            onClick={() => showToast('📧 Email sent to doctor')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
          >
            <Mail style={{ width: 13, height: 13 }} /> Email
          </button>
          <button
            onClick={() => showToast('💬 Platform message sent')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
          >
            <MessageSquare style={{ width: 13, height: 13 }} /> Message
          </button>
          <button
            onClick={() => showToast('🔗 Opening doctor portal...')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
          >
            <ExternalLink style={{ width: 13, height: 13 }} /> Open Portal
          </button>
          <div className="flex-1" />
          {doctor.accountStatus !== 'suspended' && (
            <button
              onClick={() => onStatusAction(doctor, 'flag')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.2)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)'}
            >
              <AlertTriangle style={{ width: 13, height: 13 }} /> Flag
            </button>
          )}
          <button
            onClick={() => onStatusAction(doctor, 'suspend')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
          >
            <ShieldOff style={{ width: 13, height: 13 }} /> Suspend
          </button>
        </div>
      </div>
    </>
  );
}
