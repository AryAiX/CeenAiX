import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Filter,
  FlaskConical,
  Heart,
  Phone,
  Pill,
  Search,
  Shield,
  ShieldCheck,
  Stethoscope,
  Video,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientInsurance, type PatientInsuranceActivity } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';

type InsuranceTab = 'claims' | 'preauth' | 'benefits' | 'documents';
type StatusFilter = 'all' | PatientInsuranceActivity['status'];

function statusClasses(status: PatientInsuranceActivity['status']) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'denied') return 'bg-rose-50 text-rose-800 border-rose-200';
  if (status === 'review') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export const PatientInsurance = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientInsurance(user?.id);
  const [tab, setTab] = useState<InsuranceTab>('claims');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showExclusions, setShowExclusions] = useState(false);
  const [cardActionMessage, setCardActionMessage] = useState<string | null>(null);

  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const formatDate = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString(
          locale,
          dateTimeFormatWithNumerals(uiLang, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        )
      : t('shared.notAvailable', 'N/A');
  const money = (value: number | null | undefined) =>
    value == null ? '—' : `AED ${formatLocaleDigits(Math.round(value), uiLang)}`;

  const primaryPlan = data?.primaryPlan ?? null;

  const handleDownloadCard = () => {
    setCardActionMessage(null);
    if (primaryPlan?.cardPhotoUrl) {
      window.open(primaryPlan.cardPhotoUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const lines = [
      'Insurance card summary',
      `Provider: ${primaryPlan?.providerCompany ?? '—'}`,
      `Member: ${data?.patientName ?? '—'}`,
      `Member ID: ${primaryPlan?.memberId ?? primaryPlan?.policyNumber ?? '—'}`,
      `Plan: ${primaryPlan?.planName ?? '—'}`,
      `Valid until: ${formatDate(primaryPlan?.validUntil)}`,
    ];
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `insurance-card-summary-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setCardActionMessage(
        t('patient.insurance.cardDownloadError', { defaultValue: 'Could not prepare a download. Please try again.' })
      );
    }
  };

  const handleContactInsurer = () => {
    const subject = encodeURIComponent(
      `Insurance inquiry — ${primaryPlan?.memberId ?? primaryPlan?.policyNumber ?? 'member'}`
    );
    const body = encodeURIComponent(
      `Plan: ${primaryPlan?.planName ?? '—'}\nMember ID: ${primaryPlan?.memberId ?? '—'}\nPolicy: ${primaryPlan?.policyNumber ?? '—'}\n\n`
    );
    window.location.assign(`mailto:?subject=${subject}&body=${body}`);
  };
  const coPay = primaryPlan?.coPayPercent ?? null;
  const coveredPercent = coPay == null ? null : Math.max(0, 100 - coPay);
  const annualLimit = primaryPlan?.annualLimit ?? null;
  const annualUsed = primaryPlan?.annualLimitUsed ?? 0;
  const usedPct = annualLimit && annualLimit > 0 ? Math.min(100, (annualUsed / annualLimit) * 100) : 0;

  const activity = useMemo(() => data?.activity ?? [], [data?.activity]);
  const totals = useMemo(
    () =>
      activity.reduce(
        (acc, row) => ({
          total: acc.total + row.totalEstimate,
          covered: acc.covered + row.coveredEstimate,
          patient: acc.patient + row.patientShareEstimate,
          pending: acc.pending + (row.status === 'pending' ? 1 : 0),
        }),
        { total: 0, covered: 0, patient: 0, pending: 0 }
      ),
    [activity]
  );

  const filteredActivity = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activity.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch =
        !q ||
        row.provider.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q) ||
        row.referenceCode.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [activity, search, statusFilter]);

  const tabs: Array<{ key: InsuranceTab; label: string; badge?: number }> = [
    { key: 'claims', label: t('patient.insurance.tabClaims'), badge: activity.length },
    { key: 'preauth', label: t('patient.insurance.tabPreauth') },
    { key: 'benefits', label: t('patient.insurance.tabBenefits') },
    { key: 'documents', label: t('patient.insurance.tabDocuments') },
  ];

  const benefits = [
    {
      icon: Stethoscope,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      name: t('patient.insurance.benefitSpecialists'),
      pct: coveredPercent == null ? '—' : `${formatLocaleDigits(coveredPercent, uiLang)}%`,
      copay: coPay == null ? t('patient.insurance.planNeeded') : t('patient.insurance.coPayPct', { percent: formatLocaleDigits(coPay, uiLang) }),
      notes: t('patient.insurance.benefitSpecialistsNote'),
    },
    {
      icon: FlaskConical,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      name: t('patient.insurance.benefitLabs'),
      pct: coveredPercent == null ? '—' : `${formatLocaleDigits(coveredPercent, uiLang)}%`,
      copay: coPay == null ? t('patient.insurance.planNeeded') : t('patient.insurance.coPayPct', { percent: formatLocaleDigits(coPay, uiLang) }),
      notes: t('patient.insurance.benefitLabsNote'),
    },
    {
      icon: Pill,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      name: t('patient.insurance.benefitPharmacy'),
      pct: coveredPercent == null ? '—' : `${formatLocaleDigits(Math.max(0, coveredPercent - 10), uiLang)}%`,
      copay: coPay == null ? t('patient.insurance.planNeeded') : t('patient.insurance.pharmacyCoPayNote'),
      notes: t('patient.insurance.benefitPharmacyNote'),
    },
    {
      icon: Video,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      name: t('patient.insurance.benefitTelehealth'),
      pct: coveredPercent == null ? '—' : `${formatLocaleDigits(coveredPercent, uiLang)}%`,
      copay: coPay == null ? t('patient.insurance.planNeeded') : t('patient.insurance.coPayPct', { percent: formatLocaleDigits(coPay, uiLang) }),
      notes: t('patient.insurance.benefitTelehealthNote'),
    },
    {
      icon: Heart,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      name: t('patient.insurance.benefitPreventive'),
      pct: primaryPlan ? '100%' : '—',
      copay: primaryPlan ? t('patient.insurance.noCopay') : t('patient.insurance.planNeeded'),
      notes: t('patient.insurance.benefitPreventiveNote'),
    },
    {
      icon: Activity,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      name: t('patient.insurance.benefitPhysio'),
      pct: coveredPercent == null ? '—' : `${formatLocaleDigits(Math.max(0, coveredPercent - 10), uiLang)}%`,
      copay: coPay == null ? t('patient.insurance.planNeeded') : t('patient.insurance.referralRequired'),
      notes: t('patient.insurance.benefitPhysioNote'),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {cardActionMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {cardActionMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('patient.insurance.title')}</h1>
            <p className="text-xs text-slate-400">{t('patient.insurance.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadCard}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          <Download className="h-4 w-4" /> {t('patient.insurance.downloadCard')}
        </button>
        <button
          type="button"
          onClick={handleContactInsurer}
          className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <Phone className="h-4 w-4" /> {primaryPlan?.providerCompany ?? t('patient.insurance.contactInsurer')}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <div
            className="relative min-h-[200px] w-full max-w-lg overflow-hidden rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)',
              boxShadow: '0 20px 60px rgba(30,58,95,0.35)',
            }}
          >
            <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />

            <div className="relative mb-5 flex items-start justify-between">
              <span className="text-sm font-bold text-white">
                {primaryPlan?.providerCompany ?? t('patient.insurance.noInsuranceProvider')}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  {primaryPlan?.isActive ? t('patient.insurance.activeBadge') : t('patient.insurance.notLinkedBadge')}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                  {primaryPlan?.providerCompany?.charAt(0).toUpperCase() ?? 'C'}
                </div>
              </div>
            </div>

            <div className="relative mb-3">
              <div className="mb-1 font-mono text-base font-bold uppercase tracking-widest text-white">
                {data?.patientName ?? t('patient.insurance.memberNameMissing')}
              </div>
              <div className="font-mono text-xs text-white/70">
                {t('patient.insurance.member')}: {primaryPlan?.memberId ?? primaryPlan?.policyNumber ?? '—'}
              </div>
            </div>

            <div className="relative mb-5 flex flex-wrap items-center gap-3">
              <span className="text-base font-bold text-amber-300">{primaryPlan?.planName ?? t('patient.insurance.noPlan')}</span>
              <span className="text-sm text-white/60">{primaryPlan?.coverageType ?? t('patient.insurance.coverageNotRecorded')}</span>
            </div>

            <div className="relative flex items-end justify-between text-xs text-white/70">
              <div>
                <div>{t('patient.insurance.validUntil')}</div>
                <div className="font-mono font-bold text-white">{formatDate(primaryPlan?.validUntil)}</div>
              </div>
              <div className="text-right">
                <div>{t('patient.insurance.copay')}</div>
                <div className="font-mono font-bold text-white">
                  {coPay == null ? '—' : `${formatLocaleDigits(coPay, uiLang)}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-5 text-center">
              <div className="mb-1 text-3xl font-bold text-emerald-600">
                {coveredPercent == null ? '—' : `${formatLocaleDigits(coveredPercent, uiLang)}%`}
              </div>
              <div className="text-sm text-slate-600">{t('patient.insurance.coverage')}</div>
            </div>
            <div className="rounded-xl bg-blue-50 p-5 text-center">
              <div className="mb-1 text-3xl font-bold text-blue-600">{money(annualLimit)}</div>
              <div className="text-sm text-slate-600">{t('patient.insurance.annualLimit')}</div>
            </div>
            <div className="rounded-xl bg-violet-50 p-5 text-center">
              <div className="mb-1 text-3xl font-bold text-violet-600">{money(annualUsed)}</div>
              <div className="text-sm text-slate-600">{t('patient.insurance.usedThisYear')}</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-5 text-center">
              <div className="mb-1 text-3xl font-bold text-amber-600">{formatLocaleDigits(totals.pending, uiLang)}</div>
              <div className="text-sm text-slate-600">{t('patient.insurance.pendingActivity')}</div>
            </div>
          </div>

          <div className="mt-6 w-full max-w-3xl">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600">{t('patient.insurance.annualUsage')}</span>
              <span className="font-bold text-slate-900">
                {money(annualUsed)} / {money(annualLimit)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-700"
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 sm:px-6">
          <div className="flex min-w-max gap-6 overflow-x-auto sm:gap-8">
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`relative px-2 py-4 text-[15px] font-medium transition-all duration-300 ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {item.label}
                  {typeof item.badge === 'number' ? (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {formatLocaleDigits(item.badge, uiLang)}
                    </span>
                  ) : null}
                  {active ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {tab === 'claims' ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-5">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{t('patient.insurance.totalActivity')}</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900">{money(totals.total)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-5">
                  <div className="text-xs uppercase tracking-wide text-emerald-600">{t('patient.insurance.planCovered')}</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">{money(totals.covered)}</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-5">
                  <div className="text-xs uppercase tracking-wide text-blue-600">{t('patient.insurance.youPaid')}</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-blue-700">{money(totals.patient)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    maxLength={FORM_FIELD_LIMITS.searchQuery}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('patient.insurance.searchActivity')}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="rounded-xl border border-slate-200 py-3 pl-10 pr-8 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('patient.insurance.filterAll')}</option>
                    <option value="approved">{t('patient.insurance.statusApproved')}</option>
                    <option value="pending">{t('patient.insurance.statusPending')}</option>
                    <option value="review">{t('patient.insurance.statusReview')}</option>
                    <option value="denied">{t('patient.insurance.statusDenied')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredActivity.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    {t('patient.insurance.noActivity')}
                  </div>
                ) : (
                  filteredActivity.map((item) => {
                    const denied = item.status === 'denied';
                    return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-5 shadow-sm ${
                        denied ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-bold ${denied ? 'text-slate-700 line-through decoration-slate-400' : 'text-slate-900'}`}>
                              {item.service}
                            </h3>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClasses(item.status)}`}>
                              {t(`patient.insurance.status.${item.status}`)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {item.provider} · {item.serviceType} · {formatDate(item.date)}
                          </div>
                          <div className="mt-2 font-mono text-xs text-slate-400">{item.referenceCode}</div>
                        </div>
                        <div className="grid min-w-[260px] grid-cols-3 gap-3 text-right">
                          <div>
                            <div className="text-xs text-slate-400">{t('patient.insurance.fullPrice')}</div>
                            <div className={`font-mono font-bold ${denied ? 'text-slate-500' : 'text-slate-900'}`}>{money(item.totalEstimate)}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${denied ? 'text-rose-600' : 'text-emerald-600'}`}>{t('patient.insurance.covered')}</div>
                            <div
                              className={`font-mono font-bold ${
                                denied ? 'text-rose-700 line-through decoration-rose-400' : 'text-emerald-700'
                              }`}
                            >
                              {money(item.coveredEstimate)}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs ${denied ? 'text-rose-600' : 'text-blue-600'}`}>{t('patient.insurance.patientShare')}</div>
                            <div className={`font-mono font-bold ${denied ? 'text-rose-800' : 'text-blue-700'}`}>
                              {money(item.patientShareEstimate)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {tab === 'preauth' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  {t('patient.insurance.preauthTitle')}
                </div>
                <p className="text-sm text-slate-600">{t('patient.insurance.preauthBody')}</p>
              </div>
              {['MRI / CT imaging', 'High-cost branded medication', 'Elective procedures'].map((label) => (
                <div key={label} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-bold text-slate-900">{label}</div>
                      <div className="text-sm text-slate-500">{primaryPlan?.planName ?? t('patient.insurance.noPlan')}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {t('patient.insurance.ruleBased')}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'benefits' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.name} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${benefit.bg}`}>
                        <Icon className={`h-6 w-6 ${benefit.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900">{benefit.name}</h3>
                          <span className="font-mono text-xl font-bold text-teal-600">{benefit.pct}</span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-600">{benefit.copay}</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">{benefit.notes}</p>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setShowExclusions((prev) => !prev)}
                className="rounded-xl border border-slate-200 p-5 text-left transition hover:bg-slate-50 md:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{t('patient.insurance.exclusionsTitle')}</span>
                  <span className="text-slate-400">{showExclusions ? '▲' : '▼'}</span>
                </div>
                {showExclusions ? <p className="mt-3 text-sm text-slate-500">{t('patient.insurance.exclusionsBody')}</p> : null}
              </button>
            </div>
          ) : null}

          {tab === 'documents' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  key: 'card' as const,
                  title: t('patient.insurance.docCard'),
                  body: primaryPlan?.cardPhotoUrl ? t('patient.insurance.docCardUploaded') : t('patient.insurance.docCardMissing'),
                  icon: ShieldCheck,
                  action: primaryPlan?.cardPhotoUrl
                    ? t('patient.insurance.viewDocument')
                    : t('patient.insurance.uploadCard', { defaultValue: 'Upload on profile' }),
                },
                {
                  key: 'policy' as const,
                  title: t('patient.insurance.docPolicy'),
                  body: primaryPlan?.policyNumber ?? t('patient.insurance.policyMissing'),
                  icon: FileText,
                  action: t('patient.insurance.viewDocument'),
                },
                {
                  key: 'eob' as const,
                  title: t('patient.insurance.docEob'),
                  body: t('patient.insurance.docEobBody', { count: formatLocaleDigits(activity.length, uiLang) }),
                  icon: CheckCircle,
                  action: t('patient.insurance.generateFromActivity'),
                },
                {
                  key: 'annual' as const,
                  title: t('patient.insurance.docAnnual'),
                  body: `${money(annualUsed)} ${t('patient.insurance.usedThisYear').toLowerCase()}`,
                  icon: Activity,
                  action: t('patient.insurance.viewSummary'),
                },
              ].map((doc) => {
                const Icon = doc.icon;
                const handleDocumentAction = () => {
                  if (doc.key === 'card') {
                    if (primaryPlan?.cardPhotoUrl) {
                      window.open(primaryPlan.cardPhotoUrl, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    navigate('/patient/profile');
                    return;
                  }
                  if (doc.key === 'policy' || doc.key === 'annual') {
                    setTab('benefits');
                    return;
                  }
                  setTab('claims');
                };

                return (
                  <div key={doc.key} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{doc.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{doc.body}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDocumentAction}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" />
                      {doc.action}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        {t('patient.insurance.dataNote')}
      </div>
    </div>
  );
};
