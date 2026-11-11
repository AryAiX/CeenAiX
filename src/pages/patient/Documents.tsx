import { useMemo, useState } from 'react';
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
  Lock,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import {
  getPatientDocumentSignedUrl,
  recordPatientDocumentShare,
  setPatientDocumentCareTeamAccess,
  softDeletePatientDocument,
  uploadPatientDocument,
  usePatientDocumentVault,
  usePatientInsurance,
  usePatientLabResults,
  usePatientPrescriptions,
  type PatientVaultDocumentCategory,
} from '../../hooks';
import type { PatientPharmacyWorkflowStatus } from '../../hooks/use-patient-prescriptions';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { createPdfReport, drawPdfFooters, drawPdfHeader } from '../../lib/pdf-report';
import { savePdf } from '../../lib/save-file';
import { labItemDisplayStatus, type LabDisplayStatus } from '../../lib/lab-report-item';

// Lab result categories reuse the existing Lab Results status badge keys.
const LAB_STATUS_KEY: Record<LabDisplayStatus, string> = {
  normal: 'patient.labResults.statusNormal',
  abnormal: 'patient.labResults.statusAbnormal',
  borderline: 'patient.labResults.statusBorderline',
  high: 'patient.labResults.statusHigh',
  low: 'patient.labResults.statusLow',
  critical: 'patient.labResults.statusCritical',
  pending: 'patient.labResults.statusPending',
};

// Prefix icons for pharmacy statuses that have one; the rest show the label alone.
const PHARMACY_STATUS_ICON: Partial<Record<PatientPharmacyWorkflowStatus, string>> = {
  dispensed: '✅ ',
  picked_up: '✅ ',
  in_progress: '⏳ ',
  not_sent: '📤 ',
};

