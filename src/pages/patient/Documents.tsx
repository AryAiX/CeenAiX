import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Grid3x3,
  List,
  Search,
  Share2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientInsurance, usePatientLabResults, usePatientPrescriptions } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';

export const PatientDocuments = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data: labOrders, loading: labsLoading } = usePatientLabResults(user?.id);
  const { data: prescriptions, loading: prescriptionsLoading } = usePatientPrescriptions(user?.id);
  const { data: insurance, loading: insuranceLoading } = usePatientInsurance(user?.id);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | PatientDocument['category']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadedFile(null);
    setUploadSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadedFile(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      locale,
      dateTimeFormatWithNumerals(uiLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );

  interface PatientDocument {
    id: string;
    name: string;
    fileName: string;
    category: 'lab-report' | 'prescription' | 'insurance';
    categoryLabel: string;
    categoryColor: string;
    date: string;
    issuedBy: string;
    contains: string;
    status: 'reviewed' | 'active' | 'pending';
    source: 'lab_orders' | 'prescriptions' | 'patient_insurance';
  }

  const documents = useMemo<PatientDocument[]>(() => {
    const labDocs: PatientDocument[] = (labOrders ?? []).map((order) => ({
      id: `lab-${order.id}`,
      name: `${t('patient.documents.labReport')} — ${order.items[0]?.test_name ?? t('patient.documents.labOrder')}`,
      fileName: `lab_report_${order.id.slice(0, 8)}.pdf`,
      category: 'lab-report',
      categoryLabel: t('patient.documents.categoryLab'),
      categoryColor: '#7C3AED',
      date: order.ordered_at,
      issuedBy: order.labName ?? t('patient.documents.ceenaixLab'),
      contains:
        order.parentItems.length > 0
          ? order.parentItems
              .slice(0, 4)
              .map((item) => item.test_name)
              .join(' + ')
          : t('patient.documents.labOrder'),
      status: order.reviewStatus === 'reviewed' ? 'reviewed' : 'pending',
      source: 'lab_orders',
    }));

    const prescriptionDocs: PatientDocument[] = (prescriptions ?? []).map((rx) => {
      const meds = rx.items.map((item) => item.medication_name).filter(Boolean);
      return {
        id: `rx-${rx.id}`,
        name: `${t('patient.documents.prescription')} — ${meds[0] ?? t('shared.medicationPlan')}`,
        fileName: `prescription_${rx.id.slice(0, 8)}.pdf`,
        category: 'prescription',
        categoryLabel: t('patient.documents.categoryPrescription'),
        categoryColor: '#0D9488',
        date: rx.prescribed_at,
        issuedBy: rx.doctorName,
        contains: meds.length > 0 ? meds.slice(0, 4).join(' + ') : t('shared.medicationPlan'),
        status: rx.status === 'active' ? 'active' : 'reviewed',
        source: 'prescriptions',
      };
    });

    const insuranceDocs: PatientDocument[] = (insurance?.plans ?? []).map((plan) => ({
      id: `insurance-${plan.id}`,
      name: `${t('patient.documents.insuranceCard')} — ${plan.planName}`,
      fileName: `insurance_card_${plan.id.slice(0, 8)}.pdf`,
      category: 'insurance',
      categoryLabel: t('patient.documents.categoryInsurance'),
      categoryColor: '#2563EB',
      date: plan.validFrom ?? plan.validUntil ?? new Date().toISOString(),
      issuedBy: plan.providerCompany,
      contains: plan.policyNumber ?? plan.memberId ?? t('patient.documents.policyData'),
      status: plan.isActive ? 'active' : 'pending',
      source: 'patient_insurance',
    }));

    return [...labDocs, ...prescriptionDocs, ...insuranceDocs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [insurance?.plans, labOrders, prescriptions, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesCategory = category === 'all' || doc.category === category;
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.issuedBy.toLowerCase().includes(q) ||
        doc.contains.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [category, documents, search]);

  const selectedDocument = filtered.find((doc) => doc.id === selectedId) ?? null;
  const loading = labsLoading || prescriptionsLoading || insuranceLoading;
  const categories: Array<{ id: 'all' | PatientDocument['category']; label: string; count: number }> = [
    { id: 'all', label: t('patient.documents.filterAll'), count: documents.length },
    {
      id: 'lab-report',
      label: t('patient.documents.categoryLab'),
      count: documents.filter((doc) => doc.category === 'lab-report').length,
    },
    {
      id: 'prescription',
      label: t('patient.documents.categoryPrescription'),
      count: documents.filter((doc) => doc.category === 'prescription').length,
    },
    {
      id: 'insurance',
      label: t('patient.documents.categoryInsurance'),
      count: documents.filter((doc) => doc.category === 'insurance').length,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100">
            <FolderOpen className="h-6 w-6 text-cyan-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('patient.documents.title')}</h1>
            <p className="text-sm text-slate-500">{t('patient.documents.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSecurityModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          <ShieldCheck className="h-4 w-4" />
          {t('patient.documents.security')}
        </button>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
        >
          <Upload className="h-4 w-4" />
          {t('patient.documents.uploadDocument')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t('patient.documents.totalDocs')}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatLocaleDigits(documents.length, uiLang)}</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-violet-500">{t('patient.documents.labReports')}</div>
          <div className="mt-2 text-3xl font-bold text-violet-600">
            {formatLocaleDigits(categories.find((item) => item.id === 'lab-report')?.count ?? 0, uiLang)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-teal-500">{t('patient.documents.prescriptions')}</div>
          <div className="mt-2 text-3xl font-bold text-teal-600">
            {formatLocaleDigits(categories.find((item) => item.id === 'prescription')?.count ?? 0, uiLang)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-amber-500">{t('patient.documents.needsAction')}</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">
            {formatLocaleDigits(documents.filter((doc) => doc.status === 'pending').length, uiLang)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('patient.documents.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  category === item.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label} ({formatLocaleDigits(item.count, uiLang)})
              </button>
            ))}
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500'}`}
              aria-label={t('patient.documents.gridView')}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500'}`}
              aria-label={t('patient.documents.listView')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900">{t('patient.documents.noDocsTitle')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('patient.documents.noDocsBody')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc, idx) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedId(doc.id)}
              className="animate-slideUp rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${doc.categoryColor}18` }}>
                  <FileText className="h-6 w-6" style={{ color: doc.categoryColor }} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {doc.status === 'pending' ? <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-500" /> : <CheckCircle className="mr-1 inline h-3 w-3 text-emerald-500" />}
                  {t(`patient.documents.status.${doc.status}`)}
                </span>
              </div>
              <h3 className="mb-2 line-clamp-2 font-bold text-slate-900">{doc.name}</h3>
              <p className="mb-3 line-clamp-2 text-sm text-slate-500">{doc.contains}</p>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {formatDate(doc.date)}
                </div>
                <div>{doc.issuedBy}</div>
                <div className="font-mono">{doc.fileName}</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: doc.categoryColor }}>
                  {doc.categoryLabel}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {filtered.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedId(doc.id)}
              className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 text-left transition hover:bg-slate-50 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${doc.categoryColor}18` }}>
                  <FileText className="h-5 w-5" style={{ color: doc.categoryColor }} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-900">{doc.name}</div>
                  <div className="truncate text-sm text-slate-500">{doc.contains}</div>
                </div>
              </div>
              <div className="text-sm text-slate-500">{formatDate(doc.date)}</div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-600" />
                <Download className="h-4 w-4 text-slate-400" />
                <Share2 className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedDocument.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedDocument.fileName}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100">
                {t('shared.close')}
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="mb-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
                <FileText className="h-12 w-12 text-slate-300" />
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">{t('patient.documents.issuedBy')}</dt>
                  <dd className="font-medium text-slate-900">{selectedDocument.issuedBy}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t('patient.documents.date')}</dt>
                  <dd className="font-medium text-slate-900">{formatDate(selectedDocument.date)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-400">{t('patient.documents.contains')}</dt>
                  <dd className="font-medium text-slate-900">{selectedDocument.contains}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
                <Eye className="h-4 w-4" /> {t('patient.documents.view')}
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <Download className="h-4 w-4" /> {t('patient.documents.download')}
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <Share2 className="h-4 w-4" /> {t('patient.documents.share')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
        {t('patient.documents.dataNote')}
      </div>

      {showUploadModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">Upload Document</h2>
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {uploadSuccess ? (
                /* Success screen */
                <div className="flex flex-col items-center gap-4 px-6 py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-9 w-9 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Document Uploaded!</h3>
                  <p className="text-center text-sm text-slate-500">
                    Your file has been encrypted and stored securely.
                  </p>
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    className="mt-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Upload form */
                <div className="px-6 py-5 space-y-5">
                  {/* Drop / click area */}
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-cyan-400 hover:bg-cyan-50"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100">
                      <Upload className="h-7 w-7 text-cyan-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Click to browse files</p>
                      <p className="mt-1 text-xs text-slate-400">PDF, Word (.doc / .docx), or images</p>
                    </div>
                  </button>

                  {/* Hidden file input */}
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={handleFileChange}
                  />

                  {/* Selected file preview */}
                  {uploadedFile && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100">
                        <FileText className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-400">
                          {uploadedFile.type || 'Unknown type'} · {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-3 text-xs text-cyan-700">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Files are encrypted and stored securely
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeUploadModal}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!uploadedFile}
                      onClick={() => setUploadSuccess(true)}
                      className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {showSecurityModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSecurityModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-bold text-slate-900">Document Security</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3 px-6 py-5">
                {[
                  {
                    emoji: '🔒',
                    title: 'End-to-End Encryption',
                    description: 'All documents are encrypted using AES-256 encryption before storage',
                  },
                  {
                    emoji: '🛡️',
                    title: 'HIPAA Compliant',
                    description: 'Our platform follows strict HIPAA guidelines to protect your health data',
                  },
                  {
                    emoji: '👁️',
                    title: 'Access Control',
                    description: 'Only you and authorized healthcare providers can access your documents',
                  },
                  {
                    emoji: '🔐',
                    title: 'Secure Sharing',
                    description: 'When you share documents, recipients get time-limited view-only access',
                  },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-2 text-2xl">{card.emoji}</div>
                    <p className="mb-1 text-sm font-semibold text-slate-800">{card.title}</p>
                    <p className="text-xs leading-relaxed text-slate-500">{card.description}</p>
                  </div>
                ))}
              </div>

              {/* Green banner */}
              <div className="mx-6 mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                Your documents are protected by bank-level security
              </div>

              {/* Got it */}
              <div className="border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
