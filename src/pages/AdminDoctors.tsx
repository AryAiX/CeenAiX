import { useState, useCallback, useMemo } from 'react';
import { Stethoscope, BarChart3, Download, UserPlus, LayoutList, AlertTriangle, Clock, XCircle } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import DoctorKpiStrip from '../components/adminDoctors/DoctorKpiStrip';
import DoctorFilterBar from '../components/adminDoctors/DoctorFilterBar';
import DoctorTable from '../components/adminDoctors/DoctorTable';
import VerificationQueue from '../components/adminDoctors/VerificationQueue';
import LicenseAlertsTab from '../components/adminDoctors/LicenseAlertsTab';
import FlaggedSuspendedTab from '../components/adminDoctors/FlaggedSuspendedTab';
import DoctorAnalyticsView from '../components/adminDoctors/DoctorAnalyticsView';
import DoctorDetailDrawer from '../components/adminDoctors/DoctorDetailDrawer';
import {
  ApproveModal, RejectModal, DoctorStatusActionModal,
  AddDoctorModal, ExportDoctorsModal
} from '../components/adminDoctors/DoctorModals';
import { AdminDoctor, mockDoctors } from '../data/adminDoctorsData';

type MainTab = 'all' | 'pending' | 'license-alerts' | 'flagged';

interface ToastItem { id: string; msg: string; }