export const PatientDocuments = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data: labOrders, loading: labsLoading, error: labsError, refetch: refetchLabs } = usePatientLabResults(user?.id);
  const { data: prescriptions, loading: prescriptionsLoading, error: rxError, refetch: refetchRx } = usePatientPrescriptions(user?.id);
  const { data: insurance, loading: insuranceLoading, error: insuranceError, refetch: refetchInsurance } = usePatientInsurance(user?.id);
  const { data: vaultDocuments, loading: vaultLoading, error: vaultError, refetch: refetchVault } = usePatientDocumentVault(user?.id);
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState<PatientVaultDocumentCategory>('upload');
  const [uploadCareTeamAccess, setUploadCareTeamAccess] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [vaultActionBusyId, setVaultActionBusyId] = useState<string | null>(null);
  const [vaultActionError, setVaultActionError] = useState<string | null>(null);

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
    category: 'lab-report' | 'prescription' | 'insurance' | 'imaging' | 'visit-note' | 'upload' | 'other';
    categoryLabel: string;
    categoryColor: string;
    date: string;
    issuedBy: string;
    contains: string;
    status: 'reviewed' | 'active' | 'pending' | 'private' | 'shared';
    source: 'lab_orders' | 'prescriptions' | 'patient_insurance' | 'patient_document_files';
    storagePath?: string;
    vaultDocumentId?: string;
    allowCareTeamAccess?: boolean;
    fileSizeBytes?: number;
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
      issuedBy: order.labName ?? t('patient.documents.labNotRecorded'),
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

    const uploadedDocs: PatientDocument[] = (vaultDocuments ?? []).map((doc) => ({
      id: `vault-${doc.id}`,
      name: doc.title,
      fileName: doc.originalFileName,
      category: doc.category,
      categoryLabel: t(`patient.documents.category.${doc.category}`, { defaultValue: doc.category.replace(/-/g, ' ') }),
      categoryColor: '#0891B2',
      date: doc.createdAt,
      issuedBy: t('patient.documents.uploadedByPatient'),
      contains: doc.description ?? doc.originalFileName,
      // A patient's own upload is never "reviewed", so show who can see it instead.
      status: doc.allowCareTeamAccess ? 'shared' : 'private',
      source: 'patient_document_files',
      storagePath: doc.storagePath,
      vaultDocumentId: doc.id,
      allowCareTeamAccess: doc.allowCareTeamAccess,
      fileSizeBytes: doc.fileSizeBytes,
    }));

    return [...uploadedDocs, ...labDocs, ...prescriptionDocs, ...insuranceDocs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [insurance?.plans, labOrders, prescriptions, t, vaultDocuments]);

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
  const loading = labsLoading || prescriptionsLoading || insuranceLoading || vaultLoading;
  const loadError = labsError ?? rxError ?? insuranceError ?? vaultError ?? vaultActionError;
  const handleRetry = () => {
    void refetchLabs();
    void refetchRx();
    void refetchInsurance();
    void refetchVault();
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
    {
      id: 'upload',
      label: t('patient.documents.categoryUploads'),
      count: documents.filter((doc) => doc.category === 'upload' || doc.source === 'patient_document_files').length,
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
    setVaultActionError(null);
    let vaultUrl: string | null = null;
    if (shareModalDocument.source === 'patient_document_files' && shareModalDocument.storagePath) {
      try {
        vaultUrl = await getPatientDocumentSignedUrl(shareModalDocument.storagePath, 3600);
        if (shareModalDocument.vaultDocumentId && user?.id) {
          await recordPatientDocumentShare(shareModalDocument.vaultDocumentId, user.id, shareMethod);
        }
      } catch (err) {
        setVaultActionError(err instanceof Error ? err.message : t('patient.documents.shareError'));
        return;
      }
    }
    const text = [
      shareModalDocument.name,
      `Issued by: ${shareModalDocument.issuedBy}`,
      `Date: ${formatDate(shareModalDocument.date)}`,
      `Contents: ${shareModalDocument.contains}`,
      '',
      vaultUrl
        ? `Secure link: ${vaultUrl}`
        : `View the live source: ${window.location.origin}${
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

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('upload');
    setUploadCareTeamAccess(false);
    setUploadBusy(false);
  };

  const handleUploadDocument = async () => {
    if (!user?.id || !uploadFile) return;
    setUploadBusy(true);
    setVaultActionError(null);
    try {
      await uploadPatientDocument({
        patientId: user.id,
        file: uploadFile,
        title: uploadTitle || uploadFile.name,
        description: uploadDescription,
        category: uploadCategory,
        allowCareTeamAccess: uploadCareTeamAccess,
      });
      resetUploadModal();
      await refetchVault();
    } catch (err) {
      setVaultActionError(err instanceof Error ? err.message : t('patient.documents.uploadError'));
      setUploadBusy(false);
    }
  };

  const openVaultDocument = async (doc: PatientDocument) => {
    if (!doc.storagePath) return;
    setVaultActionBusyId(doc.id);
    setVaultActionError(null);
    try {
      const signedUrl = await getPatientDocumentSignedUrl(doc.storagePath);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setVaultActionError(err instanceof Error ? err.message : t('patient.documents.openError'));
    } finally {
      setVaultActionBusyId(null);
    }
  };

  const toggleCareTeamAccess = async (doc: PatientDocument) => {
    if (!doc.vaultDocumentId) return;
    setVaultActionBusyId(doc.id);
    setVaultActionError(null);
    try {
      const nextValue = !doc.allowCareTeamAccess;
      await setPatientDocumentCareTeamAccess(doc.vaultDocumentId, nextValue);
      if (user?.id && nextValue) {
        await recordPatientDocumentShare(doc.vaultDocumentId, user.id, 'care_team');
      }
      await refetchVault();
    } catch (err) {
      setVaultActionError(err instanceof Error ? err.message : t('patient.documents.accessError'));
    } finally {
      setVaultActionBusyId(null);
    }
  };

  const deleteVaultDocument = async (doc: PatientDocument) => {
    if (!doc.vaultDocumentId) return;
    const confirmed = window.confirm(t('patient.documents.deleteConfirm'));
    if (!confirmed) return;
    setVaultActionBusyId(doc.id);
    setVaultActionError(null);
    try {
      await softDeletePatientDocument(doc.vaultDocumentId);
      setSelectedId(null);
      setContentModalId(null);
      await refetchVault();
    } catch (err) {
      setVaultActionError(err instanceof Error ? err.message : t('patient.documents.deleteError'));
    } finally {
      setVaultActionBusyId(null);
    }
  };

  // The PDF follows the app language, with Arabic laid out right to left (QA-069).
  const generateDocumentPdf = async (doc: PatientDocument) => {
    const pdfKey = (name: string) => t(`patient.documents.pdf.${name}`);
    const report = await createPdfReport(uiLang);
    const { doc: pdf, pageWidth, margin } = report;

    drawPdfHeader(report, t('shared.pdf.brand'), pdfKey('title'));

    let y = 26;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(16);
    report.setWeight('bold');
    report.text(report.fitLine(doc.name, pageWidth - margin * 2), margin, y);
    y += 8;

    pdf.setFontSize(9);
    report.setWeight('normal');
    pdf.setTextColor(100, 116, 139);
    report.labelValue(pdfKey('issuedBy'), report.fitLine(doc.issuedBy, 90), margin, y);
    const dateText = `${pdfKey('date')}: ${formatDate(doc.date)}`;
    report.text(dateText, pageWidth - margin, y, { align: 'right' });
    y += 5;

    pdf.setDrawColor(226, 232, 240);
    report.line(margin, y, pageWidth - margin);
    y += 8;

    // Category badge, as wide as its label.
    pdf.setFontSize(9);
    report.setWeight('bold');
    const badgeLabel = uiLang.toLowerCase().startsWith('ar') ? doc.categoryLabel : doc.categoryLabel.toUpperCase();
    const badgeWidth = report.textWidth(badgeLabel) + 8;
    pdf.setFillColor(
      parseInt(doc.categoryColor.slice(1, 3), 16),
      parseInt(doc.categoryColor.slice(3, 5), 16),
      parseInt(doc.categoryColor.slice(5, 7), 16)
    );
    report.roundedRect(margin, y - 4, badgeWidth, 8, 2);
    pdf.setTextColor(255, 255, 255);
    report.text(badgeLabel, margin + 4, y + 1);
    y += 12;

    pdf.setFontSize(11);
    report.setWeight('bold');
    pdf.setTextColor(15, 23, 42);
    report.text(pdfKey('contents'), margin, y);
    y += 7;

    pdf.setFontSize(9);
    report.setWeight('normal');
    pdf.setTextColor(71, 85, 105);
    const contentLines = report.splitLines(doc.contains, pageWidth - margin * 2);
    report.text(contentLines, margin, y);
    y += contentLines.length * 5 + 8;

    pdf.setDrawColor(226, 232, 240);
    report.line(margin, y, pageWidth - margin);
    y += 8;

    pdf.setFontSize(9);
    report.setWeight('bold');
    pdf.setTextColor(15, 23, 42);
    report.text(pdfKey('viewSource'), margin, y);
    y += 6;
    report.setWeight('normal');
    pdf.setTextColor(13, 148, 136);
    const sourceUrl = `${window.location.origin}${
      doc.source === 'lab_orders'
        ? '/patient/lab-results'
        : doc.source === 'prescriptions'
          ? '/patient/prescriptions'
          : doc.source === 'patient_document_files'
            ? '/patient/documents'
            : '/patient/insurance'
    }`;
    report.text(sourceUrl, margin, y);
    y += 10;

    report.setWeight('bold');
    pdf.setTextColor(15, 23, 42);
    report.text(pdfKey('status'), margin, y);
    y += 6;
    report.setWeight('normal');
    if (doc.status === 'pending') {
      pdf.setTextColor(180, 83, 9);
    } else {
      pdf.setTextColor(5, 150, 105);
    }
    const statusText = t(`patient.documents.status.${doc.status}`);
    report.text(uiLang.toLowerCase().startsWith('ar') ? statusText : statusText.toUpperCase(), margin, y);

    drawPdfFooters(report, t('shared.pdf.footerNote'), (page, total) =>
      t('shared.pdf.pageOf', { page: formatLocaleDigits(page, uiLang), total: formatLocaleDigits(total, uiLang) })
    );

    // savePdf also works inside the phone app, where jsPDF's own save does nothing on iOS (QA-096).
    await savePdf(pdf, doc.fileName);
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
            <h1 className="font-playfair text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{t('patient.documents.title')}</h1>
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
        <button
          type="button"
          onClick={() => {
            setShowUploadModal(true);
            setVaultActionError(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          title={t('patient.documents.uploadHint')}
        >
          <Upload className="h-4 w-4" />
          {t('patient.documents.uploadDocument')}
        </button>
      </div>

      {/* On a phone two cards per row instead of four full-width rows; from md up four across, as before. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <div
          className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md sm:p-5"
          onClick={() => { setCategory('all'); setShowPendingOnly(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategory('all'); setShowPendingOnly(false); } }}
        >
          <div className="text-xs uppercase tracking-wide text-slate-400">{t('patient.documents.totalDocs')}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatLocaleDigits(documents.length, uiLang)}</div>
        </div>
        <div
          className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md sm:p-5"
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
          className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md sm:p-5"
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
          className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md sm:p-5"
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
                  {doc.status === 'pending' ? (
                    <AlertTriangle className="me-1 inline h-3 w-3 text-amber-500" />
                  ) : doc.status === 'private' ? (
                    <Lock className="me-1 inline h-3 w-3 text-slate-500" />
                  ) : doc.status === 'shared' ? (
                    <Users className="me-1 inline h-3 w-3 text-teal-600" />
                  ) : (
                    <CheckCircle className="me-1 inline h-3 w-3 text-emerald-500" />
                  )}
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
                {doc.source === 'patient_document_files' ? (
                  <div className="font-mono">{doc.fileName}</div>
                ) : null}
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
                    if (doc.source === 'patient_document_files') {
                      void openVaultDocument(doc);
                    } else {
                      setContentModalId(doc.id);
                    }
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
                    if (doc.source === 'patient_document_files') {
                      void openVaultDocument(doc);
                    } else {
                      void generateDocumentPdf(doc).catch(() => undefined);
                    }
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sheet-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedDocument.name}</h2>
                {selectedDocument.source === 'patient_document_files' ? (
                  <p className="mt-1 text-sm text-slate-500">{selectedDocument.fileName}</p>
                ) : null}
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
                  if (selectedDocument.source === 'patient_document_files') {
                    void openVaultDocument(selectedDocument);
                  } else {
                    setContentModalId(selectedDocument.id);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <Eye className="h-4 w-4" /> {t('patient.documents.view')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDocument.source === 'patient_document_files') {
                    void openVaultDocument(selectedDocument);
                  } else {
                    void generateDocumentPdf(selectedDocument).catch(() => undefined);
                  }
                }}
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
              {selectedDocument.source === 'patient_document_files' ? (
                <>
                  <button
                    type="button"
                    disabled={vaultActionBusyId === selectedDocument.id}
                    onClick={() => void toggleCareTeamAccess(selectedDocument)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {selectedDocument.allowCareTeamAccess
                      ? t('patient.documents.revokeCareTeam')
                      : t('patient.documents.allowCareTeam')}
                  </button>
                  <button
                    type="button"
                    disabled={vaultActionBusyId === selectedDocument.id}
                    onClick={() => void deleteVaultDocument(selectedDocument)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('patient.documents.remove')}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      , document.body) : null}

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
        {t('patient.documents.dataNote')}
      </div>

      {showUploadModal ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sheet-backdrop"
          onClick={resetUploadModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('patient.documents.uploadDocument')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('patient.documents.uploadVaultBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={resetUploadModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t('patient.documents.file')}</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setUploadFile(file);
                    if (file && !uploadTitle) {
                      setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
                    }
                  }}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cyan-700"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t('patient.documents.titleLabel')}</span>
                <input
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  maxLength={FORM_FIELD_LIMITS.shortText}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  placeholder={t('patient.documents.titlePlaceholder')}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t('patient.documents.categoryLabel')}</span>
                <select
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value as PatientVaultDocumentCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="upload">{t('patient.documents.categoryUploads')}</option>
                  <option value="lab-report">{t('patient.documents.categoryLab')}</option>
                  <option value="prescription">{t('patient.documents.categoryPrescription')}</option>
                  <option value="insurance">{t('patient.documents.categoryInsurance')}</option>
                  <option value="imaging">{t('patient.documents.category.imaging')}</option>
                  <option value="visit-note">{t('patient.documents.category.visit-note')}</option>
                  <option value="other">{t('patient.documents.category.other')}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t('patient.documents.description')}</span>
                <textarea
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  rows={3}
                  maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  placeholder={t('patient.documents.descriptionPlaceholder')}
                />
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <input
                  type="checkbox"
                  checked={uploadCareTeamAccess}
                  onChange={(event) => setUploadCareTeamAccess(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-cyan-900">
                    {t('patient.documents.allowCareTeam')}
                  </span>
                  <span className="mt-1 block text-xs text-cyan-700">
                    {t('patient.documents.allowCareTeamBody')}
                  </span>
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetUploadModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('shared.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="button"
                  disabled={!uploadFile || uploadBusy}
                  onClick={() => void handleUploadDocument()}
                  className="flex-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadBusy
                    ? t('patient.documents.uploading')
                    : t('patient.documents.uploadDocument')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {shareModalDocument ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sheet-backdrop"
          onClick={() => { setShareModalId(null); setShareSuccess(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Share2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('patient.documents.shareTitle')}</h2>
                  <p className="text-xs text-slate-500">{shareModalDocument.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50"
                aria-label={t('patient.documents.shareCloseAria')}
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
                  <h3 className="text-lg font-bold text-slate-900">{t('patient.documents.shareSuccessTitle')}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                    {shareMethod === 'link'
                      ? t('patient.documents.shareSuccessLink')
                      : shareMethod === 'email'
                        ? t('patient.documents.shareSuccessEmail')
                        : t('patient.documents.shareSuccessWhatsapp')}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                    className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {t('patient.documents.shareDone')}
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
                      { id: 'link' as const, label: t('patient.documents.shareMethodLink'), icon: '🔗' },
                      { id: 'email' as const, label: t('patient.documents.shareMethodEmail'), icon: '✉️' },
                      { id: 'whatsapp' as const, label: t('patient.documents.shareMethodWhatsapp'), icon: '💬' },
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
                    ⚠️ {t('patient.documents.shareDisclaimer')}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShareModalId(null); setShareSuccess(false); }}
                      className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {t('patient.documents.shareCancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:shadow-md"
                    >
                      {t('patient.documents.shareConfirm')}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sheet-backdrop"
          onClick={() => setContentModalId(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto sheet-panel"
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
                aria-label={t('patient.documents.viewCloseAria')}
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
                      <div className="text-center py-8 text-sm text-slate-400">{t('patient.documents.viewNoLabResults')}</div>
                    );
                    return (
                      <div className="space-y-3">
                        {/* Lab info header */}
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewLab')}</span>
                            <span className="font-bold text-slate-900">{order.labName ?? t('patient.documents.labNotRecorded')}</span>
                          </div>
                          {order.labCity ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewLocation')}</span>
                              <span className="font-bold text-slate-900">📍 {order.labCity}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewOrderedBy')}</span>
                            <span className="font-bold text-slate-900">{order.doctorName ?? '—'}</span>
                          </div>
                          {order.doctorSpecialty ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewSpecialty')}</span>
                              <span className="font-bold text-slate-900">{order.doctorSpecialty}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewOrderDate')}</span>
                            <span className="font-bold text-slate-900">{formatDate(order.ordered_at)}</span>
                          </div>
                          {order.results_released_at ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewResultsReleased')}</span>
                              <span className="font-bold text-slate-900">{formatDate(order.results_released_at)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewReviewStatus')}</span>
                            <span className={`font-bold ${order.reviewStatus === 'reviewed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {order.reviewStatus === 'reviewed'
                                ? `✅ ${t('patient.documents.viewReviewedByDoctor')}`
                                : `⏳ ${t('patient.documents.viewPendingReview')}`}
                            </span>
                          </div>
                          {order.lab_order_code ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewOrderCode')}</span>
                              <span className="font-mono font-bold text-slate-900">{order.lab_order_code}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewTotalTests')}</span>
                            <span className="font-bold text-slate-900">{t('patient.documents.viewTestsCount', { count: order.parentItems.length })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewNormal')}</span>
                            <span className="font-bold text-emerald-600">{t('patient.labResults.normalCountBadge', { count: order.normalCount })}</span>
                          </div>
                          {order.monitorCount > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewToMonitor')}</span>
                              <span className="font-bold text-amber-600">{t('patient.labResults.monitorCountBadge', { count: order.monitorCount })}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Test results */}
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">{t('patient.documents.viewTestResults')}</div>
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
                                    <div className="text-xs text-slate-400 mt-0.5">{t('patient.documents.viewRefLabel')} <span dir="ltr">{item.reference_text}</span></div>
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
                                        : t('patient.documents.viewPending')}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isAbnormal ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {t(LAB_STATUS_KEY[labItemDisplayStatus(item)])}
                                  </span>
                                </div>
                              </div>
                              {item.doctor_comment ? (
                                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                                  <div className="text-xs font-bold text-blue-800">{t('patient.documents.viewDoctorNote')}</div>
                                  <p className="text-xs italic text-blue-700">"{item.doctor_comment}"</p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {order.overall_comment ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="mb-1 text-xs font-bold text-blue-800">{t('patient.documents.viewDoctorComment')}</div>
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
                      <div className="text-center py-8 text-sm text-slate-400">{t('patient.documents.viewNoPrescription')}</div>
                    );
                    return (
                      <div className="space-y-3">
                        {/* Prescription header */}
                        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewPrescribedBy')}</span>
                            <span className="font-bold text-slate-900">{rx.doctorName}</span>
                          </div>
                          {rx.doctorSpecialty ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewSpecialty')}</span>
                              <span className="font-bold text-slate-900">{rx.doctorSpecialty}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewPrescribedOn')}</span>
                            <span className="font-bold text-slate-900">{formatDate(rx.prescribed_at)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewStatus')}</span>
                            <span className={`font-bold ${rx.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {rx.status === 'active' ? '✅ ' : '⏹ '}
                              {t(`patient.documents.rxStatus.${rx.status}`)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewTotalMedications')}</span>
                            <span className="font-bold text-slate-900">{t('patient.documents.viewMedicationsCount', { count: rx.items.length })}</span>
                          </div>
                          {rx.pharmacyName ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewPharmacy')}</span>
                              <span className="font-bold text-slate-900">{rx.pharmacyName}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewPharmacyStatus')}</span>
                            <span className={`font-bold ${rx.pharmacyStatus === 'dispensed' || rx.pharmacyStatus === 'picked_up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {rx.pharmacyStatus
                                ? `${PHARMACY_STATUS_ICON[rx.pharmacyStatus] ?? ''}${t(`patient.documents.pharmacyStatus.${rx.pharmacyStatus}`)}`
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Medications list */}
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">{t('patient.documents.viewMedications')}</div>
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
                                  <div className="mt-1 text-xs text-slate-400">{t('patient.documents.viewQty', { quantity: item.quantity })}</div>
                                ) : null}
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${item.is_dispensed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {item.is_dispensed ? `✅ ${t('patient.documents.viewDispensed')}` : `⏳ ${t('patient.documents.viewPending')}`}
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
                      <div className="text-center py-8 text-sm text-slate-400">{t('patient.documents.viewNoInsurance')}</div>
                    );
                    return (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewPlanName')}</span>
                            <span className="font-bold text-slate-900">{plan.planName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewProvider')}</span>
                            <span className="font-bold text-slate-900">{plan.providerCompany}</span>
                          </div>
                          {plan.policyNumber ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewPolicyNumber')}</span>
                              <span className="font-mono font-bold text-slate-900">{plan.policyNumber}</span>
                            </div>
                          ) : null}
                          {plan.memberId ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewMemberId')}</span>
                              <span className="font-mono font-bold text-slate-900">{plan.memberId}</span>
                            </div>
                          ) : null}
                          {plan.coPayPercent != null ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewCoPay')}</span>
                              <span className="font-bold text-slate-900">{plan.coPayPercent}%</span>
                            </div>
                          ) : null}
                          {plan.validFrom ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewValidFrom')}</span>
                              <span className="font-bold text-slate-900">{formatDate(plan.validFrom)}</span>
                            </div>
                          ) : null}
                          {plan.validUntil ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t('patient.documents.viewValidUntil')}</span>
                              <span className="font-bold text-slate-900">{formatDate(plan.validUntil)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('patient.documents.viewStatus')}</span>
                            <span className={`font-bold ${plan.isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {plan.isActive ? `✅ ${t('patient.documents.viewActive')}` : `⏳ ${t('patient.documents.viewInactive')}`}
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
                onClick={() => void generateDocumentPdf(contentModalDocument).catch(() => undefined)}
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
                {t('patient.documents.viewClose')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};
