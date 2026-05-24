import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Layers, ListChecks, Scan, Search, Workflow } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorLabOrders } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { useAuth } from '../../lib/auth-context';
import { formatLocaleDigits } from '../../lib/i18n-ui';

function isImagingName(name: string): boolean {
  return /(mri|ct|x-?ray|ultrasound|sonography|echo|radiology|scan|doppler)/i.test(name);
}

function modalityFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('mri')) return 'MRI';
  if (lower.includes('ct')) return 'CT';
  if (lower.includes('x-ray') || lower.includes('xray')) return 'X-Ray';
  if (lower.includes('ultrasound') || lower.includes('sono')) return 'Ultrasound';
  if (lower.includes('echo')) return 'Echo';
  return 'Radiology';
}

export const DoctorImaging = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDoctorLabOrders(user?.id);
  const uiLang = i18n.language ?? 'en';
  const [activeStatus, setActiveStatus] = useState<'all' | 'pending' | 'reported' | 'abnormal'>('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const studies = useMemo(
    () =>
      (data ?? []).flatMap((order) =>
        order.items
          .filter((item) => isImagingName(item.test_name))
          .map((item) => ({
            id: item.id,
            orderId: order.id,
            patientName: order.patientName,
            status: item.status,
            modality: modalityFromName(item.test_name),
            studyType: item.test_name,
            result: item.result_value,
            isAbnormal: Boolean(item.is_abnormal),
          }))
      ),
    [data]
  );
  const pending = studies.filter((study) => study.status !== 'resulted').length;
  const abnormal = studies.filter((study) => study.isAbnormal).length;
  const modalities = useMemo(() => Array.from(new Set(studies.map((study) => study.modality))).sort(), [studies]);
  const filteredStudies = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return studies.filter((study) => {
      if (activeStatus === 'pending' && study.status === 'resulted') return false;
      if (activeStatus === 'reported' && study.status !== 'resulted') return false;
      if (activeStatus === 'abnormal' && !study.isAbnormal) return false;
      if (modalityFilter !== 'all' && study.modality !== modalityFilter) return false;
      if (!search) return true;
      return [study.patientName, study.studyType, study.modality, study.status].join(' ').toLowerCase().includes(search);
    });
  }, [activeStatus, modalityFilter, searchQuery, studies]);
  const imagingTabs = [
    { id: 'all' as const, label: t('doctor.imaging.tabAll', { defaultValue: 'All studies' }), count: studies.length },
    { id: 'pending' as const, label: t('doctor.imaging.tabPending', { defaultValue: 'Pending' }), count: pending },
    {
      id: 'reported' as const,
      label: t('doctor.imaging.tabReported', { defaultValue: 'Reported' }),
      count: studies.length - pending,
    },
    { id: 'abnormal' as const, label: t('doctor.imaging.tabAbnormal', { defaultValue: 'Abnormal' }), count: abnormal },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
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

      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
              <Scan className="h-4 w-4" />
              {t('doctor.imaging.title')}
            </div>
            <h1 className="text-3xl font-bold">{t('doctor.imaging.featureQueueTitle')}</h1>
            <p className="mt-2 max-w-2xl text-violet-100">{t('doctor.imaging.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/doctor/lab-orders')}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {t('doctor.imaging.openLabOrders', { defaultValue: 'Open lab orders' })}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: t('doctor.imaging.cardStudies', { defaultValue: 'Studies' }),
            value: studies.length,
            icon: ListChecks,
            color: 'text-violet-600',
            bg: 'bg-violet-100',
          },
          {
            label: t('doctor.imaging.tabPending', { defaultValue: 'Pending' }),
            value: pending,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
          {
            label: t('doctor.imaging.tabReported', { defaultValue: 'Reported' }),
            value: studies.length - pending,
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
          },
          {
            label: t('doctor.imaging.tabAbnormal', { defaultValue: 'Abnormal' }),
            value: abnormal,
            icon: Workflow,
            color: 'text-red-600',
            bg: 'bg-red-100',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">{formatLocaleDigits(card.value, uiLang)}</div>
              <div className="text-xs text-slate-400">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-violet-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {t('doctor.imaging.worklist', { defaultValue: 'Imaging worklist' })}
            </h2>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:min-w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                placeholder={t('doctor.imaging.searchPh', {
                  defaultValue: 'Search patient, modality, study...',
                })}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <select
              value={modalityFilter}
              onChange={(event) => setModalityFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="all">{t('doctor.imaging.allModalities', { defaultValue: 'All modalities' })}</option>
              {modalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modality}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
          {imagingTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStatus === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${activeStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {formatLocaleDigits(tab.count, uiLang)}
              </span>
            </button>
          ))}
        </div>
        {filteredStudies.length === 0 ? (
          <div className="m-5 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            {t('doctor.imaging.emptyState', {
              defaultValue: 'No radiology-style orders are assigned to you yet.',
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudies.map((study) => (
              <div key={study.id} className={`flex flex-col gap-4 p-4 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between ${study.isAbnormal ? 'border-l-4 border-l-red-500 bg-red-50' : ''}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                      {study.modality}
                    </span>
                    <span className="font-bold text-slate-900">{study.studyType}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{study.patientName}</div>
                </div>
                <div className="text-right text-sm">
                  <div className={study.isAbnormal ? 'font-bold text-red-600' : 'font-bold text-slate-700'}>
                    {study.result ?? t('shared.labOrderItemStatus.pending', { defaultValue: 'Pending' })}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t(`shared.labOrderItemStatus.${study.status}`, { defaultValue: study.status })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
        {t('doctor.imaging.footerNote', {
          defaultValue:
            'Doctor Imaging is backed by lab order items that look like radiology studies. Dedicated imaging/DICOM tables are still needed for full viewer parity.',
        })}
      </div>
    </div>
  );
};