export default function AdminDoctors() {
  const [activeSection, setActiveSection] = useState('doctors');
  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [analyticsView, setAnalyticsView] = useState(false);

  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [licenseFilter, setLicenseFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest First');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [selectedDoctor, setSelectedDoctor] = useState<AdminDoctor | null>(null);
  const [approveTarget, setApproveTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [statusAction, setStatusAction] = useState<{ doctor: AdminDoctor; action: 'flag' | 'suspend' | 'deactivate' } | null>(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((msg: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const filteredDoctors = useMemo(() => {
    let list = mockDoctors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.dhaLicense.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
      );
    }
    if (specialtyFilter !== 'All') list = list.filter(d => d.specialty === specialtyFilter);
    if (statusFilter !== 'All') list = list.filter(d => d.accountStatus === statusFilter.toLowerCase());
    if (licenseFilter !== 'All') {
      if (licenseFilter === 'Expiring') list = list.filter(d => d.daysUntilExpiry <= 90 && d.daysUntilExpiry > 0);
      if (licenseFilter === 'Expired') list = list.filter(d => d.daysUntilExpiry < 0);
      if (licenseFilter === 'Valid') list = list.filter(d => d.daysUntilExpiry > 90);
    }
    if (mainTab === 'pending') list = list.filter(d => d.verificationStatus === 'pending');
    if (mainTab === 'flagged') list = list.filter(d => d.accountStatus === 'flagged' || d.accountStatus === 'suspended');
    if (mainTab === 'license-alerts') list = list.filter(d => d.daysUntilExpiry <= 90);
    return list;
  }, [search, specialtyFilter, statusFilter, licenseFilter, mainTab]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (v: boolean) => {
    if (v) setSelectedIds(new Set(filteredDoctors.map(d => d.id)));
    else setSelectedIds(new Set());
  };

  const handleApprove = (id: string, name: string) => {
    setApproveTarget({ id, name });
  };

  const handleReject = (id: string, name: string) => {
    setRejectTarget({ id, name });
  };

  const handleApproveConfirm = () => {
    showToast(`✅ ${approveTarget?.name} approved — account activated`);
    setApproveTarget(null);
  };

  const handleRejectConfirm = (reason: string) => {
    showToast(`❌ Application rejected — reason recorded`);
    setRejectTarget(null);
  };

  const handleStatusConfirm = (reason: string) => {
    const labels: Record<string, string> = {
      flag: '🚩 Account flagged — reason recorded',
      suspend: '⛔ Account suspended — access revoked',
      deactivate: '⏸ Account deactivated',
    };
    showToast(labels[statusAction!.action] || '✅ Action completed');
    setStatusAction(null);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    const paths: Record<string, string> = {
      dashboard: '/admin/dashboard',
      patients: '/admin/patients',
      doctors: '/admin/doctors',
      users: '/admin/users',
      organizations: '/admin/organizations',
    };
    if (paths[section] && section !== 'doctors') {
      window.history.pushState({}, '', paths[section]);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const alertsStrip = [
    { type: 'critical', icon: <XCircle style={{ width: 13, height: 13 }} />, msg: '1 license expired — account auto-suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    { type: 'warning', icon: <AlertTriangle style={{ width: 13, height: 13 }} />, msg: '3 licenses expiring in <30 days — reminders not sent', color: '#FB923C', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
    { type: 'info', icon: <Clock style={{ width: 13, height: 13 }} />, msg: '4 applications pending verification · 2 ready to approve', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  ];

  const TAB_CONFIG: { id: MainTab; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'All Doctors', count: mockDoctors.length },
    { id: 'pending', label: 'Pending Verification', count: mockDoctors.filter(d => d.verificationStatus === 'pending').length, color: '#F59E0B' },
    { id: 'license-alerts', label: 'License Alerts', count: mockDoctors.filter(d => d.daysUntilExpiry <= 90).length, color: '#FB923C' },
    { id: 'flagged', label: 'Flagged / Suspended', count: mockDoctors.filter(d => d.accountStatus === 'flagged' || d.accountStatus === 'suspended').length, color: '#EF4444' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#0F172A' }}>
      <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="sticky top-0 z-30 flex items-center gap-4 px-6 flex-shrink-0"
          style={{ height: 64, background: '#1E293B', borderBottom: '1px solid rgba(51,65,85,0.8)' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Stethoscope style={{ width: 18, height: 18, color: '#2DD4BF' }} />
            <div style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
              <span style={{ color: '#475569' }}>Admin Portal › </span>
              <span style={{ color: '#CBD5E1', fontWeight: 700 }}>Doctors</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontSize: 12, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>847 verified doctors</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <Stethoscope style={{ width: 28, height: 28, color: '#2DD4BF' }} />
              <div>
                <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2 }}>
                  Doctors
                </h1>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  DHA license verification & platform-wide doctor management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAnalyticsView(!analyticsView)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                style={{
                  fontSize: 13, fontFamily: 'Inter, sans-serif',
                  background: analyticsView ? 'rgba(13,148,136,0.15)' : '#334155',
                  color: analyticsView ? '#5EEAD4' : '#94A3B8',
                  border: `1px solid ${analyticsView ? 'rgba(13,148,136,0.4)' : '#475569'}`,
                  height: 40,
                }}
              >
                {analyticsView ? <LayoutList style={{ width: 16, height: 16 }} /> : <BarChart3 style={{ width: 16, height: 16 }} />}
                {analyticsView ? 'List View' : 'Analytics'}
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569', height: 40 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
              >
                <Download style={{ width: 16, height: 16 }} />
                Export
              </button>
              <button
                onClick={() => setShowAddDoctor(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#0D9488', color: '#fff', border: 'none', height: 40, fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0F766E'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0D9488'}
              >
                <UserPlus style={{ width: 16, height: 16 }} />
                Add Doctor
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {alertsStrip.map(a => (
              <div
                key={a.type}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: a.bg, border: `1px solid ${a.border}` }}
              >
                <span style={{ color: a.color }}>{a.icon}</span>
                <span style={{ fontSize: 12, color: a.color, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{a.msg}</span>
              </div>
            ))}
          </div>

          {!analyticsView && (
            <DoctorKpiStrip
              activeTab={mainTab}
              onTabChange={(tab) => {
                if (tab === 'pending') setMainTab('pending');
                else if (tab === 'alerts') setMainTab('license-alerts');
                else if (tab === 'flagged') setMainTab('flagged');
                else setMainTab('all');
              }}
            />
          )}

          {analyticsView ? (
            <DoctorAnalyticsView />
          ) : (
            <>
              <div className="flex items-center gap-1 mb-5 p-1 rounded-xl self-start" style={{ background: '#1E293B', border: '1px solid #334155', width: 'fit-content' }}>
                {TAB_CONFIG.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setMainTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                      background: mainTab === tab.id ? (tab.id === 'all' ? '#0D9488' : 'rgba(51,65,85,0.8)') : 'transparent',
                      color: mainTab === tab.id ? (tab.id === 'all' ? '#fff' : (tab.color || '#F1F5F9')) : '#64748B',
                      border: mainTab === tab.id && tab.id !== 'all' ? `1px solid ${tab.color || '#475569'}33` : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                    <span
                      className="px-1.5 py-0.5 rounded-md"
                      style={{
                        fontSize: 11, fontFamily: 'DM Mono, monospace',
                        background: mainTab === tab.id && tab.id !== 'all' ? `${tab.color}22` : 'rgba(51,65,85,0.5)',
                        color: mainTab === tab.id ? (tab.color || '#2DD4BF') : '#475569',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {mainTab === 'pending' ? (
                <VerificationQueue
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showToast={showToast}
                />
              ) : mainTab === 'license-alerts' ? (
                <LicenseAlertsTab
                  showToast={showToast}
                  onRowClick={setSelectedDoctor}
                />
              ) : mainTab === 'flagged' ? (
                <FlaggedSuspendedTab showToast={showToast} />
              ) : (
                <>
                  <DoctorFilterBar
                    search={search} onSearchChange={setSearch}
                    specialtyFilter={specialtyFilter} onSpecialtyChange={setSpecialtyFilter}
                    statusFilter={statusFilter} onStatusChange={setStatusFilter}
                    licenseFilter={licenseFilter} onLicenseChange={setLicenseFilter}
                    sortBy={sortBy} onSortChange={setSortBy}
                    perPage={perPage} onPerPageChange={setPerPage}
                    selectAll={selectedIds.size === filteredDoctors.length && filteredDoctors.length > 0}
                    onSelectAll={handleSelectAll}
                  />
                  <DoctorTable
                    doctors={filteredDoctors}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onRowClick={setSelectedDoctor}
                    onApprove={d => handleApprove(d.id, d.name)}
                    onReject={d => handleReject(d.id, d.name)}
                    showToast={showToast}
                  />
                  <div className="flex items-center justify-between mt-4">
                    <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                      Showing {filteredDoctors.length} of {mockDoctors.length} doctors
                    </span>
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{selectedIds.size} selected</span>
                        {[
                          { label: '📧 Email', action: 'email' },
                          { label: '🔔 Remind All', action: 'remind' },
                          { label: '📤 Export', action: 'export' },
                        ].map(btn => (
                          <button key={btn.action} onClick={() => showToast(`✅ Bulk action: ${btn.action}`)} className="px-3 py-1.5 rounded-lg" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <DoctorDetailDrawer
        doctor={selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        onStatusAction={(doctor, action) => {
          setSelectedDoctor(null);
          setStatusAction({ doctor, action });
        }}
        showToast={showToast}
      />

      {approveTarget && (
        <ApproveModal
          doctorName={approveTarget.name}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApproveConfirm}
        />
      )}
      {rejectTarget && (
        <RejectModal
          doctorName={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
      {statusAction && (
        <DoctorStatusActionModal
          doctor={statusAction.doctor}
          action={statusAction.action}
          onClose={() => setStatusAction(null)}
          onConfirm={handleStatusConfirm}
        />
      )}
      {showAddDoctor && <AddDoctorModal onClose={() => setShowAddDoctor(false)} showToast={showToast} />}
      {showExport && <ExportDoctorsModal onClose={() => setShowExport(false)} showToast={showToast} />}

      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl px-4 py-3 shadow-2xl"
            style={{
              background: '#1E293B', borderLeft: '4px solid #0D9488',
              color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              width: 300, animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
