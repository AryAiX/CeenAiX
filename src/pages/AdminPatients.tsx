import { useState, useCallback, useMemo } from 'react';
import { Users, BarChart3, Download, UserPlus, LayoutList } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import PatientKpiStrip from '../components/adminPatients/PatientKpiStrip';
import PatientFilterBar from '../components/adminPatients/PatientFilterBar';
import PatientTable from '../components/adminPatients/PatientTable';
import PatientCardGrid from '../components/adminPatients/PatientCardGrid';
import PatientTableFooter from '../components/adminPatients/PatientTableFooter';
import PatientDetailDrawer from '../components/adminPatients/PatientDetailDrawer';
import PatientAnalyticsView from '../components/adminPatients/PatientAnalyticsView';
import { ExportModal, StatusActionModal, RegisterPatientModal } from '../components/adminPatients/PatientModals';
import { AdminPatient, PatientStatus, mockPatients } from '../data/adminPatientsData';

interface ToastItem { id: string; msg: string; }

export default function AdminPatients() {
  const [activeSection, setActiveSection] = useState('patients');
  const [analyticsView, setAnalyticsView] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('all');
  const [insuranceFilter, setInsuranceFilter] = useState('All');
  const [emirateFilter, setEmirateFilter] = useState('All UAE');
  const [sortBy, setSortBy] = useState('Newest First');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<AdminPatient | null>(null);
  const [statusAction, setStatusAction] = useState<{ patient: AdminPatient; action: 'flag' | 'suspend' | 'deactivate' } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((msg: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const filtered = useMemo(() => {
    let list = mockPatients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.ptId.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.emiratesId.includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (insuranceFilter !== 'All') list = list.filter(p => p.insurance === insuranceFilter);
    if (emirateFilter !== 'All UAE') list = list.filter(p => p.location === emirateFilter);
    return list;
  }, [search, statusFilter, insuranceFilter, emirateFilter]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (v: boolean) => {
    setSelectAll(v);
    if (v) setSelectedIds(new Set(filtered.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const handleStatusAction = (patient: AdminPatient, action: 'flag' | 'suspend' | 'deactivate') => {
    setStatusAction({ patient, action });
    setSelectedPatient(null);
  };

  const handleStatusConfirm = (reason: string) => {
    const { patient, action } = statusAction!;
    const msgs: Record<string, string> = {
      flag: '✅ Account flagged · ID logged',
      suspend: '✅ Account suspended — reason recorded',
      deactivate: '✅ Account deactivated',
    };
    showToast(msgs[action]);
    setStatusAction(null);
  };

  const handleBulkAction = (action: string) => {
    const count = selectedIds.size;
    const msgs: Record<string, string> = {
      email: `📧 Email sent to ${count} patients`,
      message: `💬 Platform message sent to ${count} patients`,
      flag: `🚩 ${count} accounts flagged`,
      deactivate: `⏸ ${count} accounts deactivated`,
      export: `📤 Exporting ${count} patient records...`,
      delete: '⚠️ Delete requires confirmation',
    };
    showToast(msgs[action] || '✅ Bulk action completed');
    if (action !== 'delete') setSelectedIds(new Set());
  };

  const handleSectionChange = (section: string) => {
    if (section !== 'patients') {
      setActiveSection(section);
      const paths: Record<string, string> = {
        dashboard: '/admin/dashboard',
        users: '/admin/users',
        organizations: '/admin/organizations',
      };
      if (paths[section]) {
        window.history.pushState({}, '', paths[section]);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0F172A' }}>
      <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="sticky top-0 z-30 flex items-center gap-4 px-6 flex-shrink-0"
          style={{ height: 64, background: '#1E293B', borderBottom: '1px solid rgba(51,65,85,0.8)' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users style={{ width: 18, height: 18, color: '#2DD4BF' }} />
            <div style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
              <span style={{ color: '#475569' }}>Admin Portal › </span>
              <span style={{ color: '#CBD5E1', fontWeight: 700 }}>Patients</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontSize: 12, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>1,247 active sessions now</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users style={{ width: 28, height: 28, color: '#2DD4BF' }} />
              <div>
                <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2 }}>
                  Patients
                </h1>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Platform-wide patient management
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
                onClick={() => setShowRegister(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#0D9488', color: '#fff', border: 'none', height: 40, fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0F766E'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0D9488'}
              >
                <UserPlus style={{ width: 16, height: 16 }} />
                Register Patient
              </button>
            </div>
          </div>

          {!analyticsView && (
            <PatientKpiStrip
              onFilterChange={v => { setStatusFilter(v === 'new' || v === 'pending' || v === 'all' ? 'all' : v as PatientStatus); }}
              activeFilter={statusFilter === 'all' ? 'all' : statusFilter}
            />
          )}

          {analyticsView ? (
            <PatientAnalyticsView />
          ) : (
            <>
              <PatientFilterBar
                search={search} onSearchChange={setSearch}
                statusFilter={statusFilter} onStatusChange={setStatusFilter}
                insuranceFilter={insuranceFilter} onInsuranceChange={setInsuranceFilter}
                emirateFilter={emirateFilter} onEmirateChange={setEmirateFilter}
                sortBy={sortBy} onSortChange={setSortBy}
                viewMode={viewMode} onViewModeChange={setViewMode}
                perPage={perPage} onPerPageChange={setPerPage}
                selectAll={selectAll} onSelectAll={handleSelectAll}
              />

              {viewMode === 'table' ? (
                <PatientTable
                  patients={filtered}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onRowClick={setSelectedPatient}
                  onStatusAction={handleStatusAction}
                  showToast={showToast}
                />
              ) : (
                <PatientCardGrid
                  patients={filtered}
                  onRowClick={setSelectedPatient}
                  showToast={showToast}
                />
              )}

              <PatientTableFooter
                totalCount={48231}
                page={page}
                perPage={perPage}
                onPageChange={setPage}
                selectedCount={selectedIds.size}
                onBulkAction={handleBulkAction}
                onDeselectAll={() => { setSelectedIds(new Set()); setSelectAll(false); }}
              />
            </>
          )}
        </div>
      </div>

      <PatientDetailDrawer
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onStatusAction={handleStatusAction}
        showToast={showToast}
      />

      {statusAction && (
        <StatusActionModal
          patient={statusAction.patient}
          action={statusAction.action}
          onClose={() => setStatusAction(null)}
          onConfirm={handleStatusConfirm}
        />
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} showToast={showToast} />}
      {showRegister && <RegisterPatientModal onClose={() => setShowRegister(false)} showToast={showToast} />}

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
