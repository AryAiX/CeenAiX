import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientInsurance, usePatientLabResults, usePatientPrescriptions } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';

export const PatientDocuments = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data: labOrders, loading: labsLoading, error: labsError, refetch: refetchLabs } = usePatientLabResults(user?.id);
  const { data: prescriptions, loading: prescriptionsLoading, error: rxError, refetch: refetchRx } = usePatientPrescriptions(user?.id);
  const { data: insurance, loading: insuranceLoading, error: insuranceError, refetch: refetchInsurance } = usePatientInsurance(user?.id);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | PatientDocument['category']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  const loadError = labsError ?? rxError ?? insuranceError;
  const handleRetry = () => {
    void refetchLabs();
    void refetchRx();
    void refetchInsurance();
  };
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
      {loadError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError}
          <button type="button" onClick={handleRetry} className="ml-2 font-semibold underline">
            {t('shared.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}
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
        <Link
          to="/patient/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          <ShieldCheck className="h-4 w-4" />
          {t('patient.documents.security')}
        </Link>
        <Link
          to="/patient/ai-chat"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          title={t('patient.documents.uploadHint', {
            defaultValue:
              'Upload a document by attaching it to the AI chat — the assistant will store and summarise it for your record.',
          })}
        >
          <Upload className="h-4 w-4" />
          {t('patient.documents.uploadDocument')}
        </Link>
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
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
              {selectedDocument.source === 'lab_orders' ? (
                <Link
                  to="/patient/lab-results"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Eye className="h-4 w-4" /> {t('patient.documents.view')}
                </Link>
              ) : selectedDocument.source === 'prescriptions' ? (
                <Link
                  to="/patient/prescriptions"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Eye className="h-4 w-4" /> {t('patient.documents.view')}
                </Link>
              ) : (
                <Link
                  to="/patient/insurance"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Eye className="h-4 w-4" /> {t('patient.documents.view')}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  // Real client-side download — assembles a human-readable text
                  // summary of the document so patients can keep a local copy
                  // even before the full PDF renderer ships.
                  const lines = [
                    selectedDocument.name,
                    `Issued by: ${selectedDocument.issuedBy}`,
                    `Date: ${formatDate(selectedDocument.date)}`,
                    `Contents: ${selectedDocument.contains}`,
                    '',
                    'View the live, signed source via the CeenAiX patient portal:',
                    `${window.location.origin}${
                      selectedDocument.source === 'lab_orders'
                        ? '/patient/lab-results'
                        : selectedDocument.source === 'prescriptions'
                          ? '/patient/prescriptions'
                          : '/patient/insurance'
                    }`,
                  ];
                  const blob = new Blob([lines.join('\n')], {
                    type: 'text/plain;charset=utf-8',
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = selectedDocument.fileName.replace(/\.pdf$/i, '.txt');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Download className="h-4 w-4" /> {t('patient.documents.download')}
              </button>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  selectedDocument.name
                )}&body=${encodeURIComponent(
                  `${selectedDocument.name}\nIssued by: ${selectedDocument.issuedBy}\nDate: ${formatDate(
                    selectedDocument.date
                  )}\n\nView the live source: ${window.location.origin}${
                    selectedDocument.source === 'lab_orders'
                      ? '/patient/lab-results'
                      : selectedDocument.source === 'prescriptions'
                        ? '/patient/prescriptions'
                        : '/patient/insurance'
                  }`
                )}`}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Share2 className="h-4 w-4" /> {t('patient.documents.share')}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
        {t('patient.documents.dataNote')}
      </div>
    </div>
  );
};
