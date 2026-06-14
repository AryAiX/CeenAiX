import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { createPortal } from 'react-dom';
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
  X,
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [contentModalId, setContentModalId] = useState<string | null>(null);
  const [shareModalId, setShareModalId] = useState<string | null>(null);
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'whatsapp'>('link');
  const [shareSuccess, setShareSuccess] = useState(false);

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
    const result = documents.filter((doc) => {
      const matchesCategory = category === 'all' || doc.category === category;
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.issuedBy.toLowerCase().includes(q) ||
        doc.contains.toLowerCase().includes(q);
      const matchesPending = !showPendingOnly || doc.status === 'pending';
      return matchesCategory && matchesSearch && matchesPending;
    });

    return result.sort((a, b) => {
      if (sortOrder === 'alphabetical') return a.name.localeCompare(b.name);
      if (sortOrder === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [category, documents, search, sortOrder, showPendingOnly]);

  const selectedDocument = filtered.find((doc) => doc.id === selectedId) ?? null;
  const contentModalDocument = documents.find((doc) => doc.id === contentModalId) ?? null;
  const shareModalDocument = documents.find((doc) => doc.id === shareModalId) ?? null;
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

  const handleShare = async () => {
    if (!shareModalDocument) return;
    const text = [
      shareModalDocument.name,
      `Issued by: ${shareModalDocument.issuedBy}`,
      `Date: ${formatDate(shareModalDocument.date)}`,
      `Contents: ${shareModalDocument.contains}`,
      '',
      `View the live source: ${window.location.origin}${
        shareModalDocument.source === 'lab_orders'
          ? '/patient/lab-results'
          : shareModalDocument.source === 'prescriptions'
            ? '/patient/prescriptions'
            : '/patient/insurance'
      }`,
    ].join('\n');

    if (shareMethod === 'link') {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // clipboard denied — proceed anyway
      }
    } else if (shareMethod === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(shareModalDocument.name)}&body=${encodeURIComponent(text)}`);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
    setShareSuccess(true);
  };

  const generateDocumentPdf = (doc: PatientDocument) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 16;
    let y = 20;

    // Header
    pdf.setFillColor(13, 148, 136);
    pdf.rect(0, 0, pageWidth, 14, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CeenAiX Health Platform', margin, 9);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Patient Document', pageWidth - margin, 9, { align: 'right' });

    y = 26;
    pdf.setTextColor(15, 23, 42);

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.name, margin, y);
    y += 8;

    // Meta
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Issued by: ${doc.issuedBy}`, margin, y);
    pdf.text(`Date: ${formatDate(doc.date)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    // Divider
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Category badge
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.setFillColor(
      parseInt(doc.categoryColor.slice(1, 3), 16),
      parseInt(doc.categoryColor.slice(3, 5), 16),
      parseInt(doc.categoryColor.slice(5, 7), 16)
    );
    pdf.roundedRect(margin, y - 4, 40, 8, 2, 2, 'F');
    pdf.text(doc.categoryLabel.toUpperCase(), margin + 4, y + 1);
    y += 12;

    // Contents section
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Document Contents', margin, y);
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const contentLines = pdf.splitTextToSize(doc.contains, pageWidth - margin * 2);
    pdf.text(contentLines, margin, y);
    y += contentLines.length * 5 + 8;

    // Divider
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Source link
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('View Live Source', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(13, 148, 136);
    const sourceUrl = `${window.location.origin}${
      doc.source === 'lab_orders'
        ? '/patient/lab-results'
        : doc.source === 'prescriptions'
          ? '/patient/prescriptions'
          : '/patient/insurance'
    }`;
    pdf.text(sourceUrl, margin, y);
    y += 10;

    // Status
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Status', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    if (doc.status === 'pending') {
      pdf.setTextColor(180, 83, 9);
    } else {
      pdf.setTextColor(5, 150, 105);
    }
    pdf.text(doc.status.toUpperCase(), margin, y);

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, pdf.internal.pageSize.getHeight() - 10, pageWidth, 10, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Generated by CeenAiX Health Platform — Confidential Medical Record', margin, pdf.internal.pageSize.getHeight() - 3);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pdf.internal.pageSize.getHeight() - 3, { align: 'right' });
    }

    pdf.save(doc.fileName);
  };

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
        <div
          className="cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setCategory('all'); setShowPendingOnly(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategory('all'); setShowPendingOnly(false); } }}
        >
          <div className="text-xs uppercase tracking-wide text-slate-400">{t('patient.documents.totalDocs')}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatLocaleDigits(documents.length, uiLang)}</div>
        </div>
        <div
          className="cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setCategory('lab-report'); setShowPendingOnly(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategory('lab-report'); setShowPendingOnly(false); } }}
        >
          <div className="text-xs uppercase tracking-wide text-violet-500">{t('patient.documents.labReports')}</div>
          <div className="mt-2 text-3xl font-bold text-violet-600">
            {formatLocaleDigits(categories.find((item) => item.id === 'lab-report')?.count ?? 0, uiLang)}
          </div>
        </div>
        <div
          className="cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setCategory('prescription'); setShowPendingOnly(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategory('prescription'); setShowPendingOnly(false); } }}
        >
          <div className="text-xs uppercase tracking-wide text-teal-500">{t('patient.documents.prescriptions')}</div>
          <div className="mt-2 text-3xl font-bold text-teal-600">
            {formatLocaleDigits(categories.find((item) => item.id === 'prescription')?.count ?? 0, uiLang)}
          </div>
        </div>
        <div
          className="cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setCategory('all'); setSearch(''); setShowPendingOnly(true); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategory('all'); setSearch(''); setShowPendingOnly(true); } }}
        >
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
                onClick={() => { setCategory(item.id); setShowPendingOnly(false); }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  category === item.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label} ({formatLocaleDigits(item.count, uiLang)})
              </button>
            ))}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="newest">{t('patient.records.sortNewest', { defaultValue: 'Newest First' })}</option>
            <option value="oldest">{t('patient.records.sortOldest', { defaultValue: 'Oldest First' })}</option>
            <option value="alphabetical">{t('patient.records.sortAlpha', { defaultValue: 'A → Z' })}</option>
          </select>
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
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContentModalId(doc.id);
                  }}
                  title={t('patient.documents.view')}
                  className="rounded-lg p-1.5 text-cyan-600 transition hover:bg-cyan-50"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    generateDocumentPdf(doc);
                  }}
                  title={t('patient.documents.download')}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModalId(doc.id);
                    setShareMethod('link');
                    setShareSuccess(false);
                  }}
                  title={t('patient.documents.share')}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDocument ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedDocument.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedDocument.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={t('shared.close')}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
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
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setContentModalId(selectedDocument.id);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <Eye className="h-4 w-4" /> {t('patient.documents.view')}
              </button>
              <button
                type="button"
                onClick={() => generateDocumentPdf(selectedDocument)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Download className="h-4 w-4" /> {t('patient.documents.download')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setShareModalId(selectedDocument.id);
                  setShareMethod('link');
                  setShareSuccess(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Share2 className="h-4 w-4" /> {t('patient.documents.share')}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
        {t('patient.documents.dataNote')}
      </div>

      {shareModalDocument ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShareModalId(null); setShareSuccess(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Share2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Share Document</h2>
                  <p className="text-xs text-slate-500">{shareModalDocument.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              {shareSuccess ? (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-9 w-9 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Document Shared!</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                    {shareMethod === 'link'
                      ? 'Document details copied to clipboard. Paste and share securely.'
                      : shareMethod === 'email'
                        ? 'Your email client has opened with the document pre-filled.'
                        : 'WhatsApp has opened with the document ready to send.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                    className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${shareModalDocument.categoryColor}18` }}>
                      <FileText className="h-5 w-5" style={{ color: shareModalDocument.categoryColor }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{shareModalDocument.name}</div>
                      <div className="text-xs text-slate-500">{shareModalDocument.issuedBy} · {formatDate(shareModalDocument.date)}</div>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-3 gap-3">
                    {[
                      { id: 'link' as const, label: 'Secure Link', icon: '🔗' },
                      { id: 'email' as const, label: 'Email', icon: '✉️' },
                      { id: 'whatsapp' as const, label: 'WhatsApp', icon: '💬' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setShareMethod(m.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-xs font-semibold transition ${
                          shareMethod === m.id
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    ⚠️ Only share with authorized healthcare providers. Recipient will have view-only access.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                      className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:shadow-md"
                    >
                      Share
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {contentModalDocument ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setContentModalId(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{contentModalDocument.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{contentModalDocument.issuedBy} · {formatDate(contentModalDocument.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setContentModalId(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {contentModalDocument.category === 'lab-report' ? (
                <>
                  {(() => {
                    const orderId = contentModalDocument.id.replace('lab-', '');
                    const order = (labOrders ?? []).find((o) => o.id === orderId);
                    if (!order) return (
                      <div className="text-center py-8 text-sm text-slate-400">No results available yet.</div>
                    );
                    return (
                      <div className="space-y-3">
                        {/* Lab info header */}
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Lab</span>
                            <span className="font-bold text-slate-900">{order.labName ?? 'CeenAiX Lab Network'}</span>
                          </div>
                          {order.labCity ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Location</span>
                              <span className="font-bold text-slate-900">📍 {order.labCity}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Ordered By</span>
                            <span className="font-bold text-slate-900">{order.doctorName ?? '—'}</span>
                          </div>
                          {order.doctorSpecialty ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Specialty</span>
                              <span className="font-bold text-slate-900">{order.doctorSpecialty}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Order Date</span>
                            <span className="font-bold text-slate-900">{formatDate(order.ordered_at)}</span>
                          </div>
                          {order.results_released_at ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Results Released</span>
                              <span className="font-bold text-slate-900">{formatDate(order.results_released_at)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Review Status</span>
                            <span className={`font-bold ${order.reviewStatus === 'reviewed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {order.reviewStatus === 'reviewed' ? '✅ Reviewed by doctor' : '⏳ Pending review'}
                            </span>
                          </div>
                          {order.lab_order_code ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Order Code</span>
                              <span className="font-mono font-bold text-slate-900">{order.lab_order_code}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Tests</span>
                            <span className="font-bold text-slate-900">{order.parentItems.length} tests</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Normal</span>
                            <span className="font-bold text-emerald-600">{order.normalCount} normal</span>
                          </div>
                          {order.monitorCount > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">To Monitor</span>
                              <span className="font-bold text-amber-600">{order.monitorCount} to monitor</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Test results */}
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">Test Results</div>
                        {order.parentItems.map((item) => {
                          const isAbnormal = item.is_abnormal === true;
                          return (
                            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="text-sm font-bold text-slate-900">{item.test_name}</div>
                                  {item.display_name_long ? (
                                    <div className="text-xs text-slate-400">{item.display_name_long}</div>
                                  ) : null}
                                  {item.reference_text ? (
                                    <div className="text-xs text-slate-400 mt-0.5">Ref: {item.reference_text}</div>
                                  ) : null}
                                  {item.patient_explanation ? (
                                    <div className="text-xs text-slate-500 mt-1 italic">{item.patient_explanation}</div>
                                  ) : null}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="font-mono text-sm font-bold text-slate-900">
                                    {item.numeric_value != null
                                      ? `${item.numeric_value}${item.result_unit ? ` ${item.result_unit}` : ''}`
                                      : item.result_value != null && item.result_value.trim() !== ''
                                        ? `${item.result_value}${item.result_unit ? ` ${item.result_unit}` : ''}`
                                        : 'Pending'}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isAbnormal ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {item.status_label ?? item.status_category}
                                  </span>
                                </div>
                              </div>
                              {item.doctor_comment ? (
                                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                                  <div className="text-xs font-bold text-blue-800">Doctor Note</div>
                                  <p className="text-xs italic text-blue-700">"{item.doctor_comment}"</p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {order.overall_comment ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="mb-1 text-xs font-bold text-blue-800">Doctor Comment</div>
                            <p className="text-sm italic text-blue-700">"{order.overall_comment}"</p>
                            {order.doctorName ? (
                              <p className="mt-1 text-xs text-blue-500">— {order.doctorName}{order.doctorSpecialty ? `, ${order.doctorSpecialty}` : ''}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </>
              ) : contentModalDocument.category === 'prescription' ? (
                <>
                  {(() => {
                    const rxId = contentModalDocument.id.replace('rx-', '');
                    const rx = (prescriptions ?? []).find((p) => p.id === rxId);
                    if (!rx) return (
                      <div className="text-center py-8 text-sm text-slate-400">No prescription details available.</div>
                    );
                    return (
                      <div className="space-y-3">
                        {/* Prescription header */}
                        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Prescribed By</span>
                            <span className="font-bold text-slate-900">{rx.doctorName}</span>
                          </div>
                          {rx.doctorSpecialty ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Specialty</span>
                              <span className="font-bold text-slate-900">{rx.doctorSpecialty}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Prescribed On</span>
                            <span className="font-bold text-slate-900">{formatDate(rx.prescribed_at)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Status</span>
                            <span className={`font-bold ${rx.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {rx.status === 'active' ? '✅ Active' : '⏹ ' + rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Medications</span>
                            <span className="font-bold text-slate-900">{rx.items.length} medication{rx.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          {rx.pharmacyName ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Pharmacy</span>
                              <span className="font-bold text-slate-900">{rx.pharmacyName}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Pharmacy Status</span>
                            <span className={`font-bold ${rx.pharmacyStatus === 'dispensed' || rx.pharmacyStatus === 'picked_up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {rx.pharmacyStatus === 'dispensed' ? '✅ Dispensed'
                                : rx.pharmacyStatus === 'picked_up' ? '✅ Picked Up'
                                : rx.pharmacyStatus === 'in_progress' ? '⏳ In Progress'
                                : rx.pharmacyStatus === 'not_sent' ? '📤 Not Sent to Pharmacy'
                                : rx.pharmacyStatus ?? '—'}
                            </span>
                          </div>
                        </div>

                        {/* Medications list */}
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">Medications</div>
                        {rx.items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-slate-900">{item.medication_name} {item.dosage ?? ''}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                  {item.frequency ? <span className="rounded-full bg-slate-200 px-2 py-0.5">{item.frequency}</span> : null}
                                  {item.duration ? <span className="rounded-full bg-slate-200 px-2 py-0.5">{item.duration}</span> : null}
                                </div>
                                {item.instructions ? (
                                  <div className="mt-1 text-xs text-slate-400">📋 {item.instructions}</div>
                                ) : null}
                                {item.quantity != null ? (
                                  <div className="mt-1 text-xs text-slate-400">Qty: {item.quantity}</div>
                                ) : null}
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${item.is_dispensed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {item.is_dispensed ? '✅ Dispensed' : '⏳ Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  {(() => {
                    const planId = contentModalDocument.id.replace('insurance-', '');
                    const plan = (insurance?.plans ?? []).find((p) => p.id === planId);
                    if (!plan) return (
                      <div className="text-center py-8 text-sm text-slate-400">No insurance details available.</div>
                    );
                    return (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Plan Name</span>
                            <span className="font-bold text-slate-900">{plan.planName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Provider</span>
                            <span className="font-bold text-slate-900">{plan.providerCompany}</span>
                          </div>
                          {plan.policyNumber ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Policy Number</span>
                              <span className="font-mono font-bold text-slate-900">{plan.policyNumber}</span>
                            </div>
                          ) : null}
                          {plan.memberId ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Member ID</span>
                              <span className="font-mono font-bold text-slate-900">{plan.memberId}</span>
                            </div>
                          ) : null}
                          {plan.coPayPercent != null ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Co-pay</span>
                              <span className="font-bold text-slate-900">{plan.coPayPercent}%</span>
                            </div>
                          ) : null}
                          {plan.validFrom ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Valid From</span>
                              <span className="font-bold text-slate-900">{formatDate(plan.validFrom)}</span>
                            </div>
                          ) : null}
                          {plan.validUntil ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Valid Until</span>
                              <span className="font-bold text-slate-900">{formatDate(plan.validUntil)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Status</span>
                            <span className={`font-bold ${plan.isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {plan.isActive ? '✅ Active' : '⏳ Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => generateDocumentPdf(contentModalDocument)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <Download className="h-4 w-4" />
                {t('patient.documents.download')}
              </button>
              <button
                type="button"
                onClick={() => setContentModalId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};
